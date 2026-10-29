// Optional authoring toolchain, separate from the site's runtime dependencies.
// Usage: node scripts/models/compress_mechanical.mjs EXPORT_DIR OUTPUT_DIR TOOLCHAIN_DIR
// TOOLCHAIN_DIR contains @gltf-transform/{core,extensions,functions}@4.5.1
// and draco3dgltf@1.5.9 (install them in a separate authoring workspace).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const [inputDirectory, outputDirectory, toolchainDirectory] = process.argv.slice(2);
if (!inputDirectory || !outputDirectory || !toolchainDirectory)
  throw new Error('Provide EXPORT_DIR OUTPUT_DIR TOOLCHAIN_DIR; see the header for pinned tools.');
const requireTool = createRequire(resolve(toolchainDirectory, 'package.json'));
const { NodeIO } = requireTool('@gltf-transform/core');
const { ALL_EXTENSIONS } = requireTool('@gltf-transform/extensions');
const { dedup, prune, weld, draco } = requireTool('@gltf-transform/functions');
const draco3d = requireTool('draco3dgltf');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
const doc = await io.read(resolve(inputDirectory, 'mechanical-supplement.glb'));
for (const node of doc.getRoot().listNodes()) {
  const extras = node.getExtras();
  if (extras.mechanicalExample) node.setExtras({ ...extras, sourceType: 'authored_illustrative' });
}
await doc.transform(
  dedup(),
  prune(),
  weld(),
  draco({
    method: 'edgebreaker',
    encodeSpeed: 5,
    decodeSpeed: 5,
    quantizePosition: 16,
    quantizeNormal: 12,
    quantizeTexcoord: 14,
    quantizeColor: 10,
  }),
);
mkdirSync(resolve(outputDirectory), { recursive: true });
const asset = resolve(outputDirectory, 'mechanical-supplement.glb');
await io.write(asset, doc);
const checksum = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const metadata = JSON.parse(readFileSync(resolve(inputDirectory, 'provenance.json'), 'utf8'));
const authoredSources = [
  'scripts/models/build_mechanical_supplement.py',
  'scripts/models/engine_geometry.py',
  'scripts/models/compress_mechanical.mjs',
];
Object.assign(metadata, {
  sha256: checksum(asset),
  bytes: readFileSync(asset).length,
  compression: 'Draco edge-breaker, position16/normal12/UV14/color10; no decimation',
  sourceScript: authoredSources.join(' and '),
  authoredSources: authoredSources.map((path) => ({ path, sha256: checksum(resolve(repo, path)) })),
});
writeFileSync(
  resolve(outputDirectory, 'mechanical-provenance.json'),
  JSON.stringify(metadata, null, 2) + '\n',
);
console.log(`Published mechanical supplement: ${metadata.bytes} bytes, ${metadata.sha256}`);
