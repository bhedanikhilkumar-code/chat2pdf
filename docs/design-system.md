# Chat2PDF Design System

> **Style Profile**: Soft Minimal Productivity  
> **Primary Color**: Trust Blue `#2563EB` | **Accent**: Amber `#D97706` / Emerald `#059669`  
> **Background**: Light `#FAFAFA` (Paper `#FFFFFF`) / Dark `#09090B` (Card `#18181B`)  
> **Typography**: Inter (Body) + JetBrains Mono (Code/Metadata)  
> **Dark Mode**: Dual `class="dark"` + `data-theme="dark"` with consistent `color-scheme`

---

## 1. Design Principles & Goals
Chat2PDF is a focused, 100% client-side privacy tool. The interface prioritizes:
- **Zero Distraction**: Generous whitespace, clean single-column workflow, no marketing noise or unsolicited badges.
- **Immediate Trust**: Calm, professional slate/blue palette with crisp system typography.
- **Fidelity**: Exported paper/PDF outputs remain classic white/paper light even when editing in Dark Mode.
- **Accessibility & Touch**: All interactive touch targets are $\ge 44\text{px}$, with WCAG AA+ contrast ratios ($> 4.5:1$).

---

## 2. Color Palette & Semantic Tokens

### Light Theme
- **App Background**: `#FAFAFA` (`bg-gray-50`)
- **Card Surface**: `#FFFFFF` (`bg-white`)
- **Border Default**: `#E4E4E7` (`border-zinc-200`)
- **Text Primary**: `#09090B` (`text-zinc-900`)
- **Text Secondary**: `#52525B` (`text-zinc-600`)
- **Text Muted**: `#A1A1AA` (`text-zinc-400`)
- **Primary Brand / Action**: `#2563EB` (`bg-blue-600`, hover `#1D4ED8`)
- **User Chat Bubble**: `#EFF6FF` (`bg-blue-50/60`, border `#DBEAFE`)
- **Assistant Chat Bubble**: `#FFFFFF` (`bg-white`, border `#E4E4E7`)

### Dark Theme
- **App Background**: `#09090B` (`dark:bg-zinc-950`)
- **Card Surface**: `#18181B` (`dark:bg-zinc-900`)
- **Border Default**: `#27272A` (`dark:border-zinc-800`)
- **Text Primary**: `#FAFAFA` (`dark:text-zinc-100`)
- **Text Secondary**: `#A1A1AA` (`dark:text-zinc-400`)
- **Text Muted**: `#71717A` (`dark:text-zinc-500`)
- **Primary Brand / Action**: `#3B82F6` (`dark:bg-blue-600`, hover `#2563EB`)
- **User Chat Bubble**: `#172554` (`dark:bg-blue-950/40`, border `#1E3A8A`)
- **Assistant Chat Bubble**: `#18181B` (`dark:bg-zinc-900`, border `#27272A`)

---

## 3. Typography Pairing
- **Primary UI / Prose**: `Inter, system-ui, -apple-system, sans-serif`
  - Font weights: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- **Monospace / Code Blocks**: `JetBrains Mono, Menlo, monospace`
  - Font weights: 400 (Code body), 600 (Keywords / headers)
- **Scale**:
  - Step Title: `1.25rem` (`20px`), Bold, `-0.02em` tracking
  - Body Text: `0.875rem` (`14px`), Regular, leading `1.5`
  - Secondary/Caption: `0.75rem` (`12px`), Regular / Medium
  - Code / Metadata: `0.75rem` (`12px`), JetBrains Mono

---

## 4. Layout Breakpoints & Stepper Rhythm
- **Mobile (< 640px)**:
  - 1-column input area, 2-column format grid.
  - Sticky bottom action bar (`min-h-[44px]` touch targets) with backdrop blur.
  - Chat preview bubbles scale down margins while preserving readability.
- **Tablet (640px – 1024px)**:
  - 3-column format grid.
  - Generous card padding (`p-5`).
- **Desktop (1024px – 1440px)**:
  - Max container width `max-w-5xl` centered.
  - 4-column format grid.

---

## 5. Components & Dark Mode Contracts
1. **Chat Preview**:
   - Matches standard ChatGPT/Claude style.
   - User messages aligned right/compact, Assistant messages on left with neutral robot/sparkle icon.
   - Per-turn include/exclude checkbox toggle.
   - Syntax highlighted code blocks with language tag.
2. **Paper Exporters**:
   - PDF, Word, PPTX, and Handwriting generators ignore dark mode classes and enforce pristine white paper backgrounds (`#FFFFFF` or `#fffef9`).
