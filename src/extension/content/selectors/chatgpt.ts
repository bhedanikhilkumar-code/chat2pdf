import type { SiteSelectors } from '@core/parser/types';

export const chatgptSelectors: SiteSelectors = {
  messageContainer: '[data-testid^="conversation-turn"]',
  userMessage: '[data-message-author-role="user"]',
  assistantMessage: '[data-message-author-role="assistant"]',
  messageContent: '.markdown',
  chatTitle: 'h1',
  junkSelectors: [
    'button',
    '[data-testid="copy-button"]',
    '.copy-button',
    '.regenerate-button',
    '.feedback-buttons',
    '.message-actions',
    '.thumbs-up',
    '.thumbs-down',
    'svg',
    '.sr-only',
    '[aria-hidden="true"]',
    '.result-streaming',
    '.text-token-text-secondary',
  ],
};
