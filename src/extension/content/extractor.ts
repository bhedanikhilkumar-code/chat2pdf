import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { getSelectorsForHost } from './selectors/index';
import { cleanText } from '../../core/parser/cleaners';
import type { Attachment, SiteSelectors, ThemeSnapshot } from '../../core/parser/types';
import {
  safeQuerySelector,
  safeQuerySelectorAll,
  safeMatches,
  findButtonByText,
  findButtonsByText,
} from './dom-utils';
import { extractThemeSnapshot } from './theme-snapshot';
import { processRichMessage } from './rich-content';

export interface ExtractedMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  htmlContent?: string;
  attachments?: Attachment[];
}

export interface PipelineDiagnostics {
  rawNodesFound: number;
  afterRoleClassification: number;
  afterCleaning: number;
  afterDedupe: number;
  afterMerge: number;
  final: number;
  rounds: number;
  elapsedMs: number;
  stageDetails: string;
}

export interface ExtractedConversation {
  title: string;
  source: string;
  messages: ExtractedMessage[];
  themeSnapshot?: ThemeSnapshot;
  diagnostics?: PipelineDiagnostics;
}

// Global cancellation token for async full-chat scroll operations
let activeCancellationToken: { cancelled: boolean } | null = null;

export function cancelCollection() {
  if (activeCancellationToken) {
    activeCancellationToken.cancelled = true;
    console.log('[Chat2PDF] Extraction cancelled by user token');
  }
}

// Configure Turndown with GFM
function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  td.use(gfm);

  td.addRule('fencedCodeBlock', {
    filter: (node, _options) => {
      return (
        node.nodeName === 'PRE' ||
        (node.nodeName === 'DIV' && (node as HTMLElement).classList.contains('code-block'))
      );
    },
    replacement: (_content, node, _options) => {
      const el = node as HTMLElement;
      const codeEl = safeQuerySelector<HTMLElement>(el, 'code') || el;
      const langClass = Array.from(codeEl.classList).find((c) => c.startsWith('language-'));
      const lang = langClass ? langClass.replace('language-', '') : '';
      const text = codeEl.textContent || '';
      return `\n\`\`\`${lang}\n${text.replace(/\n+$/, '')}\n\`\`\`\n\n`;
    },
  });

  return td;
}

const turndown = createTurndown();

function cleanNodeToMarkdownAndHtml(
  node: HTMLElement,
  junkSelectors: string[]
): { html: string; markdown: string } {
  const { html, rawText } = processRichMessage(node, junkSelectors);
  let md = '';
  try {
    md = cleanText(turndown.turndown(html));
  } catch (err) {
    md = cleanText(rawText);
  }
  return { html, markdown: md };
}

// Extract attachments from user turns
function extractAttachments(turnNode: HTMLElement, selectors?: SiteSelectors): Attachment[] {
  const attachments: Attachment[] = [];
  const containerSel =
    selectors?.attachmentContainer ||
    '[class*="attachment"], [class*="file-chip"], [class*="file-pill"]';

  const items = safeQuerySelectorAll<HTMLElement>(turnNode, containerSel);
  items.forEach((item) => {
    const nameEl = safeQuerySelector<HTMLElement>(
      item,
      '[class*="name"], [class*="title"], span, div'
    );
    const name = nameEl?.textContent?.trim() || item.getAttribute('aria-label') || 'attached-file';

    // Check if thumbnail/image
    let thumbnail: string | undefined;
    const imgEl = safeQuerySelector<HTMLImageElement>(item, 'img');
    if (imgEl && imgEl.src && imgEl.src.startsWith('data:')) {
      thumbnail = imgEl.src;
    }

    attachments.push({
      name,
      kind: name.includes('.') ? name.split('.').pop() : 'file',
      thumbnail,
    });
  });

  return attachments;
}

// Generate stable hash id for message deduplication
function hashMessage(role: string, content: string): string {
  const trimmed = content.trim();
  const sample = `${role}:${trimmed.length}:${trimmed.slice(0, 300)}:${trimmed.slice(-100)}`;
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    hash = (hash << 5) - hash + sample.charCodeAt(i);
    hash |= 0;
  }
  return `msg_${role}_${Math.abs(hash)}`;
}

