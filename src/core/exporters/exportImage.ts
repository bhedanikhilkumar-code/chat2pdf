import { toPng, toJpeg } from 'html-to-image';
import { saveAs } from 'file-saver';
import type { Conversation, ExportOptions, ImageMode } from '../parser/types';
import { filterMessages } from '../parser/filters';

const STYLES = {
  container: {
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    backgroundColor: '#ffffff',
    padding: '32px',
    maxWidth: '800px',
    width: '800px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '24px',
  },
  userCard: {
    backgroundColor: '#e8f0fe',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    borderLeft: '4px solid #4285f4',
  },
  assistantCard: {
    backgroundColor: '#f0f4f0',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    borderLeft: '4px solid #34a853',
  },
  systemCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    borderLeft: '4px solid #999',
  },
  roleLabel: {
    fontSize: '11px',
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    marginBottom: '6px',
    letterSpacing: '0.5px',
  },
  content: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#333',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  shortContent: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#333',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
};

function applyStyles(
  el: HTMLElement,
  styles: Record<string, string | number>
): void {
  Object.entries(styles).forEach(([key, value]) => {
    (el.style as unknown as Record<string, string>)[key] = String(value);
  });
}

function createMessageElement(
  msg: { role: string; content: string },
  mode: ImageMode
): HTMLElement {
  const card = document.createElement('div');
  const cardStyle =
    msg.role === 'user'
      ? STYLES.userCard
      : msg.role === 'assistant'
        ? STYLES.assistantCard
        : STYLES.systemCard;
  applyStyles(card, cardStyle);

  const label = document.createElement('div');
  applyStyles(label, STYLES.roleLabel);
  label.style.color =
    msg.role === 'user'
      ? '#4285f4'
      : msg.role === 'assistant'
        ? '#34a853'
        : '#999';
  label.textContent =
    msg.role === 'user'
      ? '👤 USER'
      : msg.role === 'assistant'
        ? '🤖 ASSISTANT'
        : '⚙ SYSTEM';
  card.appendChild(label);

  const content = document.createElement('div');
  const contentText =
    mode === 'short' && msg.content.length > 400
      ? msg.content.substring(0, 400).trim() + '…'
      : msg.content;
  applyStyles(content, mode === 'short' ? STYLES.shortContent : STYLES.content);
  content.textContent = contentText;
  card.appendChild(content);

  return card;
}

export async function exportImage(
  conversation: Conversation,
  options: ExportOptions,
  format: 'png' | 'jpg' = 'png'
): Promise<void> {
  const messages = filterMessages(conversation.messages, options.filterMode);
  const mode: ImageMode = options.imageMode || 'long';

  // Create temporary hidden container
  const container = document.createElement('div');
  applyStyles(container, STYLES.container);
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  try {
    // Title
    if (options.includeTitle !== false && conversation.title) {
      const titleEl = document.createElement('div');
      applyStyles(titleEl, STYLES.title);
      titleEl.textContent = conversation.title;
      container.appendChild(titleEl);

      const subtitleEl = document.createElement('div');
      applyStyles(subtitleEl, STYLES.subtitle);
      subtitleEl.textContent = `${conversation.source} • ${conversation.exportedAt}`;
      container.appendChild(subtitleEl);
    }

    if (messages.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.textContent = 'No messages to export.';
      emptyEl.style.color = '#999';
      emptyEl.style.padding = '20px';
      emptyEl.style.textAlign = 'center';
      container.appendChild(emptyEl);
    } else if (mode === 'short') {
      // Short mode: only assistant answers (key answers), compact cards
      const keyMessages = messages.filter((m) => m.role === 'assistant');
      const toRender = keyMessages.length > 0 ? keyMessages : messages;
      for (const msg of toRender) {
        container.appendChild(createMessageElement(msg, 'short'));
      }
    } else {
      // Long mode: all messages
      for (const msg of messages) {
        container.appendChild(createMessageElement(msg, 'long'));
      }
    }

    // Wait a tick for DOM rendering
    await new Promise((r) => setTimeout(r, 100));

    const captureOptions = {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    };

    let dataUrl: string;
    if (format === 'jpg') {
      dataUrl = await toJpeg(container, captureOptions);
    } else {
      dataUrl = await toPng(container, captureOptions);
    }

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const ext = format === 'jpg' ? 'jpg' : 'png';
    saveAs(blob, `${options.fileName || conversation.title || 'chat'}.${ext}`);
  } finally {
    document.body.removeChild(container);
  }
}
