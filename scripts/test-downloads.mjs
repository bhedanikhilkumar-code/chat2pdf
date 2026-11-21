import { chromium } from 'playwright';
import { createServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import JSZip from 'jszip';

const OUTPUT_DIR = path.resolve('test-results/downloads');

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

async function validateFile(filePath, fmt) {
  const buf = fs.readFileSync(filePath);
  if (buf.length === 0) {
    throw new Error(`File is empty: ${filePath}`);
  }

  if (fmt === 'pdf' || fmt === 'handwriting-pdf') {
    const header = buf.toString('utf-8', 0, 4);
    if (header !== '%PDF') {
      throw new Error(`Invalid PDF header: ${header}`);
    }
  } else if (fmt === 'png') {
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
      throw new Error('Invalid PNG magic bytes');
    }
  } else if (fmt === 'jpg' || fmt === 'handwriting-jpg') {
    if (buf[0] !== 0xff || buf[1] !== 0xd8) {
      throw new Error('Invalid JPG magic bytes');
    }
  } else if (fmt === 'docx') {
    const zip = await JSZip.loadAsync(buf);
    if (!zip.file('word/document.xml')) {
      throw new Error('Invalid DOCX: missing word/document.xml');
    }
  } else if (fmt === 'pptx') {
    const zip = await JSZip.loadAsync(buf);
    if (!zip.file('ppt/presentation.xml')) {
      throw new Error('Invalid PPTX: missing ppt/presentation.xml');
    }
  } else if (fmt === 'md' || fmt === 'txt' || fmt === 'csv') {
    const str = buf.toString('utf-8');
    if (!str.includes('Chat2PDF') && !str.includes('TypeScript')) {
      throw new Error(`File content suspicious: ${str.slice(0, 100)}`);
    }
  } else if (fmt === 'json') {
    const parsed = JSON.parse(buf.toString('utf-8'));
    if (!parsed.messages || !Array.isArray(parsed.messages)) {
      throw new Error('Invalid JSON: missing messages array');
    }
  }
  return buf.length;
}

