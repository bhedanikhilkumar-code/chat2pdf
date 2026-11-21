import type { Conversation, ExportOptions } from '../parser/types';
import { filterMessages } from '../parser/filters';
import { WATERMARK_TEXT } from '../branding';
import { downloadBlob } from './downloadHelper';

const ROLE_EMOJI: Record<string, string> = {
  user: '👤',
  assistant: '🤖',
  system: '⚙️',
};

export function buildMarkdownContent(
  conversation: Conversation,
  options: ExportOptions
): string {
  const messages = filterMessages(conversation.messages, options.filterMode);

  if (messages.length === 0) {
    return `*No messages to export.*\n\n---\n*${WATERMARK_TEXT}*\n`;
  }

  const parts: string[] = [];

  if (options.includeTitle !== false && conversation.title) {
    parts.push(`# ${conversation.title}`);
    parts.push('');
    parts.push(
      `> **Source:** ${conversation.source} | **Exported:** ${conversation.exportedAt}`
    );
    parts.push('');
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const emoji = ROLE_EMOJI[msg.role] || '💬';
    const roleLabel = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);

    parts.push(`## ${emoji} ${roleLabel}`);
    parts.push('');
    parts.push(msg.content);
    parts.push('');

    if (msg.attachments && msg.attachments.length > 0) {
      parts.push('**Attachments:**');
      msg.attachments.forEach((att) => {
        parts.push(`- [Attachment: ${att.name}]${att.size ? ` (${att.size})` : ''}`);
      });
      parts.push('');
    }

    if (i < messages.length - 1) {
      parts.push('---');
      parts.push('');
    }
  }

  parts.push('---');
  parts.push(`*${WATERMARK_TEXT}*`);
  parts.push('');

  return parts.join('\n');
}

export async function exportMarkdown(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const markdown = buildMarkdownContent(conversation, options);
  const blob = new Blob([markdown], {
    type: 'text/markdown;charset=utf-8',
  });
  await downloadBlob(blob, `${options.fileName || conversation.title || 'chat'}.md`);
}
