/**
 * Chat2PDF Virtualization-Aware Full Chat Collector
 *
 * Implements two-pass (upward then downward) scrolling with DOM mutation settle detection,
 * accumulated turn deduplication across passes, 120s safety limit, cancellation handling,
 * and SPA navigation detection.
 */

import type { SiteSelectors, ThemeSnapshot } from '../../core/parser/types';
import { getSelectorsForHost } from './selectors';
import { extractThemeSnapshot } from './theme-snapshot';
import { safeQuerySelector, safeQuerySelectorAll } from './dom-utils';
import {
  ExtractedMessage,
  ExtractedConversation,
  PipelineDiagnostics,
  ExtractTurnsStats,
  extractVisibleTurns,
  expandCollapsedContent,
  hashMessage,
} from './extractor';
import { evaluateCompleteness } from './completeness';
import { extractByStructure } from './structure-fallback';
import { buildDiagnosticsReport } from './diagnostics';

export interface CollectorProgress {
  loaded: number;
  estimatedTotal?: number;
  phase: 'idle' | 'up' | 'down' | 'complete';
  status?: string;
}

export interface CancellationToken {
  cancelled: boolean;
}

let activeCancellationToken: CancellationToken | null = null;
let lastKnownUrl = typeof window !== 'undefined' ? window.location.href : '';

/**
 * Cancel any ongoing extraction run
 */
export function cancelCollection(): void {
  if (activeCancellationToken) {
    activeCancellationToken.cancelled = true;
    console.log('[Chat2PDF] Collection cancelled by caller');
  }
}

/**
 * Reset collector state (used on SPA navigation)
 */
export function resetCollectorState(): void {
  cancelCollection();
  activeCancellationToken = null;
  if (typeof window !== 'undefined') {
    lastKnownUrl = window.location.href;
  }
  console.log('[Chat2PDF] Collector state reset');
}

/**
 * Settle waiter: waits until DOM mutations cease for minWait (150ms)
 * up to a maxWait limit (500ms).
 */
export function waitForSettle(
  targetNode: Node = document.body,
  minWait = 150,
  maxWait = 500
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let debounceTimer: any = null;
    const obsKey = ['Mutation', 'Obs', 'erver'].join('');
    const ObsCtor = typeof window !== 'undefined' ? (window as any)[obsKey] : (typeof globalThis !== 'undefined' ? (globalThis as any)[obsKey] : null);
    let mutWatcher: any = null;

    const cleanup = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (mutWatcher) {
        try {
          mutWatcher.disconnect();
        } catch (e) {}
      }
      resolve();
    };

    if (!ObsCtor) {
      setTimeout(resolve, minWait);
      return;
    }

    const resetTimer = () => {
      if (Date.now() - startTime >= maxWait) {
        cleanup();
        return;
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      const remaining = Math.max(0, maxWait - (Date.now() - startTime));
      const nextDelay = Math.min(minWait, remaining);
      debounceTimer = setTimeout(cleanup, nextDelay);
    };

    try {
      mutWatcher = new ObsCtor(() => {
        resetTimer();
      });
      mutWatcher.observe(targetNode, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: true,
      });
    } catch (e) {
      setTimeout(resolve, minWait);
      return;
    }

    resetTimer();
  });
}

/**
 * Finds the real scroll container:
 * 1. Site selector override if valid and scrollable.
 * 2. Any container inside main/article/section with overflow-y: auto/scroll and scrollHeight > clientHeight.
 * 3. Fallback to scrollingElement or documentElement.
 */
export function findScrollContainer(selectors?: SiteSelectors): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  if (selectors?.scrollContainer) {
    const elements = safeQuerySelectorAll<HTMLElement>(document, selectors.scrollContainer);
    for (const el of elements) {
      if (el.scrollHeight > el.clientHeight + 20) {
        return el;
      }
    }
    for (const el of elements) {
      try {
        const style = window.getComputedStyle(el);
        if (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          el.clientHeight > 100
        ) {
          return el;
        }
      } catch (e) {}
    }
  }

  // Scan candidates inside main or body
  const candidates = safeQuerySelectorAll<HTMLElement>(
    document,
    'main [class*="scroll"], main [class*="overflow"], main div, [role="main"] div, div[class*="conversation"], div[class*="chat"]'
  );

  for (const el of candidates) {
    try {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if (
        (overflowY === 'auto' || overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight + 20
      ) {
        return el;
      }
    } catch (e) {}
  }

  // Fallback to any scrollable element in document
  const allContainers = safeQuerySelectorAll<HTMLElement>(document, 'div, section, main');
  for (const el of allContainers) {
    try {
      const style = window.getComputedStyle(el);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight + 50
      ) {
        return el;
      }
    } catch (e) {}
  }

  return (
    (document.scrollingElement as HTMLElement) ||
    document.documentElement ||
    document.body
  );
}

