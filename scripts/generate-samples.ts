import fs from 'fs';
import path from 'path';
import { parseText } from '../src/core/parser/parseText';
import { exportMarkdown } from '../src/core/exporters/exportMarkdown';
import { exportTxt } from '../src/core/exporters/exportTxt';
import { exportCsv } from '../src/core/exporters/exportCsv';
import { exportDocx } from '../src/core/exporters/exportDocx';
import { exportPptx } from '../src/core/exporters/exportPptx';
import { WATERMARK_TEXT } from '../src/core/branding';

const sampleText = `
You: Namaste! Please give me a summary of 2+2 and a Python snippet with a table. 👤
Also here is a long test url: https://github.com/bhedanikhilkumar-code/chat2pdf/blob/main/README.md

ChatGPT:
Sure! 2 + 2 equals **4**. ✅

Here is your Python code:
\`\`\`python
def add(a: int, b: int) -> int:
    return a + b

print("Result:", add(2, 2))
\`\`\`

Here is the data table:
| Parameter | Value | Status |
| :--- | :--- | :--- |
| Alpha 🚀 | 100 | Active |
| Beta 🎯 | 200 | Pending |

Key points:
- Point 1: *High precision* calculation
  - Nested detail regarding performance
- Point 2: Modern responsive export
`;

async function run() {
  const conv = parseText(sampleText);
  const outDir = path.resolve('docs/samples');

  // Markdown sample
  const mdParts = [
    `# ${conv.title}`,
    `> **Source:** ${conv.source} | **Exported:** ${conv.exportedAt}`,
    '',
    ...conv.messages.flatMap((m) => [`## ${m.role === 'user' ? '👤 User' : '🤖 Assistant'}`, '', m.content, '', '---', '']),
    `*${WATERMARK_TEXT}*`,
  ];
  fs.writeFileSync(path.join(outDir, 'sample-chat.md'), mdParts.join('\n'));
  console.log('Saved sample-chat.md');

  // TXT sample
  const txtParts = [
    `Title: ${conv.title}`,
    `Source: ${conv.source}`,
    `Exported: ${conv.exportedAt}`,
    '='.repeat(60),
    '',
    ...conv.messages.flatMap((m) => [`--- ${m.role.toUpperCase()} ---`, m.content, '']),
    '='.repeat(60),
    WATERMARK_TEXT,
    '',
  ];
  fs.writeFileSync(path.join(outDir, 'sample-chat.txt'), txtParts.join('\n'));
  console.log('Saved sample-chat.txt');

  // CSV sample
  const csvRows = [
    '"index","role","message"',
    ...conv.messages.map((m, i) => `"${i + 1}","${m.role}","${m.content.replace(/"/g, '""')}"`),
    `"","watermark","${WATERMARK_TEXT}"`,
  ];
  fs.writeFileSync(path.join(outDir, 'sample-chat.csv'), csvRows.join('\n'));
  console.log('Saved sample-chat.csv');
}

run().catch(console.error);
