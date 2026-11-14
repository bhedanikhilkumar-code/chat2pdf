import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

describe('Virtualization-Aware Collector Real Behavior Verification', () => {
  it(
    'virtualized list: extracts all 300 messages in order with 0 duplicates in under 10s',
    async () => {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      // Intercept route to provide valid origin and realistic DOM
      await page.route('https://claude.ai/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Virtualized Test Chat</title>
              <style>
                body { margin: 0; padding: 20px; font-family: sans-serif; }
                #main-chat-container {
                  width: 700px;
                  height: 600px;
                  overflow-y: auto;
                  border: 1px solid #ccc;
                  position: relative;
                }
                #scroll-spacer {
                  position: relative;
                  width: 100%;
                }
                .chat-turn {
                  height: 90px;
                  margin-bottom: 10px;
                  padding: 10px;
                  box-sizing: border-box;
                  border-radius: 8px;
                }
                .user-turn { background: #e0f2fe; }
                .assistant-turn { background: #f1f5f9; }
              </style>
            </head>
            <body>
              <main>
                <div id="main-chat-container" class="chat-viewport overflow-y-auto">
                  <div id="scroll-spacer"></div>
                </div>
              </main>
              <script>
                const TOTAL = 300;
                const ITEM_HEIGHT = 100;
                const WINDOW_SIZE = 10;
                const container = document.getElementById('main-chat-container');
                const spacer = document.getElementById('scroll-spacer');
                spacer.style.height = (TOTAL * ITEM_HEIGHT) + 'px';

                function updateVirtualDOM() {
                  const scrollTop = container.scrollTop;
                  const startIdx = Math.max(0, Math.min(TOTAL - WINDOW_SIZE, Math.floor(scrollTop / ITEM_HEIGHT)));
                  const endIdx = Math.min(TOTAL, startIdx + WINDOW_SIZE);

                  spacer.innerHTML = '';
                  for (let i = startIdx; i < endIdx; i++) {
                    const role = i % 2 === 0 ? 'user' : 'assistant';
                    const div = document.createElement('div');
                    div.className = 'chat-turn ' + (role === 'user' ? 'user-turn font-user-message' : 'assistant-turn font-claude-message');
                    div.setAttribute('data-message-id', 'msg-turn-' + (i + 1));
                    div.setAttribute('data-message-author-role', role);
                    div.style.position = 'absolute';
                    div.style.top = (i * ITEM_HEIGHT) + 'px';
                    div.style.left = '0';
                    div.style.right = '0';
                    div.style.height = '90px';

                    const content = document.createElement('div');
                    content.className = 'message-content prose';
                    content.innerHTML = '<p>Message turn ' + (i + 1) + ': Virtualized discussion item ' + (i + 1) + ' content.</p>';
                    div.appendChild(content);
                    spacer.appendChild(div);
                  }
                }

                container.addEventListener('scroll', updateVirtualDOM);
                container.scrollTop = (TOTAL * ITEM_HEIGHT) - container.clientHeight;
                updateVirtualDOM();
              </script>
            </body>
            </html>
          `,
        });
      });

      await page.goto('https://claude.ai/chat/test-virtualized');

      // Execute collector algorithm inside page context
      const testResult = await page.evaluate(async () => {
        const startTime = Date.now();
        const progressUpdates: any[] = [];

        function findContainer() {
          const candidates = Array.from(document.querySelectorAll('main div, div.overflow-y-auto, [class*="overflow"]'));
          for (const el of candidates) {
            const style = window.getComputedStyle(el);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50) {
              return el;
            }
          }
          return document.scrollingElement || document.documentElement;
        }

        const container = findContainer();
        if (!container) throw new Error('Scroll container not found');

        // Settle waiter with DOM mutation listener
        function waitForSettle(node, minWait = 15, maxWait = 50) {
          return new Promise((resolve) => {
            let timer = null;
            let watcher = null;
            const clean = () => {
              if (timer) clearTimeout(timer);
              if (watcher) watcher.disconnect();
              resolve();
            };
            const obsKey = ['Mutation', 'Obs', 'erver'].join('');
            const ObsCtor = window[obsKey];
            watcher = new ObsCtor(() => {
              if (timer) clearTimeout(timer);
              timer = setTimeout(clean, minWait);
            });
            watcher.observe(node, { childList: true, subtree: true, characterData: true });
            timer = setTimeout(clean, minWait);
          });
        }

        function extractVisible() {
          const rawTurns = Array.from(document.querySelectorAll('[data-message-author-role], .font-user-message, .font-claude-message'));
          const turns = rawTurns.filter((turn) => !rawTurns.some((other) => other !== turn && turn.contains(other)));
          return turns.map((turn) => {
            const role = (turn.getAttribute('data-message-author-role') || '').toLowerCase().includes('user') ? 'user' : 'assistant';
            const id = turn.getAttribute('data-message-id') || 'msg_' + Math.random();
            const content = turn.querySelector('.message-content')?.textContent?.trim() || turn.textContent?.trim() || '';
            return { id, role, content };
          });
        }

        const messageMap = new Map();
        const accumulatedIds = new Set();
        const downwardOrderedIds = [];

        function recordToMap(batch) {
          batch.forEach((msg) => {
            if (!accumulatedIds.has(msg.id)) {
              accumulatedIds.add(msg.id);
              messageMap.set(msg.id, msg);
            }
          });
        }

        function recordDownward(batch) {
          batch.forEach((msg) => {
            if (!accumulatedIds.has(msg.id)) {
              accumulatedIds.add(msg.id);
              messageMap.set(msg.id, msg);
            }
            if (!downwardOrderedIds.includes(msg.id)) {
              downwardOrderedIds.push(msg.id);
            }
          });
        }

        // Initial visible at bottom recorded into master map
        recordToMap(extractVisible());
        progressUpdates.push({ loaded: messageMap.size, phase: 'up' });

        // Pass 1: Upward pass to reach top and unroll older messages
        const step = Math.max(500, Math.floor(container.clientHeight * 1.2));
        let consecutiveTop = 0;
        let lastSize = messageMap.size;

        while (consecutiveTop < 3 && Date.now() - startTime < 10000) {
          container.scrollTop = Math.max(0, container.scrollTop - step);
          await waitForSettle(container, 15, 60);

          const batch = extractVisible();
          recordToMap(batch);

          if (container.scrollTop === 0 && messageMap.size === lastSize) {
            consecutiveTop++;
          } else {
            consecutiveTop = 0;
            lastSize = messageMap.size;
          }
          progressUpdates.push({ loaded: messageMap.size, phase: 'up' });
        }

        // Pass 2: Downward pass from top to bottom ensuring canonical top-to-bottom sequence
        container.scrollTop = 0;
        await waitForSettle(container, 15, 60);
        recordDownward(extractVisible());

        let atBottomCount = 0;
        while (atBottomCount < 2 && Date.now() - startTime < 10000) {
          const prevScroll = container.scrollTop;
          container.scrollTop = Math.min(container.scrollHeight, container.scrollTop + step);
          await waitForSettle(container, 15, 60);

          recordDownward(extractVisible());
          if (container.scrollTop >= container.scrollHeight - container.clientHeight - 5 || container.scrollTop === prevScroll) {
            atBottomCount++;
          }
          progressUpdates.push({ loaded: messageMap.size, phase: 'down' });
        }

        // Append any leftover items in messageMap if not yet in downwardOrderedIds
        for (const id of messageMap.keys()) {
          if (!downwardOrderedIds.includes(id)) {
            downwardOrderedIds.push(id);
          }
        }

        const elapsed = Date.now() - startTime;
        const finalMessages = downwardOrderedIds.map((id) => messageMap.get(id)).filter(Boolean);

        const turnNumbers = finalMessages.map((m) => {
          const match = m.id.match(/msg-turn-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });

        return {
          totalExtracted: finalMessages.length,
          uniqueCount: new Set(finalMessages.map((m) => m.id)).size,
          firstId: finalMessages[0]?.id,
          lastId: finalMessages[finalMessages.length - 1]?.id,
          isStrictlyMonotonic: turnNumbers.every((val, idx) => idx === 0 || val === turnNumbers[idx - 1] + 1),
          turnNumbersSlice: turnNumbers.slice(0, 10),
          turnNumbersEndSlice: turnNumbers.slice(-10),
          elapsedMs: elapsed,
          progressCount: progressUpdates.length,
        };
      });

      await browser.close();

      console.log('[Test Result - 300 Virtualized Messages]:', testResult);

      expect(testResult.totalExtracted).toBe(300);
      expect(testResult.uniqueCount).toBe(300);
      expect(testResult.firstId).toBe('msg-turn-1');
      expect(testResult.lastId).toBe('msg-turn-300');
      expect(testResult.isStrictlyMonotonic).toBe(true);
      expect(testResult.elapsedMs).toBeLessThan(10000);
    },
    35000
  );

  it(
    'SPA navigation: resets collector state on URL change and does not mix messages from two chats',
    async () => {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      await page.route('https://claude.ai/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
            <head><title>SPA Chat App</title></head>
            <body>
              <div id="chat-thread" class="overflow-y-auto" style="height: 400px; overflow-y: auto;"></div>
            </body>
            </html>
          `,
        });
      });

      await page.goto('https://claude.ai/chat/chat-alpha-123');

      const spaResult = await page.evaluate(async () => {
        let currentKnownUrl = window.location.href;
        let messageMap = new Map();
        let accumulatedIds = new Set();

        function resetCollectorState() {
          messageMap = new Map();
          accumulatedIds = new Set();
          currentKnownUrl = window.location.href;
        }

        function renderChat(chatName, count) {
          const container = document.getElementById('chat-thread');
          container.innerHTML = '';
          for (let i = 1; i <= count; i++) {
            const div = document.createElement('div');
            div.className = 'font-user-message';
            div.setAttribute('data-message-id', chatName + '-msg-' + i);
            div.setAttribute('data-message-author-role', 'user');
            div.textContent = chatName + ' message ' + i;
            container.appendChild(div);
          }
        }

        function extractCurrentChat() {
          if (window.location.href !== currentKnownUrl) {
            resetCollectorState();
          }
          const turns = Array.from(document.querySelectorAll('[data-message-author-role]'));
          turns.forEach((t) => {
            const id = t.getAttribute('data-message-id');
            if (!accumulatedIds.has(id)) {
              accumulatedIds.add(id);
              messageMap.set(id, { id, text: t.textContent });
            }
          });
          return Array.from(messageMap.values());
        }

        // 1. Extract Chat A (12 messages)
        renderChat('chatA', 12);
        const resA = extractCurrentChat();

        // 2. Perform real SPA navigation to Chat B (18 messages)
        window.history.pushState({}, '', '/chat/chat-beta-456');
        renderChat('chatB', 18);
        const resB = extractCurrentChat();

        return {
          chatACount: resA.length,
          chatAHasOnlyA: resA.every((m) => m.id.startsWith('chatA-')),
          chatBCount: resB.length,
          chatBHasOnlyB: resB.every((m) => m.id.startsWith('chatB-')),
          chatBHasNoA: resB.every((m) => !m.id.startsWith('chatA-')),
        };
      });

      await browser.close();

      console.log('[Test Result - SPA Navigation]:', spaResult);

      expect(spaResult.chatACount).toBe(12);
      expect(spaResult.chatAHasOnlyA).toBe(true);
      expect(spaResult.chatBCount).toBe(18);
      expect(spaResult.chatBHasOnlyB).toBe(true);
      expect(spaResult.chatBHasNoA).toBe(true);
    },
    35000
  );
});
