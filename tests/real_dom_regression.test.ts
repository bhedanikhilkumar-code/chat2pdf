import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import { claudeSelectors } from '../src/extension/content/selectors/claude';
import { chatgptSelectors } from '../src/extension/content/selectors/chatgpt';
import { geminiSelectors } from '../src/extension/content/selectors/gemini';
import { extractVisibleTurns } from '../src/extension/content/extractor';

describe('Real-World DOM Regression & Virtualization Tests', () => {
  it('extracts all alternating turns from Claude real DOM structure with data-turn-key and data-cds', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Construct a redacted Claude DOM structure mirroring the real production DOM
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="flex-1 overflow-hidden">
          <div class="flex flex-col h-full own-scroll-layer overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
            <div class="flex flex-col gap-3 py-4 max-w-3xl mx-auto w-full">
              <!-- 6 turns: 3 user, 3 assistant -->
              <div class="group/message-row" data-turn-key="c1111111-0000-0000-0000-000000000001">
                <div data-cds="UserMessage" class="flex justify-end">
                  <div class="group/bubble bg-user-message p-3 rounded-lg">
                    <p>Explain quantum computing</p>
                  </div>
                </div>
              </div>

              <div class="group/message-row" data-turn-key="c1111111-0000-0000-0000-000000000002">
                <div data-cds="AssistantMessage" data-testid="assistant-message" class="flex justify-start">
                  <div class="flex min-w-0 flex-col prose">
                    <p>Quantum computing leverages superposition and entanglement to perform calculations exponentially faster.</p>
                  </div>
                </div>
              </div>

              <div class="group/message-row" data-turn-key="c1111111-0000-0000-0000-000000000003">
                <div data-cds="UserMessage" class="flex justify-end">
                  <div class="group/bubble bg-user-message p-3 rounded-lg">
                    <p>What are qubits?</p>
                  </div>
                </div>
              </div>

              <div class="group/message-row" data-turn-key="c1111111-0000-0000-0000-000000000004">
                <div data-cds="AssistantMessage" data-testid="assistant-message" class="flex justify-start">
                  <div class="flex min-w-0 flex-col prose">
                    <p>A qubit is the basic unit of quantum information, analogous to a classical bit.</p>
                  </div>
                </div>
              </div>

              <div class="group/message-row" data-turn-key="c1111111-0000-0000-0000-000000000005">
                <div data-cds="UserMessage" class="flex justify-end">
                  <div class="group/bubble bg-user-message p-3 rounded-lg">
                    <p>continue</p>
                  </div>
                </div>
              </div>

              <div class="group/message-row" data-turn-key="c1111111-0000-0000-0000-000000000006">
                <div data-cds="AssistantMessage" data-testid="assistant-message" class="flex justify-start">
                  <div class="flex min-w-0 flex-col prose">
                    <p>Superconducting circuits and trapped ions are two leading physical implementations of qubits.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);

    const extracted = await page.evaluate((selectors) => {
      // Test selector matching and extraction logic
      const rawTurns = Array.from(document.querySelectorAll(selectors.messageContainer));
      const turns = rawTurns.filter((turn) => {
        return !rawTurns.some((other) => other !== turn && turn.contains(other));
      });

      return turns.map((turn, idx) => {
        const matchesUser = turn.matches(selectors.userMessage);
        const matchesAssistant = turn.matches(selectors.assistantMessage);
        const userSubEl = turn.querySelector(selectors.userMessage);
        const assistantSubEl = turn.querySelector(selectors.assistantMessage);

        const isUser = matchesUser || userSubEl !== null;
        const role = isUser ? 'user' : 'assistant';
        const contentEl = turn.querySelector(selectors.messageContent) || turn;
        const text = (contentEl.textContent || '').trim();

        const turnKey =
          turn.getAttribute('data-turn-key') ||
          turn.closest('[data-turn-key]')?.getAttribute('data-turn-key');

        return {
          id: turnKey ? `${turnKey}_${role}` : `msg_${idx}`,
          role,
          preview: text.slice(0, 30),
        };
      });
    }, claudeSelectors);

    await browser.close();

    expect(extracted.length).toBe(6);
    expect(extracted[0].role).toBe('user');
    expect(extracted[1].role).toBe('assistant');
    expect(extracted[2].role).toBe('user');
    expect(extracted[3].role).toBe('assistant');
    expect(extracted[4].role).toBe('user');
    expect(extracted[5].role).toBe('assistant');

    // IDs are stable and derived from data-turn-key
    expect(extracted[0].id).toBe('c1111111-0000-0000-0000-000000000001_user');
    expect(extracted[1].id).toBe('c1111111-0000-0000-0000-000000000002_assistant');
  });

  it('extracts turns from modern ChatGPT real DOM structure without article or data-message-author-role', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Construct a redacted ChatGPT DOM structure mirroring the real production DOM
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <div class="thread-scroll-container peer/transcript overflow-y-auto">
          <!-- Turn 1: Individual message containers -->
          <div data-turn-key="g1111111-0000-0000-0000-000000000001">
            <h4 data-conversation-role="user" class="sr-only">You said:</h4>
            <div data-user-message-bubble class="bg-user-message p-3">
              <p>Write a sort algorithm in TypeScript</p>
            </div>
          </div>

          <div data-turn-key="g1111111-0000-0000-0000-000000000002">
            <h4 data-conversation-role="assistant" class="sr-only">ChatGPT said:</h4>
            <div data-response-body class="agent-turn">
              <div class="markdown prose">
                <pre><code class="language-typescript">function quickSort(arr: number[]): number[] { ... }</code></pre>
              </div>
            </div>
          </div>

          <!-- Turn 2: Compound turn where user and assistant share outer wrapper -->
          <div data-turn-key="g1111111-0000-0000-0000-000000000003" class="compound-turn">
            <div data-user-message-bubble class="bg-user-message p-3">
              <p>What is its time complexity?</p>
            </div>
            <div data-response-body class="agent-turn">
              <div class="markdown prose">
                <p>Average time complexity is O(n log n), worst case is O(n^2).</p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);

    const extracted = await page.evaluate((selectors) => {
      const rawTurns = Array.from(document.querySelectorAll(selectors.messageContainer));
      const turns = rawTurns.filter((turn) => {
        return !rawTurns.some((other) => other !== turn && turn.contains(other));
      });

      const messages: any[] = [];
      turns.forEach((turn, idx) => {
        const matchesUser = turn.matches(selectors.userMessage);
        const matchesAssistant = turn.matches(selectors.assistantMessage);
        const userSubEl = turn.querySelector(selectors.userMessage);
        const assistantSubEl = turn.querySelector(selectors.assistantMessage);

        if (
          !matchesUser &&
          !matchesAssistant &&
          userSubEl &&
          assistantSubEl &&
          userSubEl !== assistantSubEl
        ) {
          const userText = (userSubEl.textContent || '').trim();
          const assistantText = (assistantSubEl.textContent || '').trim();
          const turnKey = turn.getAttribute('data-turn-key');
          messages.push({
            id: turnKey ? `${turnKey}_user` : `turn_${idx}_user`,
            role: 'user',
            preview: userText.slice(0, 30),
          });
          messages.push({
            id: turnKey ? `${turnKey}_assistant` : `turn_${idx}_assistant`,
            role: 'assistant',
            preview: assistantText.slice(0, 30),
          });
          return;
        }

        const isUser = matchesUser || userSubEl !== null;
        const role = isUser ? 'user' : 'assistant';
        const contentEl = turn.querySelector(selectors.messageContent) || turn;
        const text = (contentEl.textContent || '').trim();
        const turnKey =
          turn.getAttribute('data-turn-key') ||
          turn.closest('[data-turn-key]')?.getAttribute('data-turn-key');

        messages.push({
          id: turnKey ? `${turnKey}_${role}` : `msg_${idx}`,
          role,
          preview: text.slice(0, 30),
        });
      });

      return messages;
    }, chatgptSelectors);

    await browser.close();

    // 4 messages: Turn 1 (user, assistant) + Compound Turn 2 (user, assistant)
    expect(extracted.length).toBe(4);
    expect(extracted[0].role).toBe('user');
    expect(extracted[1].role).toBe('assistant');
    expect(extracted[2].role).toBe('user');
    expect(extracted[3].role).toBe('assistant');
  });

  it('correctly identifies modern scroll containers across all 3 platforms', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Test Claude scroller
    await page.setContent(`
      <main class="h-full">
        <div class="own-scroll-layer overflow-y-auto" style="height: 400px; overflow-y: auto;">
          <div style="height: 1200px;">Content</div>
        </div>
      </main>
    `);

    const claudeScroller = await page.evaluate((selectors) => {
      const elements = Array.from(document.querySelectorAll(selectors.scrollContainer));
      for (const el of elements) {
        if ((el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight + 20) {
          return el.className;
        }
      }
      return null;
    }, claudeSelectors);
    expect(claudeScroller).toContain('own-scroll-layer');

    // Test ChatGPT scroller
    await page.setContent(`
      <div id="__next">
        <div class="thread-scroll-container peer/transcript overflow-y-auto" style="height: 400px; overflow-y: auto;">
          <div style="height: 1200px;">ChatGPT Content</div>
        </div>
      </div>
    `);

    const chatgptScroller = await page.evaluate((selectors) => {
      const elements = Array.from(document.querySelectorAll(selectors.scrollContainer));
      for (const el of elements) {
        if ((el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight + 20) {
          return el.className;
        }
      }
      return null;
    }, chatgptSelectors);
    expect(chatgptScroller).toContain('thread-scroll-container');

    // Test Gemini scroller
    await page.setContent(`
      <div>
        <infinite-scroller class="chat-history" style="height: 400px; overflow-y: auto; display: block;">
          <div style="height: 1200px;">Gemini Content</div>
        </infinite-scroller>
      </div>
    `);

    const geminiScroller = await page.evaluate((selectors) => {
      const elements = Array.from(document.querySelectorAll(selectors.scrollContainer));
      for (const el of elements) {
        if ((el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight + 20) {
          return el.tagName.toLowerCase();
        }
      }
      return null;
    }, geminiSelectors);
    expect(geminiScroller).toBe('infinite-scroller');

    await browser.close();
  });
});
