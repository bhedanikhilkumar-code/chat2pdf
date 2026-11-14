import fs from 'fs';
import path from 'path';

const srcManifest = path.resolve('src/extension/manifest.json');
const distDir = path.resolve('dist-extension');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy manifest
fs.copyFileSync(srcManifest, path.join(distDir, 'manifest.json'));

// Clean up any vite-generated leftover src/ directory inside dist-extension
const leftoverSrc = path.join(distDir, 'src');
if (fs.existsSync(leftoverSrc)) {
  fs.rmSync(leftoverSrc, { recursive: true, force: true });
}

// Ensure theme-init.js is present at root and in popup/
const themeInitSrc = path.resolve('public/theme-init.js');
if (fs.existsSync(themeInitSrc)) {
  fs.copyFileSync(themeInitSrc, path.join(distDir, 'theme-init.js'));
}

// Prepare popup directory and popup.html (zero inline scripts, only external theme-init.js & popup.js)
const popupTargetDir = path.join(distDir, 'popup');
if (!fs.existsSync(popupTargetDir)) fs.mkdirSync(popupTargetDir, { recursive: true });

if (fs.existsSync(themeInitSrc)) {
  fs.copyFileSync(themeInitSrc, path.join(popupTargetDir, 'theme-init.js'));
}

const popupHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="../assets/popup.css" />
  <script src="./theme-init.js"></script>
  <title>Chat2PDF</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./popup.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(popupTargetDir, 'popup.html'), popupHtmlContent, 'utf8');

// Copy web build to web/
const webTargetDir = path.join(distDir, 'web');
if (!fs.existsSync(webTargetDir)) {
  fs.mkdirSync(webTargetDir, { recursive: true });
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    let destName = entry.name;
    if (destName.startsWith('_')) {
      destName = 'ext-' + destName.replace(/^_+/, '');
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      if (destName.endsWith('.html') || destName.endsWith('.js')) {
        let fileText = fs.readFileSync(destPath, 'utf8');
        if (fileText.includes('__vite-browser-external')) {
          fileText = fileText.replace(/__vite-browser-external/g, 'ext-vite-browser-external');
          fs.writeFileSync(destPath, fileText, 'utf8');
        }
      }
    }
  }
}

const sourceDir = fs.existsSync(path.resolve('dist-web-ext'))
  ? path.resolve('dist-web-ext')
  : path.resolve('dist');

copyDirectory(sourceDir, webTargetDir);

// Verify theme-init.js in webTargetDir
if (fs.existsSync(themeInitSrc) && !fs.existsSync(path.join(webTargetDir, 'theme-init.js'))) {
  fs.copyFileSync(themeInitSrc, path.join(webTargetDir, 'theme-init.js'));
}

/**
 * Robust UTF-8 / ASCII sanitizer:
 * Windows Chromium content script parser requires strict UTF-8 with zero BOM
 * and rejects raw non-ASCII bytes in content script files when running on certain system locales.
 * Converting all characters >= 128 to \\uXXXX guarantees 100% valid 7-bit ASCII
 * (which is universally valid UTF-8 without byte-order ambiguity).
 */
function sanitizeFileToAsciiSafeUtf8(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  let sanitized = '';
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code >= 128) {
      sanitized += '\\u' + ('0000' + code.toString(16)).slice(-4);
    } else {
      sanitized += raw[i];
    }
  }
  fs.writeFileSync(filePath, sanitized, 'utf8');
}

function recursivelySanitizeJs(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      recursivelySanitizeJs(fullPath);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      sanitizeFileToAsciiSafeUtf8(fullPath);
    }
  }
}

recursivelySanitizeJs(distDir);

console.log('Extension bundle finalized successfully in dist-extension/ with UTF-8 ASCII-safe encoding.');
