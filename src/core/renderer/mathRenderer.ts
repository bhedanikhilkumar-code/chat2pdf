import katex from 'katex';

/**
 * Converts LaTeX math expressions in text to clean, readable plain text.
 * Used for formats that cannot render HTML/KaTeX directly (DOCX, PPTX, TXT, CSV),
 * or as a fallback so that raw '$$' delimiters are never output to users.
 */
export function cleanMathToReadableText(rawText: string): string {
  if (!rawText) return '';

  function formatLatexFormula(tex: string): string {
    let s = tex.trim();
    // Common mathematical operators & symbols
    s = s.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, '∑($1 to $2) ');
    s = s.replace(/\\prod_\{([^}]+)\}\^\{([^}]+)\}/g, '∏($1 to $2) ');
    s = s.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '∫($1 to $2) ');
    s = s.replace(/\\sum/g, '∑');
    s = s.replace(/\\prod/g, '∏');
    s = s.replace(/\\int/g, '∫');
    s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');
    s = s.replace(/\\approx/g, '≈');
    s = s.replace(/\\ne(q)?/g, '≠');
    s = s.replace(/\\le(q)?/g, '≤');
    s = s.replace(/\\ge(q)?/g, '≥');
    s = s.replace(/\\pm/g, '±');
    s = s.replace(/\\times/g, '×');
    s = s.replace(/\\div/g, '÷');
    s = s.replace(/\\cdot/g, '·');
    s = s.replace(/\\infty/g, '∞');
    s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

    // Greek letters
    s = s.replace(/\\mu/g, 'μ');
    s = s.replace(/\\sigma/g, 'σ');
    s = s.replace(/\\alpha/g, 'α');
    s = s.replace(/\\beta/g, 'β');
    s = s.replace(/\\gamma/g, 'γ');
    s = s.replace(/\\delta/g, 'δ');
    s = s.replace(/\\pi/g, 'π');
    s = s.replace(/\\theta/g, 'θ');
    s = s.replace(/\\lambda/g, 'λ');

    // Subscripts & Superscripts
    s = s.replace(/_\{([^}]+)\}/g, '_$1');
    s = s.replace(/\^\{([^}]+)\}/g, '^$1');

    // Strip remaining LaTeX commands like \text{...} or single slashes
    s = s.replace(/\\text\{([^}]+)\}/g, '$1');
    s = s.replace(/\\([a-zA-Z]+)/g, '$1');

    return s.trim();
  }

  // Replace block math $$...$$
  let processed = rawText.replace(/\$\$([\s\S]+?)\$\$/g, (_, eq) => {
    return formatLatexFormula(eq);
  });

  // Replace inline math $...$ (ignore currency like $100)
  processed = processed.replace(/(^|[^\$\\])\$([^\$\n]+?)\$/g, (_, prefix, eq) => {
    // If it looks like a number/price, keep as is
    if (/^\s*\d+([.,]\d+)?\s*$/.test(eq)) {
      return `${prefix}$${eq}$`;
    }
    return prefix + formatLatexFormula(eq);
  });

  return processed;
}

/**
 * Renders LaTeX math expressions ($$...$$ and $...$) into HTML using KaTeX.
 * If rendering fails, converts to clean readable text, NEVER raw $$ source.
 */
export function renderMathInMarkdown(markdown: string): string {
  if (!markdown) return '';

  // 1. Process block math $$...$$
  let result = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `<div class="chat2pdf-math-display">${cleanMathToReadableText(tex)}</div>`;
    }
  });

  // 2. Process inline math $...$
  result = result.replace(/(^|[^\$\\])\$([^\$\n]+?)\$/g, (match, prefix, tex) => {
    // Exclude currency like $50 or $1,000
    if (/^\s*\d+([.,]\d+)?\s*$/.test(tex)) {
      return match;
    }
    try {
      const rendered = katex.renderToString(tex.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return prefix + rendered;
    } catch {
      return prefix + `<span class="chat2pdf-math-inline">${cleanMathToReadableText(tex)}</span>`;
    }
  });

  return result;
}
