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
  // Remove role prefixes like "You:", "ChatGPT:", "**User**:", etc.
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

  // First pass: check if there are explicit role markers
  for (const line of lines) {
    if (detectRole(line) !== null) {
      hasExplicitRoles = true;
      break;
    }
  }

  if (hasExplicitRoles) {
    // Parse with role markers
    for (const line of lines) {
      const role = detectRole(line);
      if (role !== null) {
        // Save previous message
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
    // No explicit roles: try to split by double newlines, alternate user/assistant
    const blocks = cleaned.split(/\n\n+/);
    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;
      messages.push({
        role: currentRole,
        content: trimmed,
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
  // Try to extract a title from the first user message
  const firstLine = text.split('\n')[0]?.trim() || '';
  if (firstLine.length > 0 && firstLine.length <= 80) {
    return firstLine.replace(/^(You|User|Human|Me|Q|Question)\s*[:\-]\s*/i, '');
  }
  return 'Untitled Chat';
}

// Parse from extension-extracted data (pre-structured)
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
