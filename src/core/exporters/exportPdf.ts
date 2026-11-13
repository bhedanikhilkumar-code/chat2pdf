import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import type { Conversation, ExportOptions } from '../parser/types';
import { filterMessages } from '../parser/filters';

const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 25;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const LINE_HEIGHT = 6;
const CODE_BG_COLOR = '#f0f0f0';
const CODE_PADDING = 3;

function isCodeBlock(line: string): boolean {
  return line.startsWith('```');
}

export async function exportPdf(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const messages = filterMessages(conversation.messages, options.filterMode);

  if (messages.length === 0) {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('No messages to export.', MARGIN_LEFT, MARGIN_TOP);
    const blob = doc.output('blob');
    saveAs(blob, `${options.fileName || conversation.title || 'chat'}.pdf`);
    return;
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN_TOP;
  let pageNum = 1;
  const maxY = PAGE_HEIGHT - MARGIN_BOTTOM;

  function addPageNumber() {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pageNum}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, {
      align: 'center',
    });
    doc.setTextColor(0, 0, 0);
  }

  function newPage() {
    addPageNumber();
    doc.addPage();
    pageNum++;
    y = MARGIN_TOP;
  }

  function ensureSpace(needed: number) {
    if (y + needed > maxY) {
      newPage();
    }
  }

  // Title
  if (options.includeTitle !== false && conversation.title) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(conversation.title, CONTENT_WIDTH);
    ensureSpace(titleLines.length * 8 + 5);
    doc.text(titleLines, MARGIN_LEFT, y);
    y += titleLines.length * 8 + 2;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Source: ${conversation.source} | Exported: ${conversation.exportedAt}`,
      MARGIN_LEFT,
      y
    );
    doc.setTextColor(0, 0, 0);
    y += 10;
  }

  for (const msg of messages) {
    // Role label
    const roleLabel =
      msg.role === 'user'
        ? '👤 User'
        : msg.role === 'assistant'
          ? '🤖 Assistant'
          : '⚙ System';

    ensureSpace(LINE_HEIGHT * 3);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(
      msg.role === 'user' ? 30 : msg.role === 'assistant' ? 0 : 100,
      msg.role === 'user' ? 100 : msg.role === 'assistant' ? 70 : 100,
      msg.role === 'user' ? 180 : msg.role === 'assistant' ? 140 : 100
    );
    doc.text(roleLabel, MARGIN_LEFT, y);
    y += LINE_HEIGHT + 1;
    doc.setTextColor(0, 0, 0);

    // Content
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const contentLines = msg.content.split('\n');
    let inCodeBlock = false;

    for (const rawLine of contentLines) {
      if (isCodeBlock(rawLine)) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
          ensureSpace(LINE_HEIGHT + CODE_PADDING * 2);
        }
        continue;
      }

      const wrappedLines = doc.splitTextToSize(
        rawLine || ' ',
        inCodeBlock ? CONTENT_WIDTH - CODE_PADDING * 2 : CONTENT_WIDTH
      ) as string[];

      // Check if we have enough space for at least 2 lines; avoid orphan lines
      const neededHeight = wrappedLines.length * LINE_HEIGHT;
      if (y + Math.min(neededHeight, LINE_HEIGHT * 2) > maxY) {
        newPage();
      }

      for (const wLine of wrappedLines) {
        if (y + LINE_HEIGHT > maxY) {
          newPage();
        }

        if (inCodeBlock) {
          // Gray background for code
          doc.setFillColor(240, 240, 240);
          doc.rect(
            MARGIN_LEFT,
            y - LINE_HEIGHT + 2,
            CONTENT_WIDTH,
            LINE_HEIGHT,
            'F'
          );
          doc.setFont('courier', 'normal');
          doc.setFontSize(9);
          doc.text(wLine, MARGIN_LEFT + CODE_PADDING, y);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
        } else {
          doc.text(wLine, MARGIN_LEFT, y);
        }
        y += LINE_HEIGHT;
      }
    }

    // Separator between messages
    y += 4;
    if (y + 2 <= maxY) {
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
      y += 6;
    }
  }

  addPageNumber();

  const blob = doc.output('blob');
  saveAs(blob, `${options.fileName || conversation.title || 'chat'}.pdf`);
}
