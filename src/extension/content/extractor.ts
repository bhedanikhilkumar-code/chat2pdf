import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { getSelectorsForHost } from './selectors/index';
import { cleanText } from '../../core/parser/cleaners';
import type { Attachment, SiteSelectors, ThemeSnapshot } from '../../core/parser/types';
import {
  safeQuerySelector,
  safeQuerySelectorAll,
  safeMatches,
  findButtonByText,
  findButtonsByText,
} from './dom-utils';
import { extractThemeSnapshot } from './theme-snapshot';
import { processRichMessage } from './rich-content';

export interface ExtractedMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  htmlContent?: string;
  attachments?: Attachment[];
}

export interface PipelineDiagnostics {
  rawNodesFound: number;
  afterRoleClassification: number;
  afterCleaning: number;
  afterDedupe: number;
  afterMerge: number;
  final: number;
  rounds: number;
  elapsedMs: number;
  stageDetails: string;
  fallbackUsed?: boolean;
  guessedRoleCount?: number;
  buttonsClicked?: number;
}

export interface CompletenessReport {
  status: 'Complete' | 'Possibly incomplete';
  foundCount: number;
  expectedCount: number;
  hasRemainingLoadControl: boolean;
  reachedTop: boolean;
  reason?: string;
}

export interface ExtractedConversation {
  title: string;
  source: string;
  messages: ExtractedMessage[];
  themeSnapshot?: ThemeSnapshot;
  diagnostics?: PipelineDiagnostics;
  completeness?: CompletenessReport;
  diagnosticsReport?: any;
}

// Re-export collector APIs for seamless backwards compatibility
export {
  findScrollContainer,
  collectFullConversation,
  cancelCollection,
  waitForSettle,
  resetCollectorState,
  type CollectorProgress,
} from './collector';

import {
  collectFullConversation as internalCollectFullConversation,
  cancelCollection as internalCancelCollection,
} from './collector';

// Configure Turndown with GFM
function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  td.use(gfm);

  td.addRule('fencedCodeBlock', {
    filter: (node, _options) => {
      return (
        node.nodeName === 'PRE' ||
        (node.nodeName === 'DIV' && (node as HTMLElement).classList.contains('code-block'))
      );
    },
    replacement: (_content, node, _options) => {
      const el = node as HTMLElement;
      const codeEl = safeQuerySelector<HTMLElement>(el, 'code') || el;
      const langClass = Array.from(codeEl.classList).find((c) => c.startsWith('language-'));
      const lang = langClass ? langClass.replace('language-', '') : '';
      const text = codeEl.textContent || '';
      return `\n\`\`\`${lang}\n${text.replace(/\n+$/, '')}\n\`\`\`\n\n`;
    },
  });

  return td;
}

const turndown = createTurndown();

export function cleanNodeToMarkdownAndHtml(
  node: HTMLElement,
  junkSelectors: string[]
): { html: string; markdown: string } {
  const { html, rawText } = processRichMessage(node, junkSelectors);
  let md = '';
  try {
    md = cleanText(turndown.turndown(html));
  } catch (err) {
    md = cleanText(rawText);
  }
  return { html, markdown: md };
}

// Extract attachments from user turns
export function extractAttachments(turnNode: HTMLElement, selectors?: SiteSelectors): Attachment[] {
  const attachments: Attachment[] = [];
  const containerSel =
    selectors?.attachmentContainer ||
    '[class*="attachment"], [class*="file-chip"], [class*="file-pill"]';

  const items = safeQuerySelectorAll<HTMLElement>(turnNode, containerSel);
  items.forEach((item) => {
    const nameEl = safeQuerySelector<HTMLElement>(
      item,
      '[class*="name"], [class*="title"], span, div'
    );
    const name = nameEl?.textContent?.trim() || item.getAttribute('aria-label') || 'attached-file';

    let thumbnail: string | undefined;
    const imgEl = safeQuerySelector<HTMLImageElement>(item, 'img');
    if (imgEl && imgEl.src && imgEl.src.startsWith('data:')) {
      thumbnail = imgEl.src;
    }

    attachments.push({
      name,
      kind: name.includes('.') ? name.split('.').pop() : 'file',
      thumbnail,
    });
  });

  return attachments;
}

// Generate stable hash id for message deduplication
export function hashMessage(role: string, content: string): string {
  const trimmed = content.trim();
  const sample = `${role}:${trimmed.length}:${trimmed.slice(0, 300)}:${trimmed.slice(-100)}`;
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    hash = (hash << 5) - hash + sample.charCodeAt(i);
    hash |= 0;
  }
  return `msg_${role}_${Math.abs(hash)}`;
}

export interface ExtractTurnsStats {
  rawNodes: number;
  roleClassified: number;
  cleaned: number;
}

