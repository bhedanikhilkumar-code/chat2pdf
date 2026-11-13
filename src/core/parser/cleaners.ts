// UI junk patterns to remove from pasted chat text
// Keep line-start/line-end exact checks so we don't clobber actual sentences
const JUNK_LINE_PATTERNS = [
  /^[ \t]*Copy[ \t]*$/i,
  /^[ \t]*Copied!?[ \t]*$/i,
  /^[ \t]*Regenerate(\s+response)?[ \t]*$/i,
  /^[ \t]*Edit[ \t]*$/i,
  /^[ \t]*Share[ \t]*$/i,
  /^[ \t]*Like[ \t]*$/i,
  /^[ \t]*Dislike[ \t]*$/i,
  /^[ \t]*👍[ \t]*$/,
  /^[ \t]*👎[ \t]*$/,
  /^[ \t]*⬆️[ \t]*$/,
  /^[ \t]*🔄[ \t]*$/,
  /^[ \t]*Continue generating[ \t]*$/i,
  /^[ \t]*Stop generating[ \t]*$/i,
  /^[ \t]*\d+\s*\/\s*\d+[ \t]*$/, // "1/2" pagination
  /^[ \t]*Model:?\s*(GPT-4|GPT-3\.5|Claude|Gemini|Llama).*$/i,
  /^[ \t]*Default[ \t]*$/i,
  /^[ \t]*Send\s+a\s+message\.?[ \t]*$/i,
  /^[ \t]*ChatGPT can make mistakes.*$/i,
  /^[ \t]*Gemini may display inaccurate.*$/i,
  /^[ \t]*Claude can make mistakes.*$/i,
  /^[ \t]*Free\s+Research\s+Preview.*$/i,
];

// Clean text while preserving markdown code blocks, tables, lists, and spacing
export function cleanText(text: string): string {
  if (!text) return '';

  const lines = text.split('\n');
  const cleanedLines: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect fenced code block start/end
    if (/^[ \t]*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      cleanedLines.push(line);
      continue;
    }

    // Inside code blocks, never strip anything
    if (inCodeBlock) {
      cleanedLines.push(line);
      continue;
    }

    // Outside code blocks, check for standalone junk lines
    const isJunk = JUNK_LINE_PATTERNS.some((pattern) => pattern.test(line));
    if (isJunk) {
      continue;
    }

    cleanedLines.push(line);
  }

  let result = cleanedLines.join('\n');

  // Collapse 3 or more blank lines into max 2 blank lines (preserving paragraph breaks)
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

// Remove HTML junk selectors from DOM content
export function cleanHtmlContent(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const junkSelectors = [
    'button',
    '[data-testid="copy-button"]',
    '.copy-button',
    '.regenerate-button',
    '.feedback-buttons',
    '.message-actions',
    '.thumbs-up',
    '.thumbs-down',
    'svg',
    '.sr-only',
    '[aria-hidden="true"]',
  ];

  for (const sel of junkSelectors) {
    doc.querySelectorAll(sel).forEach((el) => el.remove());
  }

  return doc.body.textContent?.trim() || '';
}

