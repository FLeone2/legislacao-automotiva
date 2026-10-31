import { build } from 'esbuild';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';

// Renderer chunks load only when the vehicle is opened. Remove stale generated
// chunks without touching the authored models in the same asset directory.
rmSync('assets/prototype/chunks', { recursive: true, force: true });

await build({
  entryPoints: { app: 'src/prototype/PrototypeApp.jsx' },
  bundle: true,
  minify: true,
  sourcemap: false,
  outdir: 'assets/prototype',
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  format: 'esm',
  target: ['es2020'],
  legalComments: 'eof',
  define: { 'process.env.NODE_ENV': '"production"' },
});
mkdirSync('assets/prototype', { recursive: true });
copyFileSync('assets/guide/THIRD_PARTY_NOTICES.txt', 'assets/prototype/THIRD_PARTY_NOTICES.txt');
console.log('Prototype bundle: assets/prototype/app.js + app.css');
