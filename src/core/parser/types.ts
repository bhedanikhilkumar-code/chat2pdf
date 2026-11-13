// Core types for Chat2PDF
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  index: number;
  timestamp?: string;
}

export interface Conversation {
  title: string;
  source: string; // chatgpt, gemini, claude, perplexity, groq, unknown
  messages: ChatMessage[];
  exportedAt: string;
}

export type ExportFormat = 'pdf' | 'pptx' | 'csv' | 'txt' | 'md' | 'jpg' | 'png' | 'docx' | 'handwriting';

export type ImageMode = 'long' | 'short';

export type FilterMode = 'all' | 'answers-only' | 'questions-only' | 'summary';

export type PaperType = 'ruled' | 'graph' | 'blank';

export interface HandwritingOptions {
  font: 'Caveat' | 'Indie Flower' | 'Kalam' | 'Hind';
  inkColor: string;
  paperType: PaperType;
  fontSize: number;
  exportAs: 'pdf' | 'jpg';
}

export interface ExportOptions {
  format: ExportFormat;
  filterMode: FilterMode;
  imageMode?: ImageMode;
  handwriting?: HandwritingOptions;
  includeTitle?: boolean;
  fileName?: string;
}

export interface SiteSelectors {
  messageContainer: string;
  userMessage: string;
  assistantMessage: string;
  messageContent: string;
  chatTitle?: string;
  junkSelectors: string[];
}
