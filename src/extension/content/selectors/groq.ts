import type { SiteSelectors } from '@core/parser/types';

export const groqSelectors: SiteSelectors = {
  messageContainer: '[class*="message"], [data-testid*="message"]',
  userMessage: '[data-message-author-role="user"], [class*="user-message"]',
  assistantMessage: '[data-message-author-role="assistant"], [class*="assistant-message"]',
  messageContent: '.markdown, .prose, [class*="message-content"]',
  chatTitle: 'h1, [class*="chat-title"]',
  junkSelectors: [
    'button',
    '.copy-button',
    '.regenerate-button',
    '.feedback-buttons',
    'svg',
    '.sr-only',
    '[aria-hidden="true"]',
    '[class*="action"]',
  ],
};
