import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const formatsToTest = [
  { id: 'pdf', name: 'PDF Document', ext: '.pdf', checkMagic: (buf: Buffer) => buf.toString('utf-8', 0, 4) === '%PDF' },
  { id: 'docx', name: 'Word Document', ext: '.docx', checkMagic: (buf: Buffer) => buf.length > 500 },
  { id: 'pptx', name: 'PowerPoint Slides', ext: '.pptx', checkMagic: (buf: Buffer) => buf.length > 500 },
  { id: 'png', name: 'PNG Image', ext: '.png', checkMagic: (buf: Buffer) => buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 },
  { id: 'jpg', name: 'JPG Image', ext: '.jpg', checkMagic: (buf: Buffer) => buf[0] === 0xff && buf[1] === 0xd8 },
  { id: 'md', name: 'Markdown', ext: '.md', checkMagic: (buf: Buffer) => buf.toString('utf-8').includes('Made with Chat2PDF') },
  { id: 'txt', name: 'Plain Text', ext: '.txt', checkMagic: (buf: Buffer) => buf.toString('utf-8').includes('Made with Chat2PDF') },
  { id: 'csv', name: 'CSV Spreadsheet', ext: '.csv', checkMagic: (buf: Buffer) => buf.toString('utf-8').includes('Made with Chat2PDF') },
];

async function runE2E() {
  console.log('--- STARTING COMPREHENSIVE AUTOMATED EXPORT TEST ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const downloadsDir = path.resolve('tests/output_downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');

  // Step 1: Load sample
  await page.click('text="✨ Load Sample Chat"');
  await page.click('text="Parse & Preview →"');
  await page.waitForSelector('text="Step 2: Preview & Filter"');

  // Step 2: Continue to export
  await page.click('text="Choose Format & Export →"');
  await page.waitForSelector('text="Step 3: Choose Format & Download"');

  const results: Record<string, boolean> = {};

  for (const fmt of formatsToTest) {
    console.log(`Testing export format: ${fmt.name} (${fmt.id})...`);
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    
    // Click format card
    await page.locator(`text="${fmt.name}"`).first().click();

    try {
      const download = await downloadPromise;
      const suggestedName = download.suggestedFilename();
      const savePath = path.join(downloadsDir, suggestedName);
      await download.saveAs(savePath);

      const fileBuf = fs.readFileSync(savePath);
      const isValid = fileBuf.length > 0 && fmt.checkMagic(fileBuf);

      console.log(`  ✓ Download fired: ${suggestedName} (${fileBuf.length} bytes) - Valid: ${isValid}`);
      results[fmt.id] = isValid;
    } catch (e: any) {
      console.error(`  ✗ Export failed for ${fmt.id}:`, e.message);
      results[fmt.id] = false;
    }

    await page.waitForTimeout(1000);
  }

  // Also test Handwriting Notes (PDF)
  console.log('Testing export format: Handwritten Notes (PDF)...');
  try {
    const hwCard = page.locator('text="Handwritten Notes"').first();
    await hwCard.click();
    await page.waitForSelector('text="Generate Handwritten PDF"');

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.click('text="Generate Handwritten PDF"');
    const download = await downloadPromise;
    const savePath = path.join(downloadsDir, download.suggestedFilename());
    await download.saveAs(savePath);
    const buf = fs.readFileSync(savePath);
    const isValid = buf.length > 0 && buf.toString('utf-8', 0, 4) === '%PDF';
    console.log(`  ✓ Handwriting PDF Download: ${download.suggestedFilename()} (${buf.length} bytes) - Valid: ${isValid}`);
    results['handwriting-pdf'] = isValid;
  } catch (e: any) {
    console.error('  ✗ Handwriting export failed:', e.message);
    results['handwriting-pdf'] = false;
  }

  await browser.close();

  console.log('--- ALL TEST RESULTS ---');
  console.table(results);

  const allPassed = Object.values(results).every(Boolean);
  if (!allPassed) {
    console.error('Some export formats failed verification!');
    process.exit(1);
  }
  console.log('ALL EXPORT FORMATS SUCCESSFULLY VERIFIED!');
}

runE2E().catch((err) => {
  console.error('E2E run crashed:', err);
  process.exit(1);
});
