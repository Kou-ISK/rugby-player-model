import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, relative, sep } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = resolve(root, 'research/reproducibility-manifest.json');
// Explicit local-review inventory: never scan private sessions, env vars or downloaded plans/ZIPs.
// Bounded P2P source publication is owner-authorized; its declared license remains UNLICENSED.
const inventory = [
  'start-rpm.command', 'bridge-rpm.command', 'scripts/local-launcher.mjs', 'tests/local-launcher.test.mjs', 'docs/LOCAL_STORAGE.md', 'docs/MAC_START.md',
  'src/playback.ts', 'tests/dynamic-review-regressions.test.ts', 'src/scene.ts', 'tests/dynamic-scenes.test.ts', 'tests/browser/dynamic-scenes.spec.ts', 'examples/dynamic-support.scene.json', 'docs/DYNAMIC_SCENES.md',
  '.gitignore', '.nvmrc', '.github/workflows/ci.yml', 'AGENTS.md', 'README.md', 'index.html',
  'package.json', 'package-lock.json', 'tsconfig.json', 'playwright.config.ts', 'RUGBY_JUDGMENT.md',
  'research/b-evaluation-baseline.json',
  'src/observation-history.ts', 'src/contracts.ts', 'src/cognition.ts', 'src/simulation.ts', 'src/research.ts', 'src/validation.ts',
  'src/ui/main.ts', 'src/ui/models.ts', 'src/ui/view.ts', 'src/ui/style.css',
  'src/ui/p2p/models.ts', 'src/ui/p2p/contact-pose.ts', 'src/ui/p2p/REUSE-NOTICE.md', 'src/ui/p2p/kit-manifest.json',
  'server/evaluation.ts', 'server/store.ts', 'server/dev.ts', 'server/cli.ts', 'server/experiment-types.ts',
  'scripts/make-samples.ts', 'scripts/run-model.ts', 'scripts/spike.ts', 'scripts/reproducibility.mjs',
  'schemas/contracts.schema.json',
  'examples/support-42.snapshot.json', 'examples/occluded-77.snapshot.json', 'examples/audio-8.snapshot.json', 'examples/candidate-edit.json', 'examples/conditional-coaching-edit.json',
  'docs/ADR-001-runtime.md', 'docs/ARCHITECTURE.md', 'docs/B_REVIEW.md', 'docs/B_EVALUATION_SCENES.md',
  'docs/EVALUATION_PROTOCOL.md', 'docs/RESEARCH_READINESS.md', 'docs/RESEARCH_LOOP.md', 'docs/MAC_RESEARCH_CYCLE.md', 'docs/LOCAL_BRIDGE.md', 'docs/MAC_ACCEPTANCE.md', 'docs/MAC_HEADLESS.md', 'docs/LIMITATIONS.md', 'docs/PROVENANCE.md', 'docs/VERIFICATION.md',
  'docs/MODEL_CARD.md', 'docs/DATA_CARD.md', 'docs/PUBLICATION_SCOPE.md', 'docs/REPRODUCTION.md', 'docs/versions/RUGBY_JUDGMENT-B0.md',
  'tests/evaluation-boundaries.test.ts', 'tests/research-readiness.test.ts', 'tests/browser/research-cycle.spec.ts', 'tests/cognition.test.ts', 'tests/p2p-adapter.test.ts', 'tests/browser/p2p-view.spec.ts', 'tests/research-loop.test.ts', 'tests/review-regressions.test.ts', 'tests/browser/workbench.spec.ts',
].sort();
const readJson = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const digest = path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');

function assertInventory() {
  const walk = dir => {
    for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.(ts|mjs|css|json|md|ya?ml)$/.test(entry.name) && !inventory.includes(path)) {
        throw new Error(`Unlisted public source: ${path}. Review its scope before adding it to the explicit inventory.`);
      }
    }
  };
  for (const dir of ['src', 'server', 'scripts', 'schemas', 'examples', 'docs', 'tests', '.github']) walk(dir);
  for (const path of inventory) {
    if (path.startsWith('/') || path.split('/').includes('..') || relative(root, resolve(root, path)).startsWith(`..${sep}`)) throw new Error('Inventory must contain repository-relative paths');
  }
}

