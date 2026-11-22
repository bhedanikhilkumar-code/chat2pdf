import { describe, it, expect } from 'vitest';
import type { Conversation } from '../src/core/parser/types';
import { buildJsonContent } from '../src/core/exporters/exportJson';
import { buildHtmlContent } from '../src/core/exporters/exportHtml';
import { buildPdfBlob } from '../src/core/exporters/exportPdf';
import { buildMarkdownContent } from '../src/core/exporters/exportMarkdown';
import { buildCsvContent } from '../src/core/exporters/exportCsv';
import { buildTxtContent } from '../src/core/exporters/exportTxt';
import { getPageDimensions } from '../src/core/renderer/pageRenderer';
import { computeEstimatedSize } from '../src/web/components/ExportStep';

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
    expect(html).toContain('.code-lang-badge');
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

  it('buildMarkdownContent supports YAML frontmatter for Obsidian and Notion', () => {
    const withFrontmatter = buildMarkdownContent(sampleChat, {
      format: 'md',
      filterMode: 'all',
      includeFrontmatter: true,
    });

    expect(withFrontmatter.startsWith('---\n')).toBe(true);
    expect(withFrontmatter).toContain('title: "Advanced Options Verification Chat"');
    expect(withFrontmatter).toContain('source: "chatgpt"');
    expect(withFrontmatter).toContain('message_count: 2');
    expect(withFrontmatter).toContain('## 👤 User');

    const standardHeader = buildMarkdownContent(sampleChat, {
      format: 'md',
      filterMode: 'all',
      includeFrontmatter: false,
    });

    expect(standardHeader.startsWith('---\n')).toBe(false);
    expect(standardHeader).toContain('# Advanced Options Verification Chat');
  });

  it('buildCsvContent supports customizable delimiters (comma, semicolon, tab/TSV)', () => {
    const commaCsv = buildCsvContent(sampleChat, {
      format: 'csv',
      filterMode: 'all',
      csvDelimiter: ',',
    });
    expect(commaCsv.split('\n')[0].trim()).toBe('index,role,message,attachments');

    const semiCsv = buildCsvContent(sampleChat, {
      format: 'csv',
      filterMode: 'all',
      csvDelimiter: ';',
    });
    expect(semiCsv.split('\n')[0].trim()).toBe('index;role;message;attachments');

    const tabCsv = buildCsvContent(sampleChat, {
      format: 'csv',
      filterMode: 'all',
      csvDelimiter: '\t',
    });
    expect(tabCsv.split('\n')[0].trim()).toBe('index\trole\tmessage\tattachments');
  });

  it('buildTxtContent supports detailed headers and clean dialogue script layouts', () => {
    const detailedTxt = buildTxtContent(sampleChat, {
      format: 'txt',
      filterMode: 'all',
      txtStyle: 'detailed',
    });
    expect(detailedTxt).toContain('Title: Advanced Options Verification Chat');
    expect(detailedTxt).toContain('--- User ---');
    expect(detailedTxt).toContain('--- Assistant ---');

    const simpleTxt = buildTxtContent(sampleChat, {
      format: 'txt',
      filterMode: 'all',
      txtStyle: 'simple',
    });
    expect(simpleTxt).not.toContain('Title: Advanced Options Verification Chat');
    expect(simpleTxt).not.toContain('--- User ---');
    expect(simpleTxt).toContain('User:');
    expect(simpleTxt).toContain('Assistant:');
  });

  it('computeEstimatedSize returns realistic KB estimations for formats', () => {
    const pdfSize = computeEstimatedSize('pdf', sampleChat, 'long');
    expect(pdfSize).toMatch(/^~\d+\sKB$/);

    const docxSize = computeEstimatedSize('docx', sampleChat, 'long');
    expect(docxSize).toMatch(/^~\d+\sKB$/);

    const pptxSize = computeEstimatedSize('pptx', sampleChat, 'long');
    expect(pptxSize).toMatch(/^~\d+\sKB$/);

    const mdSize = computeEstimatedSize('md', sampleChat, 'long');
    expect(mdSize).toMatch(/^~\d+\sKB$/);

    const jsonSize = computeEstimatedSize('json', sampleChat, 'long');
    expect(jsonSize).toMatch(/^~\d+\sKB$/);

    const pngSize = computeEstimatedSize('png', sampleChat, 'long');
    expect(pngSize).toMatch(/^~\d+\sKB$/);

    const pngCardsSize = computeEstimatedSize('png', sampleChat, 'card');
    expect(pngCardsSize).toMatch(/^~\d+\sKB$/);
  });

  it('correctly includes message timestamps across Markdown, TXT, and HTML exporters when present', () => {
    const chatWithTimestamps: Conversation = {
      title: 'Timestamped Discussion',
      source: 'claude',
      exportedAt: '2026-11-22T05:00:00.000Z',
      messages: [
        {
          index: 0,
          role: 'user',
          content: 'What is WebAssembly?',
          timestamp: '10:15 AM',
        },
        {
          index: 1,
          role: 'assistant',
          content: 'WebAssembly (Wasm) is a binary instruction format.',
          timestamp: '10:16 AM',
        },
      ],
    };

    const md = buildMarkdownContent(chatWithTimestamps, {
      format: 'md',
      filterMode: 'all',
    });
    expect(md).toContain('## 👤 User *(10:15 AM)*');
    expect(md).toContain('## 🤖 Assistant *(10:16 AM)*');

    const txt = buildTxtContent(chatWithTimestamps, {
      format: 'txt',
      filterMode: 'all',
      txtStyle: 'detailed',
    });
    expect(txt).toContain('--- User (10:15 AM) ---');
    expect(txt).toContain('--- Assistant (10:16 AM) ---');

    const html = buildHtmlContent(chatWithTimestamps, {
      format: 'html',
      filterMode: 'all',
    });
    expect(html).toContain('<div class="user-timestamp">10:15 AM</div>');
    expect(html).toContain('<span class="assistant-timestamp">10:16 AM</span>');
  });
});
