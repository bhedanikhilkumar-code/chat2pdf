import type { SiteSelectors } from '@core/parser/types';

export const geminiSelectors: SiteSelectors = {
  messageContainer: '.conversation-container',
  userMessage: '.query-content',
  assistantMessage: '.model-response-text, .response-content',
  messageContent: '.markdown',
  chatTitle: 'h1.conversation-title',
  junkSelectors: [
    'button',
    '.copy-button',
    '.feedback-buttons',
    '.action-buttons',
    '.thumbs-up',
    '.thumbs-down',
    'svg',
    '.sr-only',
    '[aria-hidden="true"]',
    '.citation-chip',
    '.source-card',
  ],
};