export async function runDownloadTests() {
  cleanDir(OUTPUT_DIR);
  const webDir = path.join(OUTPUT_DIR, 'web');
  const extDir = path.join(OUTPUT_DIR, 'extension');
  fs.mkdirSync(webDir, { recursive: true });
  fs.mkdirSync(extDir, { recursive: true });

  const results = {};
  const formats = [
    'PDF',
    'DOCX',
    'PPTX',
    'PNG',
    'JPG',
    'MD',
    'TXT',
    'CSV',
    'JSON',
    'Handwriting PDF',
    'Handwriting JPG',
  ];

  for (const f of formats) {
    results[f] = { web: 'NOT RUN', ext: 'NOT RUN', webSize: 0, extSize: 0 };
  }

  // --- PART 1: Web App Downloads ---
  console.log('\n--- Running Web App Download Tests ---');
  let viteServer;
  let webBrowser;
  try {
    viteServer = await createServer({
      server: { port: 5188 },
      logLevel: 'error',
    });
    await viteServer.listen();
    const serverUrl = 'http://localhost:5188';

    webBrowser = await chromium.launch({ headless: true });
    const context = await webBrowser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    await page.goto(serverUrl, { waitUntil: 'networkidle' });

    // Load sample chat
    const sampleBtn = page.locator('button:has-text("Load Sample Chat")');
    await sampleBtn.waitFor({ state: 'visible', timeout: 8000 });
    await sampleBtn.click();
    await page.waitForTimeout(300);

    // Parse & Preview
    await page.locator('button:has-text("Parse & Preview")').click();
    await page.waitForTimeout(400);

    // Choose Format & Export
    const exportStepBtn = page.locator('button:has-text("Choose Format & Export")');
    await exportStepBtn.waitFor({ state: 'visible', timeout: 8000 });
    await exportStepBtn.click();
    await page.waitForTimeout(400);

    // Test standard formats
    const standardFormats = [
      { name: 'PDF', id: 'pdf', ext: '.pdf', selector: 'text="PDF Document"' },
      { name: 'DOCX', id: 'docx', ext: '.docx', selector: 'text="Word (.docx)"' },
      { name: 'PPTX', id: 'pptx', ext: '.pptx', selector: 'text="PowerPoint (.pptx)"' },
      { name: 'PNG', id: 'png', ext: '.png', selector: 'text="PNG Image"' },
      { name: 'JPG', id: 'jpg', ext: '.jpg', selector: 'text="JPG Image"' },
      { name: 'MD', id: 'md', ext: '.md', selector: 'text="Markdown (.md)"' },
      { name: 'TXT', id: 'txt', ext: '.txt', selector: 'text="Plain Text (.txt)"' },
      { name: 'CSV', id: 'csv', ext: '.csv', selector: 'text="CSV Table (.csv)"' },
      { name: 'JSON', id: 'json', ext: '.json', selector: 'text="JSON Data (.json)"' },
    ];

    for (const fmt of standardFormats) {
      try {
        const card = page.locator(fmt.selector).first();
        await card.scrollIntoViewIfNeeded();
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 15000 }),
          card.click(),
        ]);
        const filename = `web-test-${fmt.id}${fmt.ext}`;
        const savePath = path.join(webDir, filename);
        await download.saveAs(savePath);
        const size = await validateFile(savePath, fmt.id);
        results[fmt.name].web = 'PASS';
        results[fmt.name].webSize = size;
        console.log(`  ✓ Web ${fmt.name}: PASS (${size} bytes)`);
      } catch (err) {
        results[fmt.name].web = `FAIL: ${err.message}`;
        console.error(`  ✗ Web ${fmt.name}: FAIL -`, err.message);
      }
      await page.waitForTimeout(400);
    }

    // Test Handwriting PDF
    try {
      const hwCard = page.locator('text="Handwritten Notes"').first();
      await hwCard.scrollIntoViewIfNeeded();
      await hwCard.click();
      await page.waitForTimeout(400);

      // Ensure radio is PDF
      const pdfRadio = page.locator('input[type="radio"][value="pdf"]');
      if (await pdfRadio.isVisible()) await pdfRadio.check();

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        page.locator('button:has-text("Generate Handwritten PDF")').click(),
      ]);
      const savePath = path.join(webDir, 'web-test-handwriting.pdf');
      await download.saveAs(savePath);
      const size = await validateFile(savePath, 'handwriting-pdf');
      results['Handwriting PDF'].web = 'PASS';
      results['Handwriting PDF'].webSize = size;
      console.log(`  ✓ Web Handwriting PDF: PASS (${size} bytes)`);
    } catch (err) {
      results['Handwriting PDF'].web = `FAIL: ${err.message}`;
      console.error(`  ✗ Web Handwriting PDF: FAIL -`, err.message);
    }
    await page.waitForTimeout(400);

    // Test Handwriting JPG
    try {
      const jpgRadio = page.locator('input[type="radio"][value="jpg"]');
      await jpgRadio.check();
      await page.waitForTimeout(200);

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        page.locator('button:has-text("Generate Handwritten JPG")').click(),
      ]);
      const savePath = path.join(webDir, 'web-test-handwriting.jpg');
      await download.saveAs(savePath);
      const size = await validateFile(savePath, 'handwriting-jpg');
      results['Handwriting JPG'].web = 'PASS';
      results['Handwriting JPG'].webSize = size;
      console.log(`  ✓ Web Handwriting JPG: PASS (${size} bytes)`);
    } catch (err) {
      results['Handwriting JPG'].web = `FAIL: ${err.message}`;
      console.error(`  ✗ Web Handwriting JPG: FAIL -`, err.message);
    }
  } finally {
    if (webBrowser) await webBrowser.close();
    if (viteServer) await viteServer.close();
  }

  // --- PART 2: Extension Context Downloads ---
  console.log('\n--- Running Extension Context Download Tests ---');
  const extPath = path.resolve('dist-extension').replace(/\\/g, '/');
  const tempUserDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat2pdf-ext-download-'));
  let extContext;

  try {
    extContext = await chromium.launchPersistentContext(tempUserDir, {
      headless: false,
      acceptDownloads: true,
      args: [
        `--disable-extensions-except=${extPath}`,
        `--load-extension=${extPath}`,
        '--no-first-run',
        '--no-default-browser-check',
      ],
      timeout: 15000,
    });

    // Find extension ID via chrome://extensions
    const page = await extContext.newPage();
    await page.goto('chrome://extensions');
    await page.waitForTimeout(1000);

    const items = await page.locator('extensions-item').all();
    let extensionId = '';
    for (const item of items) {
      const name = await item.locator('#name').textContent();
      if (name?.includes('Chat2PDF')) {
        extensionId = (await item.getAttribute('id')) || '';
        break;
      }
    }

    if (!extensionId) {
      throw new Error('Chat2PDF extension not found in chrome://extensions');
    }

    const exporterPage = await extContext.newPage();
    const exporterUrl = `chrome-extension://${extensionId}/web/index.html?source=extension`;
    await exporterPage.goto(exporterUrl);
    await exporterPage.waitForLoadState('load');

    // Populate chrome.storage.local with sample chat payload
    const sampleChatPayload = {
      title: 'Extension Test Conversation',
      source: 'chatgpt',
      messages: [
        {
          role: 'user',
          content: 'What are the main advantages of TypeScript and strong typing? नमस्ते!',
        },
        {
          role: 'assistant',
          content: 'TypeScript provides compile-time safety and enhanced tooling.\n\n| Feature | Benefit |\n|---|---|\n| Static Types | Catch bugs early |\n| Autocomplete | Boost productivity |\n\n```typescript\ninterface Config {\n  debug: boolean;\n}\n```\n\nEnjoy TypeScript with हिंदी support! 🎉',
        },
      ],
    };

    await exporterPage.evaluate(async (data) => {
      return new Promise((resolve) => {
        // @ts-ignore
        chrome.storage.local.set({ chat2pdf_extracted_data: data }, () => {
          resolve(true);
        });
      });
    }, sampleChatPayload);

    // Reload exporter page so it picks up the storage payload
    await exporterPage.reload();
    await exporterPage.waitForLoadState('load');
    await exporterPage.waitForTimeout(800);

    // Click Choose Format & Export
    const exportStepBtn = exporterPage.locator('button:has-text("Choose Format & Export")');
    await exportStepBtn.waitFor({ state: 'visible', timeout: 8000 });
    await exportStepBtn.click();
    await exporterPage.waitForTimeout(400);

    // Test standard formats
    const standardFormats = [
      { name: 'PDF', id: 'pdf', ext: '.pdf', selector: 'text="PDF Document"' },
      { name: 'DOCX', id: 'docx', ext: '.docx', selector: 'text="Word (.docx)"' },
      { name: 'PPTX', id: 'pptx', ext: '.pptx', selector: 'text="PowerPoint (.pptx)"' },
      { name: 'PNG', id: 'png', ext: '.png', selector: 'text="PNG Image"' },
      { name: 'JPG', id: 'jpg', ext: '.jpg', selector: 'text="JPG Image"' },
      { name: 'MD', id: 'md', ext: '.md', selector: 'text="Markdown (.md)"' },
      { name: 'TXT', id: 'txt', ext: '.txt', selector: 'text="Plain Text (.txt)"' },
      { name: 'CSV', id: 'csv', ext: '.csv', selector: 'text="CSV Table (.csv)"' },
      { name: 'JSON', id: 'json', ext: '.json', selector: 'text="JSON Data (.json)"' },
    ];

    for (const fmt of standardFormats) {
      try {
        const card = exporterPage.locator(fmt.selector).first();
        await card.scrollIntoViewIfNeeded();
        const [download] = await Promise.all([
          exporterPage.waitForEvent('download', { timeout: 15000 }),
          card.click(),
        ]);
        const filename = `ext-test-${fmt.id}${fmt.ext}`;
        const savePath = path.join(extDir, filename);
        await download.saveAs(savePath);
        const size = await validateFile(savePath, fmt.id);
        results[fmt.name].ext = 'PASS';
        results[fmt.name].extSize = size;
        console.log(`  ✓ Extension ${fmt.name}: PASS (${size} bytes)`);
      } catch (err) {
        results[fmt.name].ext = `FAIL: ${err.message}`;
        console.error(`  ✗ Extension ${fmt.name}: FAIL -`, err.message);
      }
      await exporterPage.waitForTimeout(400);
    }

    // Test Handwriting PDF
    try {
      const hwCard = exporterPage.locator('text="Handwritten Notes"').first();
      await hwCard.scrollIntoViewIfNeeded();
      await hwCard.click();
      await exporterPage.waitForTimeout(400);

      const pdfRadio = exporterPage.locator('input[type="radio"][value="pdf"]');
      if (await pdfRadio.isVisible()) await pdfRadio.check();

      const [download] = await Promise.all([
        exporterPage.waitForEvent('download', { timeout: 15000 }),
        exporterPage.locator('button:has-text("Generate Handwritten PDF")').click(),
      ]);
      const savePath = path.join(extDir, 'ext-test-handwriting.pdf');
      await download.saveAs(savePath);
      const size = await validateFile(savePath, 'handwriting-pdf');
      results['Handwriting PDF'].ext = 'PASS';
      results['Handwriting PDF'].extSize = size;
      console.log(`  ✓ Extension Handwriting PDF: PASS (${size} bytes)`);
    } catch (err) {
      results['Handwriting PDF'].ext = `FAIL: ${err.message}`;
      console.error(`  ✗ Extension Handwriting PDF: FAIL -`, err.message);
    }
    await exporterPage.waitForTimeout(400);

    // Test Handwriting JPG
    try {
      const jpgRadio = exporterPage.locator('input[type="radio"][value="jpg"]');
      await jpgRadio.check();
      await exporterPage.waitForTimeout(200);

      const [download] = await Promise.all([
        exporterPage.waitForEvent('download', { timeout: 15000 }),
        exporterPage.locator('button:has-text("Generate Handwritten JPG")').click(),
      ]);
      const savePath = path.join(extDir, 'ext-test-handwriting.jpg');
      await download.saveAs(savePath);
      const size = await validateFile(savePath, 'handwriting-jpg');
      results['Handwriting JPG'].ext = 'PASS';
      results['Handwriting JPG'].extSize = size;
      console.log(`  ✓ Extension Handwriting JPG: PASS (${size} bytes)`);
    } catch (err) {
      results['Handwriting JPG'].ext = `FAIL: ${err.message}`;
      console.error(`  ✗ Extension Handwriting JPG: FAIL -`, err.message);
    }
  } finally {
    if (extContext) {
      await extContext.close().catch(() => {});
    }
    try {
      fs.rmSync(tempUserDir, { recursive: true, force: true });
    } catch {}
  }

  // --- Print Matrix Table ---
  console.log('\n========================================================================================');
  console.log('DOWNLOAD VERIFICATION MATRIX: Format x (Web, Extension)');
  console.log('========================================================================================');
  console.table(
    Object.entries(results).map(([format, res]) => ({
      'Format': format,
      'Web App': res.web,
      'Web Size (bytes)': res.webSize,
      'Extension Context': res.ext,
      'Ext Size (bytes)': res.extSize,
    }))
  );

  const allPassed = Object.values(results).every(
    (r) => r.web === 'PASS' && r.ext === 'PASS'
  );

  if (!allPassed) {
    throw new Error('Some format downloads failed verification in Web or Extension context');
  }

  return results;
}

if (process.argv[1] && process.argv[1].endsWith('test-downloads.mjs')) {
  runDownloadTests()
    .then(() => {
      console.log('\nAll 10 formats passed download tests in both Web and Extension!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\nDownload tests failed:', err.message);
      process.exit(1);
    });
}
