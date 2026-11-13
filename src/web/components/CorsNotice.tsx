export default function CorsNotice() {
  return (
    <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
      <p>
        <span className="font-semibold">⚠️ Note:</span> Pasting a share link
        won't work due to browser CORS restrictions. Please copy and paste the
        full chat text instead. For automatic extraction, use the{' '}
        <span className="font-semibold">ChatExport Chrome Extension</span>.
      </p>
    </div>
  );
}
