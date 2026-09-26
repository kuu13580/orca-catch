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
