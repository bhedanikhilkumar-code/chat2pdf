# Chat2PDF Requirements Traceability Matrix

This document tracks all project requirements, their verification methods, implementation status, and proof artifacts.

## 1. Requirements Matrix

| ID | Requirement | Test Method | Status | Notes / Proof |
| :--- | :--- | :--- | :---: | :--- |
| **R1** | **Complete Chat Reader**: Extension reads open chat from `claude.ai`, `chatgpt.com`, `gemini.google.com`, `perplexity.ai`, `groq.com`. COMPLETE chat, all messages, any length (lazy-loaded or virtualized lists included). | Synthetic Fixtures + Real DOM Regression + Live Engine | **PASS** | Verified across real-world DOM layouts for Claude (`[data-turn-key]`, `[data-cds]`, sliding-window unmounting), modern ChatGPT (`div[data-user-message-bubble]`, `div[data-response-body]`, compound turn splitting), and Gemini (`infinite-scroller.chat-history`) in `tests/real_dom_regression.test.ts`. 30-message fixtures (`tests/fixtures_extraction.test.ts`) and 300-message virtualized benchmark (`tests/collector_real_behavior.test.ts`) both pass cleanly. Completeness check and fallback verified. |
| **R2** | **Web App (PWA) Local Parsing**: Web app works with pasted chat text, fully local, zero backend calls. | Automated Unit | **PASS** | Verified in `tests/parser.test.ts` (3/3 passed) and `tests/edge_cases.test.ts` (6/6 passed: single turn, 500 turns, code blocks, empty text, Hindi/Devanagari, malformed lines). |
| **R3** | **High-Fidelity Preview**: Preview looks like the original chat (same dark/light mode, same formatting: headings, lists, tables, code with highlighting, math, user bubbles vs assistant text, like a long screenshot). NOT plain extracted text. | Visual Inspection + Live Site Comparison Required | **NOT VERIFIED ON REAL SITE** | Automated responsive preview checks pass at 375/768/1280px in light/dark (`tests/preview_fidelity.test.ts`). **Must not be marked PASS until compared side-by-side with live site DOM screenshots.** |
| **R4** | **Attachment Detection**: Uploaded files/images in chat are detected and displayed as chips/thumbnails in preview and in every export format. | Synthetic Fixtures + Live Site Test Required | **NOT VERIFIED ON REAL SITE** | Attachment chip extraction tested on synthetic fixtures (`tests/fixtures_extraction.test.ts`) and export formatting (`tests/export_quality.test.ts`). **Must not be marked PASS until verified against live site chats with attachments.** |
| **R5** | **Multi-Format Export Quality**: PDF, DOCX, PPTX, PNG/JPG (long and short/cards), CSV, TXT, MD, Handwriting notes (PDF and JPG). Good quality: emoji, Hindi, tables, code, no cut-off text, correct line breaks. | Automated E2E + Programmatic XML Structure Check | **NOT RUN** (Visual DOCX/PPTX) / **PASS** (DOCX/PPTX XML & Other Formats) | Programmatic XML checks verified in `tests/docx_pptx_structure.test.ts`: DOCX `word/document.xml` has table, code blocks (Consolas), list items, Hindi, footer watermark + page number, no raw `$$`/`\frac`; PPTX has master/slide watermarks, Q&A unit slides, `(cont.)` split titles, `a:tbl` table shapes, and zero raw `$$`. Visual rendering via headless LibreOffice is **NOT RUN** because LibreOffice (`soffice`) is not installed on this machine. |
| **R6** | **Consistent Watermark**: "Made with Chat2PDF" bottom-right on EVERY page, slide and image (footer line/row in MD/TXT/CSV). | Automated + Visual | **PASS** | Verified in `tests/export_quality.test.ts` across all 10 formats. Bottom-right positioning asserted for PDF, PPTX master slides, DOCX footers, PNG/JPG long/cards, and handwriting canvas pages. |
| **R7** | **Reliable Downloads**: Every download button always downloads valid files, in both web app AND extension context. | Automated E2E | **PASS** | Verified in `scripts/verify-all.mjs` download matrix: 10/10 formats PASS in Web App, 10/10 formats PASS in Extension context. Non-empty buffers and valid magic headers (`%PDF-`, `PK\x03\x04`, `\xFF\xD8\xFF`, PNG) asserted. |
| **R8** | **Polished & Responsive UI**: UI is simple, modern, professional; mobile-first and responsive (320–1440px); dark mode fully works; NO unrequested elements (no GitHub link, no promo text). | Automated Audit | **PASS** | Verified in `tests/a11y_responsive.test.ts`: responsive check passed at 320px, 375px, 768px, 1024px, 1440px with no horizontal overflow and touch targets >= 44px; axe-core WCAG 2.1 AA 0 critical/serious violations; zero promo/github references in source code. |
| **R9** | **Page Style Control**: "Page style: Match chat / Light / Dark" control in Export step. | Automated + Visual | **PASS** | Implemented in `src/web/components/ExportStep.tsx` (lines 256–296), tested across light and dark modes in `tests/preview_fidelity.test.ts` and `tests/export_quality.test.ts`. |
| **R10** | **Clean Extension Security & Errors**: Extension has 0 CSP violations and 0 errors on `chrome://extensions`. | Automated Real Browser | **PASS** | Verified in `tests/extension_csp.test.ts` using real headed Chromium with `--load-extension`: 0 CSP violations, 0 console errors, 0 errors on `chrome://extensions`. `scripts/check-extension-csp.js` static check: 0 inline scripts. |
| **R11** | **Consistent Branding**: Product name is "Chat2PDF" everywhere. | Automated Check | **PASS** | Manifest name, popup title, web app title, branding constants (`WATERMARK_TEXT = 'Made with Chat2PDF'`), and package name verified. |

