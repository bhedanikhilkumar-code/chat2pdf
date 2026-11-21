import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import type { Conversation } from '../src/core/parser/types';
import { exportBundleZip } from '../src/core/exporters/exportBundleZip';
import * as downloadHelper from '../src/core/exporters/downloadHelper';
import { WATERMARK_TEXT } from '../src/core/branding';

describe('exportBundleZip - All Formats Batch Archive', () => {
  const sampleChat: Conversation = {
    title: 'Archive Verification Chat',
    source: 'claude',
    exportedAt: '2026-11-22T00:00:00.000Z',
    messages: [
      {
        index: 0,
        role: 'user',
        content: 'Hello, please bundle all formats into a zip archive!',
        attachments: [{ name: 'spec.yaml', size: '1.2 KB' }],
      },
      {
        index: 1,
        role: 'assistant',
        content: 'Here is the response with a table and code:\n\n| Item | Value |\n| :--- | :--- |\n| Status | Ready |\n\n```python\nprint("Bundle ready")\n```',
      },
    ],
  };

  it('generates a complete ZIP archive with all 8 core formats and verified contents', async () => {
    let capturedBlob: Blob | null = null;
    let capturedFilename = '';

    const downloadSpy = vi
      .spyOn(downloadHelper, 'downloadBlob')
      .mockImplementation(async (blob: Blob, filename: string) => {
        capturedBlob = blob;
        capturedFilename = filename;
      });

    const progressMessages: string[] = [];
    await exportBundleZip(
      sampleChat,
      {
        format: 'zip',
        filterMode: 'all',
        pageStyle: 'light',
        fileName: 'test-bundle',
      },
      (msg) => progressMessages.push(msg)
    );

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(capturedFilename).toBe('test-bundle-bundle.zip');
    expect(capturedBlob).not.toBeNull();
    expect(progressMessages.length).toBeGreaterThan(0);

    // Unpack ZIP archive with JSZip
    const arrayBuffer = await (capturedBlob as unknown as Blob).arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const expectedFiles = [
      'test-bundle.md',
      'test-bundle.json',
      'test-bundle.txt',
      'test-bundle.csv',
      'test-bundle.html',
      'test-bundle.docx',
      'test-bundle.pptx',
      'test-bundle.pdf',
    ];

    for (const file of expectedFiles) {
      expect(zip.file(file)).not.toBeNull();
    }

    // 1. Markdown validation
    const mdText = await zip.file('test-bundle.md')!.async('string');
    expect(mdText).toContain('# Archive Verification Chat');
    expect(mdText).toContain(WATERMARK_TEXT);

    // 2. JSON validation
    const jsonText = await zip.file('test-bundle.json')!.async('string');
    const parsedJson = JSON.parse(jsonText);
    expect(parsedJson.messages).toBeInstanceOf(Array);
    expect(parsedJson.messages.length).toBe(2);
    expect(parsedJson.watermark).toBe(WATERMARK_TEXT);

    // 3. Plain Text validation
    const txtText = await zip.file('test-bundle.txt')!.async('string');
    expect(txtText).toContain('Title: Archive Verification Chat');
    expect(txtText).toContain(WATERMARK_TEXT);

    // 4. CSV validation
    const csvText = await zip.file('test-bundle.csv')!.async('string');
    expect(csvText).toContain('archive');
    expect(csvText).toContain(WATERMARK_TEXT);

    // 5. HTML validation
    const htmlText = await zip.file('test-bundle.html')!.async('string');
    expect(htmlText).toContain('<!DOCTYPE html>');
    expect(htmlText).toContain('test-bundle');
    expect(htmlText).toContain(WATERMARK_TEXT);

    // 6. DOCX validation
    const docxBuf = await zip.file('test-bundle.docx')!.async('arraybuffer');
    const docxZip = await JSZip.loadAsync(docxBuf);
    expect(docxZip.file('word/document.xml')).not.toBeNull();

    // 7. PPTX validation
    const pptxBuf = await zip.file('test-bundle.pptx')!.async('arraybuffer');
    const pptxZip = await JSZip.loadAsync(pptxBuf);
    expect(pptxZip.file('ppt/presentation.xml')).not.toBeNull();

    // 8. PDF validation
    const pdfBuf = await zip.file('test-bundle.pdf')!.async('uint8array');
    const pdfHeader = String.fromCharCode(...pdfBuf.slice(0, 4));
    expect(pdfHeader).toBe('%PDF');

    downloadSpy.mockRestore();
  });
});
