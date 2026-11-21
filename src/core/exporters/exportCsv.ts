import Papa from 'papaparse';
import type { Conversation, ExportOptions } from '../parser/types';
import { filterMessages } from '../parser/filters';
import { WATERMARK_TEXT } from '../branding';
import { downloadBlob } from './downloadHelper';
import { cleanMathToReadableText } from '../renderer/mathRenderer';

interface CsvRow {
  index: number | string;
  role: string;
  message: string;
  attachments?: string;
}

export function buildCsvContent(
  conversation: Conversation,
  options: ExportOptions
): string {
  const messages = filterMessages(conversation.messages, options.filterMode);

  const rows: CsvRow[] = messages.map((msg, i) => ({
    index: i + 1,
    role: msg.role,
    message: cleanMathToReadableText(msg.content),
    attachments: msg.attachments && msg.attachments.length > 0
      ? msg.attachments.map((a) => a.name + (a.size ? ` (${a.size})` : '')).join('; ')
      : '',
  }));

  if (rows.length === 0) {
    rows.push({ index: 0, role: '', message: 'No messages to export.', attachments: '' });
  }

  rows.push({
    index: '',
    role: 'watermark',
    message: WATERMARK_TEXT,
    attachments: '',
  });

  return Papa.unparse(rows, {
    columns: ['index', 'role', 'message', 'attachments'],
    header: true,
  });
}

export async function exportCsv(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const csv = buildCsvContent(conversation, options);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  await downloadBlob(blob, `${options.fileName || conversation.title || 'chat'}.csv`);
}
