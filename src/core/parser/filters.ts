import type { ChatMessage, FilterMode } from './types';

export function filterMessages(
  messages: ChatMessage[],
  mode: FilterMode
): ChatMessage[] {
  switch (mode) {
    case 'answers-only':
      return messages.filter((m) => m.role === 'assistant');
    case 'questions-only':
      return messages.filter((m) => m.role === 'user');
    case 'summary':
      return messages.map((m) => ({
        ...m,
        content:
          m.content.length > 300
            ? m.content.substring(0, 300).trim() + '…'
            : m.content,
      }));
    case 'all':
    default:
      return messages;
  }
}
