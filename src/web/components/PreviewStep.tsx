import React, { useState } from 'react';
import type { Conversation, FilterMode } from '../../core/parser/types';
import { filterMessages } from '../../core/parser/filters';
import { ChatView } from './ChatView';
import { ArrowLeft, ArrowRight, Filter, Eye, EyeOff } from 'lucide-react';

interface PreviewStepProps {
  conversation: Conversation;
  filterMode: FilterMode;
  onFilterChange: (mode: FilterMode) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  conversation,
  filterMode,
  onFilterChange,
  onBack,
  onContinue,
}) => {
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());
  const filteredMessages = filterMessages(conversation.messages, filterMode);

  const toggleExclude = (index: number) => {
    setExcludedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const activeMessages = filteredMessages.filter((m) => !excludedIndices.has(m.index));

  const filterOptions: { id: FilterMode; label: string; count: number }[] = [
    { id: 'all', label: 'All Messages', count: conversation.messages.length },
    {
      id: 'answers-only',
      label: 'Answers Only',
      count: conversation.messages.filter((m) => m.role === 'assistant').length,
    },
    {
      id: 'questions-only',
      label: 'Questions Only',
      count: conversation.messages.filter((m) => m.role === 'user').length,
    },
    { id: 'summary', label: 'Summary View', count: Math.min(conversation.messages.length, 4) },
  ];

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Step 2: Preview & Filter
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {activeMessages.length} of {conversation.messages.length} messages included in export.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFilterChange(opt.id)}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                filterMode === opt.id
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-800'
              }`}
            >
              {opt.label} ({opt.count})
            </button>
          ))}
        </div>
      </div>

      {/* Preview Container */}
      <div className="border border-gray-200/90 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
        <ChatView
          conversation={conversation}
          messagesOverride={activeMessages}
          maxHeight="520px"
        />
      </div>

      {/* Bottom Sticky Action Bar on Mobile / Standard on Desktop */}
      <div className="fixed sm:static bottom-0 left-0 right-0 p-3 sm:p-0 bg-white/95 dark:bg-gray-900/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-t-0 border-gray-200 dark:border-gray-800 z-40 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
        >
          <span>Choose Format & Export</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
