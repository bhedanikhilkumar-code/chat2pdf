# Chat2PDF 💬

> Turn AI conversations into beautifully formatted, downloadable documents — 100% locally in your browser. No backend, no servers, no API keys, and offline-capable.

Chat2PDF ships as **two products from one shared codebase**:
1. **Web App (PWA)**: Paste chat text from any AI, preview, filter, and export. Works offline once loaded.
2. **Chrome Extension (Manifest V3)**: Directly extracts chats from active tabs (`chatgpt.com`, `gemini.google.com`, `claude.ai`, `perplexity.ai`, `groq.com`) and opens the exporter UI with one click.

---

## 🌟 Supported Export Formats (All 100% Client-Side)

1. **📄 PDF Document**: Formatted A4 pages, styled code blocks with syntax background, role banners, and page counters using `jsPDF`.
2. **📃 Word Document (.docx)**: Native Microsoft Word files formatted with headings, message paragraphs, and clean styling via `docx`.
3. **📊 PowerPoint (.pptx)**: Presentation slides with one slide per Q&A pair and title card using `PptxGenJS`.
4. **🖼️ PNG / JPG Images**:
   - **Long Mode**: Entire conversation captured as a single high-resolution image using `html-to-image`.
   - **Short Mode**: Compact question + key answer cards view.
5. **📑 Markdown (.md)**: Clean GitHub-flavored markdown with preserved code blocks, lists, and tables.
6. **📝 Plain Text (.txt)**: Clean human-readable text file with clear role demarcations.
7. **📋 CSV Spreadsheet**: Structured table (`index`, `role`, `message`) ready for Excel, Sheets, or data pipelines via `PapaParse`.
8. **✍️ Handwriting Notes Mode**:
   - Realistic handwritten pages rendered directly onto canvas.
   - **Fonts**: *Caveat* (casual cursive), *Indie Flower* (playful), *Kalam* (Devanagari/Hindi handwriting), and *Hind* (clean Hindi).
   - **Paper Types**: Ruled lines, Grid/Graph paper, or Blank paper.
   - **Customizable Inks**: Deep blue, royal blue, classic black, charcoal, and red ink.
   - **Physics simulation**: Natural slight variations in character rotation, baseline slant, and ink opacity.
   - **Export Options**: Multi-page PDF or high-res JPG images.

---

## 🏗️ Architecture & Codebase Structure

```
Chat2PDF/
├── src/
│   ├── core/                          # SHARED: Parsers & Exporters
│   │   ├── parser/
│   │   │   ├── types.ts               # Core domain models & interfaces
│   │   │   ├── parseText.ts           # Universal chat parser with auto-role & source detection
│   │   │   ├── cleaners.ts            # UI junk remover (Copy, Regenerate, thumbs buttons, etc.)
│   │   │   └── filters.ts             # Filter modes (all, answers-only, questions-only, summary)
│   │   ├── exporters/
│   │   │   ├── exportPdf.ts           # jsPDF exporter with styled code blocks
│   │   │   ├── exportDocx.ts          # docx library exporter
│   │   │   ├── exportPptx.ts          # PptxGenJS slide deck exporter
│   │   │   ├── exportImage.ts         # html-to-image long & short modes
│   │   │   ├── exportCsv.ts           # PapaParse CSV generator
│   │   │   ├── exportTxt.ts           # Plain text formatter
│   │   │   ├── exportMarkdown.ts      # Markdown formatter
│   │   │   └── exportHandwriting.ts   # Canvas handwriting simulation engine
│   │   └── index.ts                   # Core exports
│   │
│   ├── web/                           # PWA WEB APPLICATION
│   │   ├── App.tsx                    # 3-step state machine (Import → Preview → Export)
│   │   ├── main.tsx                   # React root entry
│   │   ├── index.css                  # Tailwind CSS styling & dark mode transitions
│   │   ├── components/
│   │   │   ├── Layout.tsx             # Responsive header, dark mode toggle & footer
│   │   │   ├── StepIndicator.tsx      # Clean step wizard progress bar
│   │   │   ├── InputStep.tsx          # Chat paste box with sample chat loader & CORS notice
│   │   │   ├── PreviewStep.tsx        # Interactive markdown preview & filter selector
│   │   │   ├── ExportStep.tsx         # Format selector cards & image mode toggles
│   │   │   ├── ChatPreview.tsx        # Formatted chat bubble display with Markdown support
│   │   │   ├── HandwritingControls.tsx# Ink, font, paper & size customization panel
│   │   │   ├── CorsNotice.tsx         # Clear explanation of browser CORS restrictions
│   │   │   └── ThemeToggle.tsx        # Dark / Light mode switcher with local persistence
│   │   └── hooks/
│   │       ├── useTheme.ts            # Dark mode state & system preference listener
│   │       └── useExport.ts           # Unified export execution runner
│   │
│   └── extension/                     # CHROME EXTENSION (Manifest V3)
│       ├── manifest.json              # Minimal permissions: activeTab, scripting, storage
│       ├── popup/                     # Popup UI with "Export this chat" button
│       ├── content/                   # Content scripts
│       │   ├── extractor.ts           # DOM extraction engine
│       │   └── selectors/             # Per-site selector configs (modular & easy to maintain)
│       │       ├── chatgpt.ts         # chatgpt.com & chat.openai.com
│       │       ├── gemini.ts          # gemini.google.com
│       │       ├── claude.ts          # claude.ai
│       │       ├── perplexity.ts      # perplexity.ai
│       │       ├── groq.ts            # groq.com
│       │       └── index.ts           # Hostname to selector registry
│       └── background/
│           └── service-worker.ts      # Extension service worker
├── dist/                              # Compiled PWA web application
├── dist-extension/                    # Packaged Chrome Extension (ready for chrome://extensions)
└── vite.config.ts / vite.config.ext.ts# Vite multi-target build configs
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
```bash
npm install
```

### Running the Web App in Development
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Building the Products

### 1. Build Web App (PWA)
```bash
npm run build:web
```
Outputs the standalone PWA to `dist/`.

### 2. Build Chrome Extension (Manifest V3)
```bash
npm run build:extension
```
Outputs the ready-to-load extension to `dist-extension/`.

### 3. Build Everything
```bash
npm run build
```

---

## 🔌 How to Load the Chrome Extension in Chrome / Brave / Edge

1. Open your browser and navigate to `chrome://extensions/` (or `brave://extensions/` / `edge://extensions/`).
2. Toggle on **Developer mode** in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `dist-extension` folder inside this project directory (`c:\Users\bheda\Music\Desktop\Chat2PDF\dist-extension`).
5. Open any supported AI chat page:
   - ChatGPT ([chatgpt.com](https://chatgpt.com))
   - Google Gemini ([gemini.google.com](https://gemini.google.com))
   - Claude ([claude.ai](https://claude.ai))
   - Perplexity ([perplexity.ai](https://www.perplexity.ai))
   - Groq ([groq.com](https://groq.com))
6. Click the **Chat2PDF** extension icon in your toolbar, then click **"Export this chat"**.
7. It extracts the conversation DOM directly, cleans junk elements, and launches the local exporter interface with your chat loaded!

---

## 🔒 Privacy & Local Processing Guarantee
- **Zero API keys required.**
- **Zero server calls.**
- All parsing, rendering, canvas drawing, PDF creation, and Word document assembly occur exclusively in memory inside your browser.
