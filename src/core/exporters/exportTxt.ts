import { saveAs } from 'file-saver';
import type { Conversation, ExportOptions } from '../parser/types';
import { filterMessages } from '../parser/filters';
import { WATERMARK_TEXT } from '../branding';

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  assistant: 'Assistant',
  system: 'System',
};

export async function exportTxt(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const messages = filterMessages(conversation.messages, options.filterMode);

  if (messages.length === 0) {
    const blob = new Blob([`No messages to export.\n\n---\n${WATERMARK_TEXT}\n`], {
      type: 'text/plain;charset=utf-8',
    });
    saveAs(blob, `${options.fileName || conversation.title || 'chat'}.txt`);
    return;
  }

  const parts: string[] = [];

  if (options.includeTitle !== false && conversation.title) {
    parts.push(`Title: ${conversation.title}`);
    parts.push(`Source: ${conversation.source}`);
    parts.push(`Exported: ${conversation.exportedAt}`);
    parts.push('='.repeat(60));
    parts.push('');
  }

  for (const msg of messages) {
    const label = ROLE_LABELS[msg.role] || msg.role;
    parts.push(`--- ${label} ---`);
    parts.push(msg.content);
    parts.push('');
  }

  parts.push('='.repeat(60));
  parts.push(WATERMARK_TEXT);
  parts.push('');

  const text = parts.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${options.fileName || conversation.title || 'chat'}.txt`);
}
