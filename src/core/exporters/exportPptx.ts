import PptxGenJS from 'pptxgenjs';
import type { Conversation, ExportOptions } from '../parser/types';
import { filterMessages } from '../parser/filters';
import { WATERMARK_TEXT } from '../branding';
import { downloadBlob } from './downloadHelper';

const COLORS = {
  titleBg: '0f172a',
  titleText: 'ffffff',
  userBg: 'f0fdf4',
  userLabel: '15803d',
  assistantBg: 'f8fafc',
  assistantLabel: '0369a1',
  systemBg: 'f1f5f9',
  systemLabel: '475569',
  bodyText: '1e293b',
  watermark: '94a3b8',
};

function splitTextIntoChunks(text: string, maxLen = 700): string[] {
  if (text.length <= maxLen) return [text];
  const paragraphs = text.split('\n\n');
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

export async function exportPptx(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const messages = filterMessages(conversation.messages, options.filterMode);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  // Define master slide layout with bottom-right watermark
  pptx.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: { color: 'ffffff' },
    objects: [
      {
        text: {
          text: WATERMARK_TEXT,
          options: {
            x: 9.5,
            y: 7.05,
            w: 3.5,
            h: 0.35,
            fontSize: 9,
            color: COLORS.watermark,
            align: 'right',
            fontFace: 'Arial',
          },
        },
      },
    ],
  });

  // Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: COLORS.titleBg };
  titleSlide.addText(conversation.title || 'Chat Export', {
    x: 1.0,
    y: 1.8,
    w: 11.3,
    h: 1.5,
    fontSize: 34,
    bold: true,
    color: COLORS.titleText,
    fontFace: 'Arial',
  });
  titleSlide.addText(
    `Source: ${conversation.source}  |  Exported: ${new Date(conversation.exportedAt).toLocaleDateString()}`,
    {
      x: 1.0,
      y: 3.4,
      w: 11.3,
      fontSize: 14,
      color: '94a3b8',
      fontFace: 'Arial',
    }
  );
  titleSlide.addText(`${messages.length} messages`, {
    x: 1.0,
    y: 4.0,
    w: 11.3,
    fontSize: 12,
    color: '64748b',
    fontFace: 'Arial',
  });
  // Watermark on title slide
  titleSlide.addText(WATERMARK_TEXT, {
    x: 9.5,
    y: 7.05,
    w: 3.5,
    h: 0.35,
    fontSize: 9,
    color: '64748b',
    align: 'right',
    fontFace: 'Arial',
  });

  if (messages.length === 0) {
    const emptySlide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    emptySlide.addText('No messages to export.', {
      x: 1,
      y: 3,
      w: 11.3,
      fontSize: 18,
      color: '94a3b8',
      align: 'center',
    });
  }

  let slideNum = 1;
  let i = 0;

  while (i < messages.length) {
    const userMsg = messages[i];
    const assistantMsg =
      i + 1 < messages.length && messages[i + 1].role === 'assistant'
        ? messages[i + 1]
        : null;

    if (userMsg.role === 'user' && assistantMsg) {
      const answerChunks = splitTextIntoChunks(assistantMsg.content, 900);

      answerChunks.forEach((chunk, chunkIdx) => {
        const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });

        slide.addText(`Slide ${slideNum}`, {
          x: 0.8,
          y: 7.05,
          w: 2,
          h: 0.35,
          fontSize: 9,
          color: COLORS.watermark,
          fontFace: 'Arial',
        });

        const qTitle = chunkIdx === 0 ? 'Question' : 'Question (cont.)';
        slide.addText(qTitle, {
          x: 0.8,
          y: 0.4,
          w: 4,
          h: 0.3,
          fontSize: 12,
          bold: true,
          color: COLORS.userLabel,
          fontFace: 'Arial',
        });
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: 0.75,
          w: 11.7,
          h: 1.6,
          fill: { color: COLORS.userBg },
          line: { color: 'bbf7d0', width: 1 },
          rectRadius: 0.08,
        });
        const userText = userMsg.attachments && userMsg.attachments.length > 0
          ? `${userMsg.content}\n[📎 ${userMsg.attachments.map((a) => a.name).join(', ')}]`
          : userMsg.content;

        slide.addText(userText.substring(0, 450), {
          x: 1.0,
          y: 0.85,
          w: 11.3,
          h: 1.4,
          fontSize: 11.5,
          color: COLORS.bodyText,
          fontFace: 'Arial',
          valign: 'top',
          wrap: true,
        });

        const aTitle = chunkIdx === 0 ? 'Answer' : `Answer (cont. ${chunkIdx + 1}/${answerChunks.length})`;
        slide.addText(aTitle, {
          x: 0.8,
          y: 2.55,
          w: 5,
          h: 0.3,
          fontSize: 12,
          bold: true,
          color: COLORS.assistantLabel,
          fontFace: 'Arial',
        });
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: 2.9,
          w: 11.7,
          h: 3.9,
          fill: { color: COLORS.assistantBg },
          line: { color: 'bae6fd', width: 1 },
          rectRadius: 0.08,
        });

        const hasCode = chunk.includes('```');
        slide.addText(chunk, {
          x: 1.0,
          y: 3.05,
          w: 11.3,
          h: 3.6,
          fontSize: hasCode ? 10.5 : 11.5,
          color: COLORS.bodyText,
          fontFace: hasCode ? 'Courier New' : 'Arial',
          valign: 'top',
          wrap: true,
        });

        slideNum++;
      });

      i += 2;
    } else {
      const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
      const isUser = userMsg.role === 'user';
      const labelColor = isUser ? COLORS.userLabel : COLORS.assistantLabel;
      const bgColor = isUser ? COLORS.userBg : COLORS.assistantBg;
      const borderColor = isUser ? 'bbf7d0' : 'bae6fd';

      slide.addText(`Slide ${slideNum}`, {
        x: 0.8,
        y: 7.05,
        w: 2,
        h: 0.35,
        fontSize: 9,
        color: COLORS.watermark,
        fontFace: 'Arial',
      });

      slide.addText(isUser ? 'User' : 'Assistant', {
        x: 0.8,
        y: 0.4,
        w: 3,
        h: 0.3,
        fontSize: 13,
        bold: true,
        color: labelColor,
        fontFace: 'Arial',
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8,
        y: 0.8,
        w: 11.7,
        h: 5.9,
        fill: { color: bgColor },
        line: { color: borderColor, width: 1 },
        rectRadius: 0.08,
      });

      slide.addText(userMsg.content.substring(0, 1600), {
        x: 1.0,
        y: 1.0,
        w: 11.3,
        h: 5.5,
        fontSize: 12,
        color: COLORS.bodyText,
        fontFace: 'Arial',
        valign: 'top',
        wrap: true,
      });

      slideNum++;
      i += 1;
    }
  }

  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  await downloadBlob(blob, `${options.fileName || conversation.title || 'chat'}.pptx`);
}
