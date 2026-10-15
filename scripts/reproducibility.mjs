import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(resolve(root, path));
const json = path => JSON.parse(read(path).toString('utf8'));
const sha = path => createHash('sha256').update(read(path)).digest('hex');
// Authored scope, not a scan of arbitrary workspace/session contents.
const inventory = json('public-files.json');
const relocation = json('tools/workbench/server/legacy-paths.json');
const manifestPath = resolve(root, 'reproducibility.json');
try {
  if (!Array.isArray(inventory) || new Set(inventory).size !== inventory.length) throw new Error('Duplicate or invalid public inventory');
  for (const path of inventory) {
    if (typeof path !== 'string' || path.startsWith('/') || path.split('/').some(p => !p || p === '..' || p === '.') || path.includes('\\')) throw new Error('Invalid public path');
  }
  const walk = dir => {
    if (!existsSync(resolve(root, dir))) return;
    for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!['dist', 'node_modules'].includes(entry.name)) walk(path);
      } else if (/\.(ts|mjs|css|json|md|html|ya?ml)$/.test(entry.name) && !inventory.includes(path)) {
        throw new Error(`Unlisted public source: ${path}. Review its scope before adding it.`);
      }
    }
  };
  for (const dir of ['src', 'server', 'scripts', 'schemas', 'models', 'tools', 'evaluation', 'docs', 'research', '.github']) walk(dir);
  const files = Object.fromEntries([...inventory].sort().map(path => [path, sha(path)]));
  const frozen = json('evaluation/baselines/judgment-evaluation.v1.json');
  for (const [logical, expected] of Object.entries(frozen.files)) {
    if (sha(relocation[logical]) !== expected) throw new Error(`Frozen B bytes changed: ${logical}`);
  }
  const renderer = 'tools/workbench/src/rendering/vendor/phrase2play/';
  for (const [name, expected] of Object.entries({
    'models.ts': '07b7965746b80d1cb222b5e13254369a257620bc42781a95821e23b550226d86',
    'contact-pose.ts': '81caee0c1778d61cf9eee80c0f0943c8531686c7c9ed6b16027bc74fd3107e98',
  })) if (sha(renderer + name) !== expected) throw new Error(`Original renderer changed: ${name}`);
  const pkg = json('package.json');
  const manifest = {
    manifestVersion: 2, status: 'uncalibrated-research-model',
    identity: 'commit-containing-this-manifest-and-explicit-sha256-files',
    runtime: { nodeMajor: 24, packageVersion: pkg.version, lock: 'package-lock.json', lockSha256: sha('package-lock.json') },
    artifacts: { A: 'models/player', B: 'models/judgment/RUGBY_JUDGMENT.md', localB: 'frozen B0 plus independently adopted amendments', humanValidity: 'not-established' },
    compatibility: { originalHead: 'ecc5c298b928ff860e124735decc587c0f7537af', frozenBCommit: frozen.baselineCommit,
      historicalManifest: 'evaluation/baselines/reproducibility.ecc5c298.json', relocation: 'tools/workbench/server/legacy-paths.json', oldDigests: 'preserved, not recomputed' },
    data: { synthetic: true, privateSessionsIncluded: false, permittedSyntheticWorld: 'evaluator-only; never projected into A/B subject packets' },
    rights: { declaredLicense: pkg.license, scope: existsSync(resolve(root, 'LICENSE-SCOPE.md')) ? 'LICENSE-SCOPE.md' : 'docs/provenance/PUBLICATION_SCOPE.md', originalNoticesRetained: true }, files,
  };
  const serialized = JSON.stringify(manifest, null, 2) + '\n';
  if (process.argv.includes('--write')) writeFileSync(manifestPath, serialized);
  else if (readFileSync(manifestPath, 'utf8') !== serialized) throw new Error('Reproduction inventory is stale; review changes then run manifest:write');
  console.log(`Reproduction v2 ${process.argv.includes('--write') ? 'written' : 'verified'} (${inventory.length} public files); B4 and original renderer2 hashes preserved.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;
}