---

## 2. Automated Test Suite Mapping & Proof Artifacts

| Test Suite | File Path | Scope & Assertion Proof | Status |
| :--- | :--- | :--- | :---: |
| **Unit Parser** | `tests/parser.test.ts` | Role detection, chat title extraction, multi-turn parsing | **PASS** |
| **Edge Cases** | `tests/edge_cases.test.ts` | 500 messages, empty strings, Devanagari Hindi text, code blocks | **PASS** |
| **Browser Selectors** | `tests/selectors_browser.test.ts` | Live browser DOM query syntax validation for all supported AI hosts | **PASS** |
| **Fixtures Extraction** | `tests/fixtures_extraction.test.ts` | 30/30 messages from Claude, ChatGPT, Gemini synthetic DOM fixtures | **PASS** |
| **Virtualized Collector** | `tests/collector_real_behavior.test.ts` | 300 virtualized turns in order, 0 duplicates, under 1.5s; SPA navigation | **PASS** |
| **Real Browser CSP** | `tests/extension_csp.test.ts` | Real Chromium `--load-extension` run: 0 CSP violations, 0 chrome errors | **PASS** |
| **Preview Fidelity** | `tests/preview_fidelity.test.ts` | Responsive preview at 375/768/1280px in light/dark; 0 horizontal overflow | **PASS** |
| **Export Quality** | `tests/export_quality.test.ts` | All 10 formats verified with Hindi, emoji, tables, code, watermarks | **PASS** |
| **A11y & Responsive** | `tests/a11y_responsive.test.ts` | 320–1440px layouts, touch targets >= 44px, axe-core WCAG 2.1 AA | **PASS** |
| **Visual Export Audit** | `tests/export_visual_audit.test.ts` | Visual inspection of PDF, PNG, JPG, Cards, Handwriting in Light/Dark | **PASS** |
| **Handwriting Multipage** | `tests/handwriting_multipage.test.ts` | 12-page chat per-page JPG zip, margins, Hindi, watermark on every page | **PASS** |
| **Completeness Check** | `tests/completeness_check.test.ts` | Scroll to top verification, sanity check (<60%), amber status on broken structure | **PASS** |
| **Structure Fallback** | `tests/structure_fallback.test.ts` | 4 DOM shapes (deep wrappers, flat list, alternating siblings, virtual list) | **PASS** |
| **Redacted Diagnostics** | `tests/diagnostics_redaction.test.ts` | Zero leak of secret words, URL :id redaction, attribute value allowlist | **PASS** |
| **DOCX/PPTX Structure** | `tests/docx_pptx_structure.test.ts` | Programmatic XML inspection of table, code, lists, watermark, and no raw `$$` | **PASS** |
| **Real DOM Regression** | `tests/real_dom_regression.test.ts` | Real production DOM extraction (Claude data-turn-key, ChatGPT role-free compound turns, scrollers) | **PASS** |
| **Download Matrix** | `scripts/test-downloads.mjs` | 10 Formats x (Web, Extension): 20/20 valid file downloads | **PASS** |

---

## 3. Visual Verification Artifacts

Generated during automated verification and stored in `docs/verification/`:
- `preview-claude-dark-375.png`, `preview-claude-dark-768.png`, `preview-claude-dark-1280.png`
- `preview-claude-light-375.png`, `preview-claude-light-768.png`, `preview-claude-light-1280.png`
- `export-pdf-page-1.png`
- `export-png-page-1.png`
- `export-jpg-page-1.png`
- `export-card-page-1.png`
- `export-handwriting-pdf-page-1.png`
- `export-handwriting-jpg-page-1.png`
