import type { SiteSelectors } from '@core/parser/types';

export const chatgptSelectors: SiteSelectors = {
  messageContainer:
    'div[data-user-message-bubble], div[data-response-body], div[data-turn-key], div[data-virtualized-turn-content], [data-testid^=conversation-turn], article[data-testid^=conversation-turn], [data-testid=conversation-turn], div[class*=agent-turn], div[class*=user-turn], [data-message-author-role]',
  userMessage:
    'div[data-user-message-bubble], h4[data-conversation-role="user"], div.bg-user-message, [data-message-author-role=user], [data-testid=user-message], [class*=user-message], div[class*=user]',
  assistantMessage:
    'div[data-response-body], h4[data-conversation-role="assistant"], [data-message-author-role=assistant], [data-testid=agent-turn], [class*=agent-turn], div[class*=agent]',
  messageContent:
    'div[data-response-body] .markdown, div[data-response-body], div[data-user-message-bubble], .markdown, [data-message-author-role] .markdown, div[class*=markdown], .prose',
  chatTitle: 'h1, [data-testid=conversation-title], title',
  scrollContainer:
    'div.thread-scroll-container, div[class*="thread-scroll-container"], main div[class*="overflow-y-auto"], [data-testid="conversation-turn-list"], div[class*="react-scroll-to-bottom"]',
  loadEarlierButton: 'button[data-testid*="load-more"], button[class*="load-earlier"]',
  expandButtons: 'button[aria-label*="Expand"], button[aria-label*="Show more"]',
  attachmentContainer: '[data-testid="attachment"], [class*="attachment"], [class*="file-pill"], [class*="image-container"]',
  junkSelectors: [
    'button',
    '[data-testid=copy-button]',
    '.copy-button',
    '.regenerate-button',
    '.feedback-buttons',
    '.message-actions',
    '.thumbs-up',
    '.thumbs-down',
    'svg',
    '.sr-only',
    '[aria-hidden=true]',
    '.result-streaming',
    '.text-token-text-secondary',
    '[data-testid*=feedback]',
    '[data-testid*=action]',
  ],
};
