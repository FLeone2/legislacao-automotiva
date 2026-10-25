import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { build } from 'esbuild';
await build({
  entryPoints: ['src/guide/GuideApp.jsx'],
  bundle: true,
  minify: true,
  sourcemap: false,
  outfile: 'assets/guide/guide.js',
  format: 'iife',
  globalName: 'HomologationGuide',
  target: ['es2020'],
  legalComments: 'eof',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.md': 'text' },
});
console.log('Guide bundle: assets/guide/guide.js');

// Keep bundled dependency licenses with the distributable, without runtime CDN access.
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const notices = [];
for (const [path, metadata] of Object.entries(lock.packages).sort(([a], [b]) =>
  a.localeCompare(b, 'en'),
)) {
  if (!path || metadata.dev) continue;
  const license = ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'license', 'license.txt']
    .map((name) => `${path}/${name}`)
    .find(existsSync);
  if (license) notices.push(`${path} @ ${metadata.version}\n${readFileSync(license, 'utf8')}`);
}
writeFileSync('assets/guide/THIRD_PARTY_NOTICES.txt', notices.join('\n\n---\n\n'));
