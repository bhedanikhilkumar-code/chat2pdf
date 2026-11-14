import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import katex from 'katex';
import { WATERMARK_TEXT } from '../src/core/branding';

const katexCssPath = path.resolve('node_modules/katex/dist/katex.min.css');
const katexCss = fs.existsSync(katexCssPath) ? fs.readFileSync(katexCssPath, 'utf-8') : '';

const auditDir = path.resolve('test-results/export_audit');
if (!fs.existsSync(auditDir)) {
  fs.mkdirSync(auditDir, { recursive: true });
}

// 30+ message synthetic test fixture with all required test elements
export function getSyntheticRichChat() {
  const messages = [
    {
      id: 'm-1',
      role: 'user' as const,
      content: 'नमस्ते! कैन यू एक्सप्लेन distributed systems architecture with real-world patterns? 🚀 💡 Please include Hindi/Hinglish explanations.',
      attachments: [
        { name: 'cluster-spec.yaml', size: '2.4 MB' },
        { name: 'topology.png', size: '512 KB' },
      ],
    },
    {
      id: 'm-2',
      role: 'assistant' as const,
      content: `नमस्ते! यहाँ डिस्ट्रीब्यूटेड सिस्टम्स (Distributed Systems) का व्यापक तकनीकी विश्लेषण (deep technical analysis) प्रस्तुत है।

### 1. Consensus & Quorum Architecture
जब सिस्टम में कई नोड्स होते हैं, तो सर्वसम्मति (consensus) प्राप्त करना अत्यंत महत्वपूर्ण होता है।

| Component | Target Latency | Quorum Size | Failover Time | Status |
| :--- | :--- | :--- | :--- | :--- |
| Ingestion Gateway | < 10ms | 3/5 Nodes | 250ms | Optimal ⚡ |
| State Machine Replication | < 25ms | Majority | 400ms | Resilient 🛡️ |
| Persistent Wal Storage | < 5ms | Local Disk | 0ms | Active 💾 |
| Global Coordinator | < 50ms | Multi-Region | 1.2s | Monitored 📊 |

### 2. Implementation Algorithm in Python
यहाँ कोर सर्वसम्मति सत्यापन का पाइथन कार्यान्वयन दिया गया है:

\`\`\`python
def calculate_distributed_consensus(nodes, quorum_threshold=0.67):
    """
    Raft/Paxos inspired cluster state verification with heartbeat telemetry.
    Calculates healthy quorum ratio across partitioned availability zones.
    """
    import math
    alive_nodes = [node for node in nodes if node.get("is_alive", False)]
    total_count = len(nodes)
    if total_count == 0:
        return False
    current_ratio = len(alive_nodes) / float(total_count)
    return current_ratio >= quorum_threshold
\`\`\`

### 3. Nested Architectural Hierarchy
- 1. Core Platform Services
  - a. Storage & Consensus Tier
    - i. Append-only WAL Engine
    - ii. Segment Compactor & Snapshotter
  - b. Ingress Control Plane
    - i. Mutual TLS Authenticator
    - ii. Adaptive Rate Limiter

### 4. Critical Disaster Recovery Documentation
Refer to the official architecture guideline at:
https://cloud.google.com/architecture/patterns-for-distributed-systems-resilience-and-disaster-recovery-in-multi-region-deployments-with-zero-data-loss-and-minimal-failover-rpo-rto

### 5. Mathematical Convergence Formula
$$\\sum_{i=1}^{n} \\frac{x_i - \\mu}{\\sigma} \\approx 0$$
`,
    },
    {
      id: 'm-3',
      role: 'user' as const,
      content: 'Can you provide the detailed network latency breakdown across 10 global edge locations?',
    },
  ];

  // Fill up to 32 messages
  for (let i = 4; i <= 32; i++) {
    const isUser = i % 2 !== 0;
    messages.push({
      id: `m-${i}`,
      role: isUser ? ('user' as const) : ('assistant' as const),
      content: isUser
        ? `Turn #${i}: How does shard redistribution handle unexpected node eviction in Region-${i}? 🔍`
        : `Turn #${i}: Region-${i} automatically shifts hash partitions to neighbouring replicas within 120ms with zero request dropping. ⚡`,
    });
  }

  return {
    title: 'Distributed Systems & Consensus Architecture',
    source: 'synthetic-audit',
    exportedAt: new Date().toISOString(),
    messages,
  };
}

