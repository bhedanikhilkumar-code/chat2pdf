import JSZip from 'jszip';
import type { Conversation, ExportOptions } from '../parser/types';
import { buildMarkdownContent } from './exportMarkdown';
import { buildJsonContent } from './exportJson';
import { buildTxtContent } from './exportTxt';
import { buildCsvContent } from './exportCsv';
import { buildHtmlContent } from './exportHtml';
import { buildDocxBlob } from './exportDocx';
import { buildPptxBlob } from './exportPptx';
import { buildPdfBlob } from './exportPdf';
import { downloadBlob } from './downloadHelper';

export async function exportBundleZip(
  conversation: Conversation,
  options: ExportOptions,
  onProgress?: (status: string) => void
): Promise<void> {
  const baseName = options.fileName || conversation.title || 'chat';
  const zip = new JSZip();

  onProgress?.('Generating Markdown...');
  const md = buildMarkdownContent(conversation, options);
  zip.file(`${baseName}.md`, md);

  onProgress?.('Generating JSON data...');
  const json = buildJsonContent(conversation, options);
  zip.file(`${baseName}.json`, json);

  onProgress?.('Generating Plain Text...');
  const txt = buildTxtContent(conversation, options);
  zip.file(`${baseName}.txt`, txt);

  onProgress?.('Generating CSV table...');
  const csv = buildCsvContent(conversation, options);
  zip.file(`${baseName}.csv`, csv);

  onProgress?.('Generating HTML webpage...');
  const html = buildHtmlContent(conversation, options);
  zip.file(`${baseName}.html`, html);

  onProgress?.('Generating Word document (.docx)...');
  const docxBlob = await buildDocxBlob(conversation, options);
  zip.file(`${baseName}.docx`, docxBlob);

  onProgress?.('Generating PowerPoint slides (.pptx)...');
  const pptxBlob = await buildPptxBlob(conversation, options);
  zip.file(`${baseName}.pptx`, pptxBlob);

  onProgress?.('Generating PDF document...');
  const pdfBlob = await buildPdfBlob(conversation, options);
  zip.file(`${baseName}.pdf`, pdfBlob);

  onProgress?.('Compressing ZIP bundle...');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  await downloadBlob(zipBlob, `${baseName}-bundle.zip`);
}
