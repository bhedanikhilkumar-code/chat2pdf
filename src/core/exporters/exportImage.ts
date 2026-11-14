import { toPng, toJpeg } from 'html-to-image';
import JSZip from 'jszip';
import type { Conversation, ExportOptions, ImageMode, ChatMessage } from '../parser/types';
import { filterMessages } from '../parser/filters';
import { resolveTheme, type ResolvedTheme } from '../theme/resolveTheme';
import { renderMarkdownToHtml } from '../renderer/pageRenderer';
import { WATERMARK_TEXT } from '../branding';
import { downloadBlob } from './downloadHelper';
import DOMPurify from 'dompurify';

const MAX_CANVAS_HEIGHT = 12000;

function getAssistantInitial(src: string): string {
  switch (src) {
    case 'chatgpt':
      return 'GPT';
    case 'claude':
      return 'C';
    case 'gemini':
      return 'G';
    case 'perplexity':
      return 'P';
    case 'groq':
      return 'Gr';
    default:
      return 'AI';
  }
}

function getSiteDisplayName(src: string): string {
  switch (src) {
    case 'chatgpt':
      return 'ChatGPT';
    case 'claude':
      return 'Claude';
    case 'gemini':
      return 'Gemini';
    case 'perplexity':
      return 'Perplexity';
    case 'groq':
      return 'Groq';
    default:
      return 'AI Assistant';
  }
}

