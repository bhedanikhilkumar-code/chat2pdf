import React from 'react';
import type { ChatMessage } from '../../core/parser/types';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ChatPreviewProps {
  messages: ChatMessage[];
  title?: string;
  source?: string;
}

export const ChatPreview: React.FC<ChatPreviewProps> = ({ messages, title, source }) => {
  const renderMarkdown = (content: string) => {
    const rawHtml = marked.parse(content, { breaks: true, gfm: true }) as string;
    return { __html: DOMPurify.sanitize(rawHtml) };
  };

  return (
    <div className="space-y-4">
      {title && (
        <div className="border-b border-gray-200 dark:border-gray-800 pb-3 flex items-center justify-between">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{title}</h3>
          {source && (
            <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 rounded-full capitalize font-medium">
              {source}
            </span>
          )}
        </div>
      )}

      {messages.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No messages to preview.
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium capitalize">
                  {isUser ? 'You' : 'Assistant'}
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200/50 dark:border-gray-700/50'
                  }`}
                >
                  <div
                    className={`prose prose-sm max-w-none ${
                      isUser
                        ? 'prose-invert prose-p:my-1 prose-pre:bg-blue-700'
                        : 'dark:prose-invert prose-p:my-1 prose-pre:bg-gray-900'
                    }`}
                    dangerouslySetInnerHTML={renderMarkdown(m.content)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
