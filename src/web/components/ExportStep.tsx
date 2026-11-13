import React, { useState } from 'react';
import type { Conversation, ExportFormat, ExportOptions, FilterMode, HandwritingOptions, ImageMode } from '../../core/parser/types';
import { HandwritingControls } from './HandwritingControls';

interface ExportStepProps {
  conversation: Conversation;
  filterMode: FilterMode;
  onBack: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  isExporting: boolean;
}

interface FormatCard {
  id: ExportFormat;
  title: string;
  icon: string;
  desc: string;
  tag?: string;
}

export const ExportStep: React.FC<ExportStepProps> = ({
  conversation,
  filterMode,
  onBack,
  onExport,
  isExporting,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [imageMode, setImageMode] = useState<ImageMode>('long');
  const [activeExportingId, setActiveExportingId] = useState<string | null>(null);

  const formats: FormatCard[] = [
    { id: 'pdf', title: 'PDF Document', icon: '📄', desc: 'Formatted A4 pages with clean code blocks & headers' },
    { id: 'docx', title: 'Word Document', icon: '📃', desc: 'Native Microsoft Word (.docx) with formatted text' },
    { id: 'pptx', title: 'PowerPoint Slides', icon: '📊', desc: 'One slide per Q&A pair, ready for presentations' },
    { id: 'png', title: 'PNG Image', icon: '🖼️', desc: 'High-res image: long single scroll or cards view' },
    { id: 'jpg', title: 'JPG Image', icon: '🖼️', desc: 'Compressed image format, ideal for mobile sharing' },
    { id: 'md', title: 'Markdown', icon: '📑', desc: 'Clean GitHub Flavored Markdown with preserved tables' },
    { id: 'txt', title: 'Plain Text', icon: '📝', desc: 'Clean, universal text format with clean separations' },
    { id: 'csv', title: 'CSV Spreadsheet', icon: '📋', desc: 'Structured columns (index, role, message) for Excel' },
    { id: 'handwriting', title: 'Handwritten Notes', icon: '✍️', desc: 'Render on ruled/graph paper with realistic ink & slant', tag: 'Creative' },
  ];

  const handleCardClick = async (format: ExportFormat) => {
    setSelectedFormat(format);
    if (format !== 'handwriting') {
      setActiveExportingId(format);
      try {
        await onExport({
          format,
          filterMode,
          imageMode,
        });
      } finally {
        setActiveExportingId(null);
      }
    }
  };

  const handleHandwritingExport = async (hwOptions: HandwritingOptions) => {
    setActiveExportingId('handwriting');
    try {
      await onExport({
        format: 'handwriting',
        filterMode,
        handwriting: hwOptions,
      });
    } finally {
      setActiveExportingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Step 3: Choose Format & Download</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select any export format. All processing happens 100% locally in your browser.
          </p>
        </div>
      </div>

      {/* Grid of export format cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {formats.map((f) => {
          const isSelected = selectedFormat === f.id;
          const isCurrentlyExporting = isExporting && activeExportingId === f.id;

          return (
            <div
              key={f.id}
              onClick={() => handleCardClick(f.id)}
              className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm ring-1 ring-blue-600'
                  : 'border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-gray-700 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <span className="text-2xl p-2 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50">
                  {f.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{f.title}</h3>
                    {f.tag && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-semibold">
                        {f.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>

              {/* Status or Download indicator */}
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/80 text-xs">
                {isCurrentlyExporting ? (
                  <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1.5">
                    <span className="animate-spin text-xs">⏳</span> Generating...
                  </span>
                ) : f.id === 'handwriting' ? (
                  <span className="text-amber-700 dark:text-amber-400 font-medium">Configure Below ↓</span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 hover:text-blue-600 font-medium">
                    Click to Download ↓
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Options for Image Export */}
      {(selectedFormat === 'png' || selectedFormat === 'jpg') && (
        <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Image Layout Mode:</span>
            <span className="ml-1 text-gray-500 dark:text-gray-400">
              {imageMode === 'long' ? 'Full continuous chat page' : 'Compact summary cards layout'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setImageMode('long')}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                imageMode === 'long'
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'
              }`}
            >
              📜 Long Scroll
            </button>
            <button
              type="button"
              onClick={() => setImageMode('short')}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                imageMode === 'short'
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'
              }`}
            >
              🃏 Compact Cards
            </button>
          </div>
        </div>
      )}

      {/* Handwriting Controls Panel */}
      {selectedFormat === 'handwriting' && (
        <HandwritingControls
          onExport={handleHandwritingExport}
          isExporting={isExporting}
        />
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition-colors"
        >
          ← Back to Preview
        </button>
      </div>
    </div>
  );
};
