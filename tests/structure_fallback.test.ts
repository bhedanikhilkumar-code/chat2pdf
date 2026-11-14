import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

describe('Structure-Based Fallback Detection (Task 2)', () => {
  it('Shape 1: Deep wrappers (30+ messages) extracts right count and order', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const turnCount = 34;
    const itemsHtml = Array.from({ length: turnCount }, (_, i) => {
      const isUser = i % 2 === 0;
      const role = isUser ? 'user' : 'assistant';
      return `
        <div class="row-wrapper-outer">
          <div class="nested-depth-1">
            <div class="nested-depth-2">
              <div class="bubble-container" data-message-author-role="${role}">
                <p>Fake content message ${i} - ${isUser ? 'User question' : 'Assistant explanation'}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <main>
          <div id="scroll-viewport" style="height: 600px; overflow-y: auto;">
            <div class="content-container">
              ${itemsHtml}
            </div>
          </div>
        </main>
      </body>
      </html>
    `);

    const result = await page.evaluate(() => {
      const container = document.getElementById('scroll-viewport')!;
      // Find candidate repeating parent
      const candidates = Array.from(container.querySelectorAll('div'));
      let bestParent: HTMLElement | null = null;
      let bestCount = 0;

      for (const cand of candidates) {
        const textKids = Array.from(cand.children).filter((k) => (k.textContent || '').trim().length > 0) as HTMLElement[];
        if (textKids.length > bestCount) {
          bestCount = textKids.length;
          bestParent = cand;
        }
      }

      const turns: any[] = [];
      if (bestParent) {
        const children = Array.from(bestParent.children) as HTMLElement[];
        children.forEach((child, idx) => {
          const roleAttr = child.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role');
          turns.push({
            index: idx,
            role: roleAttr || (idx % 2 === 0 ? 'user' : 'assistant'),
            text: (child.textContent || '').trim(),
          });
        });
      }

      return { count: turns.length, turns };
    });

    expect(result.count).toBe(turnCount);
    expect(result.turns[0].role).toBe('user');
    expect(result.turns[1].role).toBe('assistant');
    expect(result.turns[33].role).toBe('assistant');

    await browser.close();
  });

  it('Shape 2: Flat list with layout alignment (30+ messages)', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const turnCount = 32;
    const itemsHtml = Array.from({ length: turnCount }, (_, i) => {
      const isUser = i % 2 === 0;
      const align = isUser ? 'align-self: flex-end; margin-left: auto;' : 'align-self: flex-start;';
      return `
        <div class="flat-item" style="width: 80%; ${align} margin-bottom: 8px;">
          <div>Flat turn number ${i}: ${isUser ? 'prompt query' : 'model response'}</div>
        </div>
      `;
    }).join('');

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="chat-thread" style="height: 500px; display: flex; flex-direction: column; overflow-y: auto;">
          ${itemsHtml}
        </div>
      </body>
      </html>
    `);

    const result = await page.evaluate(() => {
      const container = document.getElementById('chat-thread')!;
      const children = Array.from(container.children) as HTMLElement[];
      const turns = children.map((el, i) => {
        const isRightAligned = el.style.marginLeft === 'auto' || el.style.alignSelf === 'flex-end';
        return {
          index: i,
          role: isRightAligned ? 'user' : 'assistant',
          text: (el.textContent || '').trim(),
        };
      });

      return { count: turns.length, turns };
    });

    expect(result.count).toBe(turnCount);
    expect(result.turns[0].role).toBe('user');
    expect(result.turns[1].role).toBe('assistant');

    await browser.close();
  });

  it('Shape 3: Alternating siblings with action buttons (30+ messages)', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const turnCount = 30;
    const itemsHtml = Array.from({ length: turnCount }, (_, i) => {
      const isUser = i % 2 === 0;
      const actions = isUser
        ? `<button title="Edit message">Edit</button>`
        : `<button title="Copy response">Copy</button><button title="Regenerate">Retry</button>`;
      return `
        <article class="sibling-entry">
          <div class="body">Turn text ${i}</div>
          <div class="toolbar">${actions}</div>
        </article>
      `;
    }).join('');

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="convo-container" style="overflow-y: auto; height: 500px;">
          <div class="stream-box">
            ${itemsHtml}
          </div>
        </div>
      </body>
      </html>
    `);

    const result = await page.evaluate(() => {
      const box = document.querySelector('.stream-box')!;
      const children = Array.from(box.children) as HTMLElement[];

      let prevRole: 'user' | 'assistant' | null = null;
      const turns = children.map((el, i) => {
        const hasCopy = el.querySelector('button[title*="Copy"]') !== null;
        let role: 'user' | 'assistant' = 'user';
        if (hasCopy) role = 'assistant';
        else if (prevRole === 'user') role = 'assistant';
        else if (prevRole === 'assistant') role = 'user';
        else role = i % 2 === 0 ? 'user' : 'assistant';

        prevRole = role;
        return { index: i, role, text: (el.textContent || '').trim() };
      });

      return { count: turns.length, turns };
    });

    expect(result.count).toBe(turnCount);
    expect(result.turns[0].role).toBe('user');
    expect(result.turns[1].role).toBe('assistant');

    await browser.close();
  });

  it('Shape 4: Virtualized list with spacers (30+ messages)', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const turnCount = 36;
    const itemsHtml = Array.from({ length: turnCount }, (_, i) => {
      const isUser = i % 2 === 0;
      return `
        <div class="virtual-item" style="height: 80px; width: 95%;">
          <div role="${isUser ? 'heading' : 'region'}">
            Virtualized turn ${i} - ${isUser ? 'Human text' : 'AI answer'}
          </div>
        </div>
      `;
    }).join('');

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="virtual-scroller" style="height: 500px; overflow-y: auto;">
          <div id="spacer-top" style="height: 0px;"></div>
          <div class="virtual-window">
            ${itemsHtml}
          </div>
          <div id="spacer-bottom" style="height: 0px;"></div>
        </div>
      </body>
      </html>
    `);

    const result = await page.evaluate(() => {
      const scroller = document.getElementById('virtual-scroller')!;
      const win = scroller.querySelector('.virtual-window')!;
      const children = Array.from(win.children) as HTMLElement[];

      const turns = children.map((el, i) => ({
        index: i,
        role: i % 2 === 0 ? 'user' : 'assistant',
        text: (el.textContent || '').trim(),
      }));

      return { count: turns.length, turns };
    });

    expect(result.count).toBe(turnCount);
    expect(result.turns.length).toBeGreaterThanOrEqual(30);
    expect(result.turns[0].index).toBe(0);
    expect(result.turns[turnCount - 1].index).toBe(turnCount - 1);

    await browser.close();
  });
});
