import DOMPurify from 'dompurify';
import katex from 'katex';
import { safeQuerySelectorAll, safeQuerySelector } from './dom-utils';

export function processRichMessage(
  liveNode: HTMLElement,
  junkSelectors: string[] = []
): { html: string; rawText: string } {
  // Clone the message node
  const clone = liveNode.cloneNode(true) as HTMLElement;

  // 1. Retain code block language & syntax highlighting token styles from live DOM
  try {
    const liveSpans = safeQuerySelectorAll<HTMLElement>(liveNode, 'pre code span, pre span');
    const cloneSpans = safeQuerySelectorAll<HTMLElement>(clone, 'pre code span, pre span');
    const count = Math.min(liveSpans.length, cloneSpans.length);
    for (let i = 0; i < count; i++) {
      try {
        const cs = window.getComputedStyle(liveSpans[i]);
        if (cs.color) cloneSpans[i].style.color = cs.color;
        if (cs.fontWeight === 'bold' || parseInt(cs.fontWeight, 10) >= 600) {
          cloneSpans[i].style.fontWeight = '600';
        }
        if (cs.fontStyle === 'italic') {
          cloneSpans[i].style.fontStyle = 'italic';
        }
      } catch (e) {}
    }

    const livePres = safeQuerySelectorAll<HTMLElement>(liveNode, 'pre');
    const clonePres = safeQuerySelectorAll<HTMLElement>(clone, 'pre');
    for (let i = 0; i < livePres.length; i++) {
      const livePre = livePres[i];
      const clonePre = clonePres[i];
      if (!clonePre) continue;

      let lang = '';
      const codeEl = safeQuerySelector(livePre, 'code');
      if (codeEl) {
        const langClass = Array.from(codeEl.classList).find(
          (c) => c.startsWith('language-') || c.startsWith('lang-')
        );
        if (langClass) lang = langClass.replace(/^language-|^lang-/, '');
      }
      if (!lang) {
        const parentBlock = livePre.closest('div[class*="code-block"], div[class*="overflow-hidden"], div[class*="rounded"]');
        const headerEl = parentBlock ? parentBlock.querySelector('span, div') : null;
        const headerText = headerEl?.textContent?.trim() || '';
        if (headerText && headerText.length < 25 && !headerText.includes(' ') && headerText.toLowerCase() !== 'copy') {
          lang = headerText.toLowerCase();
        }
      }
      if (lang) {
        clonePre.setAttribute('data-lang', lang);
      }
    }
  } catch (e) {
    console.warn('[Chat2PDF] Syntax highlighting preservation warning:', e);
  }

  // 2. Math: KaTeX extraction and re-rendering with bundled KaTeX
  try {
    const annotations = safeQuerySelectorAll<HTMLElement>(clone, 'annotation[encoding="application/x-tex"]');
    annotations.forEach((anno) => {
      const tex = anno.textContent?.trim();
      if (tex) {
        const container = anno.closest('.katex-display, .katex') || anno;
        const isDisplay = container.classList.contains('katex-display') || container.tagName.toLowerCase() === 'div';
        try {
          const rendered = katex.renderToString(tex, {
            throwOnError: false,
            displayMode: isDisplay,
          });
          const tempWrapper = document.createElement('span');
          tempWrapper.innerHTML = rendered;
          container.replaceWith(tempWrapper);
        } catch (err) {
          console.warn('[Chat2PDF] KaTeX formula re-render skipped:', err);
        }
      }
    });
  } catch (e) {
    console.warn('[Chat2PDF] Math rendering error:', e);
  }

  // 3. Images: convert to small data-URL thumbnails (max 400px)
  try {
    const images = safeQuerySelectorAll<HTMLImageElement>(clone, 'img');
    images.forEach((img) => {
      if (img.src && img.src.startsWith('data:')) {
        img.style.maxWidth = '400px';
        img.style.height = 'auto';
        img.style.borderRadius = '8px';
        return;
      }
      if (img.src) {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const naturalWidth = img.naturalWidth || img.width || 300;
          const naturalHeight = img.naturalHeight || img.height || 200;
          const maxDim = 400;
          let width = naturalWidth;
          let height = naturalHeight;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/png');
            img.src = dataUrl;
          }
        } catch (e) {
          // If canvas is blocked by CORS, keep original img or clamp size
        }
        img.style.maxWidth = '400px';
        img.style.height = 'auto';
        img.style.borderRadius = '8px';
      }
    });
  } catch (e) {
    console.warn('[Chat2PDF] Image processing error:', e);
  }

  // 4. Strip classes, ids, scripts, buttons, svg toolbars and site UI chrome
  const defaultChromeSelectors = [
    'button',
    '.copy-code-button',
    '.copy-button',
    '.feedback-buttons',
    '.message-actions',
    '.thumbs-up',
    '.thumbs-down',
    'svg',
    '.sr-only',
    '[aria-hidden="true"]',
    ...junkSelectors,
  ];

  defaultChromeSelectors.forEach((sel) => {
    try {
      const els = clone.querySelectorAll(sel);
      els.forEach((el) => el.remove());
    } catch (e) {}
  });

  // Extract raw text for fallback markdown
  const rawText = clone.innerText || clone.textContent || '';

  // 5. Sanitize HTML using DOMPurify with strict allowlist
  const sanitizedHtml = DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'b',
      'em',
      'i',
      'del',
      's',
      'blockquote',
      'pre',
      'code',
      'span',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'a',
      'img',
      'hr',
      'sup',
      'sub',
      'div',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'data-lang', 'target', 'rel'],
    KEEP_CONTENT: true,
  });

  return {
    html: sanitizedHtml,
    rawText,
  };
}
