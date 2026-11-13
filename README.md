# Chat2PDF 💬

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Turn AI conversations into beautifully formatted, downloadable documents — 100% locally in your browser. No backend, no servers, no API keys, and offline-capable.

Chat2PDF ships as **two products from one shared codebase**:
1. **Web App (PWA)**: Paste chat text from any AI, preview, filter, and export. Works offline once loaded.
2. **Chrome Extension (Manifest V3)**: Directly extracts chats from active tabs (chatgpt.com, gemini.google.com, claude.ai, perplexity.ai, groq.com) and opens the exporter UI with one click.

---

## 📸 Visual Walkthrough

### Step 1: Import Conversation
Paste text directly or click **Load Sample Chat** to test immediately.

![Step 1: Import Conversation](docs/screenshots/01-input-step.png)

### Step 2: Clean Preview & Filter
Preview markdown, code blocks, tables, and roles with options for *All*, *Answers Only*, *Questions Only*, or *Summary*.

![Step 2: Preview & Filter](docs/screenshots/02-preview-step.png)

### Step 3: Choose Format & Download
Select from 8 client-side export engines with live feedback.

![Step 3: Choose Format & Download](docs/screenshots/03-export-step.png)

### Handwritten Notes Mode
Realistic handwritten paper output with customizable fonts (*Caveat*, *Indie Flower*, *Kalam*, *Hind*), ruled/graph/blank paper, and ink color control.

![Handwriting Notes Controls](docs/screenshots/04-handwriting-controls.png)

---

## 🌟 Supported Export Formats (All 100% Client-Side)

1. **📄 PDF Document**: Formatted A4 pages, styled code blocks with syntax background, role banners, and page counters using jsPDF.
2. **📃 Word Document (.docx)**: Native Microsoft Word files formatted with headings, message paragraphs, and clean styling via docx.
3. **📊 PowerPoint (.pptx)**: Presentation slides with one slide per Q&A pair and title card using PptxGenJS.
4. **🖼️ PNG / JPG Images**:
   - **Long Mode**: Entire conversation captured as a single high-resolution image using html-to-image.
   - **Short Mode**: Compact question + key answer cards view.
5. **📑 Markdown (.md)**: Clean GitHub-flavored markdown with preserved code blocks, lists, and tables.
6. **📝 Plain Text (.txt)**: Clean human-readable text file with clear role demarcations.
7. **📋 CSV Spreadsheet**: Structured table (index, role, message) ready for Excel, Sheets, or data pipelines via PapaParse.
8. **✍️ Handwriting Notes Mode**:
   - Realistic handwritten pages rendered directly onto canvas.
   - **Fonts**: *Caveat* (casual cursive), *Indie Flower* (playful), *Kalam* (Devanagari/Hindi handwriting), and *Hind* (clean Hindi).
   - **Paper Types**: Ruled lines, Grid/Graph paper, or Blank paper.
   - **Customizable Inks**: Deep blue, royal blue, classic black, charcoal, and red ink.
   - **Physics simulation**: Natural slight variations in character rotation, baseline slant, and ink opacity.
   - **Export Options**: Multi-page PDF or high-res JPG images.

---

## 🔌 Install the Chrome Extension

1. Clone or download this repository and run 
pm run build:extension (or 
pm run build).
2. Open your browser and navigate to chrome://extensions/ (or rave://extensions/ / edge://extensions/).
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the dist-extension folder generated inside this repository.
6. Visit any supported chat interface: chatgpt.com, gemini.google.com, claude.ai, perplexity.ai, or groq.com.
7. Click the **Chat2PDF** icon in your browser toolbar and click **Export this chat**.

---

## 🚀 Development & Web App Usage

`ash
# Install dependencies
npm install

# Run development server
npm run dev

# Build standalone PWA web application
npm run build:web

# Build Chrome Extension
npm run build:extension

# Build both
npm run build
`

---

## 📂 Sample Exports

View generated export samples showcasing formatting, emojis, tables, code blocks, and the watermark:
- [Sample Markdown](docs/samples/sample-chat.md)
- [Sample Plain Text](docs/samples/sample-chat.txt)
- [Sample CSV](docs/samples/sample-chat.csv)

---

## 🛠️ Troubleshooting

### Extension Exporter Page Shows a Blank Screen
If chrome-extension://<id>/web/index.html displays a blank page:
1. **Asset Base Paths**: The extension UI requires relative base paths (./assets/...) rather than absolute paths (/assets/...). This is handled automatically by 
pm run build:extension via Vite's ase: './'.
2. **PWA Service Worker in Extension**: The PWA service worker (ite-plugin-pwa) is disabled in extension builds to prevent service worker conflicts inside Chrome extension contexts.
3. **No Underscore Chunks**: Chrome extensions reject assets starting with leading underscores (e.g. _commonjsHelpers). The build pipeline renames all such files with an ext- prefix.
4. **Data Sync**: The exporter reads directly from chrome.storage.local with fallback to window.localStorage. Ensure the active chat tab has finished generating before pressing **Export this chat**.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
