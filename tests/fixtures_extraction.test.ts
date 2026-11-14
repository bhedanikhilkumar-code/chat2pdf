import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import path from 'path';

describe('Synthetic DOM Structure Fixtures Extraction Verification', () => {
  it('extracts all 30 messages from claude.html synthetic fixture with attachments, code, table, and list', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const filePath = 'file:///' + path.resolve('tests/synthetic/claude.html').replace(/\\/g, '/');
    await page.goto(filePath);

    // Run extraction in the page context using the updated Claude selectors
    const result = await page.evaluate(() => {
      const selectors = {
        messageContainer: '[data-message-author-role], div.font-user-message, div.font-claude-message, [data-is-streaming], div[data-testid*="user-message"], div[data-testid*="assistant-message"]',
        userMessage: '[data-message-author-role="user"], [class*="font-user-message"], [data-testid*="user-message"], [class*="human"]',
        assistantMessage: '[data-message-author-role="assistant"], [class*="font-claude-message"], [data-testid*="assistant-message"], [class*="progressive-markdown"], [class*="claude"]',
        messageContent: '[class*="font-claude-message"], [class*="font-user-message"], [class*="progressive-markdown"], .prose, .markdown, [class*="message-content"]',
        attachmentContainer: '.file-chip, [class*="FileChip"], [class*="Attachment"], [class*="file-pill"], [aria-label*="Attachment"]',
      };

      const rawTurns = Array.from(document.querySelectorAll(selectors.messageContainer));
      // Filter out ancestor wrappers
      const turns = rawTurns.filter((turn) => {
        return !rawTurns.some((other) => other !== turn && turn.contains(other));
      });

      const extracted: any[] = [];
      turns.forEach((turn, idx) => {
        const isUser = turn.matches(selectors.userMessage) || turn.querySelector(selectors.userMessage) !== null;
        const role = isUser ? 'user' : 'assistant';
        const contentEl = turn.querySelector(selectors.messageContent) || turn;
        const text = (contentEl.textContent || '').trim();

        let attachments: any[] = [];
        if (isUser) {
          const attEl = turn.querySelector(selectors.attachmentContainer);
          if (attEl) {
            attachments.push({
              name: attEl.querySelector('.file-name')?.textContent?.trim() || 'attached-file',
            });
          }
        }

        const hasCode = contentEl.querySelector('pre, code') !== null;
        const hasTable = contentEl.querySelector('table') !== null;
        const hasList = contentEl.querySelector('ul, ol') !== null;

        extracted.push({
          index: idx,
          role,
          hasCode,
          hasTable,
          hasList,
          attachments,
          preview: text.slice(0, 40),
        });
      });

      return {
        rawCount: rawTurns.length,
        filteredCount: turns.length,
        messages: extracted,
      };
    });

    await browser.close();

    expect(result.filteredCount).toBe(30);
    expect(result.messages.length).toBe(30);

    // Check alternating roles
    for (let i = 0; i < 30; i++) {
      const expectedRole = i % 2 === 0 ? 'user' : 'assistant';
      expect(result.messages[i].role).toBe(expectedRole);
    }

    // Check attachment on turn 0 (first user turn)
    expect(result.messages[0].attachments.length).toBe(1);
    expect(result.messages[0].attachments[0].name).toBe('spec-sheet.pdf');

    // Check code on turn 1
    expect(result.messages[1].hasCode).toBe(true);

    // Check table on turn 3
    expect(result.messages[3].hasTable).toBe(true);

    // Check list on turn 5
    expect(result.messages[5].hasList).toBe(true);
  });

  it('extracts all 30 messages from chatgpt.html synthetic fixture with attachments, code, table, and list', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const filePath = 'file:///' + path.resolve('tests/synthetic/chatgpt.html').replace(/\\/g, '/');
    await page.goto(filePath);

    const result = await page.evaluate(() => {
      const selectors = {
        messageContainer: 'article[data-testid^="conversation-turn-"], [data-message-author-role]',
        userMessage: '[data-message-author-role="user"]',
        assistantMessage: '[data-message-author-role="assistant"]',
        messageContent: '.markdown, .user-turn-content, .prose',
        attachmentContainer: '.attachment-chip, [data-testid="attachment-file"]',
      };

      const rawTurns = Array.from(document.querySelectorAll(selectors.messageContainer));
      const turns = rawTurns.filter((turn) => {
        return !rawTurns.some((other) => other !== turn && turn.contains(other));
      });

      const extracted: any[] = [];
      turns.forEach((turn, idx) => {
        const isUser = turn.matches(selectors.userMessage) || turn.querySelector(selectors.userMessage) !== null;
        const role = isUser ? 'user' : 'assistant';
        const contentEl = turn.querySelector(selectors.messageContent) || turn;

        let attachments: any[] = [];
        if (isUser) {
          const attEl = turn.querySelector(selectors.attachmentContainer);
          if (attEl) {
            attachments.push({
              name: attEl.querySelector('.file-title')?.textContent?.trim() || 'file',
            });
          }
        }

        extracted.push({
          index: idx,
          role,
          hasCode: contentEl.querySelector('pre, code') !== null,
          hasTable: contentEl.querySelector('table') !== null,
          hasList: contentEl.querySelector('ul, ol') !== null,
          attachments,
        });
      });

      return {
        count: turns.length,
        messages: extracted,
      };
    });

    await browser.close();

    expect(result.count).toBe(30);
    expect(result.messages.length).toBe(30);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].attachments[0].name).toBe('benchmark.csv');
    expect(result.messages[1].hasCode).toBe(true);
    expect(result.messages[3].hasTable).toBe(true);
    expect(result.messages[5].hasList).toBe(true);
  });

  it('extracts all 30 messages from gemini.html synthetic fixture with attachments, code, table, and list', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const filePath = 'file:///' + path.resolve('tests/synthetic/gemini.html').replace(/\\/g, '/');
    await page.goto(filePath);

    const result = await page.evaluate(() => {
      const selectors = {
        messageContainer: 'user-query, model-response, [data-test-id="user-query"], [data-test-id="model-response"]',
        userMessage: 'user-query, [data-test-id="user-query"]',
        assistantMessage: 'model-response, [data-test-id="model-response"]',
        messageContent: '.message-content, .query-content, .response-container',
        attachmentContainer: '.attachment-pill, [aria-label*="Attachment"]',
      };

      const rawTurns = Array.from(document.querySelectorAll(selectors.messageContainer));
      const turns = rawTurns.filter((turn) => {
        return !rawTurns.some((other) => other !== turn && turn.contains(other));
      });

      const extracted: any[] = [];
      turns.forEach((turn, idx) => {
        const isUser = turn.matches(selectors.userMessage) || turn.querySelector(selectors.userMessage) !== null;
        const role = isUser ? 'user' : 'assistant';
        const contentEl = turn.querySelector(selectors.messageContent) || turn;

        let attachments: any[] = [];
        if (isUser) {
          const attEl = turn.querySelector(selectors.attachmentContainer);
          if (attEl) {
            attachments.push({
              name: attEl.querySelector('.name')?.textContent?.trim() || 'file',
            });
          }
        }

        extracted.push({
          index: idx,
          role,
          hasCode: contentEl.querySelector('pre, code') !== null,
          hasTable: contentEl.querySelector('table') !== null,
          hasList: contentEl.querySelector('ul, ol') !== null,
          attachments,
        });
      });

      return {
        count: turns.length,
        messages: extracted,
      };
    });

    await browser.close();

    expect(result.count).toBe(30);
    expect(result.messages.length).toBe(30);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].attachments[0].name).toBe('architecture.png');
    expect(result.messages[1].hasCode).toBe(true);
    expect(result.messages[3].hasTable).toBe(true);
    expect(result.messages[5].hasList).toBe(true);
  });
});
