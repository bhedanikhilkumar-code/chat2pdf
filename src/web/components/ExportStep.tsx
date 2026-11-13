import React, { useState } from 'react';
import type { Conversation, ExportFormat, ExportOptions, FilterMode, HandwritingOptions, ImageMode } from '../../core/parser/types';
import { HandwritingControls } from './HandwritingControls';
import {
  FileText,
  FileCode,
  Presentation,
  Image as ImageIcon,
  Table as TableIcon,
  PenTool,
  ArrowLeft,
  Download,
  AlertCircle,
  Copy,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ExportStepProps {
  conversation: Conversation;
  filterMode: FilterMode;
  onBack: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  isExporting: boolean;
  progressText?: string | null;
  error?: string | null;
  errorDetails?: string | null;
  successInfo?: { filename: string } | null;
  onClearError?: () => void;
  onClearSuccess?: () => void;
}

interface FormatCard {
  id: ExportFormat;
  title: string;
  icon: React.ReactNode;
  desc: string;
  badge?: string;
}

export const ExportStep: React.FC<ExportStepProps> = ({
  conversation,
  filterMode,
  onBack,
  onExport,
  isExporting,
  progressText,
  error,
  errorDetails,
  successInfo,
  onClearError,
  onClearSuccess,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [imageMode, setImageMode] = useState<ImageMode>('long');
  const [activeExportingId, setActiveExportingId] = useState<string | null>(null);
  const [copiedError, setCopiedError] = useState(false);
  const [showHandwritingPanel, setShowHandwritingPanel] = useState(false);

  const formats: FormatCard[] = [
    {
      id: 'pdf',
      title: 'PDF Document',
      icon: <FileText className="w-5 h-5 text-red-500" />,
      desc: 'High-res A4 pages with code blocks, tables & footer watermark',
      badge: 'Popular',
    },
    {
      id: 'docx',
      title: 'Word (.docx)',
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      desc: 'Native Microsoft Word with formatted tables & footer watermark',
    },
    {
      id: 'pptx',
      title: 'PowerPoint (.pptx)',
      icon: <Presentation className="w-5 h-5 text-amber-500" />,
      desc: 'Wide 16:9 slides with automatic Q&A splitting & watermarks',
    },
    {
      id: 'png',
      title: 'PNG Image',
      icon: <ImageIcon className="w-5 h-5 text-emerald-500" />,
      desc: 'Full-resolution stitched chat or card format',
    },
    {
      id: 'jpg',
      title: 'JPG Image',
      icon: <ImageIcon className="w-5 h-5 text-teal-500" />,
      desc: 'Compressed lightweight image for easy messaging & sharing',
    },
    {
      id: 'md',
      title: 'Markdown (.md)',
      icon: <FileCode className="w-5 h-5 text-purple-500" />,
      desc: 'GitHub Flavored Markdown preserving all blocks & tables',
    },
    {
      id: 'txt',
      title: 'Plain Text (.txt)',
      icon: <FileText className="w-5 h-5 text-gray-500" />,
      desc: 'Universal text file formatted with role demarcations',
    },
    {
      id: 'csv',
      title: 'CSV Table (.csv)',
      icon: <TableIcon className="w-5 h-5 text-green-600" />,
      desc: 'Structured tabular data ready for Excel & Google Sheets',
    },
    {
      id: 'handwriting',
      title: 'Handwritten Notes',
      icon: <PenTool className="w-5 h-5 text-amber-600" />,
      desc: 'Realistic handwritten paper with Kalam, Hind, Caveat & ink settings',
      badge: 'Creative',
    },
  ];

  const handleCardClick = async (format: ExportFormat) => {
    setSelectedFormat(format);
    if (format === 'handwriting') {
      setShowHandwritingPanel(true);
      return;
    }

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

  const handleCopyError = () => {
    if (errorDetails || error) {
      navigator.clipboard.writeText(errorDetails || error || '');
      setCopiedError(true);
      setTimeout(() => setCopiedError(false), 2000);
    }
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Step 3: Choose Format & Download
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Click any format to generate and download immediately.
          </p>
        </div>
      </div>

      {/* Progress Toast / Bar */}
      {isExporting && (
        <div className="p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 shadow-xs flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="animate-spin text-lg">⏳</span>
            <span className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-200">
              {progressText || 'Preparing your download...'}
            </span>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successInfo && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Download ready: {successInfo.filename}
              </p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                Saved to your downloads folder.
              </p>
            </div>
          </div>
          {onClearSuccess && (
            <button
              type="button"
              onClick={onClearSuccess}
              className="text-xs text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 px-2 py-1 cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-red-800 dark:text-red-300">
                {error}
              </p>
              {errorDetails && (
                <p className="text-[11px] text-red-600/80 dark:text-red-400/80 font-mono mt-1 max-h-16 overflow-y-auto">
                  {errorDetails.slice(0, 200)}...
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleCopyError}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-gray-900 text-red-700 dark:text-red-300 hover:bg-red-50 cursor-pointer"
            >
              {copiedError ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedError ? 'Copied' : 'Copy details'}</span>
            </button>
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 cursor-pointer"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* Formats Grid: 2 columns on phone, 4 columns on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {formats.map((f) => {
          const isSelected = selectedFormat === f.id;
          const isCurrentActive = isExporting && activeExportingId === f.id;

          return (
            <div
              key={f.id}
              onClick={() => handleCardClick(f.id)}
              className={`relative p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs ring-1 ring-blue-600'
                  : 'border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-gray-700'
              }`}
            >
              {f.badge && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  {f.badge}
                </span>
              )}

              <div>
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {f.title}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                  {f.desc}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px]">
                <span className="text-gray-400 dark:text-gray-500">
                  {f.id === 'handwriting' ? 'Configure' : 'Download'}
                </span>
                {isCurrentActive ? (
                  <span className="animate-spin text-blue-600 font-bold">⏳</span>
                ) : (
                  <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Collapsible Handwriting Controls Panel */}
      {showHandwritingPanel && (
        <div className="mt-4 transition-all duration-300">
          <HandwritingControls
            onExport={handleHandwritingExport}
            isExporting={isExporting && activeExportingId === 'handwriting'}
          />
        </div>
      )}

      {/* Sticky Bottom Action Bar on Mobile / Desktop Footer */}
      <div className="fixed sm:static bottom-0 left-0 right-0 p-3 sm:p-0 bg-white/95 dark:bg-gray-900/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-t-0 border-gray-200 dark:border-gray-800 z-40 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Preview</span>
        </button>

        <button
          type="button"
          onClick={() => handleCardClick(selectedFormat)}
          disabled={isExporting}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download {selectedFormat.toUpperCase()}</span>
        </button>
      </div>
    </div>
  );
};
