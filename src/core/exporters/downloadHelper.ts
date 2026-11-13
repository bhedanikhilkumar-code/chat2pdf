/**
 * Shared download helper for all exporters.
 * Creates an anchor element, appends to DOM, clicks, and cleans up after delay.
 * On mobile/supported devices, supports Web Share API fallback.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Mobile Web Share API support if possible
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare &&
    typeof File !== 'undefined'
  ) {
    try {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
        });
        return;
      }
    } catch (err: any) {
      // If user aborted/dismissed share sheet, do not re-trigger download
      if (err?.name === 'AbortError') return;
      // Otherwise proceed to anchor download fallback
    }
  }

  // Standard anchor click download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);

  try {
    link.click();
  } catch (err) {
    // If blocked or failed, open in new tab
    window.open(url, '_blank');
  }

  // Revoke after safe delay to allow browser to trigger save
  setTimeout(() => {
    try {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {}
  }, 4000);
}
