import { chromium } from 'playwright';
import path from 'path';

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');

  // Step 1: Input Step
  await page.click('text="Load Sample Chat"');
  await page.screenshot({ path: 'docs/screenshots/01-input-step.png' });
  console.log('Saved 01-input-step.png');

  // Step 2: Preview Step
  await page.click('text="Parse & Preview"');
  await page.waitForSelector('text="Step 2: Preview & Filter"');
  await page.screenshot({ path: 'docs/screenshots/02-preview-step.png' });
  console.log('Saved 02-preview-step.png');

  // Step 3: Export Step
  await page.click('text="Choose Format & Export"');
  await page.waitForSelector('text="Step 3: Choose Format & Download"');
  await page.screenshot({ path: 'docs/screenshots/03-export-step.png' });
  console.log('Saved 03-export-step.png');

  // Step 4: Handwriting Controls
  await page.locator('text="Handwritten Notes"').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/04-handwriting-controls.png' });
  console.log('Saved 04-handwriting-controls.png');

  await browser.close();
}

captureScreenshots().catch(console.error);
