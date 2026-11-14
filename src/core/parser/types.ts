export interface Attachment {
  name: string;
  kind?: string; // 'image', 'document', 'pdf', 'code', 'archive', etc.
  size?: string;
  thumbnail?: string; // data URL or small base64
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  htmlContent?: string;
  index: number;
  timestamp?: string;
  attachments?: Attachment[];
}

export type ThemeMode = 'dark' | 'light';

export interface ThemeSnapshot {
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

export interface Conversation {
  title: string;
  source: string; // chatgpt, gemini, claude, perplexity, groq, unknown
  messages: ChatMessage[];
  exportedAt: string;
  themeSnapshot?: ThemeSnapshot;
}

export type ExportFormat = 'pdf' | 'pptx' | 'csv' | 'txt' | 'md' | 'jpg' | 'png' | 'docx' | 'handwriting';

export type PageStyle = 'match' | 'light' | 'dark';

export type ImageMode = 'long' | 'short' | 'card';

export type FilterMode = 'all' | 'answers-only' | 'questions-only' | 'summary';

export type PaperType = 'ruled' | 'graph' | 'blank';

export interface HandwritingOptions {
  font: 'Caveat' | 'Indie Flower' | 'Kalam' | 'Hind';
  inkColor: string;
  paperType: PaperType;
  fontSize: number;
  exportAs: 'pdf' | 'jpg';
  lineSpacing?: number;
  jitter?: boolean;
}

export interface ExportOptions {
  format: ExportFormat;
  filterMode: FilterMode;
  pageStyle?: PageStyle;
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
  scrollContainer?: string;
  loadEarlierButton?: string;
  expandButtons?: string;
  attachmentContainer?: string;
  junkSelectors: string[];
}

