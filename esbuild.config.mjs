import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Bundle TypeScript to Code.js
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/Code.js',
  target: 'es2019',
  format: 'iife',
  logLevel: 'info',
  footer: {
    js: `
// Top-level functions for Google Apps Script Editor & Web App entrypoints
function doGet(e) {
  return globalThis.doGet(e);
}
function doPost(e) {
  return globalThis.doPost(e);
}
function getSpendData(targetDateStr) {
  return globalThis.getSpendData(targetDateStr);
}
// Helper to easily trigger OAuth consent flow from script editor
function authorize() {
  console.log("Checking authorization...");
  GmailApp.getInboxThreads(0, 1);
  console.log("Authorization successful!");
}
`,
  },
});

// 2. Copy appsscript.json to dist
if (fs.existsSync('appsscript.json')) {
  fs.copyFileSync('appsscript.json', 'dist/appsscript.json');
}

// 3. Copy HTML files from src/ui to dist
const uiDir = path.resolve('src/ui');
if (fs.existsSync(uiDir)) {
  const files = fs.readdirSync(uiDir);
  for (const file of files) {
    if (file.endsWith('.html')) {
      fs.copyFileSync(path.join(uiDir, file), path.join(distDir, file));
    }
  }
}

console.log('Build completed successfully.');
