import { describe, it, expect } from 'vitest';
import { parseText } from '../src/core/parser/parseText';
import { cleanText } from '../src/core/parser/cleaners';

const FIXTURE_CHAT = `
You: Namaste! Kya aap mujhe 2+2 ka answer aur ek python code snippet de sakte ho? 👤
Also include a table and this long link: https://very-long-url-without-any-spaces.example.com/api/v1/resource/subresource/test?id=123456789&key=abcdefghij0123456789&status=active
Copy

ChatGPT:
Zaroor! 2 + 2 ka answer **4** hota hai. ✅

🔹 Yahan aapka Python code hai:
\`\`\`python
def add(a, b):
    # Returns sum
    return a + b

print("2 + 2 =", add(2, 2))
\`\`\`

Regenerate response

Yahan ek markdown table hai:
| Item | Quantity | Price |
| :--- | :--- | :--- |
| Apple 🍎 | 2 | ₹40 |
| Mango 🥭 | 5 | ₹100 |

Lists check:
- Pehla point: *bold/italic* text
  - Nested bullet point
- Dusra point

1. Pehla step
2. Dusra step

Copy
`;

describe('Core Parser and Structure Preserver', () => {
  it('cleanText preserves code blocks, tables, lists, emoji, and strips standalone junk', () => {
    const cleaned = cleanText(FIXTURE_CHAT);
    expect(cleaned).toContain('def add(a, b):');
    expect(cleaned).toContain('| Item | Quantity | Price |');
    expect(cleaned).toContain('Apple 🍎');
    expect(cleaned).toContain('Namaste!');
    expect(cleaned).toContain('👤');
    expect(cleaned).toContain('✅');
    expect(cleaned).toContain('https://very-long-url-without-any-spaces');
    expect(cleaned).not.toMatch(/^[ \t]*Copy[ \t]*$/m);
    expect(cleaned).not.toMatch(/^[ \t]*Regenerate response[ \t]*$/m);
  });

  it('parseText parses user and assistant messages with complete markdown structure', () => {
    const conv = parseText(FIXTURE_CHAT);
    expect(conv.messages.length).toBe(2);

    const userMsg = conv.messages[0];
    expect(userMsg.role).toBe('user');
    expect(userMsg.content).toContain('Namaste!');
    expect(userMsg.content).toContain('👤');
    expect(userMsg.content).toContain('https://very-long-url-without-any-spaces');

    const assistantMsg = conv.messages[1];
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.content).toContain('def add(a, b):');
    expect(assistantMsg.content).toContain('| Item | Quantity | Price |');
    expect(assistantMsg.content).toContain('- Pehla point: *bold/italic* text');
    expect(assistantMsg.content).toContain('  - Nested bullet point');
    expect(assistantMsg.content).toContain('1. Pehla step');
  });
});
