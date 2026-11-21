import type { SiteSelectors } from '@core/parser/types';

export const perplexitySelectors: SiteSelectors = {
  messageContainer:
    '[class*=ConversationPair], [class*=question-answer], div[class*=col-span-12], div[class*=border-b][class*=border-borderMain], div[class*="group/query"]',
  userMessage: '[class*=query], [class*=Question], div[class*=font-display], div[class*=userQuery]',
  assistantMessage:
    '[class*=answer], [class*=Answer], [class*=response], div[class*=prose], div[class*="default prose"]',
  messageContent: '.prose, .markdown, [class*=markdown], div[class*=break-words]',
  chatTitle: 'h1, [class*=thread-title], title',
  scrollContainer:
    'main [class*="overflow-y-auto"], div[class*="overflow-y-auto"], main, [class*="scroll-container"]',
  loadEarlierButton: 'button[class*="load-more"], button[aria-label*="Load older"]',
  expandButtons: 'button[aria-label*="Expand"], button[aria-label*="Show more"], button[class*="expand"]',
  attachmentContainer: '[class*="attachment"], [class*="file-pill"], [class*="file-chip"]',
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
