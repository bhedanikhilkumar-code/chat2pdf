/**
 * Chat2PDF Completeness Checker
 *
 * Verifies extraction completeness by:
 * 1. Confirming scroll reached the very top with no remaining load earlier / show more controls.
 * 2. Sanity checking found message count against scrollContainer.scrollHeight / avgMessageBlockHeight.
 * 3. Flagging incomplete loads (<60% of estimated turns, remaining controls, or missed top).
 */

import type { SiteSelectors } from '../../core/parser/types';
import type { ExtractedMessage } from './extractor';
import { safeQuerySelector, safeQuerySelectorAll } from './dom-utils';

export interface CompletenessReport {
  status: 'Complete' | 'Possibly incomplete';
  foundCount: number;
  expectedCount: number;
  hasRemainingLoadControl: boolean;
  reachedTop: boolean;
  reason?: string;
}

const LOAD_MORE_PATTERN = /load\s+(earlier|older|previous|more)|show\s+(more|earlier|older)|view\s+older/i;

/**
 * Checks if a visible "load earlier" or "show more" button remains in DOM.
 */
export function hasRemainingLoadEarlierControl(
  doc: Document | HTMLElement = document,
  selectors?: SiteSelectors
): boolean {
  if (selectors?.loadEarlierButton) {
    const el = safeQuerySelector<HTMLElement>(doc, selectors.loadEarlierButton);
    if (el && isElementVisible(el)) {
      return true;
    }
  }

  // Scan generic buttons and clickable elements
  const candidates = safeQuerySelectorAll<HTMLElement>(
    doc,
    'button, [role="button"], a, div[class*="button"], div[class*="load"]'
  );

  for (const el of candidates) {
    const text = el.textContent || '';
    if (LOAD_MORE_PATTERN.test(text.trim()) && isElementVisible(el)) {
      return true;
    }
  }

  return false;
}

function isElementVisible(el: HTMLElement): boolean {
  try {
    if (typeof window === 'undefined') return true;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  } catch (e) {
    return true;
  }
}

/**
 * Computes average message block height from current DOM elements.
 */
export function computeAverageMessageHeight(
  container: HTMLElement | null,
  selectors?: SiteSelectors
): number {
  if (!container) return 120;

  let heights: number[] = [];
  let targetNodes: HTMLElement[] = [];

  if (selectors?.messageContainer) {
    const rawNodes = safeQuerySelectorAll<HTMLElement>(container, selectors.messageContainer);
    // Prefer OUTERMOST matched turn rows so slot height & virtualization buffers aren't underestimated by small inner bubbles
    targetNodes = rawNodes.filter(
      (n) => !rawNodes.some((other) => other !== n && other.contains(n))
    );
  }

  if (targetNodes.length === 0) {
    const rawChildren = safeQuerySelectorAll<HTMLElement>(
      container,
      '[data-message-author-role], [class*="message"], [class*="chat-turn"], article, [role="article"]'
    );
    targetNodes = rawChildren.filter(
      (n) => !rawChildren.some((other) => other !== n && other.contains(n))
    );
  }

  for (const node of targetNodes) {
    const h = node.offsetHeight || node.getBoundingClientRect().height;
    if (h > 20 && h < 2500) {
      let msgUnits = 1;
      if (selectors?.userMessage && selectors?.assistantMessage) {
        try {
          const uMatch = node.matches(selectors.userMessage);
          const aMatch = node.matches(selectors.assistantMessage);
          const uSub = node.querySelector(selectors.userMessage);
          const aSub = node.querySelector(selectors.assistantMessage);
          if (!uMatch && !aMatch && uSub && aSub && uSub !== aSub) {
            msgUnits = 2;
          }
        } catch (e) {}
      }
      heights.push(h / msgUnits);
    }
  }

  if (heights.length > 0) {
    const avg = heights.reduce((a, b) => a + b, 0) / heights.length;
    return Math.max(50, Math.min(800, Math.round(avg)));
  }

  return 120; // Default plausible fallback height
}

/**
 * Evaluates whether extracted messages are complete or possibly incomplete.
 */
export function evaluateCompleteness(
  scrollContainer: HTMLElement | null,
  messages: ExtractedMessage[],
  selectors?: SiteSelectors,
  rootDoc: Document | HTMLElement = typeof document !== 'undefined' ? document : (null as any),
  observedAvgHeight?: number
): CompletenessReport {
  const foundCount = messages.length;

  if (foundCount === 0) {
    return {
      status: 'Possibly incomplete',
      foundCount: 0,
      expectedCount: 1,
      hasRemainingLoadControl: false,
      reachedTop: false,
      reason: 'No messages were extracted.',
    };
  }

  const reachedTop = !scrollContainer || scrollContainer.scrollTop <= 10;
  const hasRemainingLoadControl = rootDoc
    ? hasRemainingLoadEarlierControl(rootDoc, selectors)
    : false;

  let expectedCount = foundCount;

  if (scrollContainer && scrollContainer.scrollHeight > 0) {
    const domAvgHeight = computeAverageMessageHeight(scrollContainer, selectors);
    const effectiveAvgHeight =
      observedAvgHeight && observedAvgHeight > 0
        ? Math.max(domAvgHeight, Math.min(2500, Math.round(observedAvgHeight)))
        : domAvgHeight;
    const estimatedFromScroll = Math.max(1, Math.round(scrollContainer.scrollHeight / effectiveAvgHeight));
    expectedCount = Math.max(foundCount, estimatedFromScroll);
  }

  const reasons: string[] = [];
  let isIncomplete = false;

  // Sanity check: count vs scrollHeight estimate
  // If found count is below ~60% of the estimate
  if (expectedCount > foundCount && foundCount < 0.6 * expectedCount) {
    isIncomplete = true;
    reasons.push(`Found ${foundCount} messages, but scroll geometry estimated ~${expectedCount}`);
  }

  // Not reaching top or remaining load control
  if (!reachedTop) {
    isIncomplete = true;
    reasons.push('Could not scroll to the very top of the chat container');
  }

  if (hasRemainingLoadControl) {
    isIncomplete = true;
    reasons.push('A "load earlier" or "show more" control is still present');
  }

  return {
    status: isIncomplete ? 'Possibly incomplete' : 'Complete',
    foundCount,
    expectedCount,
    hasRemainingLoadControl,
    reachedTop,
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
  };
}
