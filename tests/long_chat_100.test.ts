import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import JSZip from 'jszip';

function generate100MessagesText(): string {
  const parts: string[] = [];
  for (let i = 0; i < 50; i++) {
    const userPrompt =
      i > 0 && i % 5 === 0
        ? 'continue'
        : `[Turn ${i * 2 + 1}] Explain step ${i + 1} of building a distributed queue with code example.`;
    parts.push(`User: ${userPrompt}`);

    parts.push(
      `Assistant: [Turn ${i * 2 + 2}] Here is detailed guidance for step ${i + 1}:\n\n` +
        `- Key invariant #${i + 1}: idempotent message processing\n` +
        `- Backoff delay: $${i + 1} \\times 100\\text{ms}$\n\n` +
        '```typescript\n' +
        `export function processTask_${i}(id: string): boolean {\n` +
        `  return id.length > 0 && ${i} >= 0;\n` +
        `}\n` +
        '```\n'
    );
  }
  return parts.join('\n\n');
}

async function getExtensionId(context: any): Promise<string> {
  const extPage = await context.newPage();
  await extPage.goto('chrome://extensions');
  await extPage.waitForTimeout(800);

  const items = await extPage.locator('extensions-item').all();
  let extensionId = '';
  for (const item of items) {
    const name = await item.locator('#name').textContent();
    if (name?.includes('Chat2PDF')) {
      extensionId = (await item.getAttribute('id')) || '';
      break;
    }
  }
  await extPage.close();
  return extensionId;
}

