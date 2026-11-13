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
  const [activeFormat, setActiveFormat] = useState<string | null>(null);

  const runExport = useCallback(
    async (conversation: Conversation, options: ExportOptions) => {
      setLoading(true);
      setError(null);
      setActiveFormat(options.format);

      try {
        switch (options.format) {
          case 'pdf':
            await exportPdf(conversation, options);
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
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Export failed. Please try again.';
        setError(message);
        console.error('Export error:', err);
      } finally {
        setLoading(false);
        setActiveFormat(null);
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return { runExport, loading, error, activeFormat, clearError };
}
