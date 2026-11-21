import type { SiteSelectors } from '@core/parser/types';

export const deepseekSelectors: SiteSelectors = {
  messageContainer:
    'div[class*="chat-message"], div[class*="message-item"], div[class*="ds-message"], div[class*="fbb737a4"], div[class*="chat-turn"], [data-message-author-role]',
  userMessage:
    'div[class*="user"], div[class*="ds-message-user"], [data-message-author-role="user"], [class*="user-message"]',
  assistantMessage:
    'div[class*="assistant"], div[class*="ds-message-assistant"], div[class*="ds-markdown"], [data-message-author-role="assistant"], [class*="assistant-message"]',
  messageContent:
    'div[class*="ds-markdown"], div[class*="markdown"], .markdown, .prose, div[class*="message-content"]',
  chatTitle: 'title, h1, [class*="chat-title"], [class*="title-text"]',
  scrollContainer:
    'div[class*="chat-scroll"], div[class*="overflow-y-auto"], [class*="scroll-container"], main',
  loadEarlierButton: 'button[class*="load-more"], button[class*="load-earlier"]',
  expandButtons: 'button[aria-label*="Expand"], button[class*="expand"]',
  attachmentContainer: '[class*="attachment"], [class*="file-chip"], [class*="file-item"]',
  junkSelectors: [
    'button',
    '.copy-button',
    '.feedback-buttons',
    '.regenerate-button',
    'svg',
    '.sr-only',
    '[aria-hidden=true]',
    '[class*="ds-icon"]',
    '[class*="action"]',
    '[class*="ds-button"]',
  ],
};
