import jsPDF from 'jspdf';
import type {
  Conversation,
  ExportOptions,
  HandwritingOptions,
  PaperType,
} from '../parser/types';
import { filterMessages } from '../parser/filters';
import { WATERMARK_TEXT } from '../branding';
import { downloadBlob } from './downloadHelper';

const PAGE_W = 794;
const PAGE_H = 1123;
const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 60;
const MARGIN_TOP = 70;
const MARGIN_BOTTOM = 70;
const CONTENT_WIDTH = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;

const RULED_SPACING = 30;
const GRAPH_CELL = 20;

function drawPaperBackground(
  ctx: CanvasRenderingContext2D,
  paperType: PaperType
): void {
  ctx.fillStyle = '#fffef9';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  if (paperType === 'ruled') {
    ctx.strokeStyle = '#e8b4b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(MARGIN_LEFT - 10, 0);
    ctx.lineTo(MARGIN_LEFT - 10, PAGE_H);
    ctx.stroke();

    ctx.strokeStyle = '#c8d8e8';
    ctx.lineWidth = 0.5;
    for (let y = MARGIN_TOP; y < PAGE_H - MARGIN_BOTTOM; y += RULED_SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(PAGE_W, y);
      ctx.stroke();
    }
  } else if (paperType === 'graph') {
    ctx.strokeStyle = '#d0d8e0';
    ctx.lineWidth = 0.3;
    for (let x = 0; x < PAGE_W; x += GRAPH_CELL) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PAGE_H);
      ctx.stroke();
    }
    for (let y = 0; y < PAGE_H; y += GRAPH_CELL) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(PAGE_W, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#b0b8c0';
    ctx.lineWidth = 0.6;
    for (let x = 0; x < PAGE_W; x += GRAPH_CELL * 5) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PAGE_H);
      ctx.stroke();
    }
    for (let y = 0; y < PAGE_H; y += GRAPH_CELL * 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(PAGE_W, y);
      ctx.stroke();
    }
  }
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function wrapTextCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const result: string[] = [];
  const rawParagraphs = text.split('\n');

  for (const para of rawParagraphs) {
    if (!para.trim()) {
      result.push('');
      continue;
    }

    const words = para.split(/\s+/);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      if (ctx.measureText(word).width > maxWidth) {
        if (currentLine) {
          result.push(currentLine);
          currentLine = '';
        }

        let partial = '';
        for (const char of word) {
          if (ctx.measureText(partial + char).width > maxWidth) {
            result.push(partial);
            partial = char;
          } else {
            partial += char;
          }
        }
        currentLine = partial;
        continue;
      }

      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) result.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      result.push(currentLine);
    }
  }

  return result;
}

function drawWatermark(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';
  ctx.fillText(WATERMARK_TEXT, PAGE_W - 30, PAGE_H - 25);
  ctx.restore();
}

