import type { SiteSelectors } from '@core/parser/types';
import { chatgptSelectors } from './chatgpt';
import { geminiSelectors } from './gemini';
import { claudeSelectors } from './claude';
import { perplexitySelectors } from './perplexity';
import { groqSelectors } from './groq';
import { deepseekSelectors } from './deepseek';

export const selectorMap: Record<string, SiteSelectors> = {
  'chatgpt.com': chatgptSelectors,
  'chat.openai.com': chatgptSelectors,
  'gemini.google.com': geminiSelectors,
  'claude.ai': claudeSelectors,
  'www.perplexity.ai': perplexitySelectors,
  'perplexity.ai': perplexitySelectors,
  'groq.com': groqSelectors,
  'chat.deepseek.com': deepseekSelectors,
  'deepseek.com': deepseekSelectors,
};

export function getSelectorsForHost(hostname: string): SiteSelectors | null {
  return selectorMap[hostname] ?? null;
}
