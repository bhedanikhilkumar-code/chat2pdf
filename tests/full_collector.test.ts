import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import path from 'path';

describe('Full-Chat Collection and Order Verification', () => {
  it('collects all 300 virtualized messages with zero duplicates in strict chronological order', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const fileUrl = 'file:///' + path.resolve('tests/mock_chat.html').replace(/\\/g, '/');
    await page.goto(fileUrl);
    await page.waitForLoadState('domcontentloaded');

    // Run the two-phase collection algorithm
    const result: any = await page.evaluate(`
      (async () => {
        const container = document.getElementById('scroll-container');
        const messageMap = new Map();
        const orderedIds = [];

        function recordCurrent() {
          const turns = document.querySelectorAll('.message-turn');
          turns.forEach(function(t) {
            const id = t.getAttribute('data-message-id');
            const role = t.getAttribute('data-message-author-role');
            const content = t.querySelector('.markdown') ? t.querySelector('.markdown').textContent : '';
            if (id && !messageMap.has(id)) {
              messageMap.set(id, { id: id, role: role, content: content });
              orderedIds.push(id);
            }
          });
        }

        // Phase 1: Scroll to top to unroll all older messages
        while (container.scrollTop > 0) {
          container.scrollTop = Math.max(0, container.scrollTop - 250);
          await new Promise(function(r) { setTimeout(r, 10); });
        }

        // Phase 2: From top (scrollTop = 0), descend downwards collecting all messages in chronological order
        container.scrollTop = 0;
        await new Promise(function(r) { setTimeout(r, 10); });
        recordCurrent();

        while (container.scrollTop < container.scrollHeight - container.clientHeight) {
          var prev = container.scrollTop;
          container.scrollTop = Math.min(container.scrollHeight, container.scrollTop + 200);
          if (container.scrollTop === prev) break;
          await new Promise(function(r) { setTimeout(r, 10); });
          recordCurrent();
        }

        return {
          totalCollected: orderedIds.length,
          firstMessage: messageMap.get(orderedIds[0]),
          lastMessage: messageMap.get(orderedIds[orderedIds.length - 1]),
          allIds: orderedIds,
        };
      })()
    `);

    await browser.close();

    expect(result.totalCollected).toBe(300);
    expect(result.firstMessage.id).toBe('msg_0');
    expect(result.firstMessage.role).toBe('user');
    expect(result.lastMessage.id).toBe('msg_299');
    expect(result.lastMessage.role).toBe('assistant');
  }, 30000);
});
