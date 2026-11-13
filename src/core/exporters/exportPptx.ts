import PptxGenJS from 'pptxgenjs';
import { saveAs } from 'file-saver';
import type { Conversation, ExportOptions } from '../parser/types';
import { filterMessages } from '../parser/filters';

const COLORS = {
  titleBg: '1a1a2e',
  titleText: 'ffffff',
  userBg: 'e8f0fe',
  userLabel: '1967d2',
  assistantBg: 'f0f4f0',
  assistantLabel: '137333',
  systemBg: 'f5f5f5',
  systemLabel: '666666',
  bodyText: '333333',
};

export async function exportPptx(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const messages = filterMessages(conversation.messages, options.filterMode);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: COLORS.titleBg };
  titleSlide.addText(conversation.title || 'Chat Export', {
    x: 0.8,
    y: 1.5,
    w: '85%',
    h: 1.5,
    fontSize: 36,
    bold: true,
    color: COLORS.titleText,
    fontFace: 'Arial',
  });
  titleSlide.addText(
    `Source: ${conversation.source} | ${conversation.exportedAt}`,
    {
      x: 0.8,
      y: 3.2,
      w: '85%',
      fontSize: 14,
      color: '999999',
      fontFace: 'Arial',
    }
  );
  titleSlide.addText(`${messages.length} messages`, {
    x: 0.8,
    y: 3.8,
    w: '85%',
    fontSize: 12,
    color: '777777',
    fontFace: 'Arial',
  });

  if (messages.length === 0) {
    const emptySlide = pptx.addSlide();
    emptySlide.addText('No messages to export.', {
      x: 1,
      y: 2,
      w: '80%',
      fontSize: 20,
      color: '999999',
      fontFace: 'Arial',
      align: 'center',
    });
  }

  // Pair messages as Q&A
  let i = 0;
  let slideNum = 1;
  while (i < messages.length) {
    const userMsg = messages[i];
    const assistantMsg =
      i + 1 < messages.length && messages[i + 1].role === 'assistant'
        ? messages[i + 1]
        : null;

    const slide = pptx.addSlide();

    // Slide number
    slide.addText(`${slideNum}`, {
      x: 12.2,
      y: 6.8,
      w: 0.8,
      fontSize: 10,
      color: 'bbbbbb',
      fontFace: 'Arial',
      align: 'right',
    });

    const isQA = userMsg.role === 'user' && assistantMsg;

    if (isQA) {
      // User question - top section
      slide.addText('Question', {
        x: 0.5,
        y: 0.3,
        w: 2,
        fontSize: 12,
        bold: true,
        color: COLORS.userLabel,
        fontFace: 'Arial',
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: 0.6,
        w: 12,
        h: 2.2,
        fill: { color: COLORS.userBg },
        rectRadius: 0.1,
      });
      slide.addText(truncateText(userMsg.content, 600), {
        x: 0.7,
        y: 0.7,
        w: 11.6,
        h: 2,
        fontSize: 13,
        color: COLORS.bodyText,
        fontFace: 'Arial',
        valign: 'top',
        wrap: true,
      });

      // Assistant answer - bottom section
      slide.addText('Answer', {
        x: 0.5,
        y: 3.1,
        w: 2,
        fontSize: 12,
        bold: true,
        color: COLORS.assistantLabel,
        fontFace: 'Arial',
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: 3.4,
        w: 12,
        h: 3.2,
        fill: { color: COLORS.assistantBg },
        rectRadius: 0.1,
      });
      slide.addText(truncateText(assistantMsg.content, 1200), {
        x: 0.7,
        y: 3.5,
        w: 11.6,
        h: 3,
        fontSize: 12,
        color: COLORS.bodyText,
        fontFace: 'Arial',
        valign: 'top',
        wrap: true,
      });

      i += 2;
    } else {
      // Single message (not a Q&A pair)
      const bgColor =
        userMsg.role === 'user'
          ? COLORS.userBg
          : userMsg.role === 'assistant'
            ? COLORS.assistantBg
            : COLORS.systemBg;
      const labelColor =
        userMsg.role === 'user'
          ? COLORS.userLabel
          : userMsg.role === 'assistant'
            ? COLORS.assistantLabel
            : COLORS.systemLabel;

      slide.addText(capitalize(userMsg.role), {
        x: 0.5,
        y: 0.3,
        w: 3,
        fontSize: 14,
        bold: true,
        color: labelColor,
        fontFace: 'Arial',
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: 0.7,
        w: 12,
        h: 5.6,
        fill: { color: bgColor },
        rectRadius: 0.1,
      });
      slide.addText(truncateText(userMsg.content, 1800), {
        x: 0.7,
        y: 0.8,
        w: 11.6,
        h: 5.4,
        fontSize: 13,
        color: COLORS.bodyText,
        fontFace: 'Arial',
        valign: 'top',
        wrap: true,
      });

      i += 1;
    }

    slideNum++;
  }

  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  saveAs(blob, `${options.fileName || conversation.title || 'chat'}.pptx`);
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen).trim() + '…';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