// Extract turns currently present in DOM
export function extractVisibleTurns(
  selectors?: SiteSelectors,
  stats?: ExtractTurnsStats
): ExtractedMessage[] {
  const defaultJunk = [
    'button',
    '.copy-button',
    '.feedback-buttons',
    '.message-actions',
    'svg',
    '.sr-only',
    '[aria-hidden=true]',
  ];
  const junk = selectors?.junkSelectors || defaultJunk;
  const extracted: ExtractedMessage[] = [];

  if (selectors) {
    const rawTurns = safeQuerySelectorAll<HTMLElement>(document, selectors.messageContainer);
    if (stats) stats.rawNodes += rawTurns.length;

    // Filter out ancestor containers that contain other matched turn elements (avoids outer wrapper capture)
    const turns = rawTurns.filter((turn) => {
      return !rawTurns.some((other) => other !== turn && turn.contains(other));
    });

    if (turns.length > 0) {
      turns.forEach((turn) => {
        const isUser =
          safeMatches(turn, selectors.userMessage) ||
          safeQuerySelector(turn, selectors.userMessage) !== null;
        const isAssistant =
          safeMatches(turn, selectors.assistantMessage) ||
          safeQuerySelector(turn, selectors.assistantMessage) !== null;

        if (stats && (isUser || isAssistant)) stats.roleClassified++;
        const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

        const contentEl = safeQuerySelector<HTMLElement>(turn, selectors.messageContent) || turn;
        const { html, markdown } = cleanNodeToMarkdownAndHtml(contentEl, junk);

        if (markdown || html) {
          if (stats) stats.cleaned++;
          const id =
            turn.getAttribute('data-message-id') ||
            turn.getAttribute('data-testid') ||
            hashMessage(role, markdown || html);

          const attachments = isUser ? extractAttachments(turn, selectors) : undefined;

          extracted.push({
            id,
            role,
            content: markdown,
            htmlContent: html,
            attachments: attachments && attachments.length > 0 ? attachments : undefined,
          });
        }
      });
      return extracted;
    }
  }

  // Fallback heuristics
  const rawCandidateTurns = safeQuerySelectorAll<HTMLElement>(
    document,
    '[data-message-author-role], article, [class*=message], [class*=chat-turn]'
  );
  if (stats) stats.rawNodes += rawCandidateTurns.length;

  const candidateTurns = rawCandidateTurns.filter((turn) => {
    return !rawCandidateTurns.some((other) => other !== turn && turn.contains(other));
  });

  candidateTurns.forEach((turn) => {
    const roleAttr = (turn.getAttribute('data-message-author-role') || turn.className || '').toLowerCase();
    const isUser = roleAttr.includes('user') || roleAttr.includes('human');
    if (stats) stats.roleClassified++;
    const role: 'user' | 'assistant' = isUser ? 'user' : 'assistant';

    const contentEl =
      safeQuerySelector<HTMLElement>(turn, '.markdown, .prose, [class*=content]') || turn;
    const { html, markdown } = cleanNodeToMarkdownAndHtml(contentEl, defaultJunk);

    if ((markdown && markdown.length > 3) || (html && html.length > 5)) {
      if (stats) stats.cleaned++;
      const id = turn.getAttribute('data-message-id') || hashMessage(role, markdown || html);
      extracted.push({ id, role, content: markdown, htmlContent: html });
    }
  });

  return extracted;
}

// Expand collapsed content buttons before reading
export function expandCollapsedContent(selectors?: SiteSelectors): number {
  const expandSelector =
    selectors?.expandButtons ||
    'button[aria-label*="Expand"], button[aria-label*="Show more"]';

  const buttons = safeQuerySelectorAll<HTMLElement>(document, expandSelector);
  const textButtons = findButtonsByText(document, /show more|read more|expand/i);

  let clicked = 0;
  const allToClick = new Set<HTMLElement>([...buttons, ...textButtons]);
  allToClick.forEach((btn) => {
    try {
      btn.click();
      clicked++;
    } catch (e) {
      console.warn('[Chat2PDF] Failed to click expand button', e);
    }
  });
  if (clicked > 0) {
    console.log(`[Chat2PDF] buttons clicked (expand): ${clicked}`);
  }
  return clicked;
}

// Backward compatibility helper
export function extractConversation(): ExtractedConversation {
  const hostname = window.location.hostname.replace(/^www\./, '');
  const selectors = getSelectorsForHost(hostname) || getSelectorsForHost(window.location.hostname) || undefined;
  const turns = extractVisibleTurns(selectors);

  let title = document.title || 'Exported Chat';
  if (selectors?.chatTitle) {
    const titleEl = safeQuerySelector(document, selectors.chatTitle);
    if (titleEl && titleEl.textContent) {
      title = titleEl.textContent.trim();
    }
  }

  return {
    title,
    source: hostname,
    messages: turns,
    themeSnapshot: extractThemeSnapshot(hostname),
  };
}

// Chrome runtime message listeners
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'EXTRACT_CHAT') {
      try {
        const result = extractConversation();
        sendResponse({ success: true, data: result });
      } catch (err: any) {
        console.error('[Chat2PDF] EXTRACT_CHAT error:', err);
        sendResponse({ success: false, error: err?.message || 'Extraction failed' });
      }
      return true;
    }

    if (request.action === 'EXTRACT_FULL_CHAT') {
      internalCollectFullConversation((progress) => {
        try {
          chrome.runtime.sendMessage({
            action: 'EXTRACTION_PROGRESS',
            count: progress.loaded,
            loaded: progress.loaded,
            estimatedTotal: progress.estimatedTotal,
            phase: progress.phase,
            status: progress.status,
          });
        } catch (e) {}
      })
        .then((result) => {
          sendResponse({ success: true, data: result });
        })
        .catch((err: any) => {
          console.error('[Chat2PDF] EXTRACT_FULL_CHAT error:', err);
          sendResponse({ success: false, error: err?.message || 'Full extraction failed' });
        });
      return true;
    }

    if (request.action === 'CANCEL_EXTRACTION') {
      internalCancelCollection();
      sendResponse({ success: true });
      return true;
    }
  });
}
