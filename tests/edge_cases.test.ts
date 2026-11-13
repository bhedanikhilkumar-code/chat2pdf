import { describe, it, expect } from 'vitest';
import { parseText } from '../src/core/parser/parseText';
import { filterMessages } from '../src/core/parser/filters';

describe('Edge cases and bug sweep', () => {
  it('handles empty input gracefully', () => {
    const conv = parseText('');
    expect(conv.messages.length).toBe(0);
    const filtered = filterMessages(conv.messages, 'all');
    expect(filtered.length).toBe(0);
  });

  it('handles single message input', () => {
    const conv = parseText('User: Just one question here.');
    expect(conv.messages.length).toBe(1);
    expect(filterMessages(conv.messages, 'all').length).toBe(1);
    expect(filterMessages(conv.messages, 'questions-only').length).toBe(1);
    expect(filterMessages(conv.messages, 'answers-only').length).toBe(0);
  });

  it('handles 200 messages efficiently without crashing or recursion', () => {
    let bigText = '';
    for (let i = 1; i <= 100; i++) {
      bigText += `User: Question number ${i} about architecture\n\nAssistant: Answer number ${i} with details\n\n`;
    }
    const start = Date.now();
    const conv = parseText(bigText);
    const duration = Date.now() - start;

    expect(conv.messages.length).toBe(200);
    expect(duration).toBeLessThan(500); // Parses 200 messages in <500ms
  });

  it('handles message consisting solely of a code block', () => {
    const codeChat = `User: Show me quicksort
Assistant:
\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
\`\`\``;
    const conv = parseText(codeChat);
    expect(conv.messages.length).toBe(2);
    expect(conv.messages[1].content).toContain('def quicksort(arr):');
  });

  it('handles message consisting purely of Hindi text', () => {
    const hindiChat = `User: नमस्ते! आप कैसे हैं?
Assistant: नमस्ते! मैं एक एआई सहायक हूँ। मैं आपकी किस प्रकार सहायता कर सकता हूँ?`;
    const conv = parseText(hindiChat);
    expect(conv.messages.length).toBe(2);
    expect(conv.messages[0].content).toContain('नमस्ते');
    expect(conv.messages[1].content).toContain('सहायता');
  });

  it('handles message consisting purely of emojis', () => {
    const emojiChat = `User: 🚀 🎉 🥳 🔥 ✨
Assistant: 🤖 👍 💡 🌟 💯`;
    const conv = parseText(emojiChat);
    expect(conv.messages.length).toBe(2);
    expect(conv.messages[0].content).toContain('🚀');
    expect(conv.messages[1].content).toContain('💯');
  });
});
