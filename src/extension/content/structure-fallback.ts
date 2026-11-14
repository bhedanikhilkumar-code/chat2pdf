/**
 * Chat2PDF Structure-Based Fallback Message Detector
 *
 * Discovers chat turns without relying on site-specific class names:
 * 1. Finds the repeating block pattern inside the main scroll container:
 *    the deepest ancestor whose direct children are many siblings of similar
 *    structure and similar width, containing text.
 * 2. Classifies roles (user vs assistant) by structure and layout:
 *    - Role attributes (data-*, aria)
 *    - Alignment / background difference
 *    - Presence of action buttons (copy, regenerate, thumbs)
 *    - Strict alternation fallback
 * 3. Tracks guessed roles for diagnostics.
 */

import type { ExtractedMessage } from './extractor';
import { cleanNodeToMarkdownAndHtml } from './extractor';
import { safeQuerySelectorAll } from './dom-utils';

export interface StructureFallbackResult {
  messages: ExtractedMessage[];
  guessedRoleCount: number;
  used: boolean;
  ancestorSelectorPath: string;
}

const ACTION_BUTTON_ASSISTANT_RE = /copy|regenerate|retry|thumbs|share|listen|read aloud|speak/i;
const ACTION_BUTTON_USER_RE = /edit\s+message|edit\s+prompt/i;

/**
 * Returns a CSS selector path snippet for an element (tag + role/testid, no hashed classes)
 */
export function getRedactedPath(el: HTMLElement | null): string {
  if (!el || !el.tagName) return 'unknown';
  const parts: string[] = [];
  let curr: HTMLElement | null = el;
  while (curr && curr.tagName && curr !== document.body && parts.length < 5) {
    let part = curr.tagName.toLowerCase();
    const role = curr.getAttribute('role');
    const testid = curr.getAttribute('data-testid');
    if (role) part += `[role="${role}"]`;
    else if (testid) part += `[data-testid="${testid}"]`;
    else if (curr.id) part += `#${curr.id.replace(/[0-9a-f-]{10,}/gi, ':id')}`;
    parts.unshift(part);
    curr = curr.parentElement;
  }
  return parts.join(' > ');
}

/**
 * Guesses message role based on strict 4-level precedence:
 * 1. Role attributes (data-*, aria)
 * 2. Alignment & background layout differences
 * 3. Action buttons (copy, regenerate vs edit)
 * 4. Strict alternation fallback
 */
export function guessRole(
  el: HTMLElement,
  index: number,
  prevRole: 'user' | 'assistant' | null
): { role: 'user' | 'assistant'; isGuessed: boolean } {
  // 1. Role attributes (explicit)
  const roleAttr = el.getAttribute('data-message-author-role') ||
                   el.getAttribute('data-author') ||
                   el.getAttribute('data-role') ||
                   el.getAttribute('role') ||
                   el.getAttribute('aria-label') ||
                   '';

  const roleAttrLower = roleAttr.toLowerCase();
  if (roleAttrLower.includes('human') || roleAttrLower.includes('user')) {
    return { role: 'user', isGuessed: false };
  }
  if (
    roleAttrLower.includes('assistant') ||
    roleAttrLower.includes('ai') ||
    roleAttrLower.includes('bot') ||
    roleAttrLower.includes('claude') ||
    roleAttrLower.includes('model')
  ) {
    return { role: 'assistant', isGuessed: false };
  }

  // Check child role attributes
  const childWithRole = el.querySelector('[data-message-author-role], [data-author], [role="article"]');
  if (childWithRole) {
    const childRole = (childWithRole.getAttribute('data-message-author-role') ||
                       childWithRole.getAttribute('data-author') ||
                       childWithRole.getAttribute('aria-label') ||
                       '').toLowerCase();
    if (childRole.includes('human') || childRole.includes('user')) {
      return { role: 'user', isGuessed: false };
    }
    if (childRole.includes('assistant') || childRole.includes('ai') || childRole.includes('model')) {
      return { role: 'assistant', isGuessed: false };
    }
  }

  // 2. Alignment and background differences (layout inspection)
  try {
    const style = typeof window !== 'undefined' ? window.getComputedStyle(el) : (el.style as any);
    const alignSelf = style.alignSelf || '';
    const marginLeft = style.marginLeft || '';
    const textAlign = style.textAlign || '';
    const float = style.float || '';

    if (
      alignSelf === 'flex-end' ||
      marginLeft === 'auto' ||
      textAlign === 'right' ||
      float === 'right'
    ) {
      return { role: 'user', isGuessed: true };
    }

    // Inspect child bubble container if present
    const innerBubble = el.firstElementChild as HTMLElement;
    if (innerBubble) {
      const innerStyle = typeof window !== 'undefined' ? window.getComputedStyle(innerBubble) : (innerBubble.style as any);
      if (
        innerStyle.alignSelf === 'flex-end' ||
        innerStyle.marginLeft === 'auto' ||
        innerStyle.textAlign === 'right'
      ) {
        return { role: 'user', isGuessed: true };
      }
    }
  } catch (e) {}

  // 3. Action buttons (copy, regenerate, thumbs up -> assistant; edit -> user)
  const buttons = safeQuerySelectorAll<HTMLElement>(el, 'button, [role="button"], svg, a');
  let hasAssistantButton = false;
  let hasUserButton = false;

  for (const btn of buttons) {
    const label = (
      btn.getAttribute('aria-label') ||
      btn.getAttribute('title') ||
      btn.textContent ||
      ''
    ).trim();
    if (ACTION_BUTTON_ASSISTANT_RE.test(label)) {
      hasAssistantButton = true;
      break;
    }
    if (ACTION_BUTTON_USER_RE.test(label)) {
      hasUserButton = true;
    }
  }

  if (hasAssistantButton) {
    return { role: 'assistant', isGuessed: true };
  }
  if (hasUserButton) {
    return { role: 'user', isGuessed: true };
  }

  // 4. Strict alternation fallback
  if (prevRole === 'user') {
    return { role: 'assistant', isGuessed: true };
  }
  if (prevRole === 'assistant') {
    return { role: 'user', isGuessed: true };
  }

  // First message default is user
  return { role: index % 2 === 0 ? 'user' : 'assistant', isGuessed: true };
}