function createMessageDom(
  msg: ChatMessage,
  resolved: ResolvedTheme
): HTMLElement {
  const isUser = msg.role === 'user';
  const item = document.createElement('div');
  item.style.display = 'flex';
  item.style.flexDirection = 'column';
  item.style.width = '100%';
  item.style.marginBottom = '24px';
  item.style.boxSizing = 'border-box';

  const bodyHtml = msg.htmlContent
    ? DOMPurify.sanitize(msg.htmlContent)
    : renderMarkdownToHtml(msg.content);

  let attachmentsHtml = '';
  if (msg.attachments && msg.attachments.length > 0) {
    attachmentsHtml = `
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid ${resolved.borderColor}; display: flex; flex-wrap: wrap; gap: 6px;">
        ${msg.attachments
          .map(
            (att) => `
          <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 8px; background: ${
            isUser ? resolved.pageBackground : resolved.userBubbleBackground
          }; border: 1px solid ${resolved.borderColor}; font-size: 11.5px; color: ${resolved.textColor};">
            ${
              att.thumbnail
                ? `<img src="${att.thumbnail}" alt="${att.name}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px;" />`
                : '<span>📎</span>'
            }
            <span style="font-weight: 500;">${att.name}</span>
            ${att.size ? `<span style="color: ${resolved.mutedText}; font-size: 10px;">(${att.size})</span>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  if (isUser) {
    item.style.alignItems = 'flex-end';
    item.innerHTML = `
      <div style="max-width: 82%; background-color: ${resolved.userBubbleBackground}; color: ${resolved.userBubbleText}; padding: 12px 18px; border-radius: 20px; border-bottom-right-radius: 4px; font-size: 14.5px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); word-break: break-word;">
        <div class="chat-view-prose">${bodyHtml}</div>
        ${attachmentsHtml}
      </div>
    `;
  } else {
    item.style.alignItems = 'flex-start';
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <div style="width: 26px; height: 26px; border-radius: 50%; background-color: ${resolved.userBubbleBackground}; border: 1px solid ${resolved.borderColor}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: ${resolved.textColor};">
          ${getAssistantInitial(resolved.source)}
        </div>
        <span style="fontSize: 13px; font-weight: 600; color: ${resolved.textColor};">
          ${getSiteDisplayName(resolved.source)}
        </span>
      </div>
      <div style="width: 100%; font-size: 14.5px; color: ${resolved.textColor}; padding-left: 34px; box-sizing: border-box; word-break: break-word;">
        <div class="chat-view-prose">${bodyHtml}</div>
        ${attachmentsHtml}
      </div>
    `;
  }

  return item;
}

function createContainerWithStyles(resolved: ResolvedTheme): {
  container: HTMLDivElement;
  column: HTMLDivElement;
} {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = '840px';
  container.style.backgroundColor = resolved.pageBackground;
  container.style.color = resolved.textColor;
  container.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.lineHeight = '1.6';
  container.style.padding = '36px 36px 48px';
  container.style.boxSizing = 'border-box';

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .chat-view-prose p { margin: 0.5rem 0; }
    .chat-view-prose p:first-child { margin-top: 0; }
    .chat-view-prose p:last-child { margin-bottom: 0; }
    .chat-view-prose h1, .chat-view-prose h2, .chat-view-prose h3 { margin: 1rem 0 0.5rem; font-weight: 700; }
    .chat-view-prose ul, .chat-view-prose ol { margin: 0.5rem 0; padding-left: 1.5rem; }
    .chat-view-prose li { margin: 0.25rem 0; }
    .chat-view-prose pre {
      background-color: ${resolved.codeBlockBackground};
      border: 1px solid ${resolved.borderColor};
      border-radius: 10px;
      padding: 12px 14px;
      margin: 12px 0;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.45;
    }
    .chat-view-prose code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
    }
    .chat-view-prose table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
      font-size: 13.5px;
    }
    .chat-view-prose th, .chat-view-prose td {
      border: 1px solid ${resolved.borderColor};
      padding: 7px 10px;
      text-align: left;
    }
    .chat-view-prose th {
      background-color: ${resolved.userBubbleBackground};
      font-weight: 600;
    }
    .chat-view-prose blockquote {
      border-left: 3px solid ${resolved.borderColor};
      padding-left: 12px;
      margin: 8px 0;
      color: ${resolved.mutedText};
      font-style: italic;
    }
    .chat-view-prose a {
      color: ${resolved.linkColor};
      text-decoration: underline;
    }
    .chat-view-prose hr {
      border: 0;
      border-top: 1px solid ${resolved.borderColor};
      margin: 16px 0;
    }
  `;
  container.appendChild(styleEl);

  const column = document.createElement('div');
  column.style.maxWidth = '768px';
  column.style.margin = '0 auto';
  column.style.width = '100%';
  container.appendChild(column);

  return { container, column };
}

export async function exportImage(
  conversation: Conversation,
  options: ExportOptions,
  format: 'png' | 'jpg' = 'png',
  mode: ImageMode = 'long'
): Promise<void> {
  const messages = filterMessages(conversation.messages, options.filterMode);

  if (messages.length === 0) {
    throw new Error('No messages to export.');
  }

  const resolved = resolveTheme(conversation.themeSnapshot, options.pageStyle, conversation.source);
  const ext = format === 'jpg' ? 'jpg' : 'png';
  const exportFn = format === 'jpg' ? toJpeg : toPng;
  const baseName = options.fileName || conversation.title || 'chat';

  // 1. Build measurement tree
  const { container, column } = createContainerWithStyles(resolved);

  if (options.includeTitle !== false && conversation.title) {
    const header = document.createElement('div');
    header.style.paddingBottom = '16px';
    header.style.marginBottom = '24px';
    header.style.borderBottom = `1px solid ${resolved.borderColor}`;
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '12px';
    header.innerHTML = `
      <div>
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: ${resolved.textColor}; letter-spacing: -0.01em;">
          ${conversation.title}
        </h2>
        <div style="font-size: 12px; color: ${resolved.mutedText}; margin-top: 2px;">
          ${getSiteDisplayName(resolved.source)} conversation • ${new Date(conversation.exportedAt).toLocaleDateString()}
        </div>
      </div>
      <span style="font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 8px; border: 1px solid ${resolved.borderColor}; background-color: ${resolved.userBubbleBackground}; color: ${resolved.textColor};">
        ${getSiteDisplayName(resolved.source)}
      </span>
    `;
    column.appendChild(header);
  }

  const msgElements: HTMLElement[] = [];
  messages.forEach((msg) => {
    const el = createMessageDom(msg, resolved);
    column.appendChild(el);
    msgElements.push(el);
  });

  const footer = document.createElement('div');
  footer.style.marginTop = '40px';
  footer.style.paddingTop = '16px';
  footer.style.borderTop = `1px solid ${resolved.borderColor}`;
  footer.style.display = 'flex';
  footer.style.justifyContent = 'flex-end';
  footer.style.fontSize = '11px';
  footer.style.color = resolved.mutedText;
  footer.innerHTML = `<span>${WATERMARK_TEXT}</span>`;
  column.appendChild(footer);

  document.body.appendChild(container);

  try {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const totalHeight = container.offsetHeight;

    // Check if total height fits in single canvas or needs splitting
    if (totalHeight <= MAX_CANVAS_HEIGHT) {
      const dataUrl = await exportFn(container, {
        quality: 0.95,
        pixelRatio: 1.5,
        skipFonts: true,
        cacheBust: false,
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const filename = `${baseName}_${mode}.${ext}`;
      await downloadBlob(blob, filename);
    } else {
      // Split at message boundaries and package into ZIP
      document.body.removeChild(container);

      const slices: ChatMessage[][] = [];
      let currentSlice: ChatMessage[] = [];
      let currentSliceHeight = 0;

      // Group messages by height limit
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const approxHeight = msgElements[i].offsetHeight + 24;

        if (currentSliceHeight + approxHeight > MAX_CANVAS_HEIGHT && currentSlice.length > 0) {
          slices.push(currentSlice);
          currentSlice = [msg];
          currentSliceHeight = approxHeight;
        } else {
          currentSlice.push(msg);
          currentSliceHeight += approxHeight;
        }
      }
      if (currentSlice.length > 0) {
        slices.push(currentSlice);
      }

      const zip = new JSZip();

      for (let sIdx = 0; sIdx < slices.length; sIdx++) {
        const sliceMsgs = slices[sIdx];
        const sliceTree = createContainerWithStyles(resolved);

        if (sIdx === 0 && options.includeTitle !== false && conversation.title) {
          const header = document.createElement('div');
          header.style.paddingBottom = '16px';
          header.style.marginBottom = '24px';
          header.style.borderBottom = `1px solid ${resolved.borderColor}`;
          header.innerHTML = `
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: ${resolved.textColor};">
              ${conversation.title} (Part ${sIdx + 1}/${slices.length})
            </h2>
          `;
          sliceTree.column.appendChild(header);
        }

        sliceMsgs.forEach((msg) => {
          sliceTree.column.appendChild(createMessageDom(msg, resolved));
        });

        const sliceFooter = document.createElement('div');
        sliceFooter.style.marginTop = '40px';
        sliceFooter.style.paddingTop = '16px';
        sliceFooter.style.borderTop = `1px solid ${resolved.borderColor}`;
        sliceFooter.style.display = 'flex';
        sliceFooter.style.justifyContent = 'space-between';
        sliceFooter.style.fontSize = '11px';
        sliceFooter.style.color = resolved.mutedText;
        sliceFooter.innerHTML = `
          <span>Part ${sIdx + 1} of ${slices.length}</span>
          <span>${WATERMARK_TEXT}</span>
        `;
        sliceTree.column.appendChild(sliceFooter);

        document.body.appendChild(sliceTree.container);
        try {
          await new Promise((resolve) => setTimeout(resolve, 150));
          const sliceDataUrl = await exportFn(sliceTree.container, {
            quality: 0.95,
            pixelRatio: 1.5,
            skipFonts: true,
            cacheBust: false,
          });
          const sliceRes = await fetch(sliceDataUrl);
          const sliceBlob = await sliceRes.blob();
          zip.file(`${baseName}_part${sIdx + 1}.${ext}`, sliceBlob);
        } finally {
          document.body.removeChild(sliceTree.container);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await downloadBlob(zipBlob, `${baseName}_long_screenshots.zip`);
      return;
    }
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
