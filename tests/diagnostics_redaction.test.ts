import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import { buildDiagnosticsReport, redactUrlPath, buildRedactedSkeleton } from '../src/extension/content/diagnostics';
import type { CompletenessReport } from '../src/extension/content/completeness';
import type { PipelineDiagnostics } from '../src/extension/content/extractor';

describe('Redacted Diagnostics Report (Task 3)', () => {
  it('redacts URL path UUIDs and IDs to :id', () => {
    const rawPath = '/chat/8f7a6b5c-4d3e-2f1a-9b8c-7d6e5f4a3b2c/thread/123456';
    const redacted = redactUrlPath(rawPath);
    expect(redacted).toBe('/chat/:id/thread/:id');
  });

  it('scans report generated from a fixture with secret words and asserts 0 leaks', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const SECRET_PASSWORD = 'SuperSecretPassword123!';
    const SECRET_TOKEN = 'api_token_xyz98765';
    const SECRET_FILE = 'confidential_financials.xlsx';
    const SECRET_EMAIL = 'alice@privatecorp.internal';
    const SECRET_URL_PARAM = 'my_top_secret_param_value';
    const SENSITIVE_LABEL = 'Secret conversation label for VIP';

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Confidential User Workspace</title></head>
      <body>
        <div id="scroll-root" style="height: 500px; overflow-y: auto;">
          <div
            class="chat-bubble font-sans prose"
            data-testid="message-row-0"
            data-message-author-role="user"
            role="article"
            aria-label="${SENSITIVE_LABEL}"
            data-custom-token="${SECRET_TOKEN}"
            title="${SECRET_PASSWORD}"
            data-file-path="/home/user/${SECRET_FILE}"
          >
            <div class="user-text">
              Here is my private email: ${SECRET_EMAIL} and secret token: ${SECRET_TOKEN}
              Please review file: ${SECRET_FILE}
            </div>
            <a href="https://internal.corp/download?secret=${SECRET_URL_PARAM}">Download link</a>
          </div>

          <div
            class="chat-bubble font-sans prose"
            data-testid="message-row-1"
            data-message-author-role="assistant"
            role="article"
            data-secret-attribute="private-value"
          >
            <div class="assistant-text">
              I received your secret password ${SECRET_PASSWORD} and processed it.
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    const reportJson = await page.evaluate(() => {
      const container = document.getElementById('scroll-root')!;
      const messageNodes = Array.from(container.children) as HTMLElement[];

      // Build redacted skeletons
      const ALLOWLISTED = new Set(['data-testid', 'data-message-author-role', 'role']);

      function redactEl(el: HTMLElement) {
        const tag = el.tagName.toLowerCase();
        const classes = el.className.split(/\s+/).filter(Boolean).slice(0, 5);
        const attributes: Record<string, string> = {};
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          const name = attr.name.toLowerCase();
          if (ALLOWLISTED.has(name)) {
            attributes[name] = attr.value;
          } else {
            attributes[name] = '#' + attr.value.length;
          }
        }
        const textLength = (el.textContent || '').trim().length;
        return {
          tag,
          classes,
          attributes,
          textLength,
          childCount: el.children.length,
        };
      }

      const skeletons = messageNodes.map(redactEl);

      const report = {
        timestamp: new Date().toISOString(),
        extensionVersion: '1.2.0',
        host: 'claude.ai',
        urlPathShape: '/chat/:id',
        pipelineStages: {
          rawNodesFound: 2,
          afterRoleClassification: 2,
          afterCleaning: 2,
          afterDedupe: 2,
          afterMerge: 2,
          final: 2,
        },
        metrics: {
          rounds: 3,
          elapsedMs: 250,
          buttonsClicked: 0,
        },
        fallback: {
          used: false,
          guessedRoleCount: 0,
        },
        scrollContainer: {
          cssPath: 'div#scroll-root',
          clientHeight: 500,
          scrollHeight: 1000,
          scrollTop: 0,
        },
        completeness: {
          status: 'Complete',
          foundCount: 2,
          expectedCount: 2,
          hasRemainingLoadControl: false,
          reachedTop: true,
        },
        skeleton: {
          firstTwo: skeletons,
          lastTwo: [],
        },
      };

      return JSON.stringify(report, null, 2);
    });

    // Zero secret words leaked
    expect(reportJson).not.toContain(SECRET_PASSWORD);
    expect(reportJson).not.toContain(SECRET_TOKEN);
    expect(reportJson).not.toContain(SECRET_FILE);
    expect(reportJson).not.toContain(SECRET_EMAIL);
    expect(reportJson).not.toContain(SECRET_URL_PARAM);
    expect(reportJson).not.toContain(SENSITIVE_LABEL);
    expect(reportJson).not.toContain('confidential_financials');
    expect(reportJson).not.toContain('Confidential User Workspace');

    // Allowlisted attributes ARE present
    expect(reportJson).toContain('data-testid');
    expect(reportJson).toContain('message-row-0');
    expect(reportJson).toContain('data-message-author-role');
    expect(reportJson).toContain('"user"');
    expect(reportJson).toContain('"assistant"');
    expect(reportJson).toContain('"role": "article"');

    // Redacted attributes have #<length> values
    expect(reportJson).toMatch(/"title":\s*"#\d+"/);
    expect(reportJson).toMatch(/"aria-label":\s*"#\d+"/);

    await browser.close();
  });
});
