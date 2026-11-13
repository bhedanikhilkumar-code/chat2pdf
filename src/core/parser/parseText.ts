import { cleanText } from './cleaners';
import type { ChatMessage, Conversation } from './types';

// Role detection patterns
const ROLE_PATTERNS = {
  user: [
    /^(You|User|Human|Me|Q|Question)\s*[:\-]/i,
    /^>\s*(You|User|Human|Me)\s*[:\-]/i,
    /^\*\*(You|User|Human|Me)\*\*\s*[:\-]?/i,
  ],
  assistant: [
    /^(ChatGPT|GPT|AI|Assistant|Bot|Claude|Gemini|Perplexity|Groq|Model|A|Answer)\s*[:\-]/i,
    /^>\s*(ChatGPT|GPT|AI|Assistant|Bot|Claude|Gemini|Perplexity|Groq)\s*[:\-]/i,
    /^\*\*(ChatGPT|GPT|AI|Assistant|Bot|Claude|Gemini|Perplexity|Groq)\*\*\s*[:\-]?/i,
  ],
};

function detectRole(line: string): 'user' | 'assistant' | null {
  for (const pattern of ROLE_PATTERNS.user) {
    if (pattern.test(line)) return 'user';
  }
  for (const pattern of ROLE_PATTERNS.assistant) {
    if (pattern.test(line)) return 'assistant';
  }
  return null;
}

function stripRolePrefix(line: string): string {
  return line
    .replace(
      /^(\*\*)?(You|User|Human|Me|ChatGPT|GPT|AI|Assistant|Bot|Claude|Gemini|Perplexity|Groq|Model|Q|A|Question|Answer)(\*\*)?\s*[:\-]\s*/i,
      ''
    )
    .replace(/^>\s*/, '');
}

function detectSource(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('chatgpt') || lower.includes('gpt-4') || lower.includes('gpt-3'))
    return 'chatgpt';
  if (lower.includes('gemini') || lower.includes('google ai'))
    return 'gemini';
  if (lower.includes('claude') || lower.includes('anthropic'))
    return 'claude';
  if (lower.includes('perplexity'))
    return 'perplexity';
  if (lower.includes('groq') || lower.includes('llama'))
    return 'groq';
  return 'unknown';
}

export function parseText(rawText: string): Conversation {
  const cleaned = cleanText(rawText);
  const lines = cleaned.split('\n');
  const messages: ChatMessage[] = [];

  let currentRole: 'user' | 'assistant' = 'user';
  let currentContent: string[] = [];
  let messageIndex = 0;
  let hasExplicitRoles = false;
  let inCodeBlock = false;

  // First pass: check if there are explicit role markers outside code blocks
  for (const line of lines) {
    if (/^[ \t]*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (!inCodeBlock && detectRole(line) !== null) {
      hasExplicitRoles = true;
      break;
    }
  }

  inCodeBlock = false;

  if (hasExplicitRoles) {
    for (const line of lines) {
      if (/^[ \t]*```/.test(line)) {
        inCodeBlock = !inCodeBlock;
        currentContent.push(line);
        continue;
      }

      const role = !inCodeBlock ? detectRole(line) : null;
      if (role !== null) {
        if (currentContent.length > 0) {
          const content = currentContent.join('\n').trim();
          if (content) {
            messages.push({
              role: currentRole,
              content,
              index: messageIndex++,
            });
          }
        }
        currentRole = role;
        const stripped = stripRolePrefix(line);
        currentContent = stripped ? [stripped] : [];
      } else {
        currentContent.push(line);
      }
    }
  } else {
    // Split into turns while respecting code blocks and blank lines
    const turns: string[] = [];
    let currentTurnLines: string[] = [];
    let emptyLineCount = 0;
    let insideCode = false;

    for (const line of lines) {
      if (/^[ \t]*```/.test(line)) {
        insideCode = !insideCode;
        currentTurnLines.push(line);
        emptyLineCount = 0;
        continue;
      }

      if (insideCode) {
        currentTurnLines.push(line);
        continue;
      }

      if (line.trim() === '') {
        emptyLineCount++;
        // If 2 or more consecutive blank lines, consider it a turn boundary
        if (emptyLineCount >= 2 && currentTurnLines.length > 0) {
          const block = currentTurnLines.join('\n').trim();
          if (block) {
            turns.push(block);
          }
          currentTurnLines = [];
        } else {
          currentTurnLines.push(line);
        }
      } else {
        emptyLineCount = 0;
        currentTurnLines.push(line);
      }
    }

    if (currentTurnLines.length > 0) {
      const block = currentTurnLines.join('\n').trim();
      if (block) turns.push(block);
    }

    for (const block of turns) {
      messages.push({
        role: currentRole,
        content: block,
        index: messageIndex++,
      });
      currentRole = currentRole === 'user' ? 'assistant' : 'user';
    }

    return {
      title: extractTitle(cleaned),
      source: detectSource(cleaned),
      messages,
      exportedAt: new Date().toISOString(),
    };
  }

  // Save last message
  if (currentContent.length > 0) {
    const content = currentContent.join('\n').trim();
    if (content) {
      messages.push({
        role: currentRole,
        content,
        index: messageIndex++,
      });
    }
  }

  return {
    title: extractTitle(cleaned),
    source: detectSource(cleaned),
    messages,
    exportedAt: new Date().toISOString(),
  };
}

function extractTitle(text: string): string {
  const firstLine = text.split('\n')[0]?.trim() || '';
  if (firstLine.length > 0 && firstLine.length <= 80) {
    return firstLine.replace(/^(You|User|Human|Me|Q|Question)\s*[:\-]\s*/i, '');
  }
  return 'Untitled Chat';
}

export function parseExtracted(
  data: { role: 'user' | 'assistant'; content: string }[],
  source: string,
  title?: string
): Conversation {
  return {
    title: title || 'Exported Chat',
    source,
    messages: data.map((m, i) => ({
      ...m,
      content: cleanText(m.content),
      index: i,
    })),
    exportedAt: new Date().toISOString(),
  };
}
