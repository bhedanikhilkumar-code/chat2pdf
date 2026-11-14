import type { SiteSelectors } from '@core/parser/types';

export const perplexitySelectors: SiteSelectors = {
  messageContainer: '[class*=ConversationPair], [class*=question-answer], div[class*=col-span-12], div[class*=border-b][class*=border-borderMain]',
  userMessage: '[class*=query], [class*=Question], div[class*=font-display], div[class*=userQuery]',
  assistantMessage: '[class*=answer], [class*=Answer], [class*=response], div[class*=prose], div[class*="default prose"]',
  messageContent: '.prose, .markdown, [class*=markdown], div[class*=break-words]',
  chatTitle: 'h1, [class*=thread-title], title',
  junkSelectors: [
    'button',
    '.copy-button',
    '.feedback-buttons',
    'svg',
    '.sr-only',
    '[aria-hidden=true]',
    '[class*=source-card]',
    '[class*=citation]',
    '[class*=related-questions]',
    '[class*=action]',
  ],
};
