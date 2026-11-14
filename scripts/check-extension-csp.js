import fs from 'fs';
import path from 'path';

function scanHtmlFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanHtmlFiles(fullPath, fileList);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const distDir = path.resolve('dist-extension');
const htmlFiles = scanHtmlFiles(distDir);
let hasErrors = false;

if (htmlFiles.length === 0) {
  console.error('[CSP Check FAIL] No HTML files found in dist-extension!');
  process.exit(1);
}

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(process.cwd(), file);

  // Check for inline scripts (scripts that have body content, not just <script src="..."></script>)
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    const body = match[2].trim();
    if (body.length > 0) {
      console.error(`[CSP Check FAIL] Inline script body detected in ${relPath}:\n${body.slice(0, 120)}...`);
      hasErrors = true;
    }
  }

  // Check for inline event handlers: onclick, onload, onerror, onmouseover, etc.
  const inlineHandlerRegex = /\s(on[a-z]+)\s*=\s*['"][^'"]*['"]/gi;
  let handlerMatch;
  while ((handlerMatch = inlineHandlerRegex.exec(content)) !== null) {
    console.error(`[CSP Check FAIL] Inline event handler detected in ${relPath}: ${handlerMatch[0]}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('[CSP Check FAIL] Extension HTML contains inline scripts or handlers violating Content Security Policy!');
  process.exit(1);
} else {
  console.log(`[CSP Check PASS] All ${htmlFiles.length} extension HTML files are free of inline scripts and on*= event handlers.`);
}
