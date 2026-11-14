import fs from 'fs';
import path from 'path';

const FIXTURES_DIR = path.resolve('tests/fixtures');
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// 1. CLAUDE FIXTURE
// Claude structure uses:
// - Main container with overflow-y-auto
// - Message blocks: div[data-message-author-role="user"] and div[data-message-author-role="assistant"]
//   or class font-user-message and font-claude-message / progressive-markdown
// - Title: h1 or [data-testid="conversation-title"]
// - File chips in user message: div.file-chip or [aria-label*="Attachment"]
function generateClaudeFixture() {
  let messagesHtml = '';
  for (let i = 1; i <= 30; i++) {
    const isUser = i % 2 !== 0;
    const turnIndex = i;
    if (isUser) {
      const hasAttachment = turnIndex === 1;
      messagesHtml += `
      <div class="group relative flex flex-col items-end w-full mb-6" data-message-author-role="user" data-test-render-count="1">
        <div class="font-user-message max-w-[85%] rounded-2xl p-4 bg-gray-100 text-gray-900 shadow-sm">
          <p>User turn #${turnIndex}: Explaining question regarding architecture design patterns and performance considerations.</p>
          ${
            hasAttachment
              ? `
          <div class="file-chip flex items-center gap-2 mt-2 p-2 rounded-lg bg-white border border-gray-300" aria-label="Attachment: spec-sheet.pdf">
            <span class="file-icon">📎</span>
            <span class="file-name font-medium text-xs">spec-sheet.pdf</span>
            <span class="file-size text-gray-500 text-[10px]">(128 KB)</span>
          </div>`
              : ''
          }
        </div>
      </div>`;
    } else {
      let extra = '';
      if (turnIndex === 2) {
        extra = `
        <pre><code class="language-typescript">interface CacheConfig {
  ttlMs: number;
  maxEntries: number;
  evictionPolicy: 'LRU' | 'LFU';
}
export function initCache(cfg: CacheConfig): void {
  console.log("Cache initialized with TTL:", cfg.ttlMs);
}</code></pre>`;
      } else if (turnIndex === 4) {
        extra = `
        <table class="border-collapse border border-gray-300 my-3">
          <thead><tr class="bg-gray-100"><th class="border p-2">Pattern</th><th class="border p-2">Latency</th><th class="border p-2">Throughput</th></tr></thead>
          <tbody>
            <tr><td class="border p-2">Pattern A</td><td class="border p-2">12ms</td><td class="border p-2">High</td></tr>
            <tr><td class="border p-2">Pattern B</td><td class="border p-2">45ms</td><td class="border p-2">Ultra-High</td></tr>
          </tbody>
        </table>`;
      } else if (turnIndex === 6) {
        extra = `
        <ul class="list-disc pl-5 my-2">
          <li>Key consideration 1: Memory footprint and garbage collection</li>
          <li>Key consideration 2: Cache invalidation strategies</li>
          <li>Key consideration 3: Network partition tolerance</li>
        </ul>`;
      }

      messagesHtml += `
      <div class="group relative flex flex-col items-start w-full mb-6" data-message-author-role="assistant" data-test-render-count="1">
        <div class="font-claude-message progressive-markdown prose max-w-none w-full text-gray-800">
          <p>Claude assistant turn #${turnIndex}: Comprehensive breakdown of system architectural tradeoffs.</p>
          ${extra}
        </div>
      </div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Architecture Discussion with Claude</title>
</head>
<body class="bg-white text-gray-900 m-0 p-0">
  <div class="flex h-screen flex-col">
    <header class="p-4 border-b">
      <h1 class="text-lg font-bold">Architecture Discussion with Claude</h1>
    </header>
    <main class="flex-1 flex flex-col overflow-y-auto p-6" style="height: 600px; max-height: 600px;">
      <div class="conversation-container max-w-3xl mx-auto w-full">
        ${messagesHtml}
      </div>
    </main>
  </div>
</body>
</html>`;
}

// 2. CHATGPT FIXTURE
function generateChatGptFixture() {
  let messagesHtml = '';
  for (let i = 1; i <= 30; i++) {
    const isUser = i % 2 !== 0;
    const turnIndex = i;
    if (isUser) {
      const hasAttachment = turnIndex === 1;
      messagesHtml += `
      <article class="w-full text-token-text-primary focus-visible:outline-2 focus-visible:outline-offset-[-4px]" data-testid="conversation-turn-${turnIndex}">
        <div class="m-auto text-base py-[18px] px-3 md:px-4 w-full">
          <div class="mx-auto flex flex-1 gap-3 text-base md:max-w-3xl">
            <div data-message-author-role="user" data-message-id="chatgpt-msg-${turnIndex}" class="relative flex w-full min-w-0 flex-col">
              <div class="user-turn-content">User question #${turnIndex}: Can you explain concurrency models in modern runtime engines?</div>
              ${
                hasAttachment
                  ? `
              <div class="attachment-chip flex items-center gap-2 mt-2 p-1.5 border rounded" data-testid="attachment-file">
                <span class="file-title">benchmark.csv</span>
                <span class="text-xs text-gray-400">(42 KB)</span>
              </div>`
                  : ''
              }
            </div>
          </div>
        </div>
      </article>`;
    } else {
      let extra = '';
      if (turnIndex === 2) {
        extra = `<pre><code class="language-python">async def worker(queue: asyncio.Queue) -> None:
    while True:
        task = await queue.get()
        await process(task)
        queue.task_done()</code></pre>`;
      } else if (turnIndex === 4) {
        extra = `
        <table>
          <thead><tr><th>Runtime</th><th>Model</th><th>Event Loop</th></tr></thead>
          <tbody><tr><td>Node.js</td><td>Single-thread libuv</td><td>Yes</td></tr><tr><td>Go</td><td>M:N Goroutines</td><td>Work stealing</td></tr></tbody>
        </table>`;
      } else if (turnIndex === 6) {
        extra = `
        <ol>
          <li>Asynchronous cooperative scheduling</li>
          <li>Preemptive OS threads</li>
          <li>Software transactional memory</li>
        </ol>`;
      }

      messagesHtml += `
      <article class="w-full text-token-text-primary focus-visible:outline-2 focus-visible:outline-offset-[-4px]" data-testid="conversation-turn-${turnIndex}">
        <div class="m-auto text-base py-[18px] px-3 md:px-4 w-full">
          <div class="mx-auto flex flex-1 gap-3 text-base md:max-w-3xl">
            <div data-message-author-role="assistant" data-message-id="chatgpt-msg-${turnIndex}" class="relative flex w-full min-w-0 flex-col">
              <div class="markdown prose w-full break-words">
                <p>ChatGPT turn #${turnIndex}: Concurrency models manage execution context and event pipelines efficiently.</p>
                ${extra}
              </div>
            </div>
          </div>
        </div>
      </article>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Concurrency Deep Dive</title>
</head>
<body class="bg-gray-900 text-white m-0 p-0">
  <div class="flex h-screen flex-col">
    <h1 class="p-4 border-b text-xl">Concurrency Deep Dive</h1>
    <div class="react-scroll-to-bottom--css overflow-y-auto flex-1 p-4" style="height: 600px; max-height: 600px;">
      ${messagesHtml}
    </div>
  </div>
</body>
</html>`;
}

// 3. GEMINI FIXTURE
function generateGeminiFixture() {
  let messagesHtml = '';
  for (let i = 1; i <= 30; i++) {
    const isUser = i % 2 !== 0;
    const turnIndex = i;
    if (isUser) {
      const hasAttachment = turnIndex === 1;
      messagesHtml += `
      <user-query class="chat-turn block my-4" data-test-id="user-query">
        <div class="query-container p-3 rounded bg-blue-50 text-blue-950">
          <div class="query-content">Gemini prompt #${turnIndex}: What are the best practices for designing scalable cloud microservices?</div>
          ${
            hasAttachment
              ? `
          <div class="attachment-pill inline-flex items-center gap-1.5 p-1 rounded bg-white border text-xs" aria-label="Attachment: architecture.png">
            <span class="icon">🖼️</span>
            <span class="name">architecture.png</span>
          </div>`
              : ''
          }
        </div>
      </user-query>`;
    } else {
      let extra = '';
      if (turnIndex === 2) {
        extra = `<pre><code class="language-go">func HealthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("ok"))
}</code></pre>`;
      } else if (turnIndex === 4) {
        extra = `
        <table border="1">
          <tr><th>Component</th><th>Purpose</th><th>SLA</th></tr>
          <tr><td>API Gateway</td><td>Ingress routing</td><td>99.99%</td></tr>
          <tr><td>Auth Service</td><td>Token validation</td><td>99.999%</td></tr>
        </table>`;
      } else if (turnIndex === 6) {
        extra = `
        <ul>
          <li>Decentralized data management per service</li>
          <li>Circuit breaker pattern for fault isolation</li>
          <li>Distributed tracing and structured telemetry</li>
        </ul>`;
      }

      messagesHtml += `
      <model-response class="chat-turn block my-4" data-test-id="model-response">
        <div class="response-container message-content p-4 rounded bg-gray-50 text-gray-900">
          <p>Gemini response #${turnIndex}: Scalable microservice architectures require deliberate isolation boundaries.</p>
          ${extra}
        </div>
      </model-response>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cloud Architecture with Gemini</title>
</head>
<body class="bg-white text-gray-900">
  <div class="chat-window-container">
    <h1 class="conversation-title p-3 text-lg font-semibold">Cloud Architecture with Gemini</h1>
    <div class="chat-history overflow-y-auto p-4" style="height: 600px; max-height: 600px;">
      ${messagesHtml}
    </div>
  </div>
</body>
</html>`;
}

fs.writeFileSync(path.join(FIXTURES_DIR, 'claude.html'), generateClaudeFixture());
fs.writeFileSync(path.join(FIXTURES_DIR, 'chatgpt.html'), generateChatGptFixture());
fs.writeFileSync(path.join(FIXTURES_DIR, 'gemini.html'), generateGeminiFixture());
console.log('Successfully generated 30-message fixtures for claude.html, chatgpt.html, and gemini.html');