async function closePersistentContextSafely(context: any) {
  if (!context) return;
  try {
    const pages = context.pages ? context.pages() : [];
    await Promise.race([
      Promise.all(pages.map((p: any) => p.close().catch(() => {}))),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    await Promise.race([context.close(), new Promise((r) => setTimeout(r, 5000))]);
  } catch {}
}

describe('100-Message Long Chat End-to-End Load Verification', () => {
  it(
    'Web App: loads, parses, previews all 100 messages, and exports valid files (including multi-part PNG zip)',
    async () => {
      const viteServer = await createServer({
        server: { port: 5192 },
        logLevel: 'error',
      });
      await viteServer.listen();
      const serverUrl = 'http://localhost:5192';

      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ acceptDownloads: true });
      const page = await context.newPage();

      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      const rawText = generate100MessagesText();
      const tmpDownloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat2pdf-100-web-'));

      try {
        await page.goto(serverUrl, { waitUntil: 'networkidle' });

        // Paste 100-message chat directly into textarea
        const textarea = page.locator('textarea');
        await textarea.waitFor({ state: 'visible', timeout: 8000 });
        await textarea.fill(rawText);

        // Parse & Preview
        await page.locator('button:has-text("Parse & Preview")').click();

        // Wait for Step 2 header and verify all 100 messages loaded
        const previewHeader = page.locator('text="100 of 100 messages included."');
        await previewHeader.waitFor({ state: 'visible', timeout: 10000 });

        const renderedTurns = await page.locator('[id^="chat-turn-"]').count();
        expect(renderedTurns).toBe(100);

        const firstTurnText = await page.locator('#chat-turn-0').textContent();
        const lastTurnText = await page.locator('#chat-turn-99').textContent();
        expect(firstTurnText).toContain('[Turn 1]');
        expect(lastTurnText).toContain('[Turn 100]');

        // Test search filter across 100 messages
        const searchInput = page.locator('input[placeholder*="Search keywords"]');
        await searchInput.fill('[Turn 99]');
        await page.waitForTimeout(200);
        expect(await page.locator('[id^="chat-turn-"]').count()).toBe(1);
        await page.locator('button[title="Clear search"]').click();
        await page.waitForTimeout(200);
        expect(await page.locator('[id^="chat-turn-"]').count()).toBe(100);

        // Continue to ExportStep
        await page.locator('button:has-text("Choose Format & Export")').click();
        await page.locator('text="100 message turns"').waitFor({ state: 'visible', timeout: 8000 });

        // Test fast formats + DOCX + PPTX + PDF + sliced PNG on 100 messages
        const formatsToTest = [
          { id: 'md', selector: 'text="Markdown (.md)"' },
          { id: 'json', selector: 'text="JSON Data (.json)"' },
          { id: 'txt', selector: 'text="Plain Text (.txt)"' },
          { id: 'csv', selector: 'text="CSV Table (.csv)"' },
          { id: 'html', selector: 'text="HTML Webpage (.html)"' },
          { id: 'docx', selector: 'text="Word (.docx)"' },
          { id: 'pptx', selector: 'text="PowerPoint (.pptx)"' },
          { id: 'pdf', selector: 'text="PDF Document"' },
          { id: 'png', selector: 'text="PNG Image"' },
        ];

        for (const fmt of formatsToTest) {
          const card = page.locator(fmt.selector).first();
          await card.scrollIntoViewIfNeeded();
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 60000 }),
            card.click(),
          ]);
          const savePath = path.join(tmpDownloadDir, download.suggestedFilename());
          await download.saveAs(savePath);
          const buf = fs.readFileSync(savePath);
          expect(buf.length).toBeGreaterThan(0);

          if (fmt.id === 'json') {
            const parsed = JSON.parse(buf.toString('utf-8'));
            expect(parsed.messages.length).toBe(100);
            expect(parsed.messages[99].content).toContain('[Turn 100]');
          } else if (fmt.id === 'md' || fmt.id === 'txt' || fmt.id === 'html') {
            const text = buf.toString('utf-8');
            expect(text).toContain('[Turn 1]');
            expect(text).toContain('[Turn 100]');
          } else if (fmt.id === 'pdf') {
            expect(buf.toString('utf-8', 0, 4)).toBe('%PDF');
          } else if (fmt.id === 'png') {
            // 100-message PNG exceeds MAX_CANVAS_HEIGHT (12000px) and must slice into >= 2 files in ZIP
            const filename = download.suggestedFilename();
            expect(filename.endsWith('.zip')).toBe(true);
            const zip = await JSZip.loadAsync(buf);
            expect(Object.keys(zip.files).length).toBeGreaterThanOrEqual(2);
          }
          await page.waitForTimeout(100);
        }

        expect(consoleErrors).toEqual([]);
      } finally {
        await browser.close();
        await viteServer.close();
        try {
          fs.rmSync(tmpDownloadDir, { recursive: true, force: true });
        } catch {}
      }
    },
    120000
  );

  it(
    'Extension Virtualized 100-Message Chat: injects IIFE content script without errors, scrolls bottom->top->down, reports Complete (100/100), and opens Studio',
    async () => {
      const extPath = path.resolve('dist-extension').replace(/\\/g, '/');
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat2pdf-100-ext-virt-'));
      let context;

      try {
        context = await chromium.launchPersistentContext(userDataDir, {
          headless: false,
          args: [
            `--disable-extensions-except=${extPath}`,
            `--load-extension=${extPath}`,
            '--no-first-run',
            '--no-default-browser-check',
          ],
          timeout: 20000,
        });

        const page = await context.newPage();
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        // Serve a 100-message virtualized Claude conversation starting at the BOTTOM
        await page.route('https://claude.ai/chat/test-100-virtualized', (route) => {
          route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `
              <!DOCTYPE html>
              <html>
              <head>
                <title>100 Message Virtualized Chat</title>
                <style>
                  body { margin: 0; font-family: sans-serif; }
                  .own-scroll-layer {
                    height: 600px;
                    overflow-y: auto;
                    position: relative;
                  }
                  #virtual-spacer {
                    position: relative;
                    width: 100%;
                  }
                </style>
              </head>
              <body>
                <main>
                  <div class="own-scroll-layer overflow-y-auto">
                    <div id="virtual-spacer"></div>
                  </div>
                </main>
                <script>
                  const TOTAL = 100;
                  const ITEM_H = 260;
                  const WIN = 12;
                  const scroller = document.querySelector('.own-scroll-layer');
                  const spacer = document.getElementById('virtual-spacer');
                  spacer.style.height = (TOTAL * ITEM_H) + 'px';

                  function renderWindow() {
                    const top = scroller.scrollTop;
                    const start = Math.max(0, Math.min(TOTAL - WIN, Math.floor(top / ITEM_H)));
                    const end = Math.min(TOTAL, start + WIN);
                    spacer.innerHTML = '';

                    for (let i = start; i < end; i++) {
                      const isUser = i % 2 === 0;
                      const row = document.createElement('div');
                      row.className = 'group/message-row';
                      row.setAttribute('data-turn-key', 'turn-' + String(i + 1).padStart(3, '0'));
                      row.style.position = 'absolute';
                      row.style.top = (i * ITEM_H) + 'px';
                      row.style.left = '0';
                      row.style.right = '0';
                      row.style.height = '240px';

                      const inner = document.createElement('div');
                      inner.setAttribute('data-cds', isUser ? 'UserMessage' : 'AssistantMessage');
                      inner.setAttribute('data-message-author-role', isUser ? 'user' : 'assistant');

                      const prose = document.createElement('div');
                      prose.className = 'prose';
                      if (isUser) {
                        prose.innerHTML = i > 0 && i % 10 === 0
                          ? '<p>[Turn ' + (i + 1) + '] continue</p>'
                          : '<p>[Turn ' + (i + 1) + '] Question number ' + (i + 1) + ' about system architecture.</p>';
                      } else {
                        prose.innerHTML =
                          '<p>[Turn ' + (i + 1) + '] Answer number ' + (i + 1) + ' explaining design details.</p>' +
                          '<pre><code class="language-ts"><span style="color: #93c5fd">const</span> step_' + (i + 1) + ' = ' + (i + 1) + ';</code></pre>';
                      }

                      inner.appendChild(prose);
                      row.appendChild(inner);
                      spacer.appendChild(row);
                    }
                  }

                  scroller.addEventListener('scroll', renderWindow);
                  // Start scrolled to BOTTOM like a real long chat session!
                  scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
                  renderWindow();
                </script>
              </body>
              </html>
            `,
          });
        });

        await page.goto('https://claude.ai/chat/test-100-virtualized', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);

        const extensionId = await getExtensionId(context);
        expect(extensionId).toBeTruthy();

        const popupPage = await context.newPage();
        await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);
        await popupPage.waitForLoadState('load');

        const extractResponse: any = await popupPage.evaluate(async () => {
          // Find the tab running our content script by pinging tabs (does not require "tabs" permission)
          const tabs = await chrome.tabs.query({});
          let targetTabId: number | undefined;

          for (const t of tabs) {
            if (!t.id) continue;
            const pingRes: any = await new Promise((resolve) => {
              chrome.tabs.sendMessage(t.id!, { action: 'PING' }, (res) => {
                if (chrome.runtime.lastError || !res?.pong) resolve(null);
                else resolve(res);
              });
            });
            if (pingRes?.pong) {
              targetTabId = t.id;
              break;
            }
          }

          if (!targetTabId) {
            return { success: false, error: 'No tab responded to content script PING' };
          }

          const extractRes: any = await new Promise((resolve) => {
            chrome.tabs.sendMessage(targetTabId!, { action: 'EXTRACT_FULL_CHAT' }, (res) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
              } else {
                resolve(res);
              }
            });
          });

          if (extractRes?.success && extractRes.data) {
            await chrome.storage.local.set({
              chat2pdf_extracted_data: {
                messages: extractRes.data.messages,
                title: extractRes.data.title,
                source: extractRes.data.source,
                themeSnapshot: extractRes.data.themeSnapshot,
                diagnosticsReport: extractRes.data.diagnosticsReport,
              },
            });
          }

          return extractRes;
        });

        console.log('[100-Msg Virtualized Extension Result]:', {
          success: extractResponse?.success,
          error: extractResponse?.error,
          count: extractResponse?.data?.messages?.length,
          completeness: extractResponse?.data?.completeness,
          elapsedMs: extractResponse?.data?.diagnostics?.elapsedMs,
          rounds: extractResponse?.data?.diagnostics?.rounds,
          pageErrors,
        });

        expect(pageErrors).toEqual([]);
        expect(extractResponse.success).toBe(true);
        expect(extractResponse.data.messages.length).toBe(100);
        expect(extractResponse.data.completeness?.status).toBe('Complete');
        expect(extractResponse.data.completeness?.reachedTop).toBe(true);
        for (let k = 0; k < 100; k++) {
          expect(extractResponse.data.messages[k].role).toBe(k % 2 === 0 ? 'user' : 'assistant');
          expect(extractResponse.data.messages[k].content).toMatch(
            new RegExp(`\\\\?\\[Turn ${k + 1}\\\\?\\]`)
          );
        }

        // Verify Studio loads all 100 messages cleanly
        const studioPage = await context.newPage();
        await studioPage.goto(`chrome-extension://${extensionId}/web/index.html?source=extension`, {
          waitUntil: 'domcontentloaded',
        });
        await studioPage.locator('text="100 of 100 messages included."').waitFor({ state: 'visible', timeout: 15000 });
        expect(await studioPage.locator('[id^="chat-turn-"]').count()).toBe(100);
        expect(await studioPage.locator('#chat-turn-0').textContent()).toContain('[Turn 1]');
        expect(await studioPage.locator('#chat-turn-99').textContent()).toContain('[Turn 100]');
      } finally {
        await closePersistentContextSafely(context);
        try {
          fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch {}
      }
    },
    90000
  );

  it(
    'Extension Full-DOM Heterogeneous 100-Message Chat (without unique data-turn-key & repeated prompts): extracts all 100 without testid collision or false incomplete warning',
    async () => {
      const extPath = path.resolve('dist-extension').replace(/\\/g, '/');
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat2pdf-100-ext-full-'));
      let context;

      try {
        context = await chromium.launchPersistentContext(userDataDir, {
          headless: false,
          args: [
            `--disable-extensions-except=${extPath}`,
            `--load-extension=${extPath}`,
            '--no-first-run',
            '--no-default-browser-check',
          ],
          timeout: 20000,
        });

        const page = await context.newPage();
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        // Serve a ChatGPT-like 100-message DOM where EVERY assistant message shares static data-testid="assistant-message"
        // (and NO data-turn-key) PLUS repeated "continue" prompts AND heterogeneous turn heights!
        await page.route('https://chatgpt.com/c/test-100-heterogeneous', (route) => {
          const items = Array.from({ length: 100 }, (_, i) => {
            const isUser = i % 2 === 0;
            // First 16 messages are short (80px), later 84 messages are tall (450px) to test heterogeneous height heuristic
            const boxH = i < 16 ? 80 : 450;
            if (isUser) {
              const text = i > 0 && i % 10 === 0 ? 'continue' : `[FullTurn ${i + 1}] User prompt #${i + 1}`;
              return `
                <div class="user-row" data-testid="user-message" data-message-author-role="user" style="min-height: ${boxH}px; padding: 12px;">
                  <div class="markdown"><p>${text}</p></div>
                </div>
              `;
            }
            return `
              <div class="assistant-row" data-testid="assistant-message" data-message-author-role="assistant" style="min-height: ${boxH}px; padding: 12px;">
                <div class="markdown prose">
                  <p>[FullTurn ${i + 1}] Detailed assistant answer #${i + 1}.</p>
                  <pre><code class="language-python"><span style="color: #93c5fd">def</span> fn_${i + 1}(): return ${i + 1}</code></pre>
                </div>
              </div>
            `;
          }).join('');

          route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `
              <!DOCTYPE html>
              <html>
              <head><title>100 Message Heterogeneous Chat</title></head>
              <body style="margin:0;">
                <main>
                  <div class="thread-scroll-container overflow-y-auto" style="height: 600px; overflow-y: auto;">
                    <div class="turn-list">${items}</div>
                  </div>
                </main>
                <script>
                  const s = document.querySelector('.thread-scroll-container');
                  s.scrollTop = s.scrollHeight - s.clientHeight;
                </script>
              </body>
              </html>
            `,
          });
        });

        await page.goto('https://chatgpt.com/c/test-100-heterogeneous', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);

        const extensionId = await getExtensionId(context);
        const popupPage = await context.newPage();
        await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);
        await popupPage.waitForLoadState('load');

        const extractResponse: any = await popupPage.evaluate(async () => {
          const tabs = await chrome.tabs.query({});
          let targetTabId: number | undefined;
          for (const t of tabs) {
            if (!t.id) continue;
            const pingRes: any = await new Promise((resolve) => {
              chrome.tabs.sendMessage(t.id!, { action: 'PING' }, (res) => {
                if (chrome.runtime.lastError || !res?.pong) resolve(null);
                else resolve(res);
              });
            });
            if (pingRes?.pong) {
              targetTabId = t.id;
              break;
            }
          }
          if (!targetTabId) return { success: false, error: 'Target tab not found' };

          return await new Promise((resolve) => {
            chrome.tabs.sendMessage(targetTabId!, { action: 'EXTRACT_FULL_CHAT' }, (res) => {
              if (chrome.runtime.lastError) resolve({ success: false, error: chrome.runtime.lastError.message });
              else resolve(res);
            });
          });
        });

        console.log('[100-Msg Heterogeneous Full-DOM Result]:', {
          success: extractResponse?.success,
          count: extractResponse?.data?.messages?.length,
          completeness: extractResponse?.data?.completeness,
          elapsedMs: extractResponse?.data?.diagnostics?.elapsedMs,
          rounds: extractResponse?.data?.diagnostics?.rounds,
          pageErrors,
        });

        expect(pageErrors).toEqual([]);
        expect(extractResponse.success).toBe(true);
        expect(extractResponse.data.messages.length).toBe(100);
        expect(extractResponse.data.completeness?.status).toBe('Complete');
        for (let k = 0; k < 100; k++) {
          expect(extractResponse.data.messages[k].role).toBe(k % 2 === 0 ? 'user' : 'assistant');
          if (k > 0 && k % 10 === 0) {
            expect(extractResponse.data.messages[k].content.trim()).toBe('continue');
          } else {
            expect(extractResponse.data.messages[k].content).toMatch(
              new RegExp(`\\\\?\\[FullTurn ${k + 1}\\\\?\\]`)
            );
          }
        }
      } finally {
        await closePersistentContextSafely(context);
        try {
          fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch {}
      }
    },
    90000
  );
});
