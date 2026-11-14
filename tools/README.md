# Chat2PDF Safe DOM Probe Tool

This tool is designed to run safely in your browser DevTools console on real chat pages (`claude.ai`, `chatgpt.com`, `gemini.google.com`, `perplexity.ai`, `groq.com`).

## Privacy & Safety Guarantees
- **Zero network requests**: It does not make any `fetch`, `XMLHttpRequest`, `sendBeacon`, or WebSocket connections.
- **Zero text leakage**: All conversation text content is completely redacted and replaced with length markers (e.g., `#142`).
- **Structural analysis only**: Gathers container tags, computed scroll styles, attribute names, CSS class tokens, and tag hierarchies.

---

## Step-by-Step Instructions

1. Open your browser and go to your chat page on:
   - **Claude**: `https://claude.ai` (open a long chat conversation, 25+ turns)
   - **ChatGPT**: `https://chatgpt.com` (open a long chat conversation, 50+ turns)
   - **Gemini**: `https://gemini.google.com` (open a long chat conversation)
2. Press **F12** (or `Ctrl+Shift+I` / `Cmd+Option+I`) to open Developer Tools.
3. Switch to the **Console** tab.
4. If Chrome or the browser displays a security warning about pasting, type:
   ```text
   allow pasting
   ```
   and press **Enter**.
5. Copy the entire contents of `tools/dom-probe.js` and paste it into the console prompt, then press **Enter**.
6. The script will automatically copy the resulting redacted JSON report directly to your system clipboard (using DevTools `copy()`).
7. Paste the copied JSON report back into our chat.

### Important: Testing Long / Virtualized Chats
If the chat has many older messages:
1. Note the `totalCandidateElementsInDom` reported in the probe.
2. Scroll all the way to the top of the chat page in your browser to trigger any lazy-loading / virtualization.
3. Re-run the script in the Console.
4. Share both the initial count/report and the scrolled count so we can observe how the site virtualizes or loads older messages.
