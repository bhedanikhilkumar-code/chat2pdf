import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import type { Conversation, ExportOptions } from '../parser/types';
import { buildPaginatedDom, PAGE_STYLES } from '../renderer/pageRenderer';
import { downloadBlob } from './downloadHelper';

export async function exportPdf(
  conversation: Conversation,
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const pages = buildPaginatedDom(conversation, options);

  if (pages.length === 0) {
    const doc = new jsPDF();
    doc.text('No messages to export.', 20, 20);
    await downloadBlob(doc.output('blob'), `${options.fileName || conversation.title || 'chat'}.pdf`);
    return;
  }

  // Staging container visible offscreen
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = '794px';
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
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
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
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgDataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const blob = pdf.output('blob');
    await downloadBlob(blob, `${options.fileName || conversation.title || 'chat'}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
