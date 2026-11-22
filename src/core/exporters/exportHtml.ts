import type { Conversation, ExportOptions, ChatMessage } from '../parser/types';
import { filterMessages } from '../parser/filters';
import { resolveTheme } from '../theme/resolveTheme';
import { WATERMARK_TEXT } from '../branding';
import { downloadBlob } from './downloadHelper';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeSanitize(html: string): string {
  try {
    if (typeof DOMPurify !== 'undefined') {
      const purify = (DOMPurify as any).default || DOMPurify;
      if (typeof purify.sanitize === 'function') {
        return purify.sanitize(html);
      }
    }
  } catch (e) {}
  return html;
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
    case 'deepseek':
      return 'DeepSeek';
    default:
      return 'AI Assistant';
  }
}

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
    case 'deepseek':
      return 'DS';
    default:
      return 'AI';
  }
}

export function buildHtmlContent(
  conversation: Conversation,
  options: ExportOptions
): string {
  const resolved = resolveTheme(conversation.themeSnapshot, options.pageStyle, conversation.source);
  const messages = filterMessages(conversation.messages, options.filterMode);
  const watermark = options.watermarkText !== undefined ? options.watermarkText : WATERMARK_TEXT;

  const title = options.fileName || conversation.title || 'Chat Conversation';
  const siteName = getSiteDisplayName(resolved.source);
  const assistantInitial = getAssistantInitial(resolved.source);

  const totalWords = messages.reduce((acc, m) => {
    return acc + (m.content ? m.content.trim().split(/\s+/).filter(Boolean).length : 0);
  }, 0);
  const readingMinutes = Math.max(1, Math.ceil(totalWords / 200));

  const renderedTurns = messages.map((m: ChatMessage) => {
    const isUser = m.role === 'user';
    const contentHtml = m.htmlContent
      ? safeSanitize(m.htmlContent)
      : safeSanitize(marked.parse(m.content, { breaks: true, gfm: true }) as string);

    const attachmentsHtml =
      m.attachments && m.attachments.length > 0
        ? `<div class="attachments">
            ${m.attachments
              .map(
                (att) => `
              <div class="attachment-pill">
                ${att.thumbnail ? `<img src="${att.thumbnail}" alt="${escapeHtml(att.name)}" class="att-img" />` : '📎'}
                <span class="att-name">${escapeHtml(att.name)}</span>
                ${att.size ? `<span class="att-size">(${escapeHtml(att.size)})</span>` : ''}
              </div>`
              )
              .join('')}
          </div>`
        : '';

    if (isUser) {
      return `
        <div class="turn turn-user">
          <div class="user-bubble">
            <div class="prose">${contentHtml}</div>
            ${attachmentsHtml}
            ${m.timestamp ? `<div class="user-timestamp">${escapeHtml(m.timestamp)}</div>` : ''}
          </div>
        </div>`;
    }

    return `
      <div class="turn turn-assistant">
        <div class="assistant-header">
          <div class="avatar">${assistantInitial}</div>
          <span class="assistant-label">${siteName}</span>
          ${m.timestamp ? `<span class="assistant-timestamp">${escapeHtml(m.timestamp)}</span>` : ''}
        </div>
        <div class="assistant-body">
          <div class="prose">${contentHtml}</div>
          ${attachmentsHtml}
        </div>
      </div>`;
  }).join('\n');

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 16px;
      background-color: ${resolved.pageBackground};
      color: ${resolved.textColor};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      font-size: 15px;
    }
    .container {
      max-width: 768px;
      margin: 0 auto;
      width: 100%;
    }
    .header {
      padding-bottom: 20px;
      margin-bottom: 28px;
      border-bottom: 1px solid ${resolved.borderColor};
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .header-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: ${resolved.textColor};
    }
    .header-meta {
      font-size: 12px;
      color: ${resolved.mutedText};
      margin-top: 4px;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid ${resolved.borderColor};
      background-color: ${resolved.userBubbleBackground};
      color: ${resolved.textColor};
      white-space: nowrap;
    }
    .chat-flow {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .turn {
      width: 100%;
      display: flex;
      flex-direction: column;
    }
    .turn-user {
      align-items: flex-end;
    }
    .user-bubble {
      max-width: 82%;
      background-color: ${resolved.userBubbleBackground};
      color: ${resolved.userBubbleText};
      padding: 12px 18px;
      border-radius: 20px;
      border-bottom-right-radius: 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .turn-assistant {
      align-items: flex-start;
    }
    .assistant-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background-color: ${resolved.userBubbleBackground};
      border: 1px solid ${resolved.borderColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: ${resolved.textColor};
    }
    .assistant-label {
      font-size: 13px;
      font-weight: 600;
      color: ${resolved.textColor};
    }
    .assistant-timestamp {
      font-size: 11px;
      color: ${resolved.mutedText};
      font-weight: 400;
      margin-left: 4px;
    }
    .user-timestamp {
      font-size: 10px;
      color: ${resolved.mutedText};
      margin-top: 4px;
      text-align: right;
    }
    .assistant-body {
      width: 100%;
      padding-left: 34px;
    }
    .prose p { margin: 0.5rem 0; }
    .prose p:first-child { margin-top: 0; }
    .prose p:last-child { margin-bottom: 0; }
    .prose h1, .prose h2, .prose h3 { margin: 1rem 0 0.5rem; font-weight: 700; }
    .prose ul, .prose ol { margin: 0.5rem 0; padding-left: 1.5rem; }
    .prose pre {
      position: relative;
      background-color: ${resolved.codeBlockBackground};
      border: 1px solid ${resolved.borderColor};
      border-radius: 10px;
      padding: 32px 14px 12px;
      margin: 12px 0;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.45;
    }
    .code-lang-badge {
      position: absolute;
      top: 8px;
      left: 10px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 2px 6px;
      border-radius: 4px;
      background-color: ${resolved.userBubbleBackground};
      color: ${resolved.mutedText};
      border: 1px solid ${resolved.borderColor};
      opacity: 0.85;
      user-select: none;
      pointer-events: none;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .code-copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 11px;
      font-weight: 500;
      line-height: 1;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid ${resolved.borderColor};
      background: ${resolved.userBubbleBackground};
      color: ${resolved.textColor};
      cursor: pointer;
      opacity: 0.8;
      transition: all 0.15s ease;
    }
    .code-copy-btn:hover {
      opacity: 1;
      transform: translateY(-1px);
    }
    .code-copy-btn.copied {
      background: #16a34a;
      color: #ffffff;
      border-color: #16a34a;
    }
    .prose code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
    }
    .prose table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
      font-size: 13.5px;
    }
    .prose th, .prose td {
      border: 1px solid ${resolved.borderColor};
      padding: 7px 10px;
      text-align: left;
    }
    .prose th {
      background-color: ${resolved.userBubbleBackground};
      font-weight: 600;
    }
    .prose blockquote {
      border-left: 3px solid ${resolved.borderColor};
      padding-left: 12px;
      margin: 8px 0;
      color: ${resolved.mutedText};
      font-style: italic;
    }
    .prose a {
      color: ${resolved.linkColor};
      text-decoration: underline;
    }
    .attachments {
      margin-top: 10px;
      padding-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .attachment-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 8px;
      background-color: ${resolved.userBubbleBackground};
      border: 1px solid ${resolved.borderColor};
      font-size: 11.5px;
      color: ${resolved.textColor};
    }
    .att-img {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      object-fit: cover;
    }
    .att-name { font-weight: 500; }
    .att-size { font-size: 10px; color: ${resolved.mutedText}; }
    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid ${resolved.borderColor};
      display: flex;
      justify-content: flex-end;
      font-size: 11px;
      color: ${resolved.mutedText};
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="header-title">${escapeHtml(title)}</h1>
        <div class="header-meta">${siteName} conversation • Exported ${escapeHtml(conversation.exportedAt || new Date().toISOString())}</div>
      </div>
      <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
        <span class="badge">${messages.length} messages</span>
        <span class="badge">${totalWords.toLocaleString()} words</span>
        <span class="badge">~${readingMinutes} min read</span>
      </div>
    </div>

    <div class="chat-flow">
      ${renderedTurns}
    </div>

    <div class="footer">
      <span>${escapeHtml(watermark)}</span>
    </div>
  </div>

  <script>
    (function() {
      var codeBlocks = document.querySelectorAll('.prose pre');
      codeBlocks.forEach(function(pre) {
        var code = pre.querySelector('code');
        if (code && code.className) {
          var langMatch = code.className.match(/language-([a-zA-Z0-9#+_-]+)/);
          if (langMatch && langMatch[1]) {
            var langBadge = document.createElement('span');
            langBadge.className = 'code-lang-badge';
            langBadge.textContent = langMatch[1].toUpperCase();
            pre.appendChild(langBadge);
          }
        }
        var btn = document.createElement('button');
        btn.className = 'code-copy-btn';
        btn.textContent = 'Copy';
        btn.setAttribute('aria-label', 'Copy code to clipboard');
        btn.addEventListener('click', function() {
          var code = pre.querySelector('code');
          var text = code ? code.innerText : pre.innerText;
          function setCopied() {
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(function() {
              btn.textContent = 'Copy';
              btn.classList.remove('copied');
            }, 2000);
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(setCopied).catch(fallback);
          } else {
            fallback();
          }
          function fallback() {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try {
              document.execCommand('copy');
              setCopied();
            } catch(e) {}
            document.body.removeChild(ta);
          }
        });
        pre.appendChild(btn);
      });
    })();
  </script>
</body>
</html>`;

  return fullHtml;
}

export async function exportHtml(
  conversation: Conversation,
  options: ExportOptions
): Promise<void> {
  const fullHtml = buildHtmlContent(conversation, options);
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  await downloadBlob(blob, `${options.fileName || conversation.title || 'chat'}.html`);
}
