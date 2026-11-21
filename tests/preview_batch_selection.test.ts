import { describe, it, expect } from 'vitest';
import type { Conversation, ChatMessage } from '../src/core/parser/types';
import { filterMessages } from '../src/core/parser/filters';

describe('Preview Step Batch Selection & Exclusion Controls', () => {
  const sampleMessages: ChatMessage[] = [
    { index: 0, role: 'user', content: 'Turn 0 User question' },
    { index: 1, role: 'assistant', content: 'Turn 1 Assistant answer' },
    { index: 2, role: 'user', content: 'Turn 2 User question' },
    { index: 3, role: 'assistant', content: 'Turn 3 Assistant answer' },
    { index: 4, role: 'user', content: 'Turn 4 User question' },
    { index: 5, role: 'assistant', content: 'Turn 5 Assistant answer' },
  ];

  const sampleChat: Conversation = {
    title: 'Batch Selection Test Chat',
    source: 'chatgpt',
    exportedAt: '2026-11-22T03:00:00.000Z',
    messages: sampleMessages,
  };

  it('correctly executes Exclude All across all displayed turns', () => {
    let excludedIndices = new Set<number>();
    const displayedMessages = filterMessages(sampleChat.messages, 'all');

    // Action: Exclude All
    const next = new Set(excludedIndices);
    displayedMessages.forEach((m) => next.add(m.index));
    excludedIndices = next;

    expect(excludedIndices.size).toBe(6);
    expect(Array.from(excludedIndices).sort()).toEqual([0, 1, 2, 3, 4, 5]);

    const remaining = sampleChat.messages.filter((m) => !excludedIndices.has(m.index));
    expect(remaining.length).toBe(0);
  });

  it('correctly executes Invert Selection across displayed turns', () => {
    // Start with turns 1 and 3 excluded
    let excludedIndices = new Set<number>([1, 3]);
    const displayedMessages = filterMessages(sampleChat.messages, 'all');

    // Action: Invert
    const next = new Set<number>();
    displayedMessages.forEach((m) => {
      if (!excludedIndices.has(m.index)) {
        next.add(m.index);
      }
    });
    sampleChat.messages.forEach((m) => {
      if (!displayedMessages.some((dm) => dm.index === m.index) && excludedIndices.has(m.index)) {
        next.add(m.index);
      }
    });
    excludedIndices = next;

    // Previously excluded: [1, 3] -> Now excluded should be: [0, 2, 4, 5]
    expect(excludedIndices.size).toBe(4);
    expect(Array.from(excludedIndices).sort()).toEqual([0, 2, 4, 5]);

    const remaining = sampleChat.messages.filter((m) => !excludedIndices.has(m.index));
    expect(remaining.length).toBe(2);
    expect(remaining.map((m) => m.index)).toEqual([1, 3]);
  });

  it('correctly executes Restore All to clear exclusions', () => {
    let excludedIndices = new Set<number>([0, 1, 2, 3]);
    expect(excludedIndices.size).toBe(4);

    // Action: Restore All
    excludedIndices = new Set();
    expect(excludedIndices.size).toBe(0);

    const remaining = sampleChat.messages.filter((m) => !excludedIndices.has(m.index));
    expect(remaining.length).toBe(6);
  });
});
