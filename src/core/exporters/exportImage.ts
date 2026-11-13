import { toPng, toJpeg } from 'html-to-image';
import type { Conversation, ExportOptions, ImageMode } from '../parser/types';
import { filterMessages } from '../parser/filters';
import { renderMarkdownToHtml, PAGE_STYLES } from '../renderer/pageRenderer';
import { WATERMARK_TEXT } from '../branding';
import { downloadBlob } from './downloadHelper';

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

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.style.boxSizing = 'border-box';
  container.style.padding = '36px';

  const styleEl = document.createElement('style');
  styleEl.textContent = PAGE_STYLES;
  container.appendChild(styleEl);

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = mode === 'card' ? '20px' : '14px';

  // Header
  if (options.includeTitle !== false && conversation.title) {
    const header = document.createElement('div');
    header.className = 'chat2pdf-header';
    header.innerHTML = `
      <h1 class="chat2pdf-title">${conversation.title}</h1>
      <div class="chat2pdf-meta">
        <span>Source: ${conversation.source}</span>
        <span>Date: ${new Date(conversation.exportedAt).toLocaleDateString()}</span>
      </div>
    `;
    wrapper.appendChild(header);
  }

  // Messages
  messages.forEach((msg) => {
    const roleIcon = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
    const roleClass = msg.role === 'user' ? 'chat2pdf-msg-user' : 'chat2pdf-msg-assistant';
    const bodyHtml = renderMarkdownToHtml(msg.content);

    let attachmentsHtml = '';
    if (msg.attachments && msg.attachments.length > 0) {
      attachmentsHtml = `
        <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">
          ${msg.attachments
            .map(
              (att) => `
            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; background: #f1f5f9; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 500; color: #334155;">
              📎 ${att.name}${att.size ? ` <span style="color: #64748b; font-size: 10px;">(${att.size})</span>` : ''}
            </span>
          `
            )
            .join('')}
        </div>
      `;
    }

    const msgEl = document.createElement('div');
    msgEl.className = `chat2pdf-msg ${roleClass}`;
    if (mode === 'card') {
      msgEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
      msgEl.style.border = '1px solid #e2e8f0';
    }
    msgEl.innerHTML = `
      <div class="chat2pdf-msg-role">${roleIcon}</div>
      <div class="chat2pdf-body">${bodyHtml}${attachmentsHtml}</div>
    `;
    wrapper.appendChild(msgEl);
  });

  // Footer with absolute bottom-right watermark
  const footer = document.createElement('div');
  footer.className = 'chat2pdf-footer';
  footer.style.marginTop = '16px';
  footer.innerHTML = `
    <span>${messages.length} messages</span>
    <span class="chat2pdf-watermark">${WATERMARK_TEXT}</span>
  `;
  wrapper.appendChild(footer);

  container.appendChild(wrapper);
  document.body.appendChild(container);

  try {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const exportFn = format === 'jpg' ? toJpeg : toPng;
    const dataUrl = await exportFn(container, {
      quality: 0.95,
      pixelRatio: 1.5,
      skipFonts: true,
      cacheBust: false,
    });

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = format === 'jpg' ? 'jpg' : 'png';
    const filename = `${options.fileName || conversation.title || 'chat'}_${mode}.${ext}`;
    await downloadBlob(blob, filename);
  } finally {
    document.body.removeChild(container);
  }
}
