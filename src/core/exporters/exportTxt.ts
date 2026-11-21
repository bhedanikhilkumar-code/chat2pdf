import type { Conversation, ExportOptions } from '../parser/types';
import { filterMessages } from '../parser/filters';
import { WATERMARK_TEXT } from '../branding';
import { downloadBlob } from './downloadHelper';
import { cleanMathToReadableText } from '../renderer/mathRenderer';

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  assistant: 'Assistant',
  system: 'System',
};

export function buildTxtContent(
  conversation: Conversation,
  options: ExportOptions
): string {
  const messages = filterMessages(conversation.messages, options.filterMode);
  const watermark = options.watermarkText !== undefined ? options.watermarkText : WATERMARK_TEXT;

  if (messages.length === 0) {
    return watermark
      ? `No messages to export.\n\n---\n${watermark}\n`
      : `No messages to export.\n`;
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
    parts.push(cleanMathToReadableText(msg.content));
    if (msg.attachments && msg.attachments.length > 0) {
      parts.push(`Attachments: ${msg.attachments.map((a) => a.name + (a.size ? ` (${a.size})` : '')).join(', ')}`);
    }
    parts.push('');
  }

  if (watermark) {
    parts.push('='.repeat(60));
    parts.push(watermark);
    parts.push('');
  }

  return parts.join('\n');
}

export async function exportTxt(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const text = buildTxtContent(conversation, options);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  await downloadBlob(blob, `${options.fileName || conversation.title || 'chat'}.txt`);
}
