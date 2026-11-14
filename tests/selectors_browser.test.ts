import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import { selectorMap } from '../src/extension/content/selectors/index';

describe('Real Browser Selector Validation', () => {
  it('all per-site selectors evaluate without SyntaxError in document.querySelector/querySelectorAll', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent('<!DOCTYPE html><html><body><div id="test">Hello</div></body></html>');

    const errors: { site: string; field: string; selector: string; error: string }[] = [];

    for (const [site, selectors] of Object.entries(selectorMap)) {
      for (const [key, value] of Object.entries(selectors)) {
        if (typeof value === 'string') {
          const testRes = await page.evaluate((sel) => {
            try {
              document.querySelector(sel);
              document.querySelectorAll(sel);
              return { ok: true };
            } catch (err: any) {
              return { ok: false, error: err?.message || String(err) };
            }
          }, value);

          if (!testRes.ok) {
            errors.push({ site, field: key, selector: value, error: testRes.error });
          }
        } else if (Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === 'string') {
              const testRes = await page.evaluate((sel) => {
                try {
                  document.querySelector(sel);
                  document.querySelectorAll(sel);
                  return { ok: true };
                } catch (err: any) {
                  return { ok: false, error: err?.message || String(err) };
                }
              }, item);

              if (!testRes.ok) {
                errors.push({ site, field: `${key}[]`, selector: item, error: testRes.error });
              }
            }
          }
        }
      }
    }

    await browser.close();

    if (errors.length > 0) {
      console.error('Selector SyntaxErrors found:', errors);
    }
    expect(errors).toEqual([]);
  }, 30000);
});
