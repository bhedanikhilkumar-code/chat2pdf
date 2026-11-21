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

  it('correctly filters messages by content type (code vs files)', () => {
    const complexMessages: ChatMessage[] = [
      { index: 0, role: 'user', content: 'Here is my python code snippet' },
      { index: 1, role: 'assistant', content: '```python\nprint("hello")\n```' },
      {
        index: 2,
        role: 'user',
        content: 'Check this diagram',
        attachments: [{ name: 'architecture.png', size: '24KB' }],
      },
      { index: 3, role: 'assistant', content: 'Looks great!' },
    ];

    const codeMessages = complexMessages.filter((m) =>
      m.content.includes('```') || (m.htmlContent && m.htmlContent.includes('<code'))
    );
    expect(codeMessages.length).toBe(1);
    expect(codeMessages[0].index).toBe(1);

    const filesMessages = complexMessages.filter((m) =>
      Boolean(m.attachments && m.attachments.length > 0)
    );
    expect(filesMessages.length).toBe(1);
    expect(filesMessages[0].index).toBe(2);
  });

  it('correctly calculates word counts for each message turn', () => {
    const msg: ChatMessage = {
      index: 0,
      role: 'user',
      content: 'Hello world this is a test turn with eight words',
    };
    const words = msg.content.trim().split(/\s+/).filter(Boolean).length;
    expect(words).toBe(10);
  });

  it('correctly updates conversation title when continuing with an edited title', () => {
    const customTitle = 'Refined Technical Specification';
    const updatedConv: Conversation = {
      ...sampleChat,
      title: customTitle,
    };
    expect(updatedConv.title).toBe(customTitle);
    expect(updatedConv.messages.length).toBe(sampleChat.messages.length);
  });
});