/**
 * Finds the deepest ancestor in container whose direct children are many siblings
 * of similar structure and similar width, containing text.
 */
export function findRepeatingBlockAncestor(container: HTMLElement): {
  parent: HTMLElement | null;
  children: HTMLElement[];
} {
  let bestParent: HTMLElement | null = null;
  let bestChildren: HTMLElement[] = [];
  let maxScore = 0;

  // Search candidate ancestors inside container
  const candidates: HTMLElement[] = [container, ...safeQuerySelectorAll<HTMLElement>(container, 'div, section, main, ul, ol')];

  for (const cand of candidates) {
    const rawKids = Array.from(cand.children) as HTMLElement[];
    // Filter to visible children with text
    const textKids = rawKids.filter((k) => {
      if (!k.textContent || k.textContent.trim().length === 0) return false;
      // Skip typical small spacers or scroll anchors
      const h = k.offsetHeight || k.getBoundingClientRect().height;
      if (h > 0 && h < 10) return false;
      return true;
    });

    if (textKids.length >= 2) {
      // Check similar width: width of each kid should be within 40% of container or median
      const widths = textKids.map((k) => k.offsetWidth || k.getBoundingClientRect().width).filter((w) => w > 0);
      let widthRatio = 1;
      if (widths.length >= 2) {
        const minW = Math.min(...widths);
        const maxW = Math.max(...widths);
        widthRatio = maxW > 0 ? minW / maxW : 1;
      }

      // Check tag uniformity
      const tags = new Set(textKids.map((k) => k.tagName));
      const tagUniformity = tags.size <= 2 ? 1.5 : 1.0;

      // Score: child count * depth weight * width uniformity
      const depth = getElementDepth(cand, container);
      const score = textKids.length * (1 + depth * 0.1) * tagUniformity * (widthRatio >= 0.3 ? 1.2 : 0.8);

      if (score > maxScore) {
        maxScore = score;
        bestParent = cand;
        bestChildren = textKids;
      }
    }
  }

  return { parent: bestParent, children: bestChildren };
}

function getElementDepth(el: HTMLElement, container: HTMLElement): number {
  let depth = 0;
  let curr: HTMLElement | null = el;
  while (curr && curr !== container && curr !== document.body) {
    depth++;
    curr = curr.parentElement;
  }
  return depth;
}

/**
 * Extracts messages using purely structural pattern detection (no class names).
 */
export function extractByStructure(container: HTMLElement | null): StructureFallbackResult {
  if (!container) {
    return { messages: [], guessedRoleCount: 0, used: false, ancestorSelectorPath: 'none' };
  }

  const { parent, children } = findRepeatingBlockAncestor(container);
  if (!parent || children.length === 0) {
    return { messages: [], guessedRoleCount: 0, used: false, ancestorSelectorPath: 'none' };
  }

  const messages: ExtractedMessage[] = [];
  let guessedRoleCount = 0;
  let prevRole: 'user' | 'assistant' | null = null;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const { role, isGuessed } = guessRole(child, i, prevRole);
    if (isGuessed) guessedRoleCount++;
    prevRole = role;

    const { html, markdown } = cleanNodeToMarkdownAndHtml(child, [
      'button',
      '.action-bar',
      '[role="toolbar"]',
      'svg',
    ]);

    if (markdown.trim().length > 0 || html.trim().length > 0) {
      messages.push({
        id: `structure-msg-${i}-${messages.length}`,
        role,
        content: markdown.trim(),
        htmlContent: html.trim(),
      });
    }
  }

  return {
    messages,
    guessedRoleCount,
    used: true,
    ancestorSelectorPath: getRedactedPath(parent),
  };
}
