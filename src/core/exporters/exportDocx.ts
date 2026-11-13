import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Footer,
  PageNumber,
} from 'docx';
import type { Conversation, ExportOptions } from '../parser/types';
import { filterMessages } from '../parser/filters';
import { WATERMARK_TEXT } from '../branding';
import { downloadBlob } from './downloadHelper';

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; emoji: string }
> = {
  user: { label: 'User', color: '15803D', emoji: '👤' },
  assistant: { label: 'Assistant', color: '0369A1', emoji: '🤖' },
  system: { label: 'System', color: '475569', emoji: '⚙' },
};

function parseMarkdownTable(tableLines: string[]): Table | null {
  if (tableLines.length < 2) return null;

  const rows: TableRow[] = [];

  tableLines.forEach((line, rowIndex) => {
    if (/^[|\s:-]+$/.test(line)) return;

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

    if (cells.length === 0) return;

    const isHeader = rowIndex === 0;

    const rowCells = cells.map(
      (cellText) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cellText,
                  bold: isHeader,
                  font: 'Calibri',
                  size: 20,
                }),
              ],
            }),
          ],
          shading: isHeader ? { fill: 'F1F5F9' } : undefined,
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
        })
    );

    rows.push(new TableRow({ children: rowCells }));
  });

  if (rows.length === 0) return null;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

function buildContentElements(content: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let tableLines: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      } else {
        inCodeBlock = false;
        codeLines.forEach((cLine) => {
          elements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: cLine,
                  font: 'Consolas',
                  size: 19,
                  color: 'F8FAFC',
                }),
              ],
              spacing: { before: 20, after: 20 },
              shading: { fill: '1E293B' },
              indent: { left: 240, right: 240 },
            })
          );
        });
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      tableLines.push(line.trim());
      continue;
    } else if (inTable) {
      inTable = false;
      const tbl = parseMarkdownTable(tableLines);
      if (tbl) elements.push(tbl);
      tableLines = [];
    }

    if (line.trim() === '') {
      elements.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
    } else {
      const isBullet = /^[ \t]*[-*+][ \t]+/.test(line);
      const isNumber = /^[ \t]*\d+\.[ \t]+/.test(line);
      const indent = isBullet || isNumber ? { left: 360 } : undefined;

      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: 'Calibri',
              size: 22,
              color: '1E293B',
            }),
          ],
          spacing: { before: 50, after: 50 },
          indent,
        })
      );
    }
  }

  if (inTable && tableLines.length > 0) {
    const tbl = parseMarkdownTable(tableLines);
    if (tbl) elements.push(tbl);
  }

  return elements;
}

export async function exportDocx(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const messages = filterMessages(conversation.messages, options.filterMode);
  const sections: (Paragraph | Table)[] = [];

  if (options.includeTitle !== false && conversation.title) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: conversation.title,
            bold: true,
            font: 'Calibri',
            size: 38,
            color: '0F172A',
          }),
        ],
        heading: HeadingLevel.TITLE,
        spacing: { after: 100 },
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Source: ${conversation.source}  |  Exported: ${new Date(conversation.exportedAt).toLocaleDateString()}`,
            font: 'Calibri',
            size: 18,
            color: '64748B',
            italics: true,
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  if (messages.length === 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'No messages to export.',
            font: 'Calibri',
            size: 22,
            color: '94A3B8',
            italics: true,
          }),
        ],
      })
    );
  }

  for (const msg of messages) {
    const config = ROLE_CONFIG[msg.role] || ROLE_CONFIG.system;

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${config.emoji} ${config.label}`,
            bold: true,
            font: 'Calibri',
            size: 26,
            color: config.color,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
      })
    );

    sections.push(...buildContentElements(msg.content));

    if (msg.attachments && msg.attachments.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '📎 Attachments: ' + msg.attachments.map((a) => a.name + (a.size ? ` (${a.size})` : '')).join(', '),
              font: 'Calibri',
              size: 20,
              color: '475569',
              bold: true,
            }),
          ],
          spacing: { before: 80, after: 80 },
        })
      );
    }

    sections.push(
      new Paragraph({
        spacing: { before: 140, after: 140 },
        border: {
          bottom: {
            color: 'E2E8F0',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Page ',
                    font: 'Calibri',
                    size: 18,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'Calibri',
                    size: 18,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    text: `   •   ${WATERMARK_TEXT}`,
                    font: 'Calibri',
                    size: 18,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        children: sections,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  await downloadBlob(blob, `${options.fileName || conversation.title || 'chat'}.docx`);
}
