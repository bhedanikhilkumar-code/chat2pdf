import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function generateEvidence() {
  const screenshotDir = path.resolve(process.cwd(), 'docs', 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
  });
  const page = await context.newPage();

  console.log('1. Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // 1. ChatGPT Dark Theme Preview
  console.log('2. Rendering ChatGPT Dark Preview...');
  const sampleBtn = page.locator('button:has-text("Load Sample Chat")');
  await sampleBtn.click();
  await page.waitForTimeout(300);

  const parseBtn = page.locator('button:has-text("Parse & Preview")');
  await parseBtn.click();
  await page.waitForTimeout(500);

  // In dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(screenshotDir, 'preview_chatgpt_dark.png'),
    fullPage: false,
  });
  console.log('✓ Saved: preview_chatgpt_dark.png');

  // 2. ChatGPT Light Theme Preview
  console.log('3. Rendering ChatGPT Light Preview...');
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(screenshotDir, 'preview_chatgpt_light.png'),
    fullPage: false,
  });
  console.log('✓ Saved: preview_chatgpt_light.png');

  // 3. Go to export step and capture Page Style control
  console.log('4. Navigating to Step 3 (Export Step)...');
  const exportBtn = page.locator('button:has-text("Choose Format & Export")');
  await exportBtn.click();
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(screenshotDir, 'export_step_page_style_control.png'),
    fullPage: false,
  });
  console.log('✓ Saved: export_step_page_style_control.png');

  // 4. Test Handwriting export download
  console.log('5. Testing Handwriting export download...');
  const hwCard = page.locator('text="Handwritten Notes"').first();
  await hwCard.click();
  await page.waitForTimeout(500);

  const downloadHwBtn = page.locator('button:has-text("Generate Handwritten Notes")').first();
  if (await downloadHwBtn.isVisible()) {
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await downloadHwBtn.click();
    const download = await downloadPromise;
    const savePath = path.join(screenshotDir, 'test_sample_handwriting.pdf');
    await download.saveAs(savePath);
    console.log('✓ Received handwriting download:', download.suggestedFilename());
  }

  await browser.close();
  console.log('All verification evidence screenshots generated successfully!');
}

generateEvidence().catch((err) => {
  console.error('Evidence generation failed:', err);
  process.exit(1);
});
