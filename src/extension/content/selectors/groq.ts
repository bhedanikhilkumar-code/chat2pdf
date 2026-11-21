import type { SiteSelectors } from '@core/parser/types';

export const groqSelectors: SiteSelectors = {
  messageContainer:
    '[class*=message], [data-testid*=message], div[class*=chat-turn], div[class*="group/message"]',
  userMessage: '[data-message-author-role=user], [class*=user-message], div[class*=justify-end]',
  assistantMessage:
    '[data-message-author-role=assistant], [class*=assistant-message], div[class*=justify-start]',
  messageContent: '.markdown, .prose, [class*=message-content], div[class*=prose-invert]',
  chatTitle: 'h1, [class*=chat-title], title',
  scrollContainer:
    'div[class*="overflow-y-auto"], main [class*="overflow-y-auto"], [class*="scroll-container"], main',
  loadEarlierButton: 'button[class*="load-more"], button[class*="load-older"]',
  expandButtons: 'button[aria-label*="Expand"], button[class*="expand"]',
  attachmentContainer: '[class*="attachment"], [class*="file-chip"]',
  junkSelectors: [
    'button',
    '.copy-button',
    '.regenerate-button',
    '.feedback-buttons',
    'svg',
    '.sr-only',
    '[aria-hidden=true]',
    '[class*=action]',
  ],
};
