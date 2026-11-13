import type { SiteSelectors } from '@core/parser/types';

export const claudeSelectors: SiteSelectors = {
  messageContainer: '[class*="conversation"]',
  userMessage: '[class*="human"]',
  assistantMessage: '[class*="assistant"]',
  messageContent: '[class*="message-content"], [class*="markdown"]',
  chatTitle: '[class*="conversation-title"], h1',
  junkSelectors: [
    'button',
    '.copy-button',
    '.feedback-buttons',
    '.message-actions',
    'svg',
    '.sr-only',
    '[aria-hidden="true"]',
    '[class*="action"]',
    '[class*="toolbar"]',
  ],
};
