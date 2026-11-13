import type { SiteSelectors } from '@core/parser/types';

export const perplexitySelectors: SiteSelectors = {
  messageContainer: '[class*="ConversationPair"], [class*="question-answer"]',
  userMessage: '[class*="query"], [class*="Question"]',
  assistantMessage: '[class*="answer"], [class*="Answer"], [class*="response"]',
  messageContent: '.prose, .markdown, [class*="markdown"]',
  chatTitle: 'h1, [class*="thread-title"]',
  junkSelectors: [
    'button',
    '.copy-button',
    '.feedback-buttons',
    'svg',
    '.sr-only',
    '[aria-hidden="true"]',
    '[class*="source-card"]',
    '[class*="citation"]',
    '[class*="related-questions"]',
    '[class*="action"]',
  ],
};
