import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import type { Conversation, ExportOptions } from '../parser/types';
import { buildPaginatedDom, PAGE_STYLES } from '../renderer/pageRenderer';

export async function exportPdf(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  // Build clean fixed-size A4 DOM pages with fonts, watermarks, and markdown formatting
  const pages = buildPaginatedDom(conversation, options);

  if (pages.length === 0) {
    const doc = new jsPDF();
    doc.text('No messages to export.', 20, 20);
    saveAs(doc.output('blob'), `${options.fileName || conversation.title || 'chat'}.pdf`);
    return;
  }

  // Temporary staging container
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
    // Wait for fonts & twemoji images to load
    await new Promise((resolve) => setTimeout(resolve, 500));

    // A4 in mm: 210 x 297
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];
      const imgDataUrl = await toPng(pageEl, {
        quality: 0.98,
        pixelRatio: 2, // 2x DPI for crisp high-resolution text and emojis
        cacheBust: true,
      });

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgDataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const blob = pdf.output('blob');
    saveAs(blob, `${options.fileName || conversation.title || 'chat'}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
