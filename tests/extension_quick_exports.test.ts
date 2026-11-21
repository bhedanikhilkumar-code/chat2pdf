import { describe, it, expect } from 'vitest';
import type { Conversation } from '../src/core/parser/types';
import { buildHtmlContent } from '../src/core/exporters/exportHtml';
import { buildTxtContent } from '../src/core/exporters/exportTxt';
import { buildMarkdownContent } from '../src/core/exporters/exportMarkdown';
import { buildJsonContent } from '../src/core/exporters/exportJson';

describe('Extension Quick Exports Verification', () => {
  const sampleChat: Conversation = {
    title: 'Quick Export Integration Test',
    source: 'claude',
    exportedAt: '2026-11-22T03:00:00.000Z',
    messages: [
      {
        index: 0,
        role: 'user',
        content: 'Please summarize quantum computing.',
      },
      {
        index: 1,
        role: 'assistant',
        content: 'Quantum computing leverages qubits and superposition to solve complex problems.',
      },
    ],
  };

  it('generates valid standalone HTML for Quick HTML export', () => {
    const html = buildHtmlContent(sampleChat, {
      format: 'html',
      fileName: 'test-quick-export',
      pageStyle: 'light',
      filterMode: 'all',
      watermarkText: 'Made with Chat2PDF',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('test-quick-export');
    expect(html).toContain('quantum computing');
    expect(html).toContain('qubits and superposition');
    expect(html).toContain('Made with Chat2PDF');
    expect(html).toContain('</html>');
  });

  it('generates formatted plain text for Quick TXT export', () => {
    const txt = buildTxtContent(sampleChat, {
      format: 'txt',
      fileName: 'test-quick-export',
      pageStyle: 'light',
      filterMode: 'all',
      watermarkText: 'Made with Chat2PDF',
    });

    expect(txt).toContain('Title: Quick Export Integration Test');
    expect(txt).toContain('--- User ---');
    expect(txt).toContain('Please summarize quantum computing.');
    expect(txt).toContain('--- Assistant ---');
    expect(txt).toContain('Quantum computing leverages qubits');
    expect(txt).toContain('Made with Chat2PDF');
  });

  it('generates valid markdown and json for Quick MD and Quick JSON exports', () => {
    const md = buildMarkdownContent(sampleChat, {
      format: 'md',
      filterMode: 'all',
    });
    expect(md).toContain('## 👤 User');
    expect(md).toContain('## 🤖 Assistant');
    expect(md).toContain('Quantum computing leverages qubits');

    const jsonStr = buildJsonContent(sampleChat, {
      format: 'json',
      filterMode: 'all',
    });
    const parsed = JSON.parse(jsonStr);
    expect(parsed.title).toBe('Quick Export Integration Test');
    expect(parsed.messages.length).toBe(2);
  });
});