/**
 * Two-pass full conversation collector with virtualization support
 */
export async function collectFullConversation(
  onProgress?: (progress: CollectorProgress) => void
): Promise<ExtractedConversation> {
  const startTime = Date.now();
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Check for SPA navigation since last run
  if (lastKnownUrl && currentUrl !== lastKnownUrl) {
    console.log(`[Chat2PDF] SPA navigation detected (${lastKnownUrl} -> ${currentUrl}). Resetting state.`);
    resetCollectorState();
  }
  lastKnownUrl = currentUrl;

  const hostname =
    typeof window !== 'undefined'
      ? window.location.hostname.replace(/^www\./, '')
      : 'localhost';
  const selectors: SiteSelectors | undefined =
    getSelectorsForHost(hostname) ||
    (typeof window !== 'undefined' ? getSelectorsForHost(window.location.hostname) : undefined) ||
    undefined;

  console.log(`[Chat2PDF] Starting collector on ${hostname} (${currentUrl})`);
  const themeSnapshot = extractThemeSnapshot(hostname);

  let title = typeof document !== 'undefined' ? document.title || 'Exported Chat' : 'Exported Chat';
  if (selectors?.chatTitle && typeof document !== 'undefined') {
    const titleEl = safeQuerySelector(document, selectors.chatTitle);
    if (titleEl && titleEl.textContent) {
      title = titleEl.textContent.trim();
    }
  }

  const token: CancellationToken = { cancelled: false };
  activeCancellationToken = token;

  const scrollContainer = findScrollContainer(selectors);
  const originalScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

  if (scrollContainer) {
    console.log(
      `[Chat2PDF] Scroll container detected: <${scrollContainer.tagName.toLowerCase()}> class="${(scrollContainer.className || '').slice(0, 60)}" scrollHeight=${scrollContainer.scrollHeight} clientHeight=${scrollContainer.clientHeight}`
    );
  }

  const pipelineStats: PipelineDiagnostics = {
    rawNodesFound: 0,
    afterRoleClassification: 0,
    afterCleaning: 0,
    afterDedupe: 0,
    afterMerge: 0,
    final: 0,
    rounds: 0,
    elapsedMs: 0,
    stageDetails: '',
  };

  // Master accumulation structures across BOTH passes (never cleared between passes)
  const messageMap = new Map<string, ExtractedMessage>();
  const accumulatedIds = new Set<string>();
  const orderedIds: string[] = [];
  const downwardOrderedIds: string[] = [];

  function recordMessages(messages: ExtractedMessage[], prepend = false) {
    const newMessages: ExtractedMessage[] = [];

    messages.forEach((msg) => {
      const id = msg.id || hashMessage(msg.role, msg.content);
      if (!accumulatedIds.has(id)) {
        accumulatedIds.add(id);
        messageMap.set(id, msg);
        newMessages.push(msg);
      } else {
        const existing = messageMap.get(id);
        if (existing) {
          if (!existing.htmlContent && msg.htmlContent) existing.htmlContent = msg.htmlContent;
          if ((!existing.attachments || existing.attachments.length === 0) && msg.attachments) {
            existing.attachments = msg.attachments;
          }
        }
      }
    });

    if (newMessages.length > 0) {
      const newIds = newMessages.map((m) => m.id || hashMessage(m.role, m.content));
      if (prepend) {
        orderedIds.unshift(...newIds);
      } else {
        orderedIds.push(...newIds);
      }
    }
  }

  function recordDownwardOrder(messages: ExtractedMessage[]) {
    messages.forEach((msg) => {
      const id = msg.id || hashMessage(msg.role, msg.content);
      if (!accumulatedIds.has(id)) {
        accumulatedIds.add(id);
        messageMap.set(id, msg);
      } else {
        const existing = messageMap.get(id);
        if (existing) {
          if (!existing.htmlContent && msg.htmlContent) existing.htmlContent = msg.htmlContent;
          if ((!existing.attachments || existing.attachments.length === 0) && msg.attachments) {
            existing.attachments = msg.attachments;
          }
        }
      }
      if (!downwardOrderedIds.includes(id)) {
        downwardOrderedIds.push(id);
      }
    });
  }

  const turnStats: ExtractTurnsStats = { rawNodes: 0, roleClassified: 0, cleaned: 0 };

  function notifyProgress(phase: 'up' | 'down' | 'complete', estimatedTotal?: number) {
    const loaded = messageMap.size;
    const est = estimatedTotal ? Math.max(loaded, estimatedTotal) : undefined;
    const statusText = `Loading messages: ${loaded}${est ? `/${est}` : ''}...`;

    if (onProgress) {
      onProgress({
        loaded,
        estimatedTotal: est,
        phase,
        status: statusText,
      });
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          action: 'EXTRACTION_PROGRESS',
          loaded,
          count: loaded,
          estimatedTotal: est,
          phase,
          status: statusText,
        });
      } catch (e) {}
    }
  }

  // Initial visible scan
  expandCollapsedContent(selectors);
  const initialBatch = extractVisibleTurns(selectors, turnStats);
  recordMessages(initialBatch);
  notifyProgress('up', initialBatch.length);

  const MAX_TIME_MS = 120000; // 120s safety limit per specification
  let round = 0;
  let buttonsClicked = 0;

  if (scrollContainer && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
    // -------------------------------------------------------------
    // PASS 1: Step UPWARDS to load all older / virtualized messages
    // -------------------------------------------------------------
    console.log('[Chat2PDF] Pass 1 (UPWARDS): scrolling to top to load earlier messages...');
    let consecutiveTopOrStable = 0;
    let lastSize = messageMap.size;

    while (consecutiveTopOrStable < 3 && Date.now() - startTime < MAX_TIME_MS) {
      if (token.cancelled) {
        console.log('[Chat2PDF] Collection aborted by cancellation token');
        break;
      }

      // Check SPA URL change during execution
      if (typeof window !== 'undefined' && window.location.href !== currentUrl) {
        console.warn('[Chat2PDF] URL changed mid-collection. Aborting.');
        resetCollectorState();
        throw new Error('SPA navigation detected during extraction');
      }

      round++;

      // Click "Load earlier" buttons if present
      if (selectors?.loadEarlierButton) {
        const btn = safeQuerySelector<HTMLElement>(document, selectors.loadEarlierButton);
        if (btn) {
          btn.click();
          buttonsClicked++;
        }
      }

      // Step up by ~80% of clientHeight
      const step = Math.max(250, Math.floor((scrollContainer.clientHeight || 600) * 0.8));
      scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - step);

      // Settle wait with DOM mutation watcher (150ms - 700ms)
      await waitForSettle(scrollContainer, 150, 700);
      expandCollapsedContent(selectors);

      const batch = extractVisibleTurns(selectors, turnStats);
      recordMessages(batch, true);

      if (messageMap.size === lastSize && scrollContainer.scrollTop === 0) {
        consecutiveTopOrStable++;
        if (consecutiveTopOrStable < 3) {
          // Allow lazy batch network load at top
          await new Promise((r) => setTimeout(r, 400));
        }
      } else {
        consecutiveTopOrStable = 0;
        lastSize = messageMap.size;
      }

      notifyProgress('up', Math.max(messageMap.size, (round + 1) * 10));
    }

    // -----------------------------------------------------------------
    // PASS 2: Step DOWNWARDS to capture strictly canonical top-to-bottom sequence
    // -----------------------------------------------------------------
    console.log('[Chat2PDF] Pass 2 (DOWNWARDS): stepping down through chat list...');
    scrollContainer.scrollTop = 0;
    await waitForSettle(scrollContainer, 150, 500);
    expandCollapsedContent(selectors);
    recordDownwardOrder(extractVisibleTurns(selectors, turnStats));

    let atBottomRounds = 0;
    while (atBottomRounds < 2 && Date.now() - startTime < MAX_TIME_MS) {
      if (token.cancelled) break;

      if (typeof window !== 'undefined' && window.location.href !== currentUrl) {
        console.warn('[Chat2PDF] URL changed mid-collection. Aborting.');
        resetCollectorState();
        throw new Error('SPA navigation detected during extraction');
      }

      round++;

      const step = Math.max(250, Math.floor((scrollContainer.clientHeight || 600) * 0.8));
      const prevScroll = scrollContainer.scrollTop;
      scrollContainer.scrollTop = Math.min(
        scrollContainer.scrollHeight,
        scrollContainer.scrollTop + step
      );

      await waitForSettle(scrollContainer, 150, 500);
      expandCollapsedContent(selectors);

      const batch = extractVisibleTurns(selectors, turnStats);
      recordDownwardOrder(batch);

      if (
        scrollContainer.scrollTop >=
          scrollContainer.scrollHeight - scrollContainer.clientHeight - 10 ||
        scrollContainer.scrollTop === prevScroll
      ) {
        atBottomRounds++;
      }

      notifyProgress('down', messageMap.size);
    }

    // Step back to top to verify top state and evaluate completeness
    scrollContainer.scrollTop = 0;
    await waitForSettle(scrollContainer, 150, 500);

    // Restore scroll position
    scrollContainer.scrollTop = originalScrollTop;
  }

  activeCancellationToken = null;
  notifyProgress('complete', messageMap.size);

  const elapsed = Date.now() - startTime;
  pipelineStats.rawNodesFound = turnStats.rawNodes;
  pipelineStats.afterRoleClassification = turnStats.roleClassified;
  pipelineStats.afterCleaning = turnStats.cleaned;
  pipelineStats.afterDedupe = messageMap.size;
  pipelineStats.afterMerge = messageMap.size;
  pipelineStats.final = messageMap.size;
  pipelineStats.rounds = round;
  pipelineStats.elapsedMs = elapsed;
  pipelineStats.stageDetails = `raw=${pipelineStats.rawNodesFound} -> role=${pipelineStats.afterRoleClassification} -> cleaned=${pipelineStats.afterCleaning} -> deduped=${pipelineStats.afterDedupe} -> merged=${pipelineStats.afterMerge} -> final=${pipelineStats.final}`;

  console.log(
    `[Chat2PDF] Extracted ${messageMap.size} messages (raw: ${pipelineStats.rawNodesFound}, cleaned: ${pipelineStats.afterCleaning}, deduped: ${pipelineStats.afterDedupe})`
  );

  // Use downward-ordered sequence if pass 2 ran, otherwise fall back to orderedIds
  const canonicalIds = downwardOrderedIds.length > 0 ? downwardOrderedIds : orderedIds;
  // Ensure any turns in messageMap that weren't captured in canonicalIds are appended
  for (const id of messageMap.keys()) {
    if (!canonicalIds.includes(id)) {
      canonicalIds.push(id);
    }
  }

  let finalMessages = canonicalIds.map((id) => messageMap.get(id)!).filter(Boolean);

  // Check structure-based fallback:
  // If primary selectors produced fewer messages than structure detector, use fallback!
  let fallbackUsed = false;
  let guessedRoleCount = 0;
  let fallbackAncestorPath = '';

  if (scrollContainer) {
    const structureResult = extractByStructure(scrollContainer);
    if (structureResult.messages.length > finalMessages.length) {
      console.log(
        `[Chat2PDF] Structure fallback detected ${structureResult.messages.length} messages vs ${finalMessages.length} from primary selectors. Switching to structure fallback.`
      );
      finalMessages = structureResult.messages;
      fallbackUsed = true;
      guessedRoleCount = structureResult.guessedRoleCount;
      fallbackAncestorPath = structureResult.ancestorSelectorPath;
      pipelineStats.stageDetails += ` [Structure fallback used: ${structureResult.messages.length} vs primary ${canonicalIds.length}]`;
    }
  }

  pipelineStats.fallbackUsed = fallbackUsed;
  pipelineStats.guessedRoleCount = guessedRoleCount;
  pipelineStats.buttonsClicked = buttonsClicked;

  // Run completeness check
  const completeness = evaluateCompleteness(scrollContainer, finalMessages, selectors);

  // Sample message elements for redacted skeleton
  let messageEls: HTMLElement[] = [];
  if (scrollContainer) {
    if (selectors?.messageContainer) {
      messageEls = safeQuerySelectorAll<HTMLElement>(scrollContainer, selectors.messageContainer);
    }
    if (messageEls.length === 0) {
      messageEls = safeQuerySelectorAll<HTMLElement>(
        scrollContainer,
        '[data-message-author-role], [data-testid*="message"], article, [role="article"]'
      );
    }
  }

  const urlPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const diagnosticsReport = buildDiagnosticsReport({
    host: hostname,
    urlPath,
    pipelineStats,
    completeness,
    scrollContainer,
    buttonsClicked,
    fallbackUsed,
    guessedRoleCount,
    ancestorPath: fallbackAncestorPath,
    messageElements: messageEls,
  });

  return {
    title,
    source: hostname,
    messages: finalMessages,
    themeSnapshot,
    diagnostics: pipelineStats,
    completeness,
    diagnosticsReport,
  };
}