export interface ExtractTurnsStats {
  rawNodes: number;
  roleClassified: number;
  cleaned: number;
}

// Extract turns currently present in DOM
export function extractVisibleTurns(
  selectors?: SiteSelectors,
  stats?: ExtractTurnsStats
): ExtractedMessage[] {
  const defaultJunk = [
    'button',
    '.copy-button',
    '.feedback-buttons',
    '.message-actions',
    'svg',
    '.sr-only',
    '[aria-hidden=true]',
  ];
  const junk = selectors?.junkSelectors || defaultJunk;
  const extracted: ExtractedMessage[] = [];

  if (selectors) {
    const rawTurns = safeQuerySelectorAll<HTMLElement>(document, selectors.messageContainer);
    if (stats) stats.rawNodes += rawTurns.length;

    // Filter out ancestor containers that contain other matched turn elements (avoids outer wrapper capture)
    const turns = rawTurns.filter((turn) => {
      return !rawTurns.some((other) => other !== turn && turn.contains(other));
    });

    if (turns.length > 0) {
      turns.forEach((turn) => {
        const isUser =
          safeMatches(turn, selectors.userMessage) ||
          safeQuerySelector(turn, selectors.userMessage) !== null;
        const isAssistant =
          safeMatches(turn, selectors.assistantMessage) ||
          safeQuerySelector(turn, selectors.assistantMessage) !== null;

        if (stats && (isUser || isAssistant)) stats.roleClassified++;
        const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

        const contentEl = safeQuerySelector<HTMLElement>(turn, selectors.messageContent) || turn;
        const { html, markdown } = cleanNodeToMarkdownAndHtml(contentEl, junk);

        if (markdown || html) {
          if (stats) stats.cleaned++;
          const id =
            turn.getAttribute('data-message-id') ||
            turn.getAttribute('data-testid') ||
            hashMessage(role, markdown || html);

          const attachments = isUser ? extractAttachments(turn, selectors) : undefined;

          extracted.push({
            id,
            role,
            content: markdown,
            htmlContent: html,
            attachments: attachments && attachments.length > 0 ? attachments : undefined,
          });
        }
      });
      return extracted;
    }
  }

  // Fallback heuristics
  const rawCandidateTurns = safeQuerySelectorAll<HTMLElement>(
    document,
    '[data-message-author-role], article, [class*=message], [class*=chat-turn]'
  );
  if (stats) stats.rawNodes += rawCandidateTurns.length;

  const candidateTurns = rawCandidateTurns.filter((turn) => {
    return !rawCandidateTurns.some((other) => other !== turn && turn.contains(other));
  });

  candidateTurns.forEach((turn) => {
    const roleAttr = (turn.getAttribute('data-message-author-role') || turn.className || '').toLowerCase();
    const isUser = roleAttr.includes('user') || roleAttr.includes('human');
    if (stats) stats.roleClassified++;
    const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

    const contentEl =
      safeQuerySelector<HTMLElement>(turn, '.markdown, .prose, [class*=content]') || turn;
    const { html, markdown } = cleanNodeToMarkdownAndHtml(contentEl, defaultJunk);

    if ((markdown && markdown.length > 3) || (html && html.length > 5)) {
      if (stats) stats.cleaned++;
      const id = turn.getAttribute('data-message-id') || hashMessage(role, markdown || html);
      extracted.push({ id, role, content: markdown, htmlContent: html });
    }
  });

  return extracted;
}

// Find chat scroll container with site-specific and common fallbacks
export function findScrollContainer(selectors?: SiteSelectors): HTMLElement | null {
  if (selectors?.scrollContainer) {
    const el = safeQuerySelector<HTMLElement>(document, selectors.scrollContainer);
    if (el && el.scrollHeight > el.clientHeight) return el;
  }

  // Universal fallback scan for scrollable container
  const candidates = safeQuerySelectorAll<HTMLElement>(document, 'main, div, section');
  for (const el of candidates) {
    try {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 100) {
        return el;
      }
    } catch (e) {}
  }

  return (document.scrollingElement as HTMLElement) || document.documentElement || document.body;
}

