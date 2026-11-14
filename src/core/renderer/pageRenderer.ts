import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { WATERMARK_TEXT } from '../branding';
import type { Conversation, ExportOptions } from '../parser/types';
import { filterMessages } from '../parser/filters';
import { resolveTheme, type ResolvedTheme } from '../theme/resolveTheme';

// Fixed A4 dimensions at 96 DPI CSS pixels
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
export const A4_MARGIN_PX = 48; // ~12.7mm margin
export const USABLE_HEIGHT_PX = A4_HEIGHT_PX - A4_MARGIN_PX * 2 - 36; // leave space for footer

export function buildPageStyles(resolved: ResolvedTheme): string {
  return `
  .chat2pdf-a4-page {
    width: 794px;
    height: 1123px;
    box-sizing: border-box;
    padding: 48px;
    background: ${resolved.pageBackground};
    color: ${resolved.textColor};
    position: relative;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 13.5px;
    line-height: 1.6;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .chat2pdf-page-content {
    flex: 1;
    overflow: hidden;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .chat2pdf-header {
    border-bottom: 2px solid ${resolved.borderColor};
    padding-bottom: 12px;
    margin-bottom: 16px;
  }

  .chat2pdf-title {
    font-size: 20px;
    font-weight: 700;
    color: ${resolved.textColor};
    margin: 0 0 4px 0;
    line-height: 1.3;
  }

  .chat2pdf-meta {
    font-size: 11px;
    color: ${resolved.mutedText};
    display: flex;
    gap: 12px;
  }

  .chat2pdf-msg {
    margin-bottom: 14px;
    padding: 12px 14px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.55;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .chat2pdf-msg-user {
    background-color: ${resolved.userBubbleBackground};
    color: ${resolved.userBubbleText};
    border-left: 4px solid ${resolved.mode === 'dark' ? '#10a37f' : '#16a34a'};
  }

  .chat2pdf-msg-assistant {
    background-color: ${resolved.mode === 'dark' ? resolved.pageBackground : '#f8fafc'};
    color: ${resolved.textColor};
    border-left: 4px solid ${resolved.mode === 'dark' ? '#38bdf8' : '#0284c7'};
  }

  .chat2pdf-msg-role {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .chat2pdf-msg-user .chat2pdf-msg-role {
    color: ${resolved.mode === 'dark' ? '#34d399' : '#15803d'};
  }

  .chat2pdf-msg-assistant .chat2pdf-msg-role {
    color: ${resolved.mode === 'dark' ? '#38bdf8' : '#0369a1'};
  }

  .chat2pdf-body p {
    margin: 0 0 8px 0;
  }

  .chat2pdf-body p:last-child {
    margin-bottom: 0;
  }

  .chat2pdf-body pre {
    background: ${resolved.codeBlockBackground};
    color: ${resolved.textColor};
    padding: 10px 12px;
    border-radius: 6px;
    border: 1px solid ${resolved.borderColor};
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 11.5px;
    line-height: 1.45;
    overflow-x: auto;
    margin: 8px 0;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .chat2pdf-body code {
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 12px;
    background: rgba(125, 125, 125, 0.15);
    padding: 2px 4px;
    border-radius: 4px;
  }

  .chat2pdf-body pre code {
    background: transparent;
    padding: 0;
    color: inherit;
  }

  .chat2pdf-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 12px;
  }

  .chat2pdf-body th, .chat2pdf-body td {
    border: 1px solid ${resolved.borderColor};
    padding: 6px 10px;
    text-align: left;
  }

  .chat2pdf-body th {
    background-color: ${resolved.userBubbleBackground};
    color: ${resolved.textColor};
    font-weight: 600;
  }

  .chat2pdf-body ul, .chat2pdf-body ol {
    margin: 4px 0 8px 20px;
    padding: 0;
  }

  .chat2pdf-body li {
    margin-bottom: 3px;
  }

  .chat2pdf-footer {
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid ${resolved.borderColor};
    padding-top: 8px;
    font-size: 10.5px;
    color: ${resolved.mutedText};
  }

  .chat2pdf-watermark {
    font-weight: 500;
    color: ${resolved.mutedText};
    letter-spacing: 0.2px;
  }
`;
}

export const PAGE_STYLES = buildPageStyles({
  mode: 'light',
  pageBackground: '#ffffff',
  textColor: '#1f2937',
  mutedText: '#94a3b8',
  borderColor: '#e5e7eb',
  userBubbleBackground: '#f0fdf4',
  userBubbleText: '#15803d',
  codeBlockBackground: '#1e293b',
  linkColor: '#2563eb',
  source: 'generic',
});

export function renderMarkdownToHtml(markdown: string): string {
  const rawHtml = marked.parse(markdown, { gfm: true, breaks: true }) as string;
  return DOMPurify.sanitize(rawHtml);
}

export interface RenderedPage {
  pageNumber: number;
  totalPages: number;
  element: HTMLElement;
}

