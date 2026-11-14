import fs from 'fs';
import path from 'path';

const bannedPatterns = [
  { pattern: /:has-text\s*\(/i, name: ':has-text()' },
  { pattern: /:text\s*\(/i, name: ':text()' },
  { pattern: /text\s*=\s*['"]/i, name: 'text=' },
  { pattern: />>/i, name: '>> (Playwright selector combinator)' },
  { pattern: /:contains\s*\(/i, name: ':contains()' },
  { pattern: /:visible\b/i, name: ':visible' },
  { pattern: /:nth-match\s*\(/i, name: ':nth-match()' },
  { pattern: /xpath\s*=/i, name: 'xpath=' },
];

function scanFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanFiles(full, fileList);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      fileList.push(full);
    }
  }
  return fileList;
}

const targetDir = path.resolve('src/extension');
const files = scanFiles(targetDir);
let errors = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    for (const { pattern, name } of bannedPatterns) {
      if (pattern.test(line)) {
        console.error(`[Selector Check FAIL] ${path.relative(process.cwd(), file)}:${index + 1} uses non-CSS Playwright selector: ${name}`);
        console.error(`  Line ${index + 1}: ${line.trim()}`);
        errors++;
      }
    }
  });
}

if (errors > 0) {
  console.error(`\n[Selector Check FAIL] Found ${errors} banned non-CSS selector(s) in src/extension! Use standard CSS + DOM text helpers instead.`);
  process.exit(1);
} else {
  console.log(`[Selector Check PASS] Scanned ${files.length} files in src/extension, 0 invalid/Playwright selectors found.`);
}