// Expand collapsed content buttons before reading
export function expandCollapsedContent(selectors?: SiteSelectors): number {
  const expandSelector =
    selectors?.expandButtons ||
    'button[aria-label*="Expand"], button[aria-label*="Show more"]';

  const buttons = safeQuerySelectorAll<HTMLElement>(document, expandSelector);
  const textButtons = findButtonsByText(document, /show more|read more|expand/i);

  let clicked = 0;
  const allToClick = new Set<HTMLElement>([...buttons, ...textButtons]);
  allToClick.forEach((btn) => {
    try {
      btn.click();
      clicked++;
    } catch (e) {
      console.warn('[Chat2PDF] Failed to click expand button', e);
    }
  });
  if (clicked > 0) {
    console.log(`[Chat2PDF] buttons clicked (expand): ${clicked}`);
  }
  return clicked;
}

/**
 * Collect full conversation by stepping upwards through scroll container,
 * resolving virtualized message nodes, capturing rich HTML and theme snapshots.
 */
export async function collectFullConversation(
  onProgress?: (count: number, status: string) => void
): Promise<ExtractedConversation> {
  const startTime = Date.now();
  const hostname = window.location.hostname.replace(/^www\./, '');
  const selectors = getSelectorsForHost(hostname) || getSelectorsForHost(window.location.hostname) || undefined;

  console.log(`[Chat2PDF] Starting full-chat extraction on host: ${hostname}`);
  const themeSnapshot = extractThemeSnapshot(hostname);
  console.log('[Chat2PDF] Theme snapshot captured:', themeSnapshot);

  let title = document.title || 'Exported Chat';
  if (selectors?.chatTitle) {
    const titleEl = safeQuerySelector(document, selectors.chatTitle);
    if (titleEl && titleEl.textContent) {
      title = titleEl.textContent.trim();
    }
  }

  const token = { cancelled: false };
  activeCancellationToken = token;

  const scrollContainer = findScrollContainer(selectors);
  const originalScrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;

  if (scrollContainer) {
    console.log(
      `[Chat2PDF] scroll container found: <${scrollContainer.tagName.toLowerCase()}> class="${(scrollContainer.className || '').slice(0, 60)}" scrollHeight=${scrollContainer.scrollHeight} clientHeight=${scrollContainer.clientHeight}`
    );
  } else {
    console.log('[Chat2PDF] scroll container found: window/document fallback');
  }

  // Pipeline stage counters
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

  // Master map of collected messages keyed by stable ID
  const messageMap = new Map<string, ExtractedMessage>();
  const orderedIds: string[] = [];

  function recordMessages(messages: ExtractedMessage[], prepend = false) {
    messages.forEach((msg) => {
      const id = msg.id || hashMessage(msg.role, msg.content);
      if (!messageMap.has(id)) {
        messageMap.set(id, msg);
        if (prepend) {
          orderedIds.unshift(id);
        } else {
          orderedIds.push(id);
        }
      } else {
        // Update existing turn with richer content/attachments if available
        const existing = messageMap.get(id)!;
        if (!existing.htmlContent && msg.htmlContent) existing.htmlContent = msg.htmlContent;
        if ((!existing.attachments || existing.attachments.length === 0) && msg.attachments) {
          existing.attachments = msg.attachments;
        }
      }
    });
  }

  const turnStats: ExtractTurnsStats = { rawNodes: 0, roleClassified: 0, cleaned: 0 };

  // Initial pass at current position
  expandCollapsedContent(selectors);
  const initialBatch = extractVisibleTurns(selectors, turnStats);
  recordMessages(initialBatch);
  console.log(`[Chat2PDF] Initial scan count: ${messageMap.size} messages in ${Date.now() - startTime}ms`);
  if (onProgress) onProgress(messageMap.size, 'Scanning conversation...');

  const MAX_TIME_MS = 90000; // 90 second cap
  let round = 0;

  if (scrollContainer) {
    // Phase 1: Scroll UPWARDS to unroll all earlier messages and reach the top
    console.log('[Chat2PDF] Phase 1: Stepping upwards to load older messages...');
    let consecutiveTopOrStable = 0;
    let lastSize = messageMap.size;

    while (consecutiveTopOrStable < 3 && Date.now() - startTime < MAX_TIME_MS) {
      if (token.cancelled) {
        console.log('[Chat2PDF] Collection cancelled by user token');
        break;
      }
      round++;

      // Click "load earlier" if button exists
      let loadBtnClicked = false;
      if (selectors?.loadEarlierButton) {
        const btn = safeQuerySelector<HTMLElement>(document, selectors.loadEarlierButton);
        if (btn) {
          console.log(`[Chat2PDF] buttons clicked: load earlier via selector "${selectors.loadEarlierButton}"`);
          btn.click();
          loadBtnClicked = true;
        }
      }
      if (!loadBtnClicked) {
        const textBtn = findButtonByText(
          document,
          /load older|load earlier|show earlier|show older|view older|previous messages/i
        );
        if (textBtn) {
          console.log(`[Chat2PDF] buttons clicked: load earlier via text "${textBtn.textContent?.trim()}"`);
          textBtn.click();
          loadBtnClicked = true;
        }
      }

      // Scroll up by viewport step
      const step = Math.max(300, Math.floor((scrollContainer.clientHeight || 600) * 0.8));
      scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - step);

      // Wait for DOM mutations or settle
      await new Promise((resolve) => setTimeout(resolve, 300));
      expandCollapsedContent(selectors);

      const batch = extractVisibleTurns(selectors, turnStats);
      recordMessages(batch, true);

      const batchDelta = messageMap.size - lastSize;
      console.log(
        `[Chat2PDF] Round ${round} (up): count per round=${batch.length} (new=${batchDelta}), total=${messageMap.size}, scrollTop=${scrollContainer.scrollTop}, time=${Date.now() - startTime}ms`
      );

      if (messageMap.size === lastSize && scrollContainer.scrollTop === 0) {
        consecutiveTopOrStable++;
      } else {
        consecutiveTopOrStable = 0;
        lastSize = messageMap.size;
      }

      if (onProgress) {
        onProgress(messageMap.size, `Loading older messages... ${messageMap.size} found`);
      }
    }

    // Phase 2: Now that top is reached, step DOWNWARDS to capture remaining thread without clearing earlier history!
    console.log('[Chat2PDF] Phase 2: Stepping downwards to ensure complete capture...');

    scrollContainer.scrollTop = 0;
    await new Promise((resolve) => setTimeout(resolve, 300));
    expandCollapsedContent(selectors);
    recordMessages(extractVisibleTurns(selectors, turnStats), false);

    let atBottomRounds = 0;
    while (atBottomRounds < 2 && Date.now() - startTime < MAX_TIME_MS) {
      if (token.cancelled) break;
      round++;

      const step = Math.max(300, Math.floor((scrollContainer.clientHeight || 600) * 0.8));
      const prevScrollTop = scrollContainer.scrollTop;
      scrollContainer.scrollTop = Math.min(scrollContainer.scrollHeight, scrollContainer.scrollTop + step);

      await new Promise((resolve) => setTimeout(resolve, 250));
      expandCollapsedContent(selectors);

      const batch = extractVisibleTurns(selectors, turnStats);
      const prevTotal = messageMap.size;
      recordMessages(batch, false);
      const batchDelta = messageMap.size - prevTotal;

      console.log(
        `[Chat2PDF] Round ${round} (down): count per round=${batch.length} (new=${batchDelta}), total=${messageMap.size}, scrollTop=${scrollContainer.scrollTop}, time=${Date.now() - startTime}ms`
      );

      if (
        scrollContainer.scrollTop >= scrollContainer.scrollHeight - scrollContainer.clientHeight - 5 ||
        scrollContainer.scrollTop === prevScrollTop
      ) {
        atBottomRounds++;
      }

      if (onProgress) {
        onProgress(messageMap.size, `Indexing full chat... ${messageMap.size} messages found`);
      }
    }

    // Restore original scroll
    scrollContainer.scrollTop = originalScrollTop;
  }

  activeCancellationToken = null;
  const elapsed = Date.now() - startTime;

  // Final pipeline calculations and logging
  pipelineStats.rawNodesFound = turnStats.rawNodes;
  pipelineStats.afterRoleClassification = turnStats.roleClassified;
  pipelineStats.afterCleaning = turnStats.cleaned;
  pipelineStats.afterDedupe = messageMap.size;
  pipelineStats.afterMerge = messageMap.size;
  pipelineStats.final = messageMap.size;
  pipelineStats.rounds = round;
  pipelineStats.elapsedMs = elapsed;
  pipelineStats.stageDetails = `raw=${pipelineStats.rawNodesFound} -> role=${pipelineStats.afterRoleClassification} -> cleaned=${pipelineStats.afterCleaning} -> deduped=${pipelineStats.afterDedupe} -> merged=${pipelineStats.afterMerge} -> final=${pipelineStats.final}`;

  console.log(`[Chat2PDF] Pipeline stage counts: ${pipelineStats.stageDetails}`);
  console.log(`[Chat2PDF] Stage 1 (Raw nodes found): ${pipelineStats.rawNodesFound}`);
  console.log(`[Chat2PDF] Stage 2 (After role classification): ${pipelineStats.afterRoleClassification}`);
  console.log(`[Chat2PDF] Stage 3 (After cleaning): ${pipelineStats.afterCleaning}`);
  console.log(`[Chat2PDF] Stage 4 (After dedupe): ${pipelineStats.afterDedupe}`);
  console.log(`[Chat2PDF] Stage 5 (After merge): ${pipelineStats.afterMerge}`);
  console.log(`[Chat2PDF] Stage 6 (Final count): ${pipelineStats.final}`);
  console.log(`[Chat2PDF] Extraction finished in ${elapsed}ms: rounds=${round}, total messages=${messageMap.size}`);

  const finalMessages = orderedIds.map((id) => messageMap.get(id)!).filter(Boolean);

  return {
    title,
    source: hostname,
    messages: finalMessages,
    themeSnapshot,
    diagnostics: pipelineStats,
  };
}

