import type { Conversation, ExportOptions } from '../parser/types';
import { filterMessages } from '../parser/filters';
import { WATERMARK_TEXT } from '../branding';
import { downloadBlob } from './downloadHelper';

export function buildJsonContent(
  conversation: Conversation,
  options: ExportOptions
): string {
  const messages = filterMessages(conversation.messages, options.filterMode);
  const watermark = options.watermarkText !== undefined ? options.watermarkText : WATERMARK_TEXT;

  const exportData = {
    title: conversation.title || 'Conversation',
    source: conversation.source,
    exportedAt: conversation.exportedAt,
    messageCount: messages.length,
    messages: messages.map((m) => ({
      index: m.index,
      role: m.role,
      content: m.content,
      ...(m.htmlContent ? { htmlContent: m.htmlContent } : {}),
      ...(m.timestamp ? { timestamp: m.timestamp } : {}),
      ...(m.attachments && m.attachments.length > 0 ? { attachments: m.attachments } : {}),
    })),
    watermark,
  };

  return options.jsonFormat === 'compact'
    ? JSON.stringify(exportData)
    : JSON.stringify(exportData, null, 2);
}

export async function exportJson(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const json = buildJsonContent(conversation, options);
  const blob = new Blob([json], {
    type: 'application/json;charset=utf-8',
  });
  await downloadBlob(blob, `${options.fileName || conversation.title || 'chat'}.json`);
}
