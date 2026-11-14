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
import { resolveTheme } from '../theme/resolveTheme';

const ROLE_CONFIG: Record<
  string,
  { label: string; lightColor: string; darkColor: string; emoji: string }
> = {
  user: { label: 'User', lightColor: '15803D', darkColor: '34D399', emoji: '👤' },
  assistant: { label: 'Assistant', lightColor: '0369A1', darkColor: '38BDF8', emoji: '🤖' },
  system: { label: 'System', lightColor: '475569', darkColor: 'A1A1AA', emoji: '⚙' },
};

function parseMarkdownTable(tableLines: string[], isDark: boolean, textColor: string): Table | null {
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
                  color: textColor,
                }),
              ],
            }),
          ],
          shading: isHeader ? { fill: isDark ? '2A2A2A' : 'F1F5F9' } : undefined,
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

function buildContentElements(
  content: string,
  textColor: string,
  codeBg: string,
  isDark: boolean
): (Paragraph | Table)[] {
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
                  color: isDark ? 'F8FAFC' : '1E293B',
                }),
              ],
              spacing: { before: 20, after: 20 },
              shading: { fill: codeBg },
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
      const tbl = parseMarkdownTable(tableLines, isDark, textColor);
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
              color: textColor,
            }),
          ],
          spacing: { before: 40, after: 40 },
          indent,
        })
      );
    }
  }

  if (inTable && tableLines.length > 0) {
    const tbl = parseMarkdownTable(tableLines, isDark, textColor);
    if (tbl) elements.push(tbl);
  }

  return elements;
}

export async function exportDocx(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const messages = filterMessages(conversation.messages, options.filterMode);
  const resolved = resolveTheme(conversation.themeSnapshot, options.pageStyle, conversation.source);
  const isDark = resolved.mode === 'dark';
  const textColor = isDark ? resolved.textColor.replace('#', '') : '1E293B';
  const bgColor = isDark ? resolved.pageBackground.replace('#', '') : 'FFFFFF';
  const mutedColor = isDark ? resolved.mutedText.replace('#', '') : '64748B';
  const codeBg = isDark ? resolved.codeBlockBackground.replace('#', '') : 'F1F5F9';
  const borderColor = isDark ? resolved.borderColor.replace('#', '') : 'E2E8F0';

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
            color: textColor,
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
            color: mutedColor,
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
            color: mutedColor,
            italics: true,
          }),
        ],
      })
    );
  }

  for (const msg of messages) {
    const config = ROLE_CONFIG[msg.role] || ROLE_CONFIG.system;
    const roleColor = isDark ? config.darkColor : config.lightColor;

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${config.emoji} ${config.label}`,
            bold: true,
            font: 'Calibri',
            size: 26,
            color: roleColor,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
      })
    );

    sections.push(...buildContentElements(msg.content, textColor, codeBg, isDark));

    if (msg.attachments && msg.attachments.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '📎 Attachments: ' + msg.attachments.map((a) => a.name + (a.size ? ` (${a.size})` : '')).join(', '),
              font: 'Calibri',
              size: 20,
              color: mutedColor,
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
            color: borderColor,
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      })
    );
  }

  const doc = new Document({
    background: {
      color: bgColor,
    },
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
                    color: mutedColor,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'Calibri',
                    size: 18,
                    color: mutedColor,
                  }),
                  new TextRun({
                    text: `   •   ${WATERMARK_TEXT}`,
                    font: 'Calibri',
                    size: 18,
                    color: mutedColor,
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
