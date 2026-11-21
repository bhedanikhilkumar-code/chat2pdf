import { describe, it, expect } from 'vitest';
import type { Conversation } from '../src/core/parser/types';
import { buildJsonContent } from '../src/core/exporters/exportJson';
import { buildHtmlContent } from '../src/core/exporters/exportHtml';
import { buildPdfBlob } from '../src/core/exporters/exportPdf';
import { getPageDimensions } from '../src/core/renderer/pageRenderer';

describe('Export Options Enhancements (PDF setup, JSON layouts, HTML code copy)', () => {
  const sampleChat: Conversation = {
    title: 'Advanced Options Verification Chat',
    source: 'chatgpt',
    exportedAt: '2026-11-22T03:30:00.000Z',
    messages: [
      {
        index: 0,
        role: 'user',
        content: 'Write a typescript function to calculate Fibonacci numbers.',
      },
      {
        index: 1,
        role: 'assistant',
        content: 'Here is the TypeScript implementation:\n\n```typescript\nfunction fib(n: number): number {\n  return n <= 1 ? n : fib(n - 1) + fib(n - 2);\n}\n```\n',
      },
    ],
  };

  it('buildJsonContent correctly supports pretty vs compact minified formatting', () => {
    const prettyJson = buildJsonContent(sampleChat, {
      format: 'json',
      filterMode: 'all',
      jsonFormat: 'pretty',
    });

    expect(prettyJson).toContain('\n  "title":');
    expect(prettyJson.split('\n').length).toBeGreaterThan(5);

    const compactJson = buildJsonContent(sampleChat, {
      format: 'json',
      filterMode: 'all',
      jsonFormat: 'compact',
    });

    expect(compactJson).not.toContain('\n  "title":');
    expect(compactJson.split('\n').length).toBe(1);
    expect(JSON.parse(compactJson).title).toBe('Advanced Options Verification Chat');
  });

  it('buildHtmlContent injects code copy button styles and client-side clipboard handler', () => {
    const html = buildHtmlContent(sampleChat, {
      format: 'html',
      filterMode: 'all',
    });

    expect(html).toContain('.code-copy-btn');
    expect(html).toContain('document.querySelectorAll(\'.prose pre\')');
    expect(html).toContain('navigator.clipboard');
    expect(html).toContain('Copied!');
  });

  it('getPageDimensions calculates accurate px and mm values across sizes and orientations', () => {
    const a4Portrait = getPageDimensions('a4', 'portrait');
    expect(a4Portrait.widthPx).toBe(794);
    expect(a4Portrait.heightPx).toBe(1123);
    expect(a4Portrait.widthMm).toBe(210);
    expect(a4Portrait.heightMm).toBe(297);

    const a4Landscape = getPageDimensions('a4', 'landscape');
    expect(a4Landscape.widthPx).toBe(1123);
    expect(a4Landscape.heightPx).toBe(794);
    expect(a4Landscape.widthMm).toBe(297);
    expect(a4Landscape.heightMm).toBe(210);

    const letterPortrait = getPageDimensions('letter', 'portrait');
    expect(letterPortrait.widthPx).toBe(816);
    expect(letterPortrait.heightPx).toBe(1056);
    expect(letterPortrait.widthMm).toBe(215.9);
    expect(letterPortrait.heightMm).toBe(279.4);

    const letterLandscape = getPageDimensions('letter', 'landscape');
    expect(letterLandscape.widthPx).toBe(1056);
    expect(letterLandscape.heightPx).toBe(816);
    expect(letterLandscape.widthMm).toBe(279.4);
    expect(letterLandscape.heightMm).toBe(215.9);
  });

  it('buildPdfBlob generates a valid Blob with custom size and orientation', async () => {
    const blob = await buildPdfBlob(sampleChat, {
      format: 'pdf',
      filterMode: 'all',
      pageSize: 'letter',
      pageOrientation: 'landscape',
    });

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);
  });
});
