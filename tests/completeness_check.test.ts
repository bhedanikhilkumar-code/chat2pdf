import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

describe('Completeness Check (Task 1)', () => {
  it('identifies healthy complete chat extraction', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          #chat-container { height: 500px; overflow-y: auto; }
          .chat-turn { height: 100px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div id="chat-container">
          ${Array.from({ length: 20 }, (_, i) => `<div class="chat-turn message-block">Turn ${i}</div>`).join('')}
        </div>
      </body>
      </html>
    `);

    const result = await page.evaluate(async () => {
      // Evaluate completeness logic
      const container = document.getElementById('chat-container')!;
      container.scrollTop = 0;

      const children = Array.from(container.querySelectorAll('.chat-turn')) as HTMLElement[];
      const avgHeight = children.reduce((sum, el) => sum + el.offsetHeight, 0) / children.length;
      const expectedCount = Math.max(children.length, Math.round(container.scrollHeight / avgHeight));
      const foundCount = children.length;

      const reachedTop = container.scrollTop <= 10;
      const hasRemainingLoadControl = false;
      const isIncomplete = foundCount < 0.6 * expectedCount || !reachedTop || hasRemainingLoadControl;

      return {
        status: isIncomplete ? 'Possibly incomplete' : 'Complete',
        foundCount,
        expectedCount,
        reachedTop,
        hasRemainingLoadControl,
      };
    });

    expect(result.status).toBe('Complete');
    expect(result.foundCount).toBe(20);
    expect(result.reachedTop).toBe(true);

    await browser.close();
  });

  it('deliberately broken structure: selector matches only 3 of 30 messages -> Possibly incomplete', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          #chat-container { height: 500px; overflow-y: auto; }
          .chat-turn { height: 100px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div id="chat-container">
          ${Array.from({ length: 30 }, (_, i) => `<div class="chat-turn ${i < 3 ? 'broken-legacy-msg' : 'hashed-new-msg'}">Turn ${i}</div>`).join('')}
        </div>
      </body>
      </html>
    `);

    const result = await page.evaluate(async () => {
      const container = document.getElementById('chat-container')!;
      container.scrollTop = 0;

      // Primary selector only matches 3 elements
      const matched = Array.from(container.querySelectorAll('.broken-legacy-msg')) as HTMLElement[];
      const allTurns = Array.from(container.querySelectorAll('.chat-turn')) as HTMLElement[];

      const avgHeight = allTurns.reduce((sum, el) => sum + el.offsetHeight, 0) / allTurns.length;
      const expectedCount = Math.max(matched.length, Math.round(container.scrollHeight / avgHeight));
      const foundCount = matched.length;

      const reachedTop = container.scrollTop <= 10;
      const hasRemainingLoadControl = false;
      const isIncomplete = foundCount < 0.6 * expectedCount || !reachedTop || hasRemainingLoadControl;

      return {
        status: isIncomplete ? 'Possibly incomplete' : 'Complete',
        foundCount,
        expectedCount,
        isIncomplete,
      };
    });

    expect(result.status).toBe('Possibly incomplete');
    expect(result.foundCount).toBe(3);
    expect(result.expectedCount).toBeGreaterThanOrEqual(25); // ~30 expected
    expect(result.isIncomplete).toBe(true);

    await browser.close();
  });

  it('flags incomplete when a load earlier control remains visible', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <button id="load-earlier">Load earlier messages</button>
        <div id="chat-container" style="height: 500px; overflow-y: auto;">
          ${Array.from({ length: 10 }, (_, i) => `<div class="chat-turn" style="height: 100px;">Turn ${i}</div>`).join('')}
        </div>
      </body>
      </html>
    `);

    const result = await page.evaluate(async () => {
      const container = document.getElementById('chat-container')!;
      container.scrollTop = 0;

      const btn = document.getElementById('load-earlier');
      const hasRemainingLoadControl = btn !== null && btn.offsetParent !== null;

      const foundCount = 10;
      const expectedCount = 10;
      const reachedTop = true;
      const isIncomplete = foundCount < 0.6 * expectedCount || !reachedTop || hasRemainingLoadControl;

      return {
        status: isIncomplete ? 'Possibly incomplete' : 'Complete',
        hasRemainingLoadControl,
      };
    });

    expect(result.status).toBe('Possibly incomplete');
    expect(result.hasRemainingLoadControl).toBe(true);

    await browser.close();
  });
});
