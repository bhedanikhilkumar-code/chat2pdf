import React, { useState, useRef, useEffect } from 'react';
import type { Conversation, FilterMode } from '../../core/parser/types';
import { filterMessages } from '../../core/parser/filters';
import { ChatView } from './ChatView';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Clock,
  FileText,
  Copy,
  CheckCircle2,
  Keyboard,
} from 'lucide-react';

type ContentTypeFilter = 'all' | 'code' | 'files';

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
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [copiedFiltered, setCopiedFiltered] = useState<boolean>(false);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let activeTurnIdx = -1;
    const handleNavigation = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === 'j' || e.key === 'J') {
        const turns = Array.from(document.querySelectorAll('[id^="chat-turn-"]'));
        if (turns.length === 0) return;
        e.preventDefault();
        activeTurnIdx = (activeTurnIdx + 1) % turns.length;
        turns[activeTurnIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (e.key === 'k' || e.key === 'K') {
        const turns = Array.from(document.querySelectorAll('[id^="chat-turn-"]'));
        if (turns.length === 0) return;
        e.preventDefault();
        activeTurnIdx = (activeTurnIdx - 1 + turns.length) % turns.length;
        turns[activeTurnIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user presses '/', focus search input unless already inside an input or textarea
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (
        (e.key === '?' || (e.shiftKey && e.key === '/')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        if (document.activeElement === searchInputRef.current) {
          setSearchQuery('');
          searchInputRef.current?.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Search & content type filters
  const queryTrimmed = searchQuery.trim().toLowerCase();
  let displayedMessages = queryTrimmed
    ? filteredMessages.filter((m) => (m.content || '').toLowerCase().includes(queryTrimmed))
    : filteredMessages;

  const codeMessagesCount = filteredMessages.filter((m) =>
    m.content.includes('```') || (m.htmlContent && m.htmlContent.includes('<code'))
  ).length;

  const filesMessagesCount = filteredMessages.filter((m) =>
    Boolean(m.attachments && m.attachments.length > 0)
  ).length;

  if (contentTypeFilter === 'code') {
    displayedMessages = displayedMessages.filter((m) =>
      m.content.includes('```') || (m.htmlContent && m.htmlContent.includes('<code'))
    );
  } else if (contentTypeFilter === 'files') {
    displayedMessages = displayedMessages.filter((m) =>
      Boolean(m.attachments && m.attachments.length > 0)
    );
  }

  const scrollToTop = () => {
    const container = document.querySelector('.chat-view-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    const container = document.querySelector('.chat-view-container');
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  // Stats
  const includedMessages = conversation.messages.filter((m) => !excludedIndices.has(m.index));
  const totalWords = includedMessages.reduce((acc, m) => {
    return acc + (m.content ? m.content.trim().split(/\s+/).filter(Boolean).length : 0);
  }, 0);
  const readingMinutes = Math.max(1, Math.ceil(totalWords / 200));

  const handleCopyFiltered = async () => {
    const lines: string[] = [];
    lines.push(`# ${conversation.title || 'Conversation'}\n`);
    displayedMessages.forEach((m) => {
      lines.push(`### ${m.role === 'user' ? '👤 User' : '🤖 Assistant'}\n\n${m.content}\n`);
      if (m.attachments && m.attachments.length > 0) {
        lines.push(`*Attachments: ${m.attachments.map((a) => a.name).join(', ')}*\n`);
      }
      lines.push('---\n');
    });
    lines.push(`*Exported with Chat2PDF • chat2pdf.app*\n`);
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopiedFiltered(true);
    setTimeout(() => setCopiedFiltered(false), 2000);
  };

  const handleExcludeAll = () => {
    const next = new Set(excludedIndices);
    displayedMessages.forEach((m) => next.add(m.index));
    setExcludedIndices(next);
  };

  const handleInvertSelection = () => {
    const next = new Set<number>();
    displayedMessages.forEach((m) => {
      if (!excludedIndices.has(m.index)) {
        next.add(m.index);
      }
    });
    conversation.messages.forEach((m) => {
      if (!displayedMessages.some((dm) => dm.index === m.index) && excludedIndices.has(m.index)) {
        next.add(m.index);
      }
    });
    setExcludedIndices(next);
  };

  const handleRestoreAll = () => {
    setExcludedIndices(new Set());
  };

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

        {/* Density & Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl bg-gray-200/70 dark:bg-gray-800/80 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                density === 'comfortable'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-xs font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                density === 'compact'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-xs font-semibold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Compact
            </button>
          </div>

          <div className="inline-flex rounded-xl bg-gray-200/70 dark:bg-gray-800/80 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={scrollToTop}
              className="px-2 py-1 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-700 transition-all cursor-pointer flex items-center gap-0.5"
              title="Scroll to top of preview"
              aria-label="Scroll to top of preview"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Top</span>
            </button>
            <button
              type="button"
              onClick={scrollToBottom}
              className="px-2 py-1 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-700 transition-all cursor-pointer flex items-center gap-0.5"
              title="Scroll to bottom of preview"
              aria-label="Scroll to bottom of preview"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bottom</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="text-xs px-2 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer flex items-center gap-1 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            title="Keyboard Shortcuts (Press '?')"
            aria-label="View keyboard shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keys</span>
          </button>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1 hidden sm:block" />

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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords within conversation (Press '/' to focus)..."
            className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
          {queryTrimmed && (
            <span className="absolute right-9 top-1/2 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 pointer-events-none">
              {displayedMessages.length} match{displayedMessages.length === 1 ? '' : 'es'}
            </span>
          )}
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

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleCopyFiltered}
            className="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80 font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 justify-center shadow-xs"
            title="Copy displayed messages formatted as markdown to clipboard"
          >
            {copiedFiltered ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-400" />
                <span>Copy View</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleInvertSelection}
            className="text-xs px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1 justify-center shadow-xs"
            title="Invert selection of excluded turns"
          >
            <span>Invert</span>
          </button>

          <button
            type="button"
            onClick={handleExcludeAll}
            className="text-xs px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1 justify-center shadow-xs"
            title="Exclude all displayed turns from export"
          >
            <span>Exclude All</span>
          </button>

          {excludedIndices.size > 0 && (
            <button
              type="button"
              onClick={handleRestoreAll}
              className="text-xs px-2.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100/70 font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1 justify-center"
              title="Restore all excluded turns"
            >
              <span>Restore all ({excludedIndices.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Content-type quick filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mr-1">Content type:</span>
        {[
          { id: 'all', label: 'All Content', count: filteredMessages.length },
          { id: 'code', label: 'With Code', count: codeMessagesCount },
          { id: 'files', label: 'With Attachments', count: filesMessagesCount },
        ].map((cf) => (
          <button
            key={cf.id}
            type="button"
            onClick={() => setContentTypeFilter(cf.id as ContentTypeFilter)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              contentTypeFilter === cf.id
                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold shadow-xs'
                : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-800'
            }`}
          >
            {cf.label} ({cf.count})
          </button>
        ))}
      </div>

      {/* Preview Container */}
      <div className="border border-gray-200/90 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
        {displayedMessages.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              No messages matched your current search or content filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setContentTypeFilter('all');
              }}
              className="mt-3 text-xs px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-medium transition-all cursor-pointer"
            >
              Reset search & filters
            </button>
          </div>
        ) : (
          <ChatView
            conversation={conversation}
            messagesOverride={displayedMessages}
            density={density}
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

      {showShortcutsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 id="shortcuts-dialog-title" className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Keyboard Shortcuts
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
                aria-label="Close shortcuts modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-300">Next message turn</span>
                <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                  J
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-300">Previous message turn</span>
                <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                  K
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-300">Focus search bar</span>
                <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                  /
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-300">Clear search / Close modal</span>
                <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                  Esc
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-gray-600 dark:text-gray-300">Toggle this dialog</span>
                <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                  ?
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
