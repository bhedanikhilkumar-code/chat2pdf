import type { SiteSelectors } from '@core/parser/types';

export const claudeSelectors: SiteSelectors = {
  // Target individual message turns directly, never parent conversation wrappers
  messageContainer:
    '[data-cds="UserMessage"], [data-cds="AssistantMessage"], div[data-testid*="user-message"], div[data-testid*="assistant-message"], div[data-turn-key], div[class*="group/message-row"], [data-message-author-role], div.font-user-message, div.font-claude-message',
  userMessage:
    '[data-cds="UserMessage"], div[class*="group/bubble"], [data-message-author-role="user"], [class*="font-user-message"], [data-testid*="user-message"], [class*="human"]',
  assistantMessage:
    '[data-cds="AssistantMessage"], div[data-testid="assistant-message"], [data-message-author-role="assistant"], [class*="font-claude-message"], [data-testid*="assistant-message"], [class*="progressive-markdown"], [class*="claude"]',
  messageContent:
    'div[class*="group/bubble"], div[data-testid="assistant-message"] .flex.min-w-0.flex-col, [class*="font-claude-message"], [class*="font-user-message"], [class*="progressive-markdown"], .prose, .markdown, [class*="message-content"]',
  chatTitle: 'h1, [data-testid="conversation-title"], [class*="conversation-title"]',
  scrollContainer:
    'div.own-scroll-layer, div[class*="own-scroll-layer"], div[class*="overflow-y-auto"][class*="overflow-x-hidden"], main.overflow-y-auto, div.overflow-y-auto, [class*="overflow-y-auto"], [class*="scroll-container"], main',
  loadEarlierButton: 'button[class*="load-older"], button[data-testid*="load-older"]',
  expandButtons: 'button[aria-label*="Expand"], button[aria-label*="Show more"]',
  attachmentContainer: '.file-chip, [class*="FileChip"], [class*="Attachment"], [class*="file-pill"], [aria-label*="Attachment"]',
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
