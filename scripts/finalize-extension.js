import fs from 'fs';
import path from 'path';

const srcManifest = path.resolve('src/extension/manifest.json');
const distDir = path.resolve('dist-extension');

// Ensure dist-extension exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Copy manifest.json
fs.copyFileSync(srcManifest, path.join(distDir, 'manifest.json'));

// 2. Adjust popup path: ensure dist-extension/popup/popup.html exists
const popupTargetDir = path.join(distDir, 'popup');
if (!fs.existsSync(popupTargetDir)) fs.mkdirSync(popupTargetDir, { recursive: true });

const popupHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="../assets/popup.css" />
  <title>Chat2PDF</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./popup.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(popupTargetDir, 'popup.html'), popupHtmlContent);

// 3. Recursive copy of dist/ into dist-extension/web/
const webTargetDir = path.join(distDir, 'web');
if (!fs.existsSync(webTargetDir)) {
  fs.mkdirSync(webTargetDir, { recursive: true });
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDirectory(path.resolve('dist'), webTargetDir);
console.log('Extension bundle finalized successfully in dist-extension/');