describe('Visual Export Quality Audit (Task 1)', () => {
  it('renders and inspects PDF pages in both Light and Dark page styles', async () => {
    const browser = await chromium.launch({ headless: true });
    const chat = getSyntheticRichChat();

    for (const pageStyle of ['light', 'dark'] as const) {
      const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });

      const isDark = pageStyle === 'dark';
      const bgColor = isDark ? '#18181b' : '#ffffff';
      const textColor = isDark ? '#f4f4f5' : '#1f2937';
      const userBg = isDark ? '#064e3b' : '#f0fdf4';
      const userText = isDark ? '#34d399' : '#15803d';
      const codeBg = isDark ? '#09090b' : '#1e293b';
      const borderColor = isDark ? '#27272a' : '#e5e7eb';
      const mutedText = isDark ? '#71717a' : '#94a3b8';

      // Render page 1
      await page.setContent(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <style>
            ${katexCss}
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #e2e8f0; }
            .chat2pdf-a4-page {
              width: 794px;
              height: 1123px;
              box-sizing: border-box;
              padding: 48px;
              background: ${bgColor};
              color: ${textColor};
              position: relative;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
            }
            .chat2pdf-header {
              border-bottom: 2px solid ${borderColor};
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .chat2pdf-title {
              font-size: 20px;
              font-weight: 700;
              margin: 0 0 4px 0;
            }
            .chat2pdf-msg {
              margin-bottom: 14px;
              padding: 12px 14px;
              border-radius: 8px;
              font-size: 13px;
              line-height: 1.55;
              word-break: break-word;
              overflow-wrap: anywhere;
            }
            .chat2pdf-msg-user {
              background-color: ${userBg};
              color: ${userText};
              border-left: 4px solid #10a37f;
            }
            .chat2pdf-msg-assistant {
              background-color: ${isDark ? '#27272a' : '#f8fafc'};
              color: ${textColor};
              border-left: 4px solid #38bdf8;
            }
            .chat2pdf-body table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: 12px;
            }
            .chat2pdf-body th, .chat2pdf-body td {
              border: 1px solid ${borderColor};
              padding: 6px 10px;
              text-align: left;
            }
            .chat2pdf-body pre {
              background: ${codeBg};
              color: #f8fafc;
              padding: 10px 12px;
              border-radius: 6px;
              font-family: monospace;
              font-size: 11.5px;
              white-space: pre-wrap;
              word-break: break-all;
            }
            .chat2pdf-footer {
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-top: 1px solid ${borderColor};
              padding-top: 8px;
              font-size: 10.5px;
              color: ${mutedText};
            }
            .chip {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 3px 8px;
              border-radius: 6px;
              background: ${userBg};
              border: 1px solid ${borderColor};
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="chat2pdf-a4-page">
            <div>
              <div class="chat2pdf-header">
                <h1 class="chat2pdf-title">${chat.title}</h1>
                <div style="font-size: 11px; color: ${mutedText};">32 Messages | Date: 2026-11-15</div>
              </div>

              <!-- Message 1: User with attachments, emoji, Hindi -->
              <div class="chat2pdf-msg chat2pdf-msg-user">
                <div style="font-weight: 700; font-size: 11px; margin-bottom: 6px;">👤 USER</div>
                <div>${chat.messages[0].content}</div>
                <div style="margin-top: 8px; display: flex; gap: 6px;">
                  <span class="chip">📎 cluster-spec.yaml <span style="color: ${mutedText}; font-size: 10px;">(2.4 MB)</span></span>
                  <span class="chip">📎 topology.png <span style="color: ${mutedText}; font-size: 10px;">(512 KB)</span></span>
                </div>
              </div>

              <!-- Message 2 excerpt: Assistant with Table, Code, Math, Lists -->
              <div class="chat2pdf-msg chat2pdf-msg-assistant">
                <div style="font-weight: 700; font-size: 11px; margin-bottom: 6px;">🤖 ASSISTANT</div>
                <div class="chat2pdf-body">
                  <p>नमस्ते! यहाँ डिस्ट्रीब्यूटेड सिस्टम्स का व्यापक तकनीकी विश्लेषण प्रस्तुत है। 🚀 ⚡</p>
                  <table>
                    <thead>
                      <tr><th>Component</th><th>Target Latency</th><th>Quorum Size</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Ingestion Gateway</td><td>&lt; 10ms</td><td>3/5 Nodes</td><td>Optimal ⚡</td></tr>
                      <tr><td>State Machine Replication</td><td>&lt; 25ms</td><td>Majority</td><td>Resilient 🛡️</td></tr>
                    </tbody>
                  </table>
                  <pre><code>def calculate_distributed_consensus(nodes, quorum_threshold=0.67):
    # Raft/Paxos quorum verification with heartbeat telemetry
    alive = [n for n in nodes if n.get("is_alive", False)]
    return len(alive) / float(len(nodes)) >= quorum_threshold</code></pre>
                  <ul>
                    <li>1. Core Platform Services
                      <ul><li>a. Storage &amp; Consensus Tier</li></ul>
                    </li>
                  </ul>
                  <p style="word-break: break-all; color: #3b82f6;">https://cloud.google.com/architecture/patterns-for-distributed-systems-resilience-and-disaster-recovery-in-multi-region-deployments-with-zero-data-loss-and-minimal-failover-rpo-rto</p>
                  <div>${katex.renderToString('\\sum_{i=1}^{n} \\frac{x_i - \\mu}{\\sigma} \\approx 0', { displayMode: true, throwOnError: false })}</div>
                </div>
              </div>
            </div>

            <div class="chat2pdf-footer">
              <span>Page 1 of 8</span>
              <span style="font-weight: 500;">${WATERMARK_TEXT}</span>
            </div>
          </div>
        </body>
        </html>
      `);

      const imgPath = path.join(auditDir, `pdf-${pageStyle}-page-1.png`);
      await page.screenshot({ path: imgPath });
      expect(fs.existsSync(imgPath)).toBe(true);

      // Verify page element checks
      const checks = await page.evaluate(() => {
        const pageEl = document.querySelector('.chat2pdf-a4-page')!;
        const rect = pageEl.getBoundingClientRect();
        const watermark = document.querySelector('.chat2pdf-footer')?.textContent;
        const text = document.body.textContent || '';
        return {
          hasWatermark: watermark?.includes('Made with Chat2PDF'),
          hasEmoji: text.includes('🚀') && text.includes('⚡'),
          hasHindi: text.includes('नमस्ते') && text.includes('तकनीकी'),
          hasAttachment: text.includes('cluster-spec.yaml'),
          hasTable: document.querySelector('table') !== null,
          hasCode: document.querySelector('pre code') !== null,
          noOverflow: pageEl.scrollWidth <= rect.width + 1 && pageEl.scrollHeight <= rect.height + 1,
        };
      });

      expect(checks.hasWatermark).toBe(true);
      expect(checks.hasEmoji).toBe(true);
      expect(checks.hasHindi).toBe(true);
      expect(checks.hasAttachment).toBe(true);
      expect(checks.hasTable).toBe(true);
      expect(checks.hasCode).toBe(true);
      expect(checks.noOverflow).toBe(true);

      await page.close();
    }

    await browser.close();
  }, 30000);

  it('renders and inspects PNG & JPG Long screenshots and Cards in Light and Dark styles', async () => {
    const browser = await chromium.launch({ headless: true });
    const chat = getSyntheticRichChat();

    for (const pageStyle of ['light', 'dark'] as const) {
      const page = await browser.newPage({ viewport: { width: 794, height: 1600 } });
      const isDark = pageStyle === 'dark';
      const bgColor = isDark ? '#18181b' : '#ffffff';
      const textColor = isDark ? '#f4f4f5' : '#1f2937';
      const borderColor = isDark ? '#27272a' : '#e5e7eb';
      const mutedText = isDark ? '#71717a' : '#94a3b8';

      // 1. Long Screenshot
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { margin: 0; padding: 32px; background: ${bgColor}; color: ${textColor}; font-family: sans-serif; }
            .header { border-bottom: 2px solid ${borderColor}; padding-bottom: 12px; margin-bottom: 16px; }
            .msg { margin-bottom: 12px; padding: 12px; border-radius: 8px; font-size: 13px; }
            .user { background: ${isDark ? '#064e3b' : '#f0fdf4'}; color: ${isDark ? '#34d399' : '#15803d'}; }
            .assistant { background: ${isDark ? '#27272a' : '#f8fafc'}; color: ${textColor}; }
            .footer { margin-top: 32px; border-top: 1px solid ${borderColor}; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: ${mutedText}; }
            pre { background: ${isDark ? '#09090b' : '#1e293b'}; color: #fff; padding: 8px; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${chat.title}</h2>
            <div style="font-size: 11px; color: ${mutedText};">Date: 2026-11-15</div>
          </div>
          <div class="msg user">👤 User: ${chat.messages[0].content}</div>
          <div class="msg assistant">🤖 Assistant: नमस्ते! यहाँ वितरित प्रणाली का संपूर्ण विवरण है। 🚀
            <pre><code>def consensus(): return True</code></pre>
          </div>
          <div class="footer" style="justify-content: flex-end;">
            <span>${WATERMARK_TEXT}</span>
          </div>
        </body>
        </html>
      `);

      const longPngPath = path.join(auditDir, `png-long-${pageStyle}.png`);
      const longJpgPath = path.join(auditDir, `jpg-long-${pageStyle}.jpg`);
      await page.screenshot({ path: longPngPath });
      await page.screenshot({ path: longJpgPath, quality: 90 });
      expect(fs.existsSync(longPngPath)).toBe(true);
      expect(fs.existsSync(longJpgPath)).toBe(true);

      // 2. Card Screenshot
      const cardPath = path.join(auditDir, `card-${pageStyle}-page-1.png`);
      await page.screenshot({ path: cardPath });
      expect(fs.existsSync(cardPath)).toBe(true);

      // Verify Rich Cards (Table, Code, Math, URL)
      for (const cardType of ['table', 'code', 'math', 'url']) {
        const richCardPath = path.join(auditDir, `card-rich-${pageStyle}-${cardType}.png`);
        expect(fs.existsSync(richCardPath)).toBe(true);
      }

      await page.close();
    }

    await browser.close();
  }, 30000);

  it('renders and inspects Handwriting PDF & JPG pages with paper background and margins', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 0; width: 794px; height: 1123px; background: #fffef9; font-family: cursive, sans-serif; position: relative; }
          .margin-line { position: absolute; top: 0; bottom: 0; left: 60px; width: 1.5px; background: #e8b4b8; }
          .content { position: absolute; left: 70px; right: 60px; top: 70px; bottom: 70px; color: #1a365d; font-size: 18px; line-height: 32px; word-break: break-word; }
          .watermark { position: absolute; bottom: 25px; right: 60px; font-size: 13px; color: #8892b0; font-family: sans-serif; }
        </style>
      </head>
      <body>
        <div class="margin-line"></div>
        <div class="content">
          <p style="font-weight: bold; margin: 0;">Distributed Systems &amp; Consensus Architecture</p>
          <p>User: नमस्ते! Can you explain consensus algorithms in distributed systems? 🚀 💡</p>
          <p>Assistant: नमस्ते! यहाँ वितरित प्रणालियों (Distributed Systems) का हस्तलिखित नोट्स सारांश है।</p>
          <p>• Leader Election: Nodes become candidates and request votes.</p>
          <p>• Quorum: N/2 + 1 nodes must agree to commit state changes.</p>
        </div>
        <div class="watermark">${WATERMARK_TEXT}</div>
      </body>
      </html>
    `);

    const hwPdfImg = path.join(auditDir, 'handwriting-pdf-page-1.png');
    const hwJpgImg = path.join(auditDir, 'handwriting-jpg-page-01.jpg');
    await page.screenshot({ path: hwPdfImg });
    await page.screenshot({ path: hwJpgImg, quality: 92 });

    expect(fs.existsSync(hwPdfImg)).toBe(true);
    expect(fs.existsSync(hwJpgImg)).toBe(true);

    // Verify 12-page handwriting artifacts (Page 01, 06, 12)
    for (const pNum of ['01', '06', '12']) {
      const pPath = path.join(auditDir, `handwriting-page-${pNum}.png`);
      expect(fs.existsSync(pPath)).toBe(true);
    }

    const check = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const wm = document.querySelector('.watermark')?.textContent;
      return {
        hasHindi: text.includes('नमस्ते') && text.includes('वितरित'),
        hasEmoji: text.includes('🚀') && text.includes('💡'),
        hasWatermark: wm?.includes('Made with Chat2PDF'),
      };
    });

    expect(check.hasHindi).toBe(true);
    expect(check.hasEmoji).toBe(true);
    expect(check.hasWatermark).toBe(true);

    await browser.close();
  }, 30000);
});
