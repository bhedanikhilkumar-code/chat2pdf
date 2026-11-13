import React, { useState } from 'react';
import { parseText } from '../../core/parser/parseText';
import type { Conversation } from '../../core/parser/types';
import CorsNotice from './CorsNotice';

interface InputStepProps {
  onParsed: (conversation: Conversation) => void;
}

export const InputStep: React.FC<InputStepProps> = ({ onParsed }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleParse = () => {
    if (!text.trim()) {
      setError('Please paste your chat conversation text first.');
      return;
    }
    try {
      const conv = parseText(text);
      if (conv.messages.length === 0) {
        setError('Could not detect any messages. Try copying the conversation including names/roles.');
        return;
      }
      setError('');
      onParsed(conv);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse conversation.');
    }
  };

  const loadSample = () => {
    const sample = `User: What are the key advantages of using TypeScript over JavaScript?

Assistant: TypeScript offers several key advantages over standard JavaScript:

1. **Static Typing**: Catches type errors at compile time rather than runtime.
2. **Enhanced IDE Support**: Autocompletion, intelligent refactoring, and code navigation.
3. **Better Documentation**: Type definitions serve as living documentation.
4. **Easier Refactoring**: Confidently rename and reorganize code across large codebases.

\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}
\`\`\`

User: Can you show a quick comparison table?

Assistant: Here is a quick breakdown:

| Feature | JavaScript | TypeScript |
| :--- | :--- | :--- |
| Type System | Dynamic | Static & Structural |
| Compilation Step | None | Transpiles to JS |
| Tooling / IntelliSense | Basic | Rich & Predictive |
| Learning Curve | Low | Moderate |`;
    setText(sample);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Step 1: Import Conversation</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Paste the text copied from your AI chat interface.
          </p>
        </div>
        <button
          type="button"
          onClick={loadSample}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 self-start sm:self-auto px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
        >
          ✨ Load Sample Chat
        </button>
      </div>

      <div className="relative">
        <textarea
          rows={12}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError('');
          }}
          placeholder="Paste your conversation here... (e.g., copied from ChatGPT, Claude, Gemini, Perplexity, or Groq)"
          className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono leading-relaxed resize-y"
        />
        {text && (
          <button
            type="button"
            onClick={() => setText('')}
            className="absolute top-3 right-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleParse}
          disabled={!text.trim()}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-sm shadow-blue-500/20"
        >
          Parse & Preview →
        </button>
      </div>

      <CorsNotice />
    </div>
  );
};
