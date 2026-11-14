import type { ThemeMode, ThemeSnapshot } from '../parser/types';

export interface ResolvedTheme {
  mode: ThemeMode;
  pageBackground: string;
  textColor: string;
  mutedText: string;
  borderColor: string;
  userBubbleBackground: string;
  userBubbleText: string;
  codeBlockBackground: string;
  linkColor: string;
  source: 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'groq' | 'generic';
}

export function resolveTheme(
  themeSnapshot?: ThemeSnapshot,
  pageStyle: 'match' | 'light' | 'dark' = 'match',
  sourceFallback = 'generic'
): ResolvedTheme {
  let source: ResolvedTheme['source'] = 'generic';
  const rawSource = (themeSnapshot?.source || sourceFallback).toLowerCase();
  if (rawSource.includes('chatgpt') || rawSource.includes('openai')) source = 'chatgpt';
  else if (rawSource.includes('claude')) source = 'claude';
  else if (rawSource.includes('gemini')) source = 'gemini';
  else if (rawSource.includes('perplexity')) source = 'perplexity';
  else if (rawSource.includes('groq')) source = 'groq';

  // Force Light
  if (pageStyle === 'light') {
    return {
      mode: 'light',
      pageBackground: '#ffffff',
      textColor: '#0d0d0d',
      mutedText: '#64748b',
      borderColor: '#e5e7eb',
      userBubbleBackground: '#f4f4f5',
      userBubbleText: '#0f172a',
      codeBlockBackground: '#f8fafc',
      linkColor: '#2563eb',
      source,
    };
  }

  // Force Dark (matching reference ChatGPT dark screenshot)
  if (pageStyle === 'dark') {
    return {
      mode: 'dark',
      pageBackground: '#212121',
      textColor: '#ececec',
      mutedText: '#b4b4b4',
      borderColor: '#2f2f2f',
      userBubbleBackground: '#2f2f2f',
      userBubbleText: '#ffffff',
      codeBlockBackground: '#171717',
      linkColor: '#10a37f',
      source,
    };
  }

  // Match chat: use snapshot if present
  if (themeSnapshot) {
    return {
      mode: themeSnapshot.mode,
      pageBackground: themeSnapshot.pageBackground,
      textColor: themeSnapshot.textColor,
      mutedText: themeSnapshot.mutedText,
      borderColor: themeSnapshot.borderColor,
      userBubbleBackground: themeSnapshot.userBubbleBackground,
      userBubbleText: themeSnapshot.userBubbleText,
      codeBlockBackground: themeSnapshot.codeBlockBackground,
      linkColor: themeSnapshot.linkColor,
      source: themeSnapshot.source || source,
    };
  }

  // Default fallback when no snapshot is available (e.g. web raw text paste)
  return {
    mode: 'light',
    pageBackground: '#ffffff',
    textColor: '#0d0d0d',
    mutedText: '#64748b',
    borderColor: '#e5e7eb',
    userBubbleBackground: '#f4f4f5',
    userBubbleText: '#0f172a',
    codeBlockBackground: '#f8fafc',
    linkColor: '#2563eb',
    source,
  };
}
