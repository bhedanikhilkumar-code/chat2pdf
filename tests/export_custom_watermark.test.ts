import { describe, it, expect } from 'vitest';
import type { Conversation } from '../src/core/parser/types';
import { buildMarkdownContent } from '../src/core/exporters/exportMarkdown';
import { buildJsonContent } from '../src/core/exporters/exportJson';
import { buildTxtContent } from '../src/core/exporters/exportTxt';
import { buildCsvContent } from '../src/core/exporters/exportCsv';
import { buildHtmlContent } from '../src/core/exporters/exportHtml';
import { WATERMARK_TEXT } from '../src/core/branding';

describe('Custom Watermark & Branding Export Controls', () => {
  const sampleChat: Conversation = {
    title: 'Custom Branding Test',
    source: 'claude',
    exportedAt: '2026-11-22T00:00:00.000Z',
    messages: [
      {
        index: 0,
        role: 'user',
        content: 'Is this document confidential?',
      },
      {
        index: 1,
        role: 'assistant',
        content: 'Yes, this document contains internal analysis.',
      },
    ],
  };

  it('uses default watermark when watermarkText is undefined', () => {
    const md = buildMarkdownContent(sampleChat, { format: 'md', filterMode: 'all' });
    expect(md).toContain(`*${WATERMARK_TEXT}*`);

    const json = JSON.parse(buildJsonContent(sampleChat, { format: 'json', filterMode: 'all' }));
    expect(json.watermark).toBe(WATERMARK_TEXT);

    const txt = buildTxtContent(sampleChat, { format: 'txt', filterMode: 'all' });
    expect(txt).toContain(WATERMARK_TEXT);

    const csv = buildCsvContent(sampleChat, { format: 'csv', filterMode: 'all' });
    expect(csv).toContain(WATERMARK_TEXT);

    const html = buildHtmlContent(sampleChat, { format: 'html', filterMode: 'all' });
    expect(html).toContain(WATERMARK_TEXT);
  });

  it('renders custom watermark text when user provides custom branding string', () => {
    const customWatermark = 'CONFIDENTIAL • INTERNAL ACME CORP';
    const opts = { format: 'md' as const, filterMode: 'all' as const, watermarkText: customWatermark };

    const md = buildMarkdownContent(sampleChat, opts);
    expect(md).toContain(`*${customWatermark}*`);
    expect(md).not.toContain(WATERMARK_TEXT);

    const json = JSON.parse(buildJsonContent(sampleChat, { ...opts, format: 'json' }));
    expect(json.watermark).toBe(customWatermark);

    const txt = buildTxtContent(sampleChat, { ...opts, format: 'txt' });
    expect(txt).toContain(customWatermark);
    expect(txt).not.toContain(WATERMARK_TEXT);

    const csv = buildCsvContent(sampleChat, { ...opts, format: 'csv' });
    expect(csv).toContain(customWatermark);
    expect(csv).not.toContain(WATERMARK_TEXT);

    const html = buildHtmlContent(sampleChat, { ...opts, format: 'html' });
    expect(html).toContain(customWatermark);
    expect(html).not.toContain(WATERMARK_TEXT);
  });

  it('omits watermark when watermarkText is set to empty string (user unchecked watermark)', () => {
    const opts = { format: 'md' as const, filterMode: 'all' as const, watermarkText: '' };

    const md = buildMarkdownContent(sampleChat, opts);
    expect(md).not.toContain(WATERMARK_TEXT);

    const txt = buildTxtContent(sampleChat, { ...opts, format: 'txt' });
    expect(txt).not.toContain(WATERMARK_TEXT);

    const csv = buildCsvContent(sampleChat, { ...opts, format: 'csv' });
    expect(csv).not.toContain(WATERMARK_TEXT);
    expect(csv).not.toContain('watermark');
  });
});