export function buildPaginatedDom(
  conversation: Conversation,
  options: ExportOptions
): HTMLElement[] {
  const messages = filterMessages(conversation.messages, options.filterMode);
  const resolved = resolveTheme(conversation.themeSnapshot, options.pageStyle, conversation.source);
  const dynamicStyles = buildPageStyles(resolved);

  // Hidden offscreen container for measurement
  const measureContainer = document.createElement('div');
  measureContainer.style.position = 'fixed';
  measureContainer.style.top = '-99999px';
  measureContainer.style.left = '-99999px';
  measureContainer.style.width = `${A4_WIDTH_PX}px`;
  measureContainer.style.visibility = 'hidden';
  measureContainer.style.boxSizing = 'border-box';
  measureContainer.style.padding = `${A4_MARGIN_PX}px`;
  document.body.appendChild(measureContainer);

  const styleEl = document.createElement('style');
  styleEl.textContent = dynamicStyles;
  measureContainer.appendChild(styleEl);

  // Measure header
  let headerHtml = '';
  let headerHeight = 0;
  if (options.includeTitle !== false && conversation.title) {
    headerHtml = `
      <div class="chat2pdf-header">
        <h1 class="chat2pdf-title">${conversation.title}</h1>
        <div class="chat2pdf-meta">
          <span>Source: ${conversation.source}</span>
          <span>Date: ${new Date(conversation.exportedAt).toLocaleDateString()}</span>
        </div>
      </div>
    `;
    const tempHeader = document.createElement('div');
    tempHeader.innerHTML = headerHtml;
    measureContainer.appendChild(tempHeader);
    headerHeight = tempHeader.offsetHeight + 16;
    measureContainer.removeChild(tempHeader);
  }

  // Measure and break message blocks
  interface PageBucket {
    isFirst: boolean;
    items: HTMLElement[];
  }

  const pages: PageBucket[] = [{ isFirst: true, items: [] }];
  let currentPageIndex = 0;
  let currentHeight = headerHeight;

  messages.forEach((msg) => {
    const roleIcon = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
    const roleClass = msg.role === 'user' ? 'chat2pdf-msg-user' : 'chat2pdf-msg-assistant';
    const bodyHtml = msg.htmlContent ? DOMPurify.sanitize(msg.htmlContent) : renderMarkdownToHtml(msg.content);

    let attachmentsHtml = '';
    if (msg.attachments && msg.attachments.length > 0) {
      attachmentsHtml = `
        <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">
          ${msg.attachments
            .map(
              (att) => `
            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; background: ${resolved.userBubbleBackground}; border: 1px solid ${resolved.borderColor}; font-size: 11px; font-weight: 500; color: ${resolved.textColor};">
              ${att.thumbnail ? `<img src="${att.thumbnail}" style="width: 16px; height: 16px; object-fit: cover; border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 4px;" />` : '📎 '}
              ${att.name}${att.size ? ` <span style="color: ${resolved.mutedText}; font-size: 10px;">(${att.size})</span>` : ''}
            </span>
          `
            )
            .join('')}
        </div>
      `;
    }

    const msgEl = document.createElement('div');
    msgEl.className = `chat2pdf-msg ${roleClass}`;
    msgEl.innerHTML = `
      <div class="chat2pdf-msg-role">${roleIcon}</div>
      <div class="chat2pdf-body">${bodyHtml}${attachmentsHtml}</div>
    `;

    measureContainer.appendChild(msgEl);
    const msgHeight = msgEl.offsetHeight + 14;
    measureContainer.removeChild(msgEl);

    const availableHeight = USABLE_HEIGHT_PX;

    if (currentHeight + msgHeight <= availableHeight) {
      pages[currentPageIndex].items.push(msgEl);
      currentHeight += msgHeight;
    } else if (msgHeight > availableHeight) {
      if (currentHeight > (pages[currentPageIndex].isFirst ? headerHeight + 50 : 50)) {
        pages.push({ isFirst: false, items: [] });
        currentPageIndex++;
        currentHeight = 0;
      }
      pages[currentPageIndex].items.push(msgEl);
      pages.push({ isFirst: false, items: [] });
      currentPageIndex++;
      currentHeight = 0;
    } else {
      pages.push({ isFirst: false, items: [] });
      currentPageIndex++;
      pages[currentPageIndex].items.push(msgEl);
      currentHeight = msgHeight;
    }
  });

  document.body.removeChild(measureContainer);

  const totalPages = pages.length;
  const pageElements: HTMLElement[] = [];

  pages.forEach((page, idx) => {
    const pageEl = document.createElement('div');
    pageEl.className = 'chat2pdf-a4-page';
    pageEl.style.backgroundColor = resolved.pageBackground;
    pageEl.style.color = resolved.textColor;

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'chat2pdf-page-content';

    if (page.isFirst && headerHtml) {
      const headerDiv = document.createElement('div');
      headerDiv.innerHTML = headerHtml;
      contentWrapper.appendChild(headerDiv);
    }

    page.items.forEach((item) => {
      contentWrapper.appendChild(item);
    });

    const footerDiv = document.createElement('div');
    footerDiv.className = 'chat2pdf-footer';
    footerDiv.style.borderTop = `1px solid ${resolved.borderColor}`;
    footerDiv.style.color = resolved.mutedText;
    footerDiv.innerHTML = `
      <span>Page ${idx + 1} of ${totalPages}</span>
      <span class="chat2pdf-watermark" style="color: ${resolved.mutedText};">${WATERMARK_TEXT}</span>
    `;

    pageEl.appendChild(contentWrapper);
    pageEl.appendChild(footerDiv);
    pageElements.push(pageEl);
  });

  return pageElements;
}
