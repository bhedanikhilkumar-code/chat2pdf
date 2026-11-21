import React, { useState } from 'react';
import type { Conversation, FilterMode } from '../../core/parser/types';
import { filterMessages } from '../../core/parser/filters';
import { ChatView } from './ChatView';
import { ArrowLeft, ArrowRight, Search, X, Clock, FileText } from 'lucide-react';

interface PreviewStepProps {
  conversation: Conversation;
  filterMode: FilterMode;
  onFilterChange: (mode: FilterMode) => void;
  onBack: () => void;
  onContinue: (updatedConversation?: Conversation) => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  conversation,
  filterMode,
  onFilterChange,
  onBack,
  onContinue,
}) => {
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');

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
  const activeCount = conversation.messages.length - excludedIndices.size;

  // Search filter
  const queryTrimmed = searchQuery.trim().toLowerCase();
  const displayedMessages = queryTrimmed
    ? filteredMessages.filter((m) => (m.content || '').toLowerCase().includes(queryTrimmed))
    : filteredMessages;

  // Stats
  const includedMessages = conversation.messages.filter((m) => !excludedIndices.has(m.index));
  const totalWords = includedMessages.reduce((acc, m) => {
    return acc + (m.content ? m.content.trim().split(/\s+/).filter(Boolean).length : 0);
  }, 0);
  const readingMinutes = Math.max(1, Math.ceil(totalWords / 200));

  const handleContinue = () => {
    if (excludedIndices.size > 0) {
      const updated: Conversation = {
        ...conversation,
        messages: conversation.messages.filter((m) => !excludedIndices.has(m.index)),
      };
      onContinue(updated);
    } else {
      onContinue();
    }
  };

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
    <div className="space-y-5 pb-20 sm:pb-0">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Step 2: Preview & Filter
          </h2>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            <span>
              {activeCount} of {conversation.messages.length} messages included.
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              {totalWords.toLocaleString()} words
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              ~{readingMinutes} min read
            </span>
          </div>
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

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search keywords within conversation messages..."
          className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-0.5"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Preview Container */}
      <div className="border border-gray-200/90 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
        {displayedMessages.length === 0 ? (
          <div className="py-12 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            No messages matched your search query &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <ChatView
            conversation={conversation}
            messagesOverride={displayedMessages}
            maxHeight="520px"
            excludedIndices={excludedIndices}
            onToggleExclude={toggleExclude}
          />
        )}
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
          onClick={handleContinue}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
        >
          <span>Choose Format & Export</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
