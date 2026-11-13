import { useState, useCallback } from 'react';
import type { Conversation, ExportOptions } from '@core/parser/types';
import {
  exportPdf,
  exportPptx,
  exportCsv,
  exportTxt,
  exportMarkdown,
  exportImage,
  exportDocx,
  exportHandwriting,
} from '@core/index';

export function useExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<string | null>(null);

  const runExport = useCallback(
    async (conversation: Conversation, options: ExportOptions) => {
      setLoading(true);
      setError(null);
      setErrorDetails(null);
      setProgressText(null);
      setActiveFormat(options.format);

      try {
        switch (options.format) {
          case 'pdf':
            await exportPdf(conversation, options, (current, total) => {
              setProgressText(`Rendering page ${current} of ${total}...`);
            });
            break;
          case 'pptx':
            await exportPptx(conversation, options);
            break;
          case 'csv':
            await exportCsv(conversation, options);
            break;
          case 'txt':
            await exportTxt(conversation, options);
            break;
          case 'md':
            await exportMarkdown(conversation, options);
            break;
          case 'png':
          case 'jpg':
            await exportImage(conversation, options, options.format);
            break;
          case 'docx':
            await exportDocx(conversation, options);
            break;
          case 'handwriting':
            await exportHandwriting(conversation, options);
            break;
          default:
            throw new Error(`Unsupported format: ${options.format}`);
        }
      } catch (err: any) {
        const message = err?.message || 'Export failed. Please try again.';
        const stack = err?.stack || String(err);
        setError(message);
        setErrorDetails(stack);
        console.error('Export error caught:', err);
      } finally {
        setLoading(false);
        setActiveFormat(null);
        setProgressText(null);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
    setErrorDetails(null);
  }, []);

  return { runExport, loading, error, errorDetails, progressText, activeFormat, clearError };
}
