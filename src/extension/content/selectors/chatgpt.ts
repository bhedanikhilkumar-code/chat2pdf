import type { SiteSelectors } from '@core/parser/types';

export const chatgptSelectors: SiteSelectors = {
  messageContainer: '[data-testid^=conversation-turn], article[data-testid^=conversation-turn], [data-testid=conversation-turn], div[class*=agent-turn], div[class*=user-turn], [data-message-author-role]',
  userMessage: '[data-message-author-role=user], [data-testid=user-message], [class*=user-message], div[class*=user]',
  assistantMessage: '[data-message-author-role=assistant], [data-testid=agent-turn], [class*=agent-turn], div[class*=agent]',
  messageContent: '.markdown, [data-message-author-role] .markdown, div[class*=markdown], .prose',
  chatTitle: 'h1, [data-testid=conversation-title], title',
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
