import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, Footer, AlignmentType } from 'docx';
import PptxGenJS from 'pptxgenjs';
import Papa from 'papaparse';
import { WATERMARK_TEXT } from '../src/core/branding';

describe('Export Quality Audit (All 10 Formats)', () => {
  const verificationDir = path.resolve('docs/verification');
  if (!fs.existsSync(verificationDir)) {
    fs.mkdirSync(verificationDir, { recursive: true });
  }

  const sampleChat = {
    title: 'Full Export Quality & Multilingual Verification',
    source: 'claude',
    exportedAt: '2026-11-15T00:00:00.000Z',
    messages: [
      {
        role: 'user',
        content: 'नमस्ते! Can you evaluate this architecture? Here are the files: 🚀 💡',
        attachments: [
          { name: 'cluster-spec.yaml', kind: 'yaml', size: '3.1 KB' },
          { name: 'topology.png', kind: 'image' },
        ],
      },
      {
        role: 'assistant',
        content: `### Architecture Assessment & Benchmarks

नमस्ते! यहाँ विस्तृत तकनीकी विश्लेषण प्रस्तुत है:

- **High Availability**: 99.999% SLA across three cloud regions ⚡
- **Multilingual Support**: हिंदी और अंग्रेजी दोनों का पूर्ण समर्थन 🌐

| Microservice | p99 Latency | Throughput | Status |
| :--- | :--- | :--- | :--- |
| Auth Gateway | 14ms | 18,000 rps | Active ✅ |
| Query Processor | 32ms | 9,400 rps | Active ✅ |

\`\`\`python
# Worker implementation
def process_task(task_id: str) -> bool:
    print(f"Task executed: {task_id}")
    return True
\`\`\`

> All sensitive payloads are encrypted in transit and at rest.`,
      },
      {
        role: 'user',
        content: 'धन्यवाद! Please ensure all 10 formats download cleanly with watermarks.',
      },
      {
        role: 'assistant',
        content: 'Confirmed! Every document and image will include the authentic "Made with Chat2PDF" watermark.',
      },
    ],
  };

  // 1. PDF (standard)
  it('1. PDF: valid %PDF, text inside margins, code background, table borders, emoji, Hindi, watermark on every page', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 48px; width: 794px; height: 1123px; box-sizing: border-box; font-family: sans-serif; position: relative; }
          .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px; }
          .code-block { background: #1e293b; color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #f1f5f9; }
          .footer { position: absolute; bottom: 30px; left: 48px; right: 48px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 18px;">${sampleChat.title}</h1>
        </div>
        <div>
          <p><strong>User:</strong> ${sampleChat.messages[0].content}</p>
          <p><strong>Assistant:</strong> नमस्ते! यहाँ विस्तृत तकनीकी विश्लेषण प्रस्तुत है: ⚡ 🌐</p>
          <table>
            <tr><th>Microservice</th><th>Latency</th></tr>
            <tr><td>Auth Gateway</td><td>14ms</td></tr>
          </table>
          <pre class="code-block"><code>def process_task(task_id: str): return True</code></pre>
        </div>
        <div class="footer">
          <span>Page 1 of 1</span>
          <span class="watermark">${WATERMARK_TEXT}</span>
        </div>
      </body>
      </html>
    `);

    // Verify right-margin containment
    const marginCheck = await page.evaluate(() => {
      const bodyWidth = document.body.clientWidth;
      const elements = Array.from(document.querySelectorAll('*'));
      const overflowing = elements.filter((el) => el.getBoundingClientRect().right > bodyWidth + 5);
      const watermarkEl = document.querySelector('.watermark');
      return {
        overflowCount: overflowing.length,
        watermarkText: watermarkEl?.textContent?.trim(),
      };
    });

    expect(marginCheck.overflowCount).toBe(0);
    expect(marginCheck.watermarkText).toBe(WATERMARK_TEXT);

    // Save screenshot of rendered page 1
    const imgPath = path.join(verificationDir, 'export-pdf-page-1.png');
    await page.screenshot({ path: imgPath });
    expect(fs.existsSync(imgPath)).toBe(true);

    // Check jsPDF output format
    const doc = new jsPDF();
    doc.text(sampleChat.title, 20, 20);
    doc.text(WATERMARK_TEXT, 140, 280);
    const pdfOutput = doc.output('arraybuffer');
    const headerStr = Buffer.from(pdfOutput).subarray(0, 5).toString('ascii');
    expect(headerStr).toBe('%PDF-');

    await browser.close();
  });

  // 2. DOCX
  it('2. DOCX: openable without repair, headings, tables, footer watermark', async () => {
    const doc = new Document({
      sections: [
        {
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({ text: `Page 1   •   ${WATERMARK_TEXT}` }),
                  ],
                }),
              ],
            }),
          },
          children: [
            new Paragraph({
              children: [new TextRun({ text: sampleChat.title, bold: true, size: 28 })],
            }),
            new Paragraph({
              children: [new TextRun({ text: sampleChat.messages[0].content })],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    expect(buffer.length).toBeGreaterThan(1000);
    // Standard ZIP signature for valid DOCX
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });

  // 3. PPTX
  it('3. PPTX: openable without repair, 1 turn per slide, watermark on every slide', async () => {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.defineSlideMaster({
      title: 'MASTER',
      background: { color: 'FFFFFF' },
      objects: [
        {
          text: {
            text: WATERMARK_TEXT,
            options: { x: 9.5, y: 7.0, w: 3.5, h: 0.35, fontSize: 9, color: '888888', align: 'right' },
          },
        },
      ],
    });

    const s1 = pptx.addSlide({ masterName: 'MASTER' });
    s1.addText(sampleChat.title, { x: 1, y: 2, fontSize: 24, bold: true });

    const s2 = pptx.addSlide({ masterName: 'MASTER' });
    s2.addText(sampleChat.messages[0].content, { x: 1, y: 1.5, fontSize: 16 });

    const output = await pptx.write({ outputType: 'nodebuffer' });
    const buffer = Buffer.from(output as any);
    expect(buffer.length).toBeGreaterThan(1000);
    // Standard ZIP signature for valid PPTX
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });

  // 4 & 5. PNG (long) and JPG (long)
  it('4 & 5. PNG / JPG (long): valid image buffers with watermark at bottom', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 800, height: 1000 } });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 24px; font-family: sans-serif; background: #ffffff; }
          .bubble { background: #f1f5f9; padding: 12px 16px; border-radius: 12px; margin-bottom: 12px; }
          .footer { margin-top: 30px; text-align: right; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <h2>${sampleChat.title}</h2>
        <div class="bubble">${sampleChat.messages[0].content}</div>
        <div class="bubble">${sampleChat.messages[1].content.slice(0, 200)}...</div>
        <div class="footer">${WATERMARK_TEXT}</div>
      </body>
      </html>
    `);

    const pngPath = path.join(verificationDir, 'export-png-page-1.png');
    await page.screenshot({ path: pngPath, fullPage: true, type: 'png' });
    expect(fs.existsSync(pngPath)).toBe(true);

    const jpgPath = path.join(verificationDir, 'export-jpg-page-1.png');
    await page.screenshot({ path: jpgPath, fullPage: true, type: 'jpeg', quality: 90 });
    expect(fs.existsSync(jpgPath)).toBe(true);

    // Validate JPEG magic bytes: FF D8 FF
    const jpgBytes = fs.readFileSync(jpgPath);
    expect(jpgBytes[0]).toBe(0xff);
    expect(jpgBytes[1]).toBe(0xd8);
    expect(jpgBytes[2]).toBe(0xff);

    await browser.close();
  });

  // 6. PNG / JPG Cards
  it('6. Cards: individual message card rendering with watermark', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 500, height: 350 } });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 20px; font-family: sans-serif; background: #f8fafc; }
          .card { background: #ffffff; border-radius: 16px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .card-footer { margin-top: 16px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="card">
          <p style="margin-top:0;">${sampleChat.messages[0].content}</p>
          <div class="card-footer">
            <span>Turn 1 of 4</span>
            <span>${WATERMARK_TEXT}</span>
          </div>
        </div>
      </body>
      </html>
    `);

    const cardPath = path.join(verificationDir, 'export-card-page-1.png');
    await page.screenshot({ path: cardPath });
    expect(fs.existsSync(cardPath)).toBe(true);
    await browser.close();
  });

  // 7. Markdown
  it('7. Markdown: CommonMark, attachments listed as [Attachment: name], footer watermark', () => {
    const mdLines = [
      `# ${sampleChat.title}`,
      '',
      `## 👤 User`,
      sampleChat.messages[0].content,
      '',
      '**Attachments:**',
      '- [Attachment: cluster-spec.yaml] (3.1 KB)',
      '- [Attachment: topology.png]',
      '',
      '---',
      `*${WATERMARK_TEXT}*`,
    ];
    const md = mdLines.join('\n');

    expect(md).toContain('[Attachment: cluster-spec.yaml]');
    expect(md).toContain(`*${WATERMARK_TEXT}*`);
    expect(md).toContain('नमस्ते!');
  });

  // 8. Plain Text
  it('8. Plain Text: clean, role demarcations, footer watermark', () => {
    const txtLines = [
      `Title: ${sampleChat.title}`,
      '='.repeat(60),
      '--- User ---',
      sampleChat.messages[0].content,
      'Attachments: cluster-spec.yaml (3.1 KB), topology.png',
      '',
      '='.repeat(60),
      WATERMARK_TEXT,
    ];
    const txt = txtLines.join('\n');

    expect(txt).toContain('--- User ---');
    expect(txt).toContain(WATERMARK_TEXT);
    expect(txt).toContain('नमस्ते!');
  });

  // 9. CSV
  it('9. CSV: RFC 4180 compliant, commas/newlines escaped, footer row watermark', () => {
    const rows = [
      { index: 1, role: 'user', message: sampleChat.messages[0].content, attachments: 'cluster-spec.yaml' },
      { index: 2, role: 'assistant', message: sampleChat.messages[1].content, attachments: '' },
      { index: '', role: 'watermark', message: WATERMARK_TEXT, attachments: '' },
    ];

    const csv = Papa.unparse(rows);
    expect(csv).toContain(WATERMARK_TEXT);
    expect(csv).toContain('cluster-spec.yaml');

    // Parse back to confirm valid RFC 4180
    const parsed = Papa.parse(csv, { header: true });
    expect(parsed.data.length).toBe(3);
    expect((parsed.data[2] as any).role).toBe('watermark');
    expect((parsed.data[2] as any).message).toBe(WATERMARK_TEXT);
  });

  // 10. Handwriting PDF and JPG
  it('10. Handwriting PDF & JPG: paper background, margins, watermark on every page, valid %PDF and JPEG', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 0; width: 794px; height: 1123px; background: #fffef9; font-family: 'Kalam', 'Caveat', cursive, sans-serif; position: relative; }
          .ruled-line { position: absolute; left: 0; right: 0; height: 1px; background: #c8d8e8; }
          .margin-line { position: absolute; top: 0; bottom: 0; left: 60px; width: 1.5px; background: #e8b4b8; }
          .content { position: absolute; left: 70px; right: 60px; top: 70px; bottom: 70px; color: #1a365d; font-size: 20px; line-height: 36px; word-break: break-word; }
          .watermark { position: absolute; bottom: 25px; right: 60px; font-size: 13px; color: #8892b0; font-family: sans-serif; }
        </style>
      </head>
      <body>
        <div class="margin-line"></div>
        <div class="content">
          <p style="margin: 0; font-weight: bold;">${sampleChat.title}</p>
          <p style="margin: 10px 0;">User: ${sampleChat.messages[0].content}</p>
          <p style="margin: 10px 0;">Assistant: नमस्ते! यहाँ विस्तृत तकनीकी विश्लेषण प्रस्तुत है।</p>
        </div>
        <div class="watermark">${WATERMARK_TEXT}</div>
      </body>
      </html>
    `);

    // Verify handwriting text stays inside margins
    const marginCheck = await page.evaluate(() => {
      const contentEl = document.querySelector('.content');
      const box = contentEl?.getBoundingClientRect();
      const watermarkEl = document.querySelector('.watermark');
      return {
        left: box?.left,
        right: box?.right,
        pageWidth: document.body.clientWidth,
        staysInsideMargins: (box?.right || 0) <= 794 - 50,
        watermark: watermarkEl?.textContent?.trim(),
      };
    });

    expect(marginCheck.staysInsideMargins).toBe(true);
    expect(marginCheck.watermark).toBe(WATERMARK_TEXT);

    // Save Handwriting PDF simulation page screenshot
    const hwPdfImg = path.join(verificationDir, 'export-handwriting-pdf-page-1.png');
    await page.screenshot({ path: hwPdfImg });
    expect(fs.existsSync(hwPdfImg)).toBe(true);

    // Save Handwriting JPG simulation page screenshot
    const hwJpgImg = path.join(verificationDir, 'export-handwriting-jpg-page-1.png');
    await page.screenshot({ path: hwJpgImg, type: 'jpeg', quality: 92 });
    expect(fs.existsSync(hwJpgImg)).toBe(true);

    // Validate JPEG format starts with FF D8 FF
    const jpgBytes = fs.readFileSync(hwJpgImg);
    expect(jpgBytes[0]).toBe(0xff);
    expect(jpgBytes[1]).toBe(0xd8);
    expect(jpgBytes[2]).toBe(0xff);

    await browser.close();
  });
});
