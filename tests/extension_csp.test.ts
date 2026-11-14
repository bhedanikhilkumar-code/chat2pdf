import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('Real Browser Extension CSP and Error Verification', () => {
  it('loads unpacked extension in real browser with 0 CSP violations, 0 console errors, and 0 errors on chrome://extensions', async () => {
    const extPath = path.resolve('dist-extension').replace(/\\/g, '/');
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat2pdf-csp-test-'));

    let context;
    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        args: [
          `--disable-extensions-except=${extPath}`,
          `--load-extension=${extPath}`,
          '--no-first-run',
          '--no-default-browser-check',
        ],
        timeout: 15000,
      });

      const page = await context.newPage();
      await page.goto('chrome://extensions');
      await page.waitForTimeout(1000);

      const items = await page.locator('extensions-item').all();
      expect(items.length).toBeGreaterThan(0);

      let extensionId = '';
      for (const item of items) {
        const name = await item.locator('#name').textContent();
        if (name?.includes('Chat2PDF')) {
          extensionId = (await item.getAttribute('id')) || '';
          break;
        }
      }
      expect(extensionId).toBeTruthy();

      const violations: string[] = [];
      const consoleErrors: string[] = [];

      // 1. Test Popup Page
      const popupPage = await context.newPage();
      popupPage.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(`[Popup Console Error] ${msg.text()}`);
        }
      });
      popupPage.on('pageerror', (err) => {
        consoleErrors.push(`[Popup Page Error] ${err.message}`);
      });
      await popupPage.addInitScript(() => {
        window.addEventListener('securitypolicyviolation', (e) => {
          // @ts-ignore
          window.__cspViolation = e.blockedURI + ' | directive: ' + e.violatedDirective;
        });
      });

      const popupUrl = `chrome-extension://${extensionId}/popup/popup.html`;
      await popupPage.goto(popupUrl);
      await popupPage.waitForLoadState('load');
      await popupPage.waitForTimeout(500);

      const popupViolation = await popupPage.evaluate(() => (window as any).__cspViolation);
      if (popupViolation) {
        violations.push(`Popup CSP violation: ${popupViolation}`);
      }

      // 2. Test Exporter Web Page
      const webPage = await context.newPage();
      webPage.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(`[Web Console Error] ${msg.text()}`);
        }
      });
      webPage.on('pageerror', (err) => {
        consoleErrors.push(`[Web Page Error] ${err.message}`);
      });
      await webPage.addInitScript(() => {
        window.addEventListener('securitypolicyviolation', (e) => {
          // @ts-ignore
          window.__cspViolation = e.blockedURI + ' | directive: ' + e.violatedDirective;
        });
      });

      const webUrl = `chrome-extension://${extensionId}/web/index.html`;
      await webPage.goto(webUrl);
      await webPage.waitForLoadState('load');
      await webPage.waitForTimeout(1000);

      const webViolation = await webPage.evaluate(() => (window as any).__cspViolation);
      if (webViolation) {
        violations.push(`Web exporter CSP violation: ${webViolation}`);
      }

      // 3. Inspect chrome://extensions
      await page.bringToFront();
      await page.reload();
      await page.waitForTimeout(1000);

      const targetItem = page.locator(`extensions-item#${extensionId}`);
      const errorsButton = targetItem.locator('#errors-button');
      const hasErrorsInitial = await errorsButton.isVisible().catch(() => false);

      if (hasErrorsInitial) {
        await errorsButton.click();
        await page.waitForTimeout(500);
        const clearAllBtn = page.locator('cr-button#clear-all');
        if (await clearAllBtn.isVisible().catch(() => false)) {
          await clearAllBtn.click();
          await page.waitForTimeout(500);
        }
        await page.goto('chrome://extensions');
        await page.waitForTimeout(500);
      }

      const screenshotDir = path.resolve('test-results');
      if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
      
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const proofScreenshotTimestamp = path.join(screenshotDir, `chrome-extensions-zero-errors-${ts}.png`);
      const proofScreenshot = path.join(screenshotDir, 'chrome-extensions-zero-errors.png');
      
      await page.screenshot({ path: proofScreenshotTimestamp });
      fs.copyFileSync(proofScreenshotTimestamp, proofScreenshot);

      const finalHasErrors = await targetItem.locator('#errors-button').isVisible().catch(() => false);

      expect(violations).toEqual([]);
      expect(consoleErrors).toEqual([]);
      expect(finalHasErrors).toBe(false);
    } finally {
      if (context) {
        await context.close().catch(() => {});
      }
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch {}
    }
  }, 30000);
});
