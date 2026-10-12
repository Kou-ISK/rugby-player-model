import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import legacyPaths from './legacy-paths.json';

export const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
export function resolveLegacyArtifact(logicalPath: keyof typeof legacyPaths): string {
  if (!Object.hasOwn(legacyPaths, logicalPath)) throw new Error('Unknown legacy artifact');
  return resolve(repositoryRoot, legacyPaths[logicalPath]);
}
export function readJudgmentBaseline(): string {
  return readFileSync(resolveLegacyArtifact('docs/versions/RUGBY_JUDGMENT-B0.md'), 'utf8');
}
// B0's original relative link was already broken at ecc5c298. Never edit frozen bytes.
export function resolveJudgmentLink(href: string): string {
  if (href !== 'docs/B_REVIEW.md') throw new Error('Unknown judgment resource');
  return resolveLegacyArtifact('docs/B_REVIEW.md');
}
export const engineSourceFiles = [
  'models/player/reference/src/cognition.ts',
  'models/player/reference/src/execution-mode.ts',
  'models/player/reference/src/execution.ts',
  'models/player/spec/execution.schema.json', 'models/player/reference/src/contracts.ts',
  'models/player/reference/src/defaults.ts', 'models/player/reference/src/replay.ts',
  'models/player/reference/src/validation.ts', 'models/player/spec/contracts.schema.json',
  'tools/simulation/src/world.ts', 'tools/simulation/src/sensing.ts', 'tools/simulation/src/body.ts',
  'tools/simulation/src/contracts.ts', 'tools/simulation/src/scene.ts', 'tools/simulation/schema/scene.schema.json',
  'tools/experiments/src/capture.ts', 'tools/experiments/src/compare.ts', 'tools/experiments/src/candidates.ts',
  'tools/experiments/src/history.ts', 'tools/experiments/src/validation.ts', 'tools/experiments/src/canonical.ts',
  'tools/experiments/src/evaluation.ts', 'tools/experiments/src/records.ts', 'tools/experiments/src/contracts.ts',
  'tools/experiments/schema/records.schema.json', 'evaluation/cases/known-regressions.ts',
  'tools/workbench/research.ts', 'schemas/contracts.schema.json',
].sort();
export const engineFingerprintFormat = 'source-manifest-v1' as const;
export function engineFingerprint(): string {
  const files = engineSourceFiles.map(path => [path,
    createHash('sha256').update(readFileSync(resolve(repositoryRoot, path))).digest('hex')]);
  return createHash('sha256').update(JSON.stringify({ format: engineFingerprintFormat, files })).digest('hex');
}
