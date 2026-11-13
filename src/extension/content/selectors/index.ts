import type { SiteSelectors } from '@core/parser/types';
import { chatgptSelectors } from './chatgpt';
import { geminiSelectors } from './gemini';
import { claudeSelectors } from './claude';
import { perplexitySelectors } from './perplexity';
import { groqSelectors } from './groq';

export const selectorMap: Record<string, SiteSelectors> = {
  'chatgpt.com': chatgptSelectors,
  'chat.openai.com': chatgptSelectors,
  'gemini.google.com': geminiSelectors,
  'claude.ai': claudeSelectors,
  'www.perplexity.ai': perplexitySelectors,
  'groq.com': groqSelectors,
};

export function getSelectorsForHost(hostname: string): SiteSelectors | null {
  return selectorMap[hostname] ?? null;
}