// Backward compatibility helper
export function extractConversation(): ExtractedConversation {
  const hostname = window.location.hostname.replace(/^www\./, '');
  const selectors = getSelectorsForHost(hostname) || getSelectorsForHost(window.location.hostname) || undefined;
  const turns = extractVisibleTurns(selectors);

  let title = document.title || 'Exported Chat';
  if (selectors?.chatTitle) {
    const titleEl = safeQuerySelector(document, selectors.chatTitle);
    if (titleEl && titleEl.textContent) {
      title = titleEl.textContent.trim();
    }
  }

  return {
    title,
    source: hostname,
    messages: turns,
    themeSnapshot: extractThemeSnapshot(hostname),
  };
}

// Chrome runtime message listeners
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'EXTRACT_CHAT') {
      try {
        const result = extractConversation();
        sendResponse({ success: true, data: result });
      } catch (err: any) {
        console.error('[Chat2PDF] EXTRACT_CHAT error:', err);
        sendResponse({ success: false, error: err?.message || 'Extraction failed' });
      }
      return true;
    }

    if (request.action === 'EXTRACT_FULL_CHAT') {
      collectFullConversation((count, status) => {
        try {
          chrome.runtime.sendMessage({ action: 'EXTRACTION_PROGRESS', count, status });
        } catch (e) {}
      })
        .then((result) => {
          sendResponse({ success: true, data: result });
        })
        .catch((err: any) => {
          console.error('[Chat2PDF] EXTRACT_FULL_CHAT error:', err);
          sendResponse({ success: false, error: err?.message || 'Full extraction failed' });
        });
      return true;
    }

    if (request.action === 'CANCEL_EXTRACTION') {
      cancelCollection();
      sendResponse({ success: true });
      return true;
    }
  });
}
