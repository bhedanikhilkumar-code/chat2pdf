/**
 * DOM utility helpers for safe querying and text-based element discovery in content scripts.
 * Guarantees standard CSS queries without Playwright-specific pseudo-selectors,
 * wrapping every selector attempt in try/catch to ensure resilient extraction.
 */

export function safeQuerySelector<T extends Element = Element>(
  root: ParentNode = document,
  selector: string
): T | null {
  if (!selector) return null;
  try {
    return root.querySelector<T>(selector);
  } catch (err) {
    console.warn(`[Chat2PDF] selector failed: ${selector}`, err);
    if (selector.includes(',')) {
      const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        try {
          const el = root.querySelector<T>(part);
          if (el) return el;
        } catch (e) {
          console.warn(`[Chat2PDF] selector failed: ${part}`, e);
        }
      }
    }
    return null;
  }
}

export function safeQuerySelectorAll<T extends Element = Element>(
  root: ParentNode = document,
  selector: string
): T[] {
  if (!selector) return [];
  try {
    return Array.from(root.querySelectorAll<T>(selector));
  } catch (err) {
    console.warn(`[Chat2PDF] selector failed: ${selector}`, err);
    if (selector.includes(',')) {
      const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
      const results: T[] = [];
      const seen = new Set<Element>();
      for (const part of parts) {
        try {
          const els = root.querySelectorAll<T>(part);
          els.forEach((el) => {
            if (!seen.has(el)) {
              seen.add(el);
              results.push(el as T);
            }
          });
        } catch (e) {
          console.warn(`[Chat2PDF] selector failed: ${part}`, e);
        }
      }
      return results;
    }
    return [];
  }
}

export function safeMatches(el: Element | null | undefined, selector: string): boolean {
  if (!el || !selector || typeof el.matches !== 'function') return false;
  try {
    return el.matches(selector);
  } catch (err) {
    console.warn(`[Chat2PDF] selector failed: ${selector}`, err);
    if (selector.includes(',')) {
      const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        try {
          if (el.matches(part)) return true;
        } catch (e) {
          console.warn(`[Chat2PDF] selector failed: ${part}`, e);
        }
      }
    }
    return false;
  }
}

/**
 * Searches candidate buttons/action elements within root by textContent, aria-label, or title
 */
export function findButtonsByText(
  root: ParentNode = document,
  pattern: RegExp | string
): HTMLElement[] {
  try {
    const candidates = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button, [role="button"], a[role="button"], input[type="button"], input[type="submit"]'
      )
    );
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    return candidates.filter((btn) => {
      const text = (btn.textContent || '').trim();
      const aria = btn.getAttribute('aria-label') || '';
      const title = btn.getAttribute('title') || '';
      return regex.test(text) || regex.test(aria) || regex.test(title);
    });
  } catch (e) {
    console.warn('[Chat2PDF] findButtonsByText error:', e);
    return [];
  }
}

export function findButtonByText(
  root: ParentNode = document,
  pattern: RegExp | string
): HTMLElement | null {
  const matches = findButtonsByText(root, pattern);
  return matches.length > 0 ? matches[0] : null;
}
