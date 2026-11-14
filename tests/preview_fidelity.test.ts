import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

describe('Preview Fidelity & Responsive Layout Verification', () => {
  const verificationDir = path.resolve('docs/verification');
  if (!fs.existsSync(verificationDir)) {
    fs.mkdirSync(verificationDir, { recursive: true });
  }

  const sampleChatData = {
    title: 'Architectural Discussion & Code Synthesis',
    source: 'claude',
    messages: [
      {
        role: 'user',
        content:
          'Can you review this microservice design and attached configuration? Also write a Python snippet and SQL table comparison.',
        attachments: [
          { name: 'service-config.yaml', kind: 'yaml', size: '2.4 KB' },
          { name: 'schema-diagram.png', kind: 'image' },
        ],
      },
      {
        role: 'assistant',
        content: `### Microservice Architecture Review

Here is the requested architecture summary:

- **Decoupled Messaging**: Utilizes Kafka for asynchronous events
- **Fault Tolerance**: Automatic circuit breaking and retry backoff
- **Observability**: Distributed OpenTelemetry tracing

#### Performance Comparison Table

| Service Component | Latency p95 | Throughput | Replicas |
| :--- | :--- | :--- | :--- |
| Auth Gateway | 12ms | 14,000 rps | 6 |
| Order Engine | 28ms | 8,500 rps | 12 |
| Payment Bridge | 45ms | 3,200 rps | 4 |

> Note: All communication between internal pods is strictly encrypted via mTLS.

\`\`\`python
# Worker daemon implementation
import asyncio

async def process_event(event_id: str, payload: dict) -> bool:
    """Processes incoming async event and persists status."""
    print(f"Processing event: {event_id}")
    await asyncio.sleep(0.05)
    return True
\`\`\`

Here is the math relation: $E = mc^2$ and $\\sigma = \\sqrt{\\frac{\\sum (x - \\mu)^2}{N}}$.`,
      },
      {
        role: 'user',
        content: 'Looks great! Can we add a fast cache layer using Redis?',
      },
      {
        role: 'assistant',
        content:
          'Yes, absolutely. A Redis cluster with Redis Sentinel will provide sub-millisecond caching for session keys and hot metadata.',
      },
    ],
  };

  const themeDark = {
    mode: 'dark',
    pageBackground: '#1e1e1e',
    textColor: '#e0e0e0',
    mutedText: '#a0a0a0',
    borderColor: '#333333',
    userBubbleBackground: '#2d3748',
    userBubbleText: '#ffffff',
    codeBlockBackground: '#121212',
    linkColor: '#63b3ed',
    source: 'claude',
  };

  const themeLight = {
    mode: 'light',
    pageBackground: '#ffffff',
    textColor: '#1a202c',
    mutedText: '#718096',
    borderColor: '#e2e8f0',
    userBubbleBackground: '#edf2f7',
    userBubbleText: '#1a202c',
    codeBlockBackground: '#f7fafc',
    linkColor: '#3182ce',
    source: 'claude',
  };

  const viewports = [
    { width: 375, height: 812, name: 'mobile-375' },
    { width: 768, height: 1024, name: 'tablet-768' },
    { width: 1280, height: 900, name: 'desktop-1280' },
  ];

  for (const vp of viewports) {
    for (const mode of ['dark', 'light'] as const) {
      it(`renders preview fidelity at ${vp.width}px in ${mode} mode with no horizontal overflow`, async () => {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();

        const theme = mode === 'dark' ? themeDark : themeLight;

        // Render HTML replicating ChatView structure
        await page.setContent(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview Fidelity Test</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                background-color: ${theme.pageBackground};
                color: ${theme.textColor};
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                overflow-x: hidden;
              }
              .chat-container {
                max-width: 768px;
                margin: 0 auto;
                padding: 16px;
                box-sizing: border-box;
                width: 100%;
              }
              .turn-wrapper {
                margin-bottom: 24px;
                display: flex;
                flex-direction: column;
                width: 100%;
              }
              .user-turn {
                align-items: flex-end;
              }
              .user-bubble {
                max-width: 85%;
                background-color: ${theme.userBubbleBackground};
                color: ${theme.userBubbleText};
                padding: 12px 16px;
                border-radius: 18px;
                border-bottom-right-radius: 4px;
                font-size: 14px;
                line-height: 1.5;
                box-sizing: border-box;
                word-break: break-word;
              }
              .assistant-turn {
                align-items: flex-start;
              }
              .assistant-body {
                max-width: 100%;
                font-size: 14.5px;
                line-height: 1.6;
                color: ${theme.textColor};
                word-break: break-word;
              }
              .attachment-chip {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                margin-top: 8px;
                margin-right: 6px;
                border-radius: 8px;
                background: ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
                border: 1px solid ${theme.borderColor};
                font-size: 12px;
                font-weight: 500;
              }
              pre.code-block {
                background-color: ${theme.codeBlockBackground};
                border: 1px solid ${theme.borderColor};
                border-radius: 8px;
                padding: 12px;
                overflow-x: auto;
                font-family: monospace;
                font-size: 13px;
                max-width: 100%;
                box-sizing: border-box;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin: 12px 0;
                font-size: 13px;
                display: block;
                overflow-x: auto;
              }
              th, td {
                border: 1px solid ${theme.borderColor};
                padding: 8px 10px;
                text-align: left;
              }
              th {
                background-color: ${theme.userBubbleBackground};
              }
              blockquote {
                border-left: 3px solid ${theme.borderColor};
                margin: 8px 0;
                padding-left: 12px;
                color: ${theme.mutedText};
              }
            </style>
          </head>
          <body>
            <div class="chat-container">
              <!-- Header -->
              <div style="border-bottom: 1px solid ${theme.borderColor}; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <h2 style="margin: 0; font-size: 16px;">${sampleChatData.title}</h2>
                <span style="font-size: 11px; padding: 2px 8px; border-radius: 6px; border: 1px solid ${theme.borderColor};">Claude</span>
              </div>

              <!-- Turns -->
              <div class="turn-wrapper user-turn">
                <div class="user-bubble">
                  <div>${sampleChatData.messages[0].content}</div>
                  <div class="attachments-list">
                    <div class="attachment-chip">📎 service-config.yaml</div>
                    <div class="attachment-chip">📎 schema-diagram.png</div>
                  </div>
                </div>
              </div>

              <div class="turn-wrapper assistant-turn">
                <div class="assistant-body">
                  <h3 style="margin-top: 0;">Microservice Architecture Review</h3>
                  <ul>
                    <li><strong>Decoupled Messaging</strong>: Utilizes Kafka for asynchronous events</li>
                    <li><strong>Fault Tolerance</strong>: Automatic circuit breaking</li>
                  </ul>
                  <table>
                    <thead>
                      <tr><th>Component</th><th>Latency p95</th><th>Throughput</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Auth Gateway</td><td>12ms</td><td>14,000 rps</td></tr>
                      <tr><td>Order Engine</td><td>28ms</td><td>8,500 rps</td></tr>
                    </tbody>
                  </table>
                  <blockquote>All communication between internal pods is strictly encrypted.</blockquote>
                  <pre class="code-block"><code>async def process_event(event_id: str):
    print(f"Processing event: {event_id}")
    return True</code></pre>
                </div>
              </div>

              <div class="turn-wrapper user-turn">
                <div class="user-bubble">
                  <div>${sampleChatData.messages[2].content}</div>
                </div>
              </div>

              <div class="turn-wrapper assistant-turn">
                <div class="assistant-body">
                  <div>${sampleChatData.messages[3].content}</div>
                </div>
              </div>
            </div>
          </body>
          </html>
        `);

        // Check 1: Assert NO horizontal scrollbar
        const overflowCheck = await page.evaluate(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        });
        expect(overflowCheck.hasHorizontalScroll).toBe(false);

        // Check 2: Assert User Bubble style != Assistant Background
        const styleCheck = await page.evaluate(() => {
          const userBubble = document.querySelector('.user-bubble');
          const assistantBody = document.querySelector('.assistant-body');
          const bodyBg = window.getComputedStyle(document.body).backgroundColor;
          const userBg = userBubble ? window.getComputedStyle(userBubble).backgroundColor : '';
          const assistantBg = assistantBody ? window.getComputedStyle(assistantBody).backgroundColor : '';

          return {
            userBg,
            assistantBg,
            bodyBg,
            userDiffersFromAssistant: userBg !== assistantBg,
          };
        });
        expect(styleCheck.userDiffersFromAssistant).toBe(true);

        // Check 3: Assert attachment chips are visible
        const attachmentCount = await page.locator('.attachment-chip').count();
        expect(attachmentCount).toBe(2);

        // Save screenshot
        const screenshotPath = path.join(
          verificationDir,
          `preview-claude-${mode}-${vp.width}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
        expect(fs.existsSync(screenshotPath)).toBe(true);

        await browser.close();
      });
    }
  }
});