export async function exportHandwriting(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const hw: HandwritingOptions = {
    font: 'Caveat',
    fontSize: 19,
    lineSpacing: 1.4,
    inkColor: '#1a237e',
    paperType: 'ruled',
    jitter: true,
    exportAs: 'pdf',
    ...options.handwriting,
  };

  const messages = filterMessages(conversation.messages, options.filterMode);

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d')!;
  measureCtx.font = `${hw.fontSize}px "${hw.font}", "Kalam", cursive, sans-serif`;

  const lineHeight = hw.fontSize * (hw.lineSpacing || 1.35);
  const maxContentY = PAGE_H - MARGIN_BOTTOM - 20;

  const allSegments: { text: string; isLabel: boolean }[] = [];

  if (options.includeTitle !== false && conversation.title) {
    allSegments.push({ text: conversation.title, isLabel: true });
    allSegments.push({ text: '', isLabel: false });
  }

  if (messages.length === 0) {
    allSegments.push({ text: 'No messages to export.', isLabel: false });
  }

  for (const msg of messages) {
    const label =
      msg.role === 'user'
        ? '— User —'
        : msg.role === 'assistant'
          ? '— Assistant —'
          : '— System —';
    allSegments.push({ text: label, isLabel: true });

    const wrappedLines = wrapTextCanvas(measureCtx, msg.content, CONTENT_WIDTH);
    for (const wl of wrappedLines) {
      allSegments.push({ text: wl, isLabel: false });
    }
    allSegments.push({ text: '', isLabel: false });
  }

  const pageCanvases: HTMLCanvasElement[] = [];
  let segIdx = 0;
  const rng = seededRandom(42);

  while (segIdx < allSegments.length) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d')!;

    drawPaperBackground(ctx, hw.paperType);

    let y = MARGIN_TOP + lineHeight;

    while (segIdx < allSegments.length) {
      const seg = allSegments[segIdx];

      if (y + lineHeight > maxContentY) {
        break;
      }

      if (seg.text === '') {
        y += lineHeight * 0.5;
        segIdx++;
        continue;
      }

      if (seg.isLabel) {
        ctx.save();
        ctx.font = `bold ${hw.fontSize * 1.1}px "${hw.font}", "Kalam", cursive, sans-serif`;
        ctx.fillStyle = hw.inkColor;
        ctx.globalAlpha = 0.9;
        ctx.fillText(seg.text, MARGIN_LEFT, y);
        ctx.restore();
        y += lineHeight * 1.2;
      } else {
        const xOffset = hw.jitter ? (rng() - 0.5) * 2 : 0;
        const yOffset = hw.jitter ? (rng() - 0.5) * 1.5 : 0;
        const rot = hw.jitter ? (rng() - 0.5) * 0.008 : 0;

        ctx.save();
        ctx.translate(MARGIN_LEFT + xOffset, y + yOffset);
        if (rot !== 0) ctx.rotate(rot);

        ctx.font = `${hw.fontSize}px "${hw.font}", "Kalam", cursive, sans-serif`;
        ctx.fillStyle = hw.inkColor;
        ctx.globalAlpha = 0.92;
        ctx.fillText(seg.text, 0, 0);
        ctx.restore();

        y += lineHeight;
      }

      segIdx++;
    }

    drawWatermark(ctx);
    pageCanvases.push(canvas);
  }

  if (pageCanvases.length === 0) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d')!;
    drawPaperBackground(ctx, hw.paperType);
    drawWatermark(ctx);
    pageCanvases.push(canvas);
  }

  const fileName = options.fileName || conversation.title || 'chat-handwriting';

  if (hw.exportAs === 'pdf') {
    const doc = new jsPDF({
      unit: 'px',
      format: [PAGE_W, PAGE_H],
      hotfixes: ['px_scaling'],
    });

    for (let i = 0; i < pageCanvases.length; i++) {
      if (i > 0) doc.addPage([PAGE_W, PAGE_H]);
      const imgData = pageCanvases[i].toDataURL('image/jpeg', 0.95);
      doc.addImage(imgData, 'JPEG', 0, 0, PAGE_W, PAGE_H);
    }

    const blob = doc.output('blob');
    await downloadBlob(blob, `${fileName}.pdf`);
  } else {
    // If multiple pages and user chose JPG, package into zip, else single image
    if (pageCanvases.length > 1) {
      const files: Array<{ name: string; blob: Blob }> = [];
      for (let i = 0; i < pageCanvases.length; i++) {
        const b = await new Promise<Blob | null>((res) =>
          pageCanvases[i].toBlob(res, 'image/jpeg', 0.92)
        );
        if (b) {
          files.push({ name: `${fileName}_page_${i + 1}.jpg`, blob: b });
        }
      }
      const { downloadFilesAsZip } = await import('./downloadHelper');
      await downloadFilesAsZip(files, `${fileName}_pages.zip`);
    } else {
      const canvas = pageCanvases[0];
      await new Promise<void>((resolve) => {
        canvas.toBlob(
          async (blob) => {
            if (blob) {
              await downloadBlob(blob, `${fileName}.jpg`);
            }
            resolve();
          },
          'image/jpeg',
          0.92
        );
      });
    }
  }
}
