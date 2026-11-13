import JSZip from 'jszip';

export interface DownloadFileOptions {
  mimeType?: string;
}

/**
 * Downloads a single Blob with a given filename.
 * - In Chrome extension context: uses chrome.downloads.download() if available.
 * - In Web context: attempts navigator.share (mobile), falls back to anchor click.
 * - Object URLs are retained for 60 seconds before revocation to avoid race conditions.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // 1. Chrome Extension context with chrome.downloads API
  if (
    typeof chrome !== 'undefined' &&
    chrome.downloads &&
    typeof chrome.downloads.download === 'function'
  ) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      try {
        chrome.downloads.download(
          {
            url,
            filename,
            saveAs: false,
          },
          (downloadId) => {
            const err = chrome.runtime?.lastError;
            // Clean up url after safe 60s window
            setTimeout(() => {
              try {
                URL.revokeObjectURL(url);
              } catch (e) {}
            }, 60000);

            if (err) {
              console.warn('[downloadBlob] chrome.downloads error:', err);
              // Fall back to anchor click in extension page
              fallbackAnchorDownload(blob, filename).then(resolve).catch(reject);
            } else {
              resolve();
            }
          }
        );
      } catch (err) {
        console.warn('[downloadBlob] chrome.downloads call threw:', err);
        fallbackAnchorDownload(blob, filename).then(resolve).catch(reject);
      }
    });
  }

  // 2. Web context with Web Share API (mobile devices)
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare &&
    typeof File !== 'undefined'
  ) {
    try {
      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
        });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // Continue to anchor fallback
    }
  }

  // 3. Fallback anchor click download
  return fallbackAnchorDownload(blob, filename);
}

/**
 * Helper to trigger browser download via hidden <a> element
 */
async function fallbackAnchorDownload(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);

  try {
    link.click();
  } catch (err) {
    window.open(url, '_blank');
  }

  // Keep alive for 60 seconds so large downloads finish buffering
  setTimeout(() => {
    try {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    } catch (e) {}
  }, 60000);
}

/**
 * Downloads multiple files or bundles them into a ZIP archive.
 * If zipName is provided or files > 1, packages into a .zip.
 */
export async function downloadFilesAsZip(
  files: Array<{ name: string; blob: Blob }>,
  zipFilename: string = 'export.zip'
): Promise<void> {
  if (files.length === 0) return;

  if (files.length === 1 && !zipFilename.endsWith('.zip')) {
    return downloadBlob(files[0].blob, files[0].name);
  }

  const zip = new JSZip();
  files.forEach((f) => {
    zip.file(f.name, f.blob);
  });

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return downloadBlob(content, zipFilename);
}
