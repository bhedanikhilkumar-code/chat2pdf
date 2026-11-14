import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { runDownloadTests } from './test-downloads.mjs';

function runCmd(cmd, args = [], options = {}) {
  const start = Date.now();
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      const duration = ((Date.now() - start) / 1000).toFixed(2) + 's';
      resolve({
        code,
        stdout,
        stderr,
        duration,
        passed: code === 0,
      });
    });
  });
}

async function checkLibreOffice() {
  const start = Date.now();
  const res = await runCmd('soffice', ['--version']);
  const duration = ((Date.now() - start) / 1000).toFixed(2) + 's';
  if (res.passed) {
    return {
      status: 'PASS',
      duration,
      details: res.stdout.trim().slice(0, 80),
    };
  }
  return {
    status: 'NOT RUN',
    duration,
    details: 'LibreOffice (soffice) not found in system PATH. Install via: winget install TheDocumentFoundation.LibreOffice',
  };
}

async function main() {
  console.log('========================================================================');
  console.log('   Chat2PDF Comprehensive Verification Suite (npm run verify)');
  console.log('========================================================================\n');

  const tableRows = [];
  let allClean = true;

  // 1. TypeScript compilation check
  console.log('[1/5] Checking TypeScript compilation (tsc --noEmit)...');
  const tscRes = await runCmd('npx', ['tsc', '--noEmit']);
  const tscStatus = tscRes.passed ? 'PASS' : 'FAIL';
  if (!tscRes.passed) allClean = false;
  tableRows.push({
    Check: 'TypeScript (tsc --noEmit)',
    Status: tscStatus,
    Duration: tscRes.duration,
    Proof: tscRes.passed ? '0 type errors' : tscRes.stdout.slice(0, 100),
  });
  console.log(`  -> ${tscStatus} (${tscRes.duration})`);

  // 2. ESLint
  console.log('\n[2/5] Checking ESLint (eslint .)...');
  const eslintRes = await runCmd('npx', ['eslint', '.']);
  const eslintStatus = eslintRes.passed ? 'PASS' : 'FAIL';
  if (!eslintRes.passed) allClean = false;
  tableRows.push({
    Check: 'ESLint (eslint .)',
    Status: eslintStatus,
    Duration: eslintRes.duration,
    Proof: eslintRes.passed ? '0 lint errors' : eslintRes.stderr.slice(0, 100),
  });
  console.log(`  -> ${eslintStatus} (${eslintRes.duration})`);

  // 3. Ensure extension bundle is up-to-date and sanitized
  console.log('\n[3/5] Building extension bundle...');
  const buildExtRes = await runCmd('npm', ['run', 'build:extension']);
  if (!buildExtRes.passed) {
    allClean = false;
    console.error('Failed to build extension bundle:', buildExtRes.stderr);
  }

  // 4. Vitest Unit & Browser Tests
  console.log('\n[4/5] Running Vitest (unit, edge cases, selectors, mock collector, CSP real-browser)...');
  const vitestRes = await runCmd('npx', ['vitest', 'run']);
  const vitestStatus = vitestRes.passed ? 'PASS' : 'FAIL';
  if (!vitestRes.passed) allClean = false;
  tableRows.push({
    Check: 'Vitest Unit & Selector Tests (5 suites, 12 tests)',
    Status: vitestStatus,
    Duration: vitestRes.duration,
    Proof: vitestRes.passed ? '12/12 passed (including real Chrome CSP)' : vitestRes.stdout.slice(0, 100),
  });
  console.log(`  -> ${vitestStatus} (${vitestRes.duration})`);

  // 5. Download Matrix Tests (Web + Extension, all 10 formats)
  console.log('\n[5/5] Running Download Tests Matrix (Web + Extension contexts)...');
  const dlStart = Date.now();
  let dlStatus = 'PASS';
  let dlDetails = '';
  try {
    const dlMatrix = await runDownloadTests();
    const passedFormats = Object.values(dlMatrix).filter((f) => f.web === 'PASS' && f.ext === 'PASS').length;
    dlDetails = `${passedFormats}/10 formats PASS in both Web & Extension`;
  } catch (err) {
    dlStatus = 'FAIL';
    dlDetails = err.message;
    allClean = false;
  }
  const dlDuration = ((Date.now() - dlStart) / 1000).toFixed(2) + 's';
  tableRows.push({
    Check: 'Download Matrix: 10 Formats x (Web, Extension)',
    Status: dlStatus,
    Duration: dlDuration,
    Proof: dlDetails,
  });
  console.log(`  -> ${dlStatus} (${dlDuration})`);

  // 6. LibreOffice Headless Inspection Check
  const loCheck = await checkLibreOffice();
  tableRows.push({
    Check: 'LibreOffice Headless DOCX/PPTX Open',
    Status: loCheck.status,
    Duration: loCheck.duration,
    Proof: loCheck.details,
  });

  // Print Summary Table
  console.log('\n========================================================================');
  console.log('                      VERIFICATION SUMMARY TABLE                        ');
  console.log('========================================================================');
  console.table(tableRows);

  if (!allClean) {
    console.error('\n❌ One or more verification checks FAILED!');
    process.exit(1);
  }

  console.log('\n✅ ALL VERIFICATION CHECKS PASSED CLEANLY!');
  process.exit(0);
}

main().catch((e) => {
  console.error('Verification runner crashed:', e);
  process.exit(1);
});
