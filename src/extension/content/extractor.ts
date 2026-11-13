import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { getSelectorsForHost } from './selectors/index';
import { cleanText } from '../../core/parser/cleaners';
import type { Attachment, SiteSelectors } from '../../core/parser/types';

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
      const codeEl = el.querySelector('code') || el;
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
        cloned.querySelectorAll(junkSel).forEach((el) => el.remove());
      } catch (e) {}
    });
  }

  cloned.querySelectorAll('button, .copy-code-button, [aria-label*="Copy"]').forEach((el) => el.remove());

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
  const containerSel = selectors?.attachmentContainer || '[class*="attachment"], [class*="file-chip"], [class*="file-pill"]';

  const items = Array.from(turnNode.querySelectorAll(containerSel)) as HTMLElement[];
  items.forEach((item) => {
    const nameEl = item.querySelector('[class*="name"], [class*="title"], span, div');
    const name = nameEl?.textContent?.trim() || item.getAttribute('aria-label') || 'attached-file';
    
    // Check if thumbnail/image
    let thumbnail: string | undefined;
    const imgEl = item.querySelector('img') as HTMLImageElement | null;
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
    const turns = Array.from(document.querySelectorAll(selectors.messageContainer)) as HTMLElement[];
    if (turns.length > 0) {
      turns.forEach((turn) => {
        const isUser = turn.matches(selectors.userMessage) || turn.querySelector(selectors.userMessage) !== null;
        const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

        const contentEl = (turn.querySelector(selectors.messageContent) as HTMLElement) || turn;
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
  const candidateTurns = Array.from(
    document.querySelectorAll('[data-message-author-role], article, [class*=message], [class*=chat-turn]')
  ) as HTMLElement[];

  candidateTurns.forEach((turn) => {
    const roleAttr = (turn.getAttribute('data-message-author-role') || turn.className || '').toLowerCase();
    const isUser = roleAttr.includes('user') || roleAttr.includes('human');
    const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

    const contentEl = (turn.querySelector('.markdown, .prose, [class*=content]') as HTMLElement) || turn;
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
    const el = document.querySelector(selectors.scrollContainer) as HTMLElement | null;
    if (el && el.scrollHeight > el.clientHeight) return el;
  }

  // Universal fallback scan for scrollable container
  const candidates = Array.from(document.querySelectorAll('main, div, section')) as HTMLElement[];
  for (const el of candidates) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 100) {
      return el;
    }
  }

  return (document.scrollingElement as HTMLElement) || document.documentElement || document.body;
}

// Expand collapsed content buttons before reading
export function expandCollapsedContent(selectors?: SiteSelectors) {
  const expandSelector =
    selectors?.expandButtons ||
    'button[aria-label*="Expand"], button[aria-label*="Show more"], button:has-text("Show more"), button:has-text("Read more")';

  try {
    document.querySelectorAll(expandSelector).forEach((btn) => {
      (btn as HTMLElement).click();
    });
  } catch (e) {}
}

/**
 * Collect full conversation by stepping upwards through scroll container,
 * resolving virtualized message nodes, and merging batches by overlap alignment.
 */
export async function collectFullConversation(
  onProgress?: (count: number, status: string) => void
): Promise<ExtractedConversation> {
  const hostname = window.location.hostname.replace(/^www\./, '');
  const selectors = getSelectorsForHost(hostname) || getSelectorsForHost(window.location.hostname);

  let title = document.title || 'Exported Chat';
  if (selectors?.chatTitle) {
    const titleEl = document.querySelector(selectors.chatTitle);
    if (titleEl && titleEl.textContent) {
      title = titleEl.textContent.trim();
    }
  }

  const token = { cancelled: false };
  activeCancellationToken = token;

  const scrollContainer = findScrollContainer(selectors);
  const originalScrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;

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
  recordMessages(extractVisibleTurns(selectors));
  if (onProgress) onProgress(messageMap.size, 'Scanned initial view...');

  const startTime = Date.now();
  const MAX_TIME_MS = 90000; // 90 second cap
  let consecutiveStableRounds = 0;
  let lastSize = messageMap.size;

  if (scrollContainer) {
    // Step upwards to trigger lazy loading / virtual unrolling
    while (consecutiveStableRounds < 3 && Date.now() - startTime < MAX_TIME_MS) {
      if (token.cancelled) break;

      // Click "load earlier" if button exists
      if (selectors?.loadEarlierButton) {
        const btn = document.querySelector(selectors.loadEarlierButton) as HTMLElement | null;
        if (btn) btn.click();
      }

      // Scroll up by viewport step
      const step = scrollContainer.clientHeight || 600;
      scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - step);

      // Wait for DOM mutations or idle settle
      await new Promise((resolve) => setTimeout(resolve, 350));
      expandCollapsedContent(selectors);

      const batch = extractVisibleTurns(selectors);
      recordMessages(batch);

      if (messageMap.size === lastSize) {
        consecutiveStableRounds++;
      } else {
        consecutiveStableRounds = 0;
        lastSize = messageMap.size;
      }

      if (onProgress) {
        onProgress(messageMap.size, `Loading older messages... ${messageMap.size} found`);
      }

      if (scrollContainer.scrollTop === 0) {
        consecutiveStableRounds++;
      }
    }

    // Scroll back down in steps to ensure bottom-most items are fully captured
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    await new Promise((resolve) => setTimeout(resolve, 300));
    recordMessages(extractVisibleTurns(selectors));

    // Restore original scroll
    scrollContainer.scrollTop = originalScrollTop;
  }

  activeCancellationToken = null;

  // Final ordered message list
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
  const selectors = getSelectorsForHost(hostname) || getSelectorsForHost(window.location.hostname);
  const turns = extractVisibleTurns(selectors);

  let title = document.title || 'Exported Chat';
  if (selectors?.chatTitle) {
    const titleEl = document.querySelector(selectors.chatTitle);
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
