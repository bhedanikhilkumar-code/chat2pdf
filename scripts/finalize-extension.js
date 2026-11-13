import fs from 'fs';
import path from 'path';

const srcManifest = path.resolve('src/extension/manifest.json');
const distDir = path.resolve('dist-extension');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}


fs.copyFileSync(srcManifest, path.join(distDir, 'manifest.json'));


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
console.log('Extension bundle finalized successfully in dist-extension/ from ' + sourceDir);