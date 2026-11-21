import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import type { Conversation, ExportOptions } from '../parser/types';
import { buildPaginatedDom, getPageDimensions, PAGE_STYLES } from '../renderer/pageRenderer';
import { downloadBlob } from './downloadHelper';

export async function buildPdfBlob(
  conversation: Conversation,
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const orientation = options.pageOrientation || 'portrait';
  const format = options.pageSize || 'a4';
  const dims = getPageDimensions(options.pageSize, options.pageOrientation);

  if (typeof document === 'undefined') {
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress: true,
    });
    doc.text(options.fileName || conversation.title || 'Chat', 15, 15);
    return doc.output('blob');
  }

  const pages = buildPaginatedDom(conversation, options);

  if (pages.length === 0) {
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress: true,
    });
    doc.text('No messages to export.', 20, 20);
    return doc.output('blob');
  }

  // Staging container visible offscreen
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = `${dims.widthPx}px`;
  container.style.background = '#ffffff';

  const styleEl = document.createElement('style');
  styleEl.textContent = PAGE_STYLES;
  container.appendChild(styleEl);

  pages.forEach((p) => container.appendChild(p));
  document.body.appendChild(container);

  try {
    // Settle rendering
    await new Promise((resolve) => setTimeout(resolve, 200));

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress: true,
    });

    for (let i = 0; i < pages.length; i++) {
      if (onProgress) {
        onProgress(i + 1, pages.length);
      }

      const pageEl = pages[i];
      // Render one page at a time with skipFonts to avoid CORS on external fonts
      const imgDataUrl = await toPng(pageEl, {
        quality: 0.95,
        pixelRatio: 1.5,
        skipFonts: true,
        cacheBust: false,
      });

      if (i > 0) {
        pdf.addPage(format, orientation);
      }

      pdf.addImage(imgDataUrl, 'PNG', 0, 0, dims.widthMm, dims.heightMm, undefined, 'FAST');
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportPdf(
  conversation: Conversation,
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const blob = await buildPdfBlob(conversation, options, onProgress);
  await downloadBlob(blob, `${options.fileName || conversation.title || 'chat'}.pdf`);
}
