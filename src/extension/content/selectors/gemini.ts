import type { SiteSelectors } from '@core/parser/types';

export const geminiSelectors: SiteSelectors = {
  messageContainer: '.conversation-container, message-content, div[class*=conversation-container], div[class*=chat-turn], div[class*=response-container], user-query, model-response',
  userMessage: '.query-content, user-query, div[class*=user-query], [data-test-id=user-query]',
  assistantMessage: '.model-response-text, .response-content, model-response, div[class*=model-response], [data-test-id=model-response]',
  messageContent: '.markdown, .prose, div[class*=markdown], message-content',
  chatTitle: 'h1.conversation-title, [data-test-id=conversation-title], h1',
  junkSelectors: [
    'button',
    '.copy-button',
    '.feedback-buttons',
    '.action-buttons',
    '.thumbs-up',
    '.thumbs-down',
    'svg',
    '.sr-only',
    '[aria-hidden=true]',
    '.citation-chip',
    '.source-card',
    'sources-carousel',
  ],
};
