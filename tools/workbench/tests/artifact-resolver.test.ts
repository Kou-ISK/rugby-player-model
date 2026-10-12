import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import frozen from '../../../evaluation/baselines/b-evaluation-baseline.v1.json';
import { readJudgmentBaseline, resolveLegacyArtifact, resolveJudgmentLink, engineSourceFiles, engineFingerprint } from '../server/artifact-resolver';

test('relocation preserves all four frozen B byte hashes and the original baseline commit', () => {
  assert.equal(frozen.baselineCommit, '5886a70ba4d2200fa67317f995cc36e48c05d2aa');
  for (const [logical, expected] of Object.entries(frozen.files)) {
    const file = resolveLegacyArtifact(logical as keyof typeof frozen.files);
    assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), expected, logical);
  }
  assert.match(readJudgmentBaseline(), /\]\(docs\/B_REVIEW\.md\)/);
  assert.equal(resolveJudgmentLink('docs/B_REVIEW.md'), resolveLegacyArtifact('docs/B_REVIEW.md'));
  assert.throws(() => resolveJudgmentLink('../private/state.json'));
});

test('new fingerprint includes extracted sensing/body, cognitive policy and authored cases', () => {
  for (const file of ['tools/simulation/src/sensing.ts', 'tools/simulation/src/body.ts',
    'models/player/reference/src/cognition.ts', 'evaluation/cases/known-regressions.ts']) {
    assert.ok(engineSourceFiles.includes(file));
  }
  assert.equal(new Set(engineSourceFiles).size, engineSourceFiles.length);
  assert.match(engineFingerprint(), /^[a-f0-9]{64}$/);
});
