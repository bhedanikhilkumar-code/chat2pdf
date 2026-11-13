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

export function extractConversation(): ExtractedConversation {
  const hostname = window.location.hostname.replace(/^www\./, '');
  const selectors = getSelectorsForHost(hostname) || getSelectorsForHost(window.location.hostname);

  const title = document.title || 'Exported Chat';
  const messages: ExtractedMessage[] = [];

  if (!selectors) {
    // Generic fallback heuristics
    const turns = document.querySelectorAll('[data-message-author-role], article, [class*="message"]');
    turns.forEach((turn) => {
      const roleAttr = turn.getAttribute('data-message-author-role') || '';
      const text = turn.textContent || '';
      const cleaned = cleanText(text);
      if (cleaned) {
        messages.push({
          role: roleAttr.includes('user') ? 'user' : 'assistant',
          content: cleaned,
        });
      }
    });

    return {
      title,
      source: hostname,
      messages,
    };
  }

  // Use configured selectors
  const turns = document.querySelectorAll(selectors.messageContainer);

  if (turns.length > 0) {
    turns.forEach((turn) => {
      // Check if user message
      const isUser = turn.matches(selectors.userMessage) || turn.querySelector(selectors.userMessage) !== null;
      const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

      // Find content element
      const contentEl = turn.querySelector(selectors.messageContent) || turn;
      
      // Clone element to safely remove junk selectors without modifying live page
      const cloned = contentEl.cloneNode(true) as HTMLElement;
      if (selectors.junkSelectors) {
        selectors.junkSelectors.forEach((junkSel) => {
          cloned.querySelectorAll(junkSel).forEach((el) => el.remove());
        });
      }

      const text = cloned.innerText || cloned.textContent || '';
      const cleaned = cleanText(text);

      if (cleaned) {
        messages.push({ role, content: cleaned });
      }
    });
  } else {
    // If container matched 0, attempt querySelectorAll directly on user and assistant elements
    const userNodes = Array.from(document.querySelectorAll(selectors.userMessage));
    const assistantNodes = Array.from(document.querySelectorAll(selectors.assistantMessage));

    // Combine and sort by DOM position
    const combined = [
      ...userNodes.map((node) => ({ node, role: 'user' as const })),
      ...assistantNodes.map((node) => ({ node, role: 'assistant' as const })),
    ].sort((a, b) => {
      const pos = a.node.compareDocumentPosition(b.node);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    combined.forEach(({ node, role }) => {
      const cloned = node.cloneNode(true) as HTMLElement;
      if (selectors.junkSelectors) {
        selectors.junkSelectors.forEach((junkSel) => {
          cloned.querySelectorAll(junkSel).forEach((el) => el.remove());
        });
      }
      const text = cloned.innerText || cloned.textContent || '';
      const cleaned = cleanText(text);
      if (cleaned) {
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
