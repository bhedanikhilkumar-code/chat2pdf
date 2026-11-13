import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function captureScreenshots() {
  const dir = path.resolve(process.cwd(), 'docs', 'screenshots');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 },
  ];

  for (const vp of viewports) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme as 'light' | 'dark',
      });
      const page = await context.newPage();

      // Go to app
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

      // Apply theme if dark
      if (theme === 'dark') {
        await page.evaluate(() => {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('chat2pdf-theme', 'dark');
        });
        await page.waitForTimeout(200);
      }

      // Step 1: Input Step
      await page.screenshot({
        path: path.join(dir, `step1_input_${vp.name}_${theme}.png`),
      });

      // Load sample
      const sampleBtn = page.locator('button:has-text("Load Sample Chat")');
      await sampleBtn.click();
      await page.waitForTimeout(300);

      // Parse & Preview
      const parseBtn = page.locator('button:has-text("Parse & Preview")');
      await parseBtn.click();
      await page.waitForTimeout(400);

      // Step 2: Preview Step
      await page.screenshot({
        path: path.join(dir, `step2_preview_${vp.name}_${theme}.png`),
      });

      // Step 3: Export Step
      const exportStepBtn = page.locator('button:has-text("Choose Format & Export")');
      await exportStepBtn.click();
      await page.waitForTimeout(400);

      await page.screenshot({
        path: path.join(dir, `step3_export_${vp.name}_${theme}.png`),
      });

      // Also standard 01, 02, 03 for README compatibility
      if (vp.name === 'desktop' && theme === 'light') {
        fs.copyFileSync(
          path.join(dir, `step1_input_${vp.name}_${theme}.png`),
          path.join(dir, '01-input-step.png')
        );
        fs.copyFileSync(
          path.join(dir, `step2_preview_${vp.name}_${theme}.png`),
          path.join(dir, '02-preview-step.png')
        );
        fs.copyFileSync(
          path.join(dir, `step3_export_${vp.name}_${theme}.png`),
          path.join(dir, '03-export-step.png')
        );
      }

      await context.close();
    }
  }

  console.log('Screenshots generated across 375px, 768px, 1280px in light & dark mode!');
  await browser.close();
}

captureScreenshots().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
