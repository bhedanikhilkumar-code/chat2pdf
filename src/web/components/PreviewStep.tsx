import React from 'react';
import type { Conversation, FilterMode } from '../../core/parser/types';
import { filterMessages } from '../../core/parser/filters';
import { ChatPreview } from './ChatPreview';

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
  const filteredMessages = filterMessages(conversation.messages, filterMode);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Step 2: Preview & Filter</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review the extracted messages and adjust the display filters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-select" className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Filter:
          </label>
          <select
            id="filter-select"
            value={filterMode}
            onChange={(e) => onFilterChange(e.target.value as FilterMode)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Messages ({conversation.messages.length})</option>
            <option value="answers-only">Answers Only</option>
            <option value="questions-only">Questions Only</option>
            <option value="summary">Short Summary View</option>
          </select>
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm">
        <ChatPreview
          messages={filteredMessages}
          title={conversation.title}
          source={conversation.source}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition-colors"
        >
          ← Back to Input
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-sm shadow-blue-500/20"
        >
          Choose Format & Export →
        </button>
      </div>
    </div>
  );
};
