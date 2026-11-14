import type { ThemeMode, ThemeSnapshot } from '../../core/parser/types';
import { safeQuerySelector, safeQuerySelectorAll } from './dom-utils';

function parseRgbColor(colorStr: string): [number, number, number, number] | null {
  if (!colorStr) return null;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (match) {
    return [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      match[4] !== undefined ? parseFloat(match[4]) : 1.0,
    ];
  }
  return null;
}

function calculateLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getEffectiveBackgroundColor(el: HTMLElement | null): { color: string; rgb: [number, number, number]; isDark: boolean } {
  let curr: HTMLElement | null = el;
  while (curr && curr !== document.documentElement) {
    const style = window.getComputedStyle(curr);
    const bg = style.backgroundColor;
    const parsed = parseRgbColor(bg);
    if (parsed && parsed[3] > 0.05) {
      const lum = calculateLuminance(parsed[0], parsed[1], parsed[2]);
      return {
        color: bg,
        rgb: [parsed[0], parsed[1], parsed[2]],
        isDark: lum < 0.35,
      };
    }
    curr = curr.parentElement;
  }

  // Fallback to html / body
  const bodyStyle = window.getComputedStyle(document.body);
  const parsedBody = parseRgbColor(bodyStyle.backgroundColor);
  if (parsedBody && parsedBody[3] > 0.05) {
    const lum = calculateLuminance(parsedBody[0], parsedBody[1], parsedBody[2]);
    return {
      color: bodyStyle.backgroundColor,
      rgb: [parsedBody[0], parsedBody[1], parsedBody[2]],
      isDark: lum < 0.35,
    };
  }

  // Default to system preference or dark fallback if class includes dark
  const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
  if (isDarkClass) {
    return { color: '#0d0d0d', rgb: [13, 13, 13], isDark: true };
  }
  return { color: '#ffffff', rgb: [255, 255, 255], isDark: false };
}

export function extractThemeSnapshot(hostname: string): ThemeSnapshot {
  let siteSource: ThemeSnapshot['source'] = 'generic';
  const host = hostname.toLowerCase();
  if (host.includes('chatgpt') || host.includes('openai')) siteSource = 'chatgpt';
  else if (host.includes('claude')) siteSource = 'claude';
  else if (host.includes('gemini')) siteSource = 'gemini';
  else if (host.includes('perplexity')) siteSource = 'perplexity';
  else if (host.includes('groq')) siteSource = 'groq';

  // Find main chat container or body
  const container =
    safeQuerySelector<HTMLElement>(document, 'main, [role="main"], #scroll-container, .chat-history') ||
    document.body;

  const bgInfo = getEffectiveBackgroundColor(container);
  const mode: ThemeMode = bgInfo.isDark ? 'dark' : 'light';

  const bodyStyle = window.getComputedStyle(container || document.body);
  const textColor = bodyStyle.color || (mode === 'dark' ? '#ececec' : '#0f172a');

  // Try to find a user bubble in the DOM
  const userEl = safeQuerySelector<HTMLElement>(
    document,
    '[data-message-author-role="user"], div[class*="user"], [data-testid*="user"]'
  );
  let userBubbleBg = mode === 'dark' ? '#2f2f2f' : '#f3f4f6';
  let userBubbleText = textColor;

  if (userEl) {
    const userStyle = window.getComputedStyle(userEl);
    const parsedUserBg = parseRgbColor(userStyle.backgroundColor);
    if (parsedUserBg && parsedUserBg[3] > 0.05) {
      userBubbleBg = userStyle.backgroundColor;
    }
    if (userStyle.color) {
      userBubbleText = userStyle.color;
    }
  }

  // Try to find code block background
  const codeEl = safeQuerySelector<HTMLElement>(document, 'pre, code, div[class*="code-block"]');
  let codeBlockBg = mode === 'dark' ? '#171717' : '#f8fafc';
  if (codeEl) {
    const codeStyle = window.getComputedStyle(codeEl);
    const parsedCodeBg = parseRgbColor(codeStyle.backgroundColor);
    if (parsedCodeBg && parsedCodeBg[3] > 0.05) {
      codeBlockBg = codeStyle.backgroundColor;
    }
  }

  // Try to find link color
  const linkEl = safeQuerySelector<HTMLElement>(document, 'a[href]');
  let linkColor = mode === 'dark' ? '#10a37f' : '#2563eb';
  if (linkEl) {
    const linkStyle = window.getComputedStyle(linkEl);
    if (linkStyle.color) linkColor = linkStyle.color;
  }

  const borderColor = mode === 'dark' ? '#2f2f2f' : '#e2e8f0';
  const mutedText = mode === 'dark' ? '#8e8ea0' : '#64748b';

  return {
    mode,
    pageBackground: bgInfo.color,
    textColor,
    mutedText,
    borderColor,
    userBubbleBackground: userBubbleBg,
    userBubbleText,
    codeBlockBackground: codeBlockBg,
    linkColor,
    source: siteSource,
  };
}
