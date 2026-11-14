import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { getSelectorsForHost } from './selectors/index';
import { cleanText } from '../../core/parser/cleaners';
import type { Attachment, SiteSelectors } from '../../core/parser/types';
import {
  safeQuerySelector,
  safeQuerySelectorAll,
  safeMatches,
  findButtonByText,
  findButtonsByText,
} from './dom-utils';

export interface ExtractedMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

export interface ExtractedConversation {
  title: string;
  source: string;
  messages: ExtractedMessage[];
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

function cleanNodeToMarkdown(node: HTMLElement, junkSelectors: string[]): string {
  const cloned = node.cloneNode(true) as HTMLElement;

  if (junkSelectors && junkSelectors.length > 0) {
    junkSelectors.forEach((junkSel) => {
      try {
        const junkEls = safeQuerySelectorAll(cloned, junkSel);
        junkEls.forEach((el) => el.remove());
      } catch (e) {
        console.warn(`[Chat2PDF] selector failed: ${junkSel}`, e);
      }
    });
  }

  const buttons = safeQuerySelectorAll(
    cloned,
    'button, .copy-code-button, [aria-label*="Copy"]'
  );
  buttons.forEach((el) => el.remove());

  try {
    const md = turndown.turndown(cloned.innerHTML);
    return cleanText(md);
  } catch (err) {
    const text = cloned.innerText || cloned.textContent || '';
    return cleanText(text);
  }
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
  let hash = 0;
  const str = `${role}:${content.trim().slice(0, 150)}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `msg_${Math.abs(hash)}`;
}

// Extract turns currently present in DOM
export function extractVisibleTurns(selectors?: SiteSelectors): ExtractedMessage[] {
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
    const turns = safeQuerySelectorAll<HTMLElement>(document, selectors.messageContainer);
    if (turns.length > 0) {
      turns.forEach((turn) => {
        const isUser =
          safeMatches(turn, selectors.userMessage) ||
          safeQuerySelector(turn, selectors.userMessage) !== null;
        const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

        const contentEl = safeQuerySelector<HTMLElement>(turn, selectors.messageContent) || turn;
        const cleaned = cleanNodeToMarkdown(contentEl, junk);

        if (cleaned) {
          const id =
            turn.getAttribute('data-message-id') ||
            turn.getAttribute('data-testid') ||
            hashMessage(role, cleaned);

          const attachments = isUser ? extractAttachments(turn, selectors) : undefined;

          extracted.push({
            id,
            role,
            content: cleaned,
            attachments: attachments && attachments.length > 0 ? attachments : undefined,
          });
        }
      });
      return extracted;
    }
  }

  // Fallback heuristics
  const candidateTurns = safeQuerySelectorAll<HTMLElement>(
    document,
    '[data-message-author-role], article, [class*=message], [class*=chat-turn]'
  );

  candidateTurns.forEach((turn) => {
    const roleAttr = (turn.getAttribute('data-message-author-role') || turn.className || '').toLowerCase();
    const isUser = roleAttr.includes('user') || roleAttr.includes('human');
    const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

    const contentEl =
      safeQuerySelector<HTMLElement>(turn, '.markdown, .prose, [class*=content]') || turn;
    const cleaned = cleanNodeToMarkdown(contentEl, defaultJunk);

    if (cleaned && cleaned.length > 3) {
      const id = turn.getAttribute('data-message-id') || hashMessage(role, cleaned);
      extracted.push({ id, role, content: cleaned });
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
 * resolving virtualized message nodes, and merging batches in chronological order.
 */
export async function collectFullConversation(
  onProgress?: (count: number, status: string) => void
): Promise<ExtractedConversation> {
  const startTime = Date.now();
  const hostname = window.location.hostname.replace(/^www\./, '');
  const selectors = getSelectorsForHost(hostname) || getSelectorsForHost(window.location.hostname) || undefined;

  console.log(`[Chat2PDF] Starting full-chat extraction on host: ${hostname}`);

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

  // Master map of collected messages keyed by stable ID
  const messageMap = new Map<string, ExtractedMessage>();
  const orderedIds: string[] = [];

  function recordMessages(messages: ExtractedMessage[]) {
    messages.forEach((msg) => {
      const id = msg.id || hashMessage(msg.role, msg.content);
      if (!messageMap.has(id)) {
        messageMap.set(id, msg);
        orderedIds.push(id);
      }
    });
  }

  // Initial pass at current position
  expandCollapsedContent(selectors);
  const initialBatch = extractVisibleTurns(selectors);
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

      const batch = extractVisibleTurns(selectors);
      recordMessages(batch);

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

    // Phase 2: Now that top is reached, step DOWNWARDS to capture full thread in strict chronological order
    console.log('[Chat2PDF] Phase 2: Stepping downwards to ensure complete chronological capture...');
    orderedIds.length = 0;
    messageMap.clear();

    scrollContainer.scrollTop = 0;
    await new Promise((resolve) => setTimeout(resolve, 300));
    expandCollapsedContent(selectors);
    recordMessages(extractVisibleTurns(selectors));

    let atBottomRounds = 0;
    while (atBottomRounds < 2 && Date.now() - startTime < MAX_TIME_MS) {
      if (token.cancelled) break;
      round++;

      const step = Math.max(300, Math.floor((scrollContainer.clientHeight || 600) * 0.8));
      const prevScrollTop = scrollContainer.scrollTop;
      scrollContainer.scrollTop = Math.min(scrollContainer.scrollHeight, scrollContainer.scrollTop + step);

      await new Promise((resolve) => setTimeout(resolve, 250));
      expandCollapsedContent(selectors);

      const batch = extractVisibleTurns(selectors);
      const prevTotal = messageMap.size;
      recordMessages(batch);
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
  console.log(`[Chat2PDF] Extraction finished in ${elapsed}ms: rounds=${round}, total messages=${messageMap.size}`);

  const finalMessages = orderedIds.map((id) => messageMap.get(id)!);

  return {
    title,
    source: hostname,
    messages: finalMessages,
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
