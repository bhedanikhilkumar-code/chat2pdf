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
  const watermark = options.watermarkText !== undefined ? options.watermarkText : WATERMARK_TEXT;

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

  if (watermark) {
    rows.push({
      index: '',
      role: 'watermark',
      message: watermark,
      attachments: '',
    });
  }

  return Papa.unparse(rows, {
    columns: ['index', 'role', 'message', 'attachments'],
    header: true,
    delimiter: options.csvDelimiter || ',',
  });
}

export async function exportCsv(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const csv = buildCsvContent(conversation, options);
  const ext = options.csvDelimiter === '\t' ? 'tsv' : 'csv';
  const mimeType = options.csvDelimiter === '\t' ? 'text/tab-separated-values;charset=utf-8' : 'text/csv;charset=utf-8';
  const blob = new Blob([csv], { type: mimeType });
  await downloadBlob(blob, `${options.fileName || conversation.title || 'chat'}.${ext}`);
}
