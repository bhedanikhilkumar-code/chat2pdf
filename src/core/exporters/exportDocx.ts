import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
import type { Conversation, ExportOptions } from '../parser/types';
import { filterMessages } from '../parser/filters';

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; emoji: string }
> = {
  user: { label: 'User', color: '1967D2', emoji: '👤' },
  assistant: { label: 'Assistant', color: '137333', emoji: '🤖' },
  system: { label: 'System', color: '666666', emoji: '⚙' },
};

function buildContentParagraphs(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: 'Consolas',
              size: 18, // 9pt
              color: '333333',
            }),
          ],
          spacing: { before: 40, after: 40 },
          shading: { type: 'clear' as unknown as undefined, color: 'auto', fill: 'F0F0F0' } as unknown as undefined,
          indent: { left: 360 },
        })
      );
    } else if (line.trim() === '') {
      paragraphs.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
    } else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: 'Calibri',
              size: 22, // 11pt
              color: '333333',
            }),
          ],
          spacing: { before: 60, after: 60 },
        })
      );
    }
  }

  return paragraphs;
}

export async function exportDocx(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const messages = filterMessages(conversation.messages, options.filterMode);

  const sections: Paragraph[] = [];

  // Title
  if (options.includeTitle !== false && conversation.title) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: conversation.title,
            bold: true,
            font: 'Calibri',
            size: 36, // 18pt
            color: '1A1A1A',
          }),
        ],
        heading: HeadingLevel.TITLE,
        spacing: { after: 120 },
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Source: ${conversation.source} | Exported: ${conversation.exportedAt}`,
            font: 'Calibri',
            size: 18, // 9pt
            color: '888888',
            italics: true,
          }),
        ],
        spacing: { after: 300 },
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
            color: '999999',
            italics: true,
          }),
        ],
      })
    );
  }

  for (const msg of messages) {
    const config = ROLE_CONFIG[msg.role] || ROLE_CONFIG.system;

    // Role heading
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${config.emoji} ${config.label}`,
            bold: true,
            font: 'Calibri',
            size: 26, // 13pt
            color: config.color,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
      })
    );

    // Message content
    sections.push(...buildContentParagraphs(msg.content));

    // Separator
    sections.push(
      new Paragraph({
        spacing: { before: 160, after: 160 },
        border: {
          bottom: {
            color: 'DDDDDD',
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
              top: 1440,  // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: sections,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${options.fileName || conversation.title || 'chat'}.docx`);
}
