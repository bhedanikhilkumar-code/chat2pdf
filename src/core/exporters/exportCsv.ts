import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import type { Conversation, ExportOptions } from '../parser/types';
import { filterMessages } from '../parser/filters';
import { WATERMARK_TEXT } from '../branding';

interface CsvRow {
  index: number | string;
  role: string;
  message: string;
}

export async function exportCsv(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const messages = filterMessages(conversation.messages, options.filterMode);

  const rows: CsvRow[] = messages.map((msg, i) => ({
    index: i + 1,
    role: msg.role,
    message: msg.content,
  }));

  if (rows.length === 0) {
    rows.push({ index: 0, role: '', message: 'No messages to export.' });
  }

  // Append watermark row at the end of CSV
  rows.push({
    index: '',
    role: 'watermark',
    message: WATERMARK_TEXT,
  });

  const csv = Papa.unparse(rows, {
    columns: ['index', 'role', 'message'],
    header: true,
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${options.fileName || conversation.title || 'chat'}.csv`);
}
