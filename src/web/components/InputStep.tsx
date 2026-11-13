import React, { useState, useRef } from 'react';
import { parseText } from '../../core/parser/parseText';
import type { Conversation } from '../../core/parser/types';
import CorsNotice from './CorsNotice';
import { Sparkles, Trash2, Clipboard, Upload, ArrowRight, FileText } from 'lucide-react';

interface InputStepProps {
  onParsed: (conversation: Conversation) => void;
}

export const InputStep: React.FC<InputStepProps> = ({ onParsed }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          setText(clipText);
          setError('');
        }
      }
    } catch (err) {
      // Browser permissions denied or unsupported
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setText(content);
        setError('');
      }
    };
    reader.readAsText(file);
  };

  const charCount = text.length;
  const lineCount = text ? text.split('\n').length : 0;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Step 1: Import Conversation
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Paste copied chat text, drag & drop a file, or load a sample to start.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadSample}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Load Sample Chat
          </button>

          <button
            type="button"
            onClick={handlePaste}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Clipboard className="w-3.5 h-3.5" />
            Paste
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.text"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Drag & Drop Area / Textarea Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        className={`relative rounded-2xl border transition-all ${
          isDragging
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30 dark:bg-blue-950/20'
            : 'border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900'
        } shadow-xs overflow-hidden`}
      >
        <textarea
          rows={11}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError('');
          }}
          placeholder="Paste your conversation here... (e.g., copied from ChatGPT, Claude, Gemini, Perplexity, or Groq)"
          className="w-full p-4 sm:p-5 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none text-base sm:text-sm font-mono leading-relaxed resize-y"
        />

        {/* Bottom meta bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800/80 text-[11px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {lineCount} lines • {charCount} chars
            </span>
          </div>

          {text && (
            <button
              type="button"
              onClick={() => setText('')}
              className="inline-flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Action footer */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <CorsNotice />

        <button
          type="button"
          onClick={handleParse}
          disabled={!text.trim()}
          className="min-h-[48px] px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Parse & Preview</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
