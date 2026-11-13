// UI junk patterns to remove from pasted chat text
const JUNK_PATTERNS = [
  /^\s*Copy\s*$/gm,
  /^\s*Copied!\s*$/gm,
  /^\s*Regenerate(\s+response)?\s*$/gm,
  /^\s*Edit\s*$/gm,
  /^\s*Share\s*$/gm,
  /^\s*Like\s*$/gm,
  /^\s*Dislike\s*$/gm,
  /^\s*👍\s*$/gm,
  /^\s*👎\s*$/gm,
  /^\s*⬆️\s*$/gm,
  /^\s*🔄\s*$/gm,
  /^\s*Continue generating\s*$/gm,
  /^\s*Stop generating\s*$/gm,
  /^\s*\d+\s*\/\s*\d+\s*$/gm, // "1/2" pagination
  /^\s*Model:?\s*(GPT-4|GPT-3\.5|Claude|Gemini|Llama).*$/gim,
  /^\s*Default\s*$/gm,
  /^\s*Send\s+a\s+message\.?\s*$/gm,
  /^\s*ChatGPT can make mistakes.*$/gm,
  /^\s*Gemini may display inaccurate.*$/gm,
  /^\s*Claude can make mistakes.*$/gm,
  /^\s*Free\s+Research\s+Preview.*$/gm,
];

// Remove junk button text and UI artifacts from pasted text
export function cleanText(text: string): string {
  let cleaned = text;

  for (const pattern of JUNK_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove excessive blank lines (3+ → 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

// Remove HTML junk selectors from DOM content
export function cleanHtmlContent(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove common junk elements
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
