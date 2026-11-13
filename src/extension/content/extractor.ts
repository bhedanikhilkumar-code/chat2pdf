import { getSelectorsForHost } from './selectors/index';
import { cleanText } from '../../core/parser/cleaners';

export interface ExtractedMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ExtractedConversation {
  title: string;
  source: string;
  messages: ExtractedMessage[];
}

function cleanNode(node: HTMLElement, junkSelectors: string[]): string {
  const cloned = node.cloneNode(true) as HTMLElement;
  if (junkSelectors && junkSelectors.length > 0) {
    junkSelectors.forEach((junkSel) => {
      try {
        cloned.querySelectorAll(junkSel).forEach((el) => el.remove());
      } catch (e) {}
    });
  }
  const text = cloned.innerText || cloned.textContent || '';
  return cleanText(text);
}

export function extractConversation(): ExtractedConversation {
  const hostname = window.location.hostname.replace(/^www\./, '');
  const selectors = getSelectorsForHost(hostname) || getSelectorsForHost(window.location.hostname);

  let title = document.title || 'Exported Chat';
  if (selectors?.chatTitle) {
    const titleEl = document.querySelector(selectors.chatTitle);
    if (titleEl && titleEl.textContent) {
      title = titleEl.textContent.trim();
    }
  }

  const messages: ExtractedMessage[] = [];
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

  if (selectors) {
    // 1. Try primary messageContainer selector
    const turns = Array.from(document.querySelectorAll(selectors.messageContainer));

    if (turns.length > 0) {
      turns.forEach((turn) => {
        const isUser = turn.matches(selectors.userMessage) || turn.querySelector(selectors.userMessage) !== null;
        const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

        const contentEl = (turn.querySelector(selectors.messageContent) as HTMLElement) || (turn as HTMLElement);
        const cleaned = cleanNode(contentEl, junk);

        if (cleaned) {
          messages.push({ role, content: cleaned });
        }
      });
    }

    // 2. If 0 messages found, try querying user and assistant elements directly
    if (messages.length === 0) {
      const userNodes = Array.from(document.querySelectorAll(selectors.userMessage)) as HTMLElement[];
      const assistantNodes = Array.from(document.querySelectorAll(selectors.assistantMessage)) as HTMLElement[];

      const combined = [
        ...userNodes.map((node) => ({ node, role: 'user' as const })),
        ...assistantNodes.map((node) => ({ node, role: 'assistant' as const })),
      ].sort((a, b) => {
        const pos = a.node.compareDocumentPosition(b.node);
        return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });

      combined.forEach(({ node, role }) => {
        const contentEl = (node.querySelector(selectors.messageContent) as HTMLElement) || node;
        const cleaned = cleanNode(contentEl, junk);
        if (cleaned) {
          messages.push({ role, content: cleaned });
        }
      });
    }
  }

  // 3. Ultra-resilient generic fallback heuristics (for new UI changes, articles, or custom bots)
  if (messages.length === 0) {
    const candidateTurns = Array.from(
      document.querySelectorAll('[data-message-author-role], article, [class*=message], [class*=chat-turn]')
    ) as HTMLElement[];

    candidateTurns.forEach((turn) => {
      const roleAttr = (turn.getAttribute('data-message-author-role') || turn.className || '').toLowerCase();
      const isUser = roleAttr.includes('user') || roleAttr.includes('human');
      const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

      const contentEl = (turn.querySelector('.markdown, .prose, [class*=content]') as HTMLElement) || turn;
      const cleaned = cleanNode(contentEl, defaultJunk);

      if (cleaned && cleaned.length > 3) {
        messages.push({ role, content: cleaned });
      }
    });
  }

  return {
    title,
    source: hostname,
    messages,
  };
}

// Listen for messages from popup or background script
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'EXTRACT_CHAT') {
      try {
        const result = extractConversation();
        sendResponse({ success: true, data: result });
      } catch (err: any) {
        sendResponse({ success: false, error: err?.message || 'Extraction failed' });
      }
    }
    return true; // Keep message channel open for async response
  });
}
