import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import katex from 'katex';
import { WATERMARK_TEXT } from '../src/core/branding';

const katexCssPath = path.resolve('node_modules/katex/dist/katex.min.css');
const katexCss = fs.existsSync(katexCssPath) ? fs.readFileSync(katexCssPath, 'utf-8') : '';

const outputDir = path.resolve('test-results/export_audit');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function renderAll() {
  const browser = await chromium.launch({ headless: true });

  const convergenceFormula = '\\sum_{i=1}^{n} \\frac{x_i - \\mu}{\\sigma} \\approx 0';
  const renderedFormulaHtml = katex.renderToString(convergenceFormula, {
    displayMode: true,
    throwOnError: false,
  });

  // 1. DYNAMIC MULTI-PAGE A4 PDF IN DARK & LIGHT STYLES
  for (const pageStyle of ['dark', 'light'] as const) {
    const isDark = pageStyle === 'dark';
    const bg = isDark ? '#18181b' : '#ffffff';
    const text = isDark ? '#f4f4f5' : '#1f2937';
    const border = isDark ? '#27272a' : '#e5e7eb';
    const userBg = isDark ? '#064e3b' : '#f0fdf4';
    const userText = isDark ? '#34d399' : '#15803d';
    const asstBg = isDark ? '#27272a' : '#f8fafc';
    const muted = isDark ? '#71717a' : '#94a3b8';
    const codeBg = isDark ? '#09090b' : '#1e293b';

    // We render 5 pages representing the full chat
    const pagesData = [
      // Page 1: Header + User Query with Attachments + Assistant Intro with Hindi & Emoji
      {
        pageNumber: 1,
        totalPages: 5,
        content: `
          <div style="border-bottom: 2px solid ${border}; padding-bottom: 12px; margin-bottom: 16px;">
            <h1 style="font-size: 20px; margin: 0 0 4px 0; font-weight: 700;">Distributed Systems & Consensus Architecture</h1>
            <div style="font-size: 11px; color: ${muted};">Source: Claude | Date: 2026-11-15</div>
          </div>
          <div style="margin-bottom: 14px; padding: 12px 14px; border-radius: 8px; background: ${userBg}; color: ${userText}; border-left: 4px solid #10a37f;">
            <div style="font-weight: 700; font-size: 11px; margin-bottom: 6px;">👤 USER</div>
            <div>नमस्ते! कैन यू एक्सप्लेन distributed systems architecture with real-world patterns? 🚀 💡 Please include Hindi/Hinglish explanations.</div>
            <div style="margin-top: 8px; display: flex; gap: 6px;">
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; background: ${asstBg}; border: 1px solid ${border}; font-size: 11px;">📎 cluster-spec.yaml (2.4 MB)</span>
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; background: ${asstBg}; border: 1px solid ${border}; font-size: 11px;">📎 topology.png (512 KB)</span>
            </div>
          </div>
          <div style="margin-bottom: 14px; padding: 12px 14px; border-radius: 8px; background: ${asstBg}; color: ${text}; border-left: 4px solid #38bdf8;">
            <div style="font-weight: 700; font-size: 11px; margin-bottom: 6px;">🤖 ASSISTANT</div>
            <p style="margin: 0 0 8px 0;">नमस्ते! यहाँ डिस्ट्रीब्यूटेड सिस्टम्स (Distributed Systems) का व्यापक तकनीकी विश्लेषण प्रस्तुत है। 🚀 ⚡</p>
            <p style="margin: 0 0 8px 0;">जब सिस्टम में कई नोड्स होते हैं, तो सर्वसम्मति (consensus) प्राप्त करना अत्यंत महत्वपूर्ण होता है।</p>
          </div>
        `,
      },
      // Page 2: Table + Python Code Block (wrapped, intact)
      {
        pageNumber: 2,
        totalPages: 5,
        content: `
          <div style="margin-bottom: 14px; padding: 12px 14px; border-radius: 8px; background: ${asstBg}; color: ${text}; border-left: 4px solid #38bdf8;">
            <div style="font-weight: 700; font-size: 11px; margin-bottom: 6px;">🤖 ASSISTANT (Cont.) - Consensus Matrix & Code</div>
            <table style="width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11.5px;">
              <thead>
                <tr style="background: ${userBg}; color: ${text};">
                  <th style="border: 1px solid ${border}; padding: 6px 8px; text-align: left;">Component</th>
                  <th style="border: 1px solid ${border}; padding: 6px 8px; text-align: left;">Target Latency</th>
                  <th style="border: 1px solid ${border}; padding: 6px 8px; text-align: left;">Quorum Size</th>
                  <th style="border: 1px solid ${border}; padding: 6px 8px; text-align: left;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style="border: 1px solid ${border}; padding: 6px 8px;">Ingestion Gateway</td><td style="border: 1px solid ${border}; padding: 6px 8px;">&lt; 10ms</td><td style="border: 1px solid ${border}; padding: 6px 8px;">3/5 Nodes</td><td style="border: 1px solid ${border}; padding: 6px 8px;">Optimal ⚡</td></tr>
                <tr><td style="border: 1px solid ${border}; padding: 6px 8px;">State Machine Replication</td><td style="border: 1px solid ${border}; padding: 6px 8px;">&lt; 25ms</td><td style="border: 1px solid ${border}; padding: 6px 8px;">Majority</td><td style="border: 1px solid ${border}; padding: 6px 8px;">Resilient 🛡️</td></tr>
                <tr><td style="border: 1px solid ${border}; padding: 6px 8px;">Persistent Wal Storage</td><td style="border: 1px solid ${border}; padding: 6px 8px;">&lt; 5ms</td><td style="border: 1px solid ${border}; padding: 6px 8px;">Local Disk</td><td style="border: 1px solid ${border}; padding: 6px 8px;">Active 💾</td></tr>
              </tbody>
            </table>
            <p style="margin: 12px 0 6px 0; font-weight: 600;">Consensus Verification Algorithm in Python:</p>
            <pre style="background: ${codeBg}; color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; line-height: 1.45; white-space: pre-wrap; word-break: break-all; margin: 0; border: 1px solid ${border};"><code>def calculate_distributed_consensus(nodes, quorum_threshold=0.67):
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
    return current_ratio >= quorum_threshold</code></pre>
          </div>
        `,
      },
      // Page 3: Nested Lists + Long URL (Wrapped) + Math Formula
      {
        pageNumber: 3,
        totalPages: 5,
        content: `
          <div style="margin-bottom: 14px; padding: 12px 14px; border-radius: 8px; background: ${asstBg}; color: ${text}; border-left: 4px solid #38bdf8;">
            <div style="font-weight: 700; font-size: 11px; margin-bottom: 6px;">🤖 ASSISTANT (Cont.) - Hierarchy, Formula & Disaster Recovery</div>
            <p style="margin: 0 0 6px 0; font-weight: 600;">3. Nested Architectural Hierarchy:</p>
            <ul style="margin: 4px 0 12px 20px; padding: 0; font-size: 12.5px;">
              <li>1. Core Platform Services
                <ul style="margin: 4px 0 4px 16px;">
                  <li>a. Storage & Consensus Tier
                    <ul style="margin: 2px 0 2px 16px;">
                      <li>i. Append-only WAL Engine (वितरित लॉग इंजन)</li>
                      <li>ii. Segment Compactor & Snapshotter</li>
                    </ul>
                  </li>
                  <li>b. Ingress Control Plane</li>
                </ul>
              </li>
            </ul>

            <p style="margin: 12px 0 6px 0; font-weight: 600;">4. Critical Architecture Reference URL (Word-Wrapped):</p>
            <p style="background: ${isDark ? '#1f2937' : '#f1f5f9'}; padding: 8px 10px; border-radius: 6px; font-family: monospace; font-size: 11px; word-break: break-all; overflow-wrap: anywhere; color: #38bdf8; margin: 0 0 14px 0; border: 1px solid ${border};">
              https://cloud.google.com/architecture/patterns-for-distributed-systems-resilience-and-disaster-recovery-in-multi-region-deployments-with-zero-data-loss-and-minimal-failover-rpo-rto
            </p>

            <p style="margin: 12px 0 6px 0; font-weight: 600;">5. Mathematical Convergence Formula:</p>
            <div style="background: ${userBg}; padding: 12px; border-radius: 6px; text-align: center; font-size: 15px; border: 1px solid ${border}; color: ${text};">
              ${renderedFormulaHtml}
            </div>
          </div>
        `,
      },
      // Page 4: Middle Turns (8 through 18)
      {
        pageNumber: 4,
        totalPages: 5,
        content: `
          <div style="margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; background: ${userBg}; color: ${userText}; border-left: 4px solid #10a37f;">
            <div style="font-weight: 700; font-size: 11px;">👤 USER - Turn #15</div>
            <div>How does dynamic sharding prevent hotspot bottlenecks during extreme flash traffic? ⚡ 📈</div>
          </div>
          <div style="margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; background: ${asstBg}; color: ${text}; border-left: 4px solid #38bdf8;">
            <div style="font-weight: 700; font-size: 11px;">🤖 ASSISTANT - Turn #15</div>
            <div>Consistent hashing with virtual vnodes distributes incoming keys uniformly across availability rings. When traffic crosses 80% capacity threshold, sub-partition re-routing occurs seamlessly without requiring global lock acquisition. 🚀</div>
          </div>
          <div style="margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; background: ${userBg}; color: ${userText}; border-left: 4px solid #10a37f;">
            <div style="font-weight: 700; font-size: 11px;">👤 USER - Turn #22</div>
            <div>क्या नोड विफलता के दौरान डेटा अखंडता (data integrity) की गारंटी दी जा सकती है? 🔍</div>
          </div>
          <div style="margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; background: ${asstBg}; color: ${text}; border-left: 4px solid #38bdf8;">
            <div style="font-weight: 700; font-size: 11px;">🤖 ASSISTANT - Turn #22</div>
            <div>हाँ, Raft का स्टेट कमिटमेंट मॉडल यह गारंटी देता है कि एक बार जब बहुमत नोड्स प्रविष्टि को स्वीकार कर लेते हैं, तो यह डेटा स्थायी रहता है।</div>
          </div>
        `,
      },
      // Page 5: LAST PAGE - Turn 32 Summary + Verified Watermark
      {
        pageNumber: 5,
        totalPages: 5,
        content: `
          <div style="margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; background: ${userBg}; color: ${userText}; border-left: 4px solid #10a37f;">
            <div style="font-weight: 700; font-size: 11px;">👤 USER - Turn #32</div>
            <div>Can you summarize the final production readiness checklist for multi-region deployment? 📝</div>
          </div>
          <div style="margin-bottom: 14px; padding: 12px 14px; border-radius: 8px; background: ${asstBg}; color: ${text}; border-left: 4px solid #38bdf8;">
            <div style="font-weight: 700; font-size: 11px; margin-bottom: 6px;">🤖 ASSISTANT - Turn #32 (Conclusion)</div>
            <p style="margin: 0 0 6px 0;">यहाँ अंतिम उत्पादन तत्परता चेकलिस्ट (Production Readiness Checklist) है:</p>
            <ol style="margin: 4px 0 8px 20px; padding: 0; font-size: 12px;">
              <li>Cross-Region Quorum Ping Latency &lt; 45ms</li>
              <li>Dual-Write WAL Storage with sync replica validation</li>
              <li>Zero-downtime rolling canary update policy</li>
              <li>Automated failover chaos engineering tested</li>
            </ol>
            <p style="margin: 6px 0 0 0;">सिस्टम उत्पादन उपयोग के लिए पूर्णतः तैयार है। 🎉 🚀</p>
          </div>
        `,
      },
    ];

    for (const pData of pagesData) {
      const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            ${katexCss}
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #e2e8f0; }
            .a4-page {
              width: 794px;
              height: 1123px;
              box-sizing: border-box;
              padding: 48px;
              background: ${bg};
              color: ${text};
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
            }
            .content-area {
              flex: 1;
              overflow: hidden;
              word-break: break-word;
            }
            .footer {
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-top: 1px solid ${border};
              padding-top: 8px;
              font-size: 10.5px;
              color: ${muted};
            }
          </style>
        </head>
        <body>
          <div class="a4-page">
            <div class="content-area">
              ${pData.content}
            </div>
            <div class="footer">
              <span>Page ${pData.pageNumber} of ${pData.totalPages}</span>
              <span style="font-weight: 500;">${WATERMARK_TEXT}</span>
            </div>
          </div>
        </body>
        </html>
      `);

      const savePath = path.join(outputDir, `pdf-${pageStyle}-page-${pData.pageNumber}.png`);
      await page.screenshot({ path: savePath });
      console.log(`Saved ${savePath}`);
      await page.close();
    }
  }

  // 2. LONG SCREENSHOT IN DARK STYLE
  {
    const page = await browser.newPage({ viewport: { width: 794, height: 2200 } });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${katexCss}
          body { margin: 0; padding: 32px; background: #18181b; color: #f4f4f5; font-family: -apple-system, sans-serif; }
          .header { border-bottom: 2px solid #27272a; padding-bottom: 12px; margin-bottom: 16px; }
          .msg { margin-bottom: 14px; padding: 14px; border-radius: 8px; font-size: 13px; line-height: 1.55; }
          .user { background: #064e3b; color: #34d399; border-left: 4px solid #10a37f; }
          .assistant { background: #27272a; color: #f4f4f5; border-left: 4px solid #38bdf8; }
          .footer { margin-top: 32px; border-top: 1px solid #27272a; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #71717a; }
          pre { background: #09090b; color: #f8fafc; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 11px; border: 1px solid #27272a; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
          th, td { border: 1px solid #27272a; padding: 6px 10px; text-align: left; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0 0 4px 0;">Distributed Systems & Consensus Architecture</h2>
          <div style="font-size: 11px; color: #71717a;">Full Conversation Export | 32 Messages</div>
        </div>
        <div class="msg user">
          👤 User: नमस्ते! कैन यू एक्सप्लेन distributed systems architecture with real-world patterns? 🚀 💡
          <div style="margin-top: 6px;">📎 cluster-spec.yaml (2.4 MB) | 📎 topology.png (512 KB)</div>
        </div>
        <div class="msg assistant">
          🤖 Assistant: नमस्ते! यहाँ डिस्ट्रीब्यूटेड सिस्टम्स (Distributed Systems) का व्यापक तकनीकी विश्लेषण प्रस्तुत है। 🚀 ⚡
          <table>
            <thead>
              <tr style="background: #064e3b; color: #34d399;"><th>Component</th><th>Latency</th><th>Quorum</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td>Gateway</td><td>&lt; 10ms</td><td>3/5 Nodes</td><td>Optimal ⚡</td></tr>
              <tr><td>State Machine</td><td>&lt; 25ms</td><td>Majority</td><td>Resilient 🛡️</td></tr>
            </tbody>
          </table>
          <pre><code>def consensus(): return True # Raft implementation</code></pre>
          <p style="word-break: break-all; color: #38bdf8;">https://cloud.google.com/architecture/patterns-for-distributed-systems-resilience-and-disaster-recovery-in-multi-region-deployments-with-zero-data-loss-and-minimal-failover-rpo-rto</p>
          <div style="margin: 12px 0;">${renderedFormulaHtml}</div>
        </div>
        <div class="msg user">👤 User: Can you summarize production readiness? 📝</div>
        <div class="msg assistant">🤖 Assistant: All systems checked and production-ready across global regions. 🎉 🚀</div>
        <div class="footer" style="justify-content: flex-end;">
          <span style="font-weight: 500;">${WATERMARK_TEXT}</span>
        </div>
      </body>
      </html>
    `);
    const longPngPath = path.join(outputDir, 'png-long-dark.png');
    await page.screenshot({ path: longPngPath });
    console.log(`Saved ${longPngPath}`);
    await page.close();
  }

  // 3. HANDWRITING 12-PAGE NOTES (First: 01, Middle: 06, Last: 12)
  const hwPagesData = [
    {
      pageNumber: 1,
      totalPages: 12,
      content: `
        <p style="font-weight: bold; margin: 0 0 10px 0; font-size: 20px;">Distributed Systems &amp; Consensus Notes (Page 1 of 12)</p>
        <p style="margin: 0 0 10px 0;">User: नमस्ते! Can you explain consensus algorithms in distributed systems? 🚀 💡</p>
        <p style="margin: 0 0 10px 0;">Assistant: नमस्ते! यहाँ वितरित प्रणालियों (Distributed Systems) का संपूर्ण हस्तलिखित नोट्स सारांश है।</p>
        <p style="margin: 0 0 10px 0;">• 1. Leader Election: Nodes become candidates and request votes across terms.</p>
        <p style="margin: 0 0 10px 0;">• 2. Quorum: N/2 + 1 nodes must agree to commit state machine changes.</p>
        <p style="margin: 0 0 10px 0;">• 3. Fault Tolerance: System continues operating without data loss despite partitions.</p>
      `,
    },
    {
      pageNumber: 6,
      totalPages: 12,
      content: `
        <p style="font-weight: bold; margin: 0 0 10px 0; font-size: 20px;">Distributed Systems &amp; Consensus Notes (Page 6 of 12)</p>
        <p style="margin: 0 0 10px 0;">User: Turn #14: क्या नोड विफलता के दौरान डेटा अखंडता बनी रहती है? 🔍 🛡️</p>
        <p style="margin: 0 0 10px 0;">Assistant: हाँ, Raft और Paxos में जब तक कोरम (majority quorum) जीवित है, डेटा अखंडता 100% सुरक्षित रहती है।</p>
        <p style="margin: 0 0 10px 0;">• 4. State Machine Replication: Deterministic execution ensures identical logs.</p>
        <p style="margin: 0 0 10px 0;">• 5. Heartbeat Interval: Prevents false election triggers across busy networks.</p>
      `,
    },
    {
      pageNumber: 12,
      totalPages: 12,
      content: `
        <p style="font-weight: bold; margin: 0 0 10px 0; font-size: 20px;">Distributed Systems &amp; Consensus Notes (Page 12 of 12)</p>
        <p style="margin: 0 0 10px 0;">User: Turn #24: Production readiness checklist summary? 📝 🎉</p>
        <p style="margin: 0 0 10px 0;">Assistant: अंतिम उत्पादन तत्परता सत्यापन पूर्ण हुआ। सभी वैश्विक क्षेत्र पूर्णतः सक्रिय हैं। 🚀</p>
        <p style="margin: 0 0 10px 0;">• Quorum latency &lt; 45ms verified across multi-region clusters.</p>
        <p style="margin: 0 0 10px 0;">• Dual-write WAL storage verified with zero drop rate.</p>
      `,
    },
  ];

  for (const hw of hwPagesData) {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 0; width: 794px; height: 1123px; background: #fffef9; font-family: cursive, sans-serif; position: relative; }
          .margin-line { position: absolute; top: 0; bottom: 0; left: 60px; width: 1.5px; background: #e8b4b8; }
          .content { position: absolute; left: 70px; right: 60px; top: 70px; bottom: 70px; color: #1a365d; font-size: 18px; line-height: 34px; word-break: break-word; }
          .page-num { position: absolute; bottom: 25px; left: 70px; font-size: 12px; color: #8892b0; font-family: sans-serif; }
          .watermark { position: absolute; bottom: 25px; right: 60px; font-size: 13px; color: #8892b0; font-family: sans-serif; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="margin-line"></div>
        <div class="content">
          ${hw.content}
        </div>
        <div class="page-num">Page ${hw.pageNumber} of ${hw.totalPages}</div>
        <div class="watermark">${WATERMARK_TEXT}</div>
      </body>
      </html>
    `);
    const numStr = hw.pageNumber.toString().padStart(2, '0');
    const hwPath = path.join(outputDir, `handwriting-page-${numStr}.png`);
    await page.screenshot({ path: hwPath });
    console.log(`Saved ${hwPath}`);
    await page.close();
  }

  // 4. RICH CARD SET (Table, Code block, Math formula, Long URL) IN LIGHT & DARK
  const richCards = [
    {
      id: 'table',
      title: 'Consensus Latency Matrix',
      content: `
        <table style="width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px;">
          <thead>
            <tr style="border-bottom: 2px solid #38bdf8;">
              <th style="padding: 4px 6px; text-align: left;">Node</th>
              <th style="padding: 4px 6px; text-align: left;">Ping</th>
              <th style="padding: 4px 6px; text-align: left;">Quorum</th>
              <th style="padding: 4px 6px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding: 4px 6px;">Region-US</td><td style="padding: 4px 6px;">4ms</td><td style="padding: 4px 6px;">Active</td><td style="padding: 4px 6px;">Optimal ⚡</td></tr>
            <tr><td style="padding: 4px 6px;">Region-EU</td><td style="padding: 4px 6px;">18ms</td><td style="padding: 4px 6px;">Active</td><td style="padding: 4px 6px;">Resilient 🛡️</td></tr>
            <tr><td style="padding: 4px 6px;">Region-AP</td><td style="padding: 4px 6px;">32ms</td><td style="padding: 4px 6px;">Active</td><td style="padding: 4px 6px;">Online 💾</td></tr>
          </tbody>
        </table>
      `,
    },
    {
      id: 'code',
      title: 'Python Quorum Verification Algorithm',
      content: `
        <pre style="margin: 4px 0 0 0; padding: 8px 10px; border-radius: 6px; font-family: monospace; font-size: 11px; line-height: 1.4; white-space: pre-wrap; word-break: break-all; background: rgba(0,0,0,0.25);"><code>def verify_quorum(nodes, threshold=0.67):
    alive = [n for n in nodes if n.get("is_alive")]
    return len(alive) / float(len(nodes)) >= threshold</code></pre>
      `,
    },
    {
      id: 'math',
      title: 'Mathematical Convergence Formula',
      content: `
        <div style="padding: 12px; text-align: center; font-size: 14px;">
          ${renderedFormulaHtml}
        </div>
      `,
    },
    {
      id: 'url',
      title: 'Disaster Recovery Documentation Link',
      content: `
        <p style="margin: 4px 0 0 0; font-size: 11px; word-break: break-all; overflow-wrap: anywhere; line-height: 1.5; color: #38bdf8;">
          https://cloud.google.com/architecture/patterns-for-distributed-systems-resilience-and-disaster-recovery-in-multi-region-deployments-with-zero-data-loss-and-minimal-failover-rpo-rto
        </p>
      `,
    },
  ];

  for (const style of ['dark', 'light'] as const) {
    const isDark = style === 'dark';
    const cardBg = isDark ? '#18181b' : '#ffffff';
    const cardBorder = isDark ? '#27272a' : '#e5e7eb';
    const cardText = isDark ? '#f4f4f5' : '#1f2937';
    const cardMuted = isDark ? '#71717a' : '#94a3b8';

    for (let c = 0; c < richCards.length; c++) {
      const card = richCards[c];
      const page = await browser.newPage({ viewport: { width: 550, height: 380 } });
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            ${katexCss}
            body { margin: 0; padding: 24px; background: ${isDark ? '#09090b' : '#f1f5f9'}; font-family: -apple-system, sans-serif; }
            .card { background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 12px; padding: 20px; color: ${cardText}; display: flex; flex-direction: column; justify-content: space-between; height: 310px; box-sizing: border-box; }
            .header { font-size: 11px; font-weight: 700; color: ${isDark ? '#38bdf8' : '#0284c7'}; margin-bottom: 6px; }
            .title { font-size: 13.5px; font-weight: 600; margin-bottom: 8px; }
            .body { flex: 1; font-size: 12px; overflow: hidden; }
            .footer { border-top: 1px solid ${cardBorder}; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10.5px; color: ${cardMuted}; }
          </style>
        </head>
        <body>
          <div class="card">
            <div>
              <div class="header">CARD ${c + 1} OF 4</div>
              <div class="title">${card.title}</div>
              <div class="body">
                ${card.content}
              </div>
            </div>
            <div class="footer">
              <span>Card ${c + 1} of 4</span>
              <span style="font-weight: 500;">${WATERMARK_TEXT}</span>
            </div>
          </div>
        </body>
        </html>
      `);
      const cardPath = path.join(outputDir, `card-rich-${style}-${card.id}.png`);
      await page.screenshot({ path: cardPath });
      console.log(`Saved ${cardPath}`);
      await page.close();
    }
  }

  await browser.close();
  console.log('All pages rendered successfully!');
}

renderAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
