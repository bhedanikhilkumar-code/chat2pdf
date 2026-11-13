import type { SiteSelectors } from '@core/parser/types';

export const claudeSelectors: SiteSelectors = {
  messageContainer: '[class*=conversation], [data-testid=chat-message-row], div[data-testid*=user-message], div[data-testid*=assistant-message], div[class*=ChatMessage_container], div[class*=font-claude-message]',
  userMessage: '[class*=human], [data-testid*=user-message], [class*=font-user-message], div[class*=user]',
  assistantMessage: '[class*=assistant], [data-testid*=assistant-message], [class*=font-claude-message], div[class*=claude]',
  messageContent: '[class*=message-content], [class*=markdown], .prose, div[class*=progressive-markdown]',
  chatTitle: '[class*=conversation-title], [data-testid=conversation-title], h1',
  scrollContainer: 'div[class*="overflow-y-auto"], [class*="scroll-container"], main',
  loadEarlierButton: 'button[class*="load-older"], button:has-text("Load older")',
  expandButtons: 'button[aria-label*="Expand"], button:has-text("Show more")',
  attachmentContainer: '[class*="FileChip"], [class*="Attachment"], [class*="file-pill"]',
  junkSelectors: [

    'button',
    '.copy-button',
    '.feedback-buttons',
    '.message-actions',
    'svg',
    '.sr-only',
    '[aria-hidden=true]',
    '[class*=action]',
    '[class*=toolbar]',
    '[class*=FeedbackButtons]',
  ],
};
