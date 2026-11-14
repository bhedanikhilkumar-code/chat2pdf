# Chat2PDF Requirements Traceability Matrix

This document tracks all project requirements, their verification methods, their current implementation status, mapping to automated test suites, and identified testing gaps.

## 1. Requirements Matrix

| ID | Requirement | Test Method | Status | Notes / Proof |
| :--- | :--- | :--- | :--- | :--- |
| **R1** | **Complete Chat Reader**: Extension reads open chat from `claude.ai`, `chatgpt.com`, `gemini.google.com`, `perplexity.ai`, `groq.com`. COMPLETE chat, all messages, any length (lazy-loaded or virtualized lists included). | Automated + Real Site | **NOT TESTED** | Earlier test passed only on 300-message `mock_chat.html`. In real tests on `claude.ai`, a 25+ message chat loaded only 3 messages. Needs real DOM probe and selector redesign. |
| **R2** | **Web App (PWA) Local Parsing**: Web app works with pasted chat text, fully local, zero backend calls. | Automated | **NOT TESTED** | Unit tested in parser & edge cases (`parser.test.ts`, `edge_cases.test.ts`). Status reset to NOT TESTED per Phase 0 baseline. |
| **R3** | **High-Fidelity Preview**: Preview looks like the original chat (same dark/light mode, same formatting: headings, lists, tables, code with highlighting, math, user bubbles vs assistant text, like a long screenshot). NOT plain extracted text. | Real Site + Visual | **NOT TESTED** | Theme snapshot capture implemented, but side-by-side comparison against real site chats is pending. |
| **R4** | **Attachment Detection**: Uploaded files/images in chat are detected and displayed as chips/thumbnails in preview and in every export format. | Automated + Real Site | **NOT TESTED** | Inline parsing logic exists in parser, but end-to-end detection from live site DOM is unverified. |
| **R5** | **Multi-Format Export Quality**: PDF, DOCX, PPTX, PNG/JPG (long and short/cards), CSV, TXT, MD, Handwriting notes (PDF and JPG). Good quality: emoji, Hindi, tables, code, no cut-off text, correct line breaks. | Automated + Manual | **NOT TESTED** | All 10 formats download in `test-downloads.mjs`, but visual inspection of page-by-page rendering across fonts and complex tables needs audit. |
| **R6** | **Consistent Watermark**: "Made with Chat2PDF" bottom-right on EVERY page, slide and image (footer line/row in MD/TXT/CSV). | Automated + Visual | **NOT TESTED** | Implemented across exporters; requires visual page-by-page verification. |
| **R7** | **Reliable Downloads**: Every download button always downloads valid files, in both web app AND extension context. | Automated | **NOT TESTED** | Tested via Playwright matrix (10/10 Web, 10/10 Extension in `test-downloads.mjs`). Reset to NOT TESTED for formal tracking. |
| **R8** | **Polished & Responsive UI**: UI is simple, modern, professional; mobile-first and responsive (320–1440px); dark mode fully works; NO unrequested elements (no GitHub link, no promo text). | Automated + Manual | **NOT TESTED** | Requires viewport responsive audit (320/375/768/1280px) and axe-core contrast audit. |
| **R9** | **Page Style Control**: "Page style: Match chat / Light / Dark" control in Export step. | Automated + Visual | **NOT TESTED** | UI control present in `ExportStep.tsx`; theme propagation to exporters needs visual check. |
| **R10** | **Clean Extension Security & Errors**: Extension has 0 CSP violations and 0 errors on `chrome://extensions`. | Automated | **NOT TESTED** | Verified in Chromium via `tests/extension_csp.test.ts` (0 CSP violations, 0 errors). Reset to NOT TESTED for formal tracking. |
| **R11** | **Consistent Branding**: Product name is "Chat2PDF" everywhere. | Automated | **NOT TESTED** | Checked in manifests and branding constants. |

---

## 2. Existing Automated Tests & Requirement Mapping

| Existing Test File | Scope | Mapped Requirement | Verification Type |
| :--- | :--- | :--- | :--- |
| `tests/parser.test.ts` | Unit tests for text parsing, role detection, and title extraction | **R2** | Automated Unit |
| `tests/edge_cases.test.ts` | Edge cases: empty text, single message, 500 turns, code blocks, Hindi Unicode | **R2, R5** | Automated Unit |
| `tests/selectors_browser.test.ts` | Evaluates selector syntax in real browser `document.querySelector` | **R1** (partial syntax only) | Automated Browser |
| `tests/full_collector.test.ts` | 300-message virtualized scroll collector on synthetic `mock_chat.html` | **R1** (synthetic mock only) | Automated Browser |
| `tests/extension_csp.test.ts` | Loads unpacked extension in real Chromium, verifies 0 CSP violations & 0 chrome://extensions errors | **R10** | Automated Browser |
| `scripts/test-downloads.mjs` | Generates & validates all 10 formats in Web App and Extension context | **R5, R6, R7** | Automated E2E |

---

## 3. Identified Verification Gaps

1. **R1 Live Site DOM Gap (CRITICAL)**:
   - Existing collector tests only ran on synthetic `mock_chat.html`.
   - On `claude.ai`, a 25+ message real chat extracts only 3 messages.
   - Selectors and virtualization logic must be derived from real DOM structure, not guesswork or synthetic mocks.

2. **R3 Visual Fidelity Gap**:
   - No side-by-side snapshot comparison exists between real site rendered bubbles and Chat2PDF preview/exports.

3. **R4 Live Attachment Chips Gap**:
   - Real attachment DOM nodes on ChatGPT, Claude, and Gemini have never been tested with real upload chips.

4. **R5 Visual Page-by-Page Render Gap**:
   - While files are confirmed non-empty and have valid magic headers, page-by-page visual inspection for line breaks, emoji rendering, and Hindi font rendering needs automated proof artifact generation.

5. **R8 Responsive & Accessibility Gap**:
   - No automated layout audit exists for 320px mobile viewport, 44px minimum touch targets, or axe-core WCAG contrast compliance.
