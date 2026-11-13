import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import type {
  Conversation,
  ExportOptions,
  HandwritingOptions,
  PaperType,
} from '../parser/types';
import { filterMessages } from '../parser/filters';

// A4 at 96 DPI
const PAGE_W = 794;
const PAGE_H = 1123;
const MARGIN_LEFT = 80;
const MARGIN_RIGHT = 60;
const MARGIN_TOP = 80;
const MARGIN_BOTTOM = 80;
const CONTENT_WIDTH = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;

// Ruled line spacing
const RULED_SPACING = 32;
// Graph paper cell size
const GRAPH_CELL = 20;

function drawPaperBackground(
  ctx: CanvasRenderingContext2D,
  paperType: PaperType
): void {
  // White background
  ctx.fillStyle = '#fffef8';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  if (paperType === 'ruled') {
    // Red margin line
    ctx.strokeStyle = '#e8b4b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(MARGIN_LEFT - 10, 0);
    ctx.lineTo(MARGIN_LEFT - 10, PAGE_H);
    ctx.stroke();

    // Blue horizontal lines
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
    // Darker lines every 5 cells
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
  // blank = just the white/cream bg, no lines
}

// Simple seeded PRNG for reproducible variations
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function wrapTextManual(
  text: string,
  maxWidth: number,
  charWidth: number
): string[] {
  const charsPerLine = Math.floor(maxWidth / charWidth);
  if (charsPerLine <= 0) return [text];

  const result: string[] = [];
  const rawLines = text.split('\n');

  for (const rawLine of rawLines) {
    if (rawLine.length === 0) {
      result.push('');
      continue;
    }
    const words = rawLine.split(' ');
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length === 0) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= charsPerLine) {
        currentLine += ' ' + word;
      } else {
        result.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine.length > 0) {
      result.push(currentLine);
    }
  }

  return result;
}

function renderHandwrittenText(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  startY: number,
  opts: HandwritingOptions
): number {
  const lineHeight = opts.fontSize * 1.6;
  const charWidth = opts.fontSize * 0.55;
  const rand = seededRandom(42);
  let y = startY;

  for (const line of lines) {
    if (y + lineHeight > PAGE_H - MARGIN_BOTTOM) {
      return -1; // Signal page break needed
    }

    let x = MARGIN_LEFT;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];

      // Small random variations for realism
      const slant = (rand() - 0.5) * 1.2; // slight rotation
      const yJitter = (rand() - 0.5) * 1.5;
      const xJitter = (rand() - 0.5) * 0.8;
      const sizeVariation = 1 + (rand() - 0.5) * 0.06;

      // Ink variation: slight opacity changes
      const alpha = 0.8 + rand() * 0.2;

      ctx.save();
      ctx.translate(x + xJitter, y + yJitter);
      ctx.rotate((slant * Math.PI) / 180);
      ctx.globalAlpha = alpha;
      ctx.font = `${opts.fontSize * sizeVariation}px "${opts.font}"`;
      ctx.fillStyle = opts.inkColor;
      ctx.fillText(char, 0, 0);
      ctx.restore();

      x += charWidth + (rand() - 0.5) * 1.5;
    }

    y += lineHeight;
  }

  return y;
}

export async function exportHandwriting(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const messages = filterMessages(conversation.messages, options.filterMode);
  const hw = options.handwriting || {
    font: 'Caveat',
    inkColor: '#1a237e',
    paperType: 'ruled' as PaperType,
    fontSize: 18,
    exportAs: 'pdf' as const,
  };

  // Ensure font is loaded
  try {
    await document.fonts.load(`${hw.fontSize}px "${hw.font}"`);
  } catch {
    // Font may already be loaded or unavailable; proceed anyway
  }

  const charWidth = hw.fontSize * 0.55;
  const lineHeight = hw.fontSize * 1.6;
  const maxContentY = PAGE_H - MARGIN_BOTTOM;

  // Prepare all text lines
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

    const wrappedLines = wrapTextManual(msg.content, CONTENT_WIDTH, charWidth);
    for (const wl of wrappedLines) {
      allSegments.push({ text: wl, isLabel: false });
    }
    allSegments.push({ text: '', isLabel: false }); // blank line between messages
  }

  // Render pages
  const pageCanvases: HTMLCanvasElement[] = [];
  let segIdx = 0;

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
        break; // next page
      }

      if (seg.text === '') {
        y += lineHeight * 0.5;
        segIdx++;
        continue;
      }

      if (seg.isLabel) {
        // Draw label slightly bolder
        ctx.save();
        ctx.font = `bold ${hw.fontSize * 1.1}px "${hw.font}"`;
        ctx.fillStyle = hw.inkColor;
        ctx.globalAlpha = 0.9;
        ctx.fillText(seg.text, MARGIN_LEFT, y);
        ctx.restore();
        y += lineHeight * 1.2;
      } else {
        const result = renderHandwrittenText(ctx, [seg.text], y, hw);
        if (result === -1) {
          break; // page break
        }
        y = result;
      }

      segIdx++;
    }

    pageCanvases.push(canvas);
  }

  // If no content was generated, create one blank page
  if (pageCanvases.length === 0) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d')!;
    drawPaperBackground(ctx, hw.paperType);
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
    saveAs(blob, `${fileName}.pdf`);
  } else {
    // JPG export: if single page, save as one image; if multi, save first page
    // (could be extended to zip multiple pages)
    const canvas = pageCanvases[0];
    canvas.toBlob(
      (blob) => {
        if (blob) {
          saveAs(blob, `${fileName}.jpg`);
        }
      },
      'image/jpeg',
      0.92
    );
  }
}
