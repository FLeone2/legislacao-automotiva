import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

await build({
  entryPoints: ['src/prototype/PrototypeApp.jsx'],
  bundle: true,
  minify: true,
  sourcemap: false,
  outfile: 'assets/prototype/app.js',
  format: 'esm',
  target: ['es2020'],
  legalComments: 'eof',
  define: { 'process.env.NODE_ENV': '"production"' },
});
mkdirSync('assets/prototype', { recursive: true });
copyFileSync('assets/guide/THIRD_PARTY_NOTICES.txt', 'assets/prototype/THIRD_PARTY_NOTICES.txt');
console.log('Prototype bundle: assets/prototype/app.js + app.css');