function buildManifest() {
  assertInventory();
  const files = Object.fromEntries(inventory.map(path => [path, digest(path)]));
  const frozenB = readJson('research/b-evaluation-baseline.json');
  for (const [path, hash] of Object.entries(frozenB.files)) {
    if (files[path] !== hash) throw new Error(`Frozen B evaluation input changed: ${path}. The current reference is ${frozenB.baselineCommit}; do not regenerate it during this evaluation.`);
  }
  const pkg = readJson('package.json'), lock = readJson('package-lock.json');
  return {
    manifestVersion: 1,
    status: 'provisional-uncalibrated-research-foundation',
    sourceIdentity: {
      method: 'git-commit-containing-this-manifest-plus-sha256-files',
      referenceReviewCommit: '5886a70ba4d2200fa67317f995cc36e48c05d2aa',
      manifestSelfHashExcluded: true,
      note: 'Reference review/CI evidence applies to that commit. Reproduce this tree from the commit containing this manifest; check the explicit file hashes below.',
    },
    runtime: { nodeMajor: 24, referenceNode: '24.19.0', macVerifiedNode: '24.21.0', packageVersion: pkg.version, npmLockVersion: lock.lockfileVersion,
      dependencies: pkg.dependencies, devDependencies: pkg.devDependencies,
      network: 'Required for initial dependency/browser installation; no external AI service required for local execution.' },
    contracts: { observationVersion: 1, schema: 'schemas/contracts.schema.json', bridgeApiVersion: 5,
      units: { distance: 'meter', angle: 'radian', time: 'second', attackDirection: '+z' } },
    artifacts: {
      A: { modelRevision: 'cognition-0.3', rulesBaseline: 'A0', type: 'hand-written-deterministic-heuristic', trainedWeights: false,
        calibration: 'none', humanValidity: 'not-established', card: 'docs/MODEL_CARD.md' },
      B: { document: 'RUGBY_JUDGMENT.md', revision: 'B0.1-draft', evaluationReference: 'research/b-evaluation-baseline.json',
        frozenAt: frozenB.baselineCommit, localExport: 'frozen B0 plus separately owner-approved amendments', evaluationOutcome: 'not-claimed' },
    },
    data: { card: 'docs/DATA_CARD.md', source: 'authored synthetic data only', trainingDataset: 'none',
      snapshots: [{ path: 'examples/support-42.snapshot.json', scene: 'support', seed: 42 },
        { path: 'examples/occluded-77.snapshot.json', scene: 'occluded', seed: 77 },
        { path: 'examples/audio-8.snapshot.json', scene: 'audio', seed: 8 }],
      evaluationStrata: [
        { caseId: 'carrier-open', seed: 900 }, { caseId: 'carrier-pressure', seed: 901 },
        { caseId: 'carrier-receiver', seed: 1230 }, { caseId: 'noncarrier-open', seed: 1231 },
        { caseId: 'carrier-missing', seed: 65536 }, { caseId: 'carrier-memory', seed: 65537 },
        { caseId: 'noncarrier-audio-left', seed: 104728 }, { caseId: 'noncarrier-audio-right', seed: 104729 },
      ],
      coverage: 'published fixed regression probes using the captured player profile; separately frozen owner-declared conditions track exposure/reuse, not proven novelty or generalization',
    },
    determinism: { generator: 'uint32 LCG: state = (1664525 * state + 1013904223) mod 2^32', simulationStepSeconds: 0.2,
      snapshotIncludes: ['immutable dynamic scene revision when present', 'world', 'observation bundle', 'ordered static-study v1 or fixed-step-study v2 observation events when captured', 'prior memory', 'profile', 'RulesA', 'B version'],
      notSeedControlled: ['feedback UUIDs', 'wall-clock timestamps', 'unsaved manual interaction history'],
      crossPlatformBitwiseEquality: 'not-guaranteed' },
    reproduction: { guide: 'docs/REPRODUCTION.md', commands: [
      'npm ci', 'npm run manifest:check', 'npm run check',
      'npm run --silent model -- --input examples/support-42.snapshot.json --steps 10',
      'npx playwright install chromium', 'npm run test:browser',
    ], browserAlternative: 'Set RPM_CHROMIUM to an existing Chromium executable.' },
    referenceEvidence: { commit: '5886a70ba4d2200fa67317f995cc36e48c05d2aa', nodeTests: 27, browserTests: 4,
      ciRun: 'https://github.com/Kou-ISK/rugby-player-model/actions/runs/38156672972', ciConclusion: 'success',
      scope: 'software checks, not scientific/human/Mac acceptance; inspect current PR checks for subsequent commits' },
    rights: { declaredLicense: pkg.license, licenseDecision: 'pending-owner-decision', publicationScope: 'docs/PUBLICATION_SCOPE.md',
      privateDataIncluded: false, p2pSourceReuse: 'verified-procedural-source-owner-authorized-publication', p2pZipChecksum: '0b24168eb6874b1bb2cacaea5b5926346050ac4baa5acebf32a31b6bcefa07bd', p2pPublicRelease: 'owner-authorized-2026-10-12-unlicensed-retained' },
    remaining: ['owner Mac research-loop acceptance', 'future OSS/license selection not made', 'human calibration/validation', 'independent B evaluation results not claimed'],
    files,
  };
}

try {
  const next = buildManifest(), serialized = JSON.stringify(next, null, 2) + '\n';
  if (process.argv.includes('--write')) {
    writeFileSync(manifestPath, serialized);
    console.log(`Wrote local-review reproduction manifest (${inventory.length} files); frozen B reference unchanged.`);
  } else {
    const previous = readFileSync(manifestPath, 'utf8');
    if (previous !== serialized) {
      const old = JSON.parse(previous);
      const changed = inventory.filter(path => old.files?.[path] !== next.files[path]);
      throw new Error(`Reproduction manifest is stale: ${changed.join(', ') || 'metadata/inventory differs'}. Review intentional changes, then run npm run manifest:write.`);
    }
    console.log(`Reproduction manifest verified (${inventory.length} files); frozen B inputs match ${next.artifacts.B.frozenAt}.`);
  }
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
