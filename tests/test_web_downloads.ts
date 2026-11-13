import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function testAllFormats() {
  const downloadDir = path.resolve(process.cwd(), 'tests', 'output_downloads_fresh');
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    acceptDownloads: true,
  });
  const page = await context.newPage();

  console.log('Navigating to local dev server: http://localhost:5173');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // 1. Paste sample chat
  const sampleBtn = page.locator('button:has-text("Load Sample Chat")');
  await sampleBtn.waitFor({ state: 'visible', timeout: 10000 });
  await sampleBtn.click();
  await page.waitForTimeout(500);

  // 2. Click Parse & Preview
  const parseBtn = page.locator('button:has-text("Parse & Preview")');
  await parseBtn.click();
  await page.waitForTimeout(500);

  // 3. Click Choose Format & Export
  const exportStepBtn = page.locator('button:has-text("Choose Format & Export")');
  await exportStepBtn.waitFor({ state: 'visible', timeout: 10000 });
  await exportStepBtn.click();
  await page.waitForTimeout(500);

  // Formats to test: pdf, docx, pptx, png, jpg, md, txt, csv
  const formats = [
    { name: 'PDF', ext: '.pdf', selector: 'text="PDF Document"' },
    { name: 'DOCX', ext: '.docx', selector: 'text="Word (.docx)"' },
    { name: 'PPTX', ext: '.pptx', selector: 'text="PowerPoint (.pptx)"' },
    { name: 'PNG', ext: '.png', selector: 'text="PNG Image"' },
    { name: 'JPG', ext: '.jpg', selector: 'text="JPG Image"' },
    { name: 'MD', ext: '.md', selector: 'text="Markdown (.md)"' },
    { name: 'TXT', ext: '.txt', selector: 'text="Plain Text (.txt)"' },
    { name: 'CSV', ext: '.csv', selector: 'text="CSV Table (.csv)"' },
  ];

  console.log('Testing downloads for all 8 formats in web app...');
  for (const fmt of formats) {
    console.log(`Triggering download for: ${fmt.name}`);
    const card = page.locator(fmt.selector).first();
    await card.scrollIntoViewIfNeeded();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      card.click(),
    ]);

    const suggestedFilename = download.suggestedFilename();
    const savePath = path.join(downloadDir, suggestedFilename);
    await download.saveAs(savePath);
    const stats = fs.statSync(savePath);
    console.log(`✓ Received: ${suggestedFilename} (${stats.size} bytes)`);
    if (stats.size === 0) {
      throw new Error(`File ${suggestedFilename} is empty (0 bytes)`);
    }
  }

  console.log('All 8 formats successfully downloaded and verified non-empty!');
  await browser.close();
}

testAllFormats().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
