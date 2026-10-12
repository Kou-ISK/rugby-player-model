import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fixture from './fixtures/legacy-ecc5c298.json' with { type: 'json' };
import { think, replayObservationSequence, validate } from '../reference/src/index.js';
import type { Bundle, Memory, Profile, RulesA } from '../reference/src/contracts.js';

test('W0: structural extraction preserves all 36 pinned legacy traces', () => {
  assert.equal(fixture.originCommit, 'ecc5c298b928ff860e124735decc587c0f7537af');
  for (const example of fixture.cases) {
    const { bundle, memory, profile, rules } = example.input;
    const trace = think(bundle as Bundle, memory as Memory, profile as Profile, rules as RulesA);
    assert.equal(createHash('sha256').update(JSON.stringify(trace)).digest('hex'), example.expectedTraceSha256, example.id);
  }
});

test('A-only contracts reject a world envelope and preserve evidence time', () => {
  const { bundle, memory, profile, rules } = fixture.cases[1].input;
  assert.throws(() => validate('Bundle', { ...bundle, world: {} }), /additional properties/);
  assert.throws(() => validate('ObservationSequence', { initialMemory: memory, events: [], sceneRef: {} }));
  assert.throws(() => think({ ...bundle, time: -1 } as Bundle, memory as Memory, profile as Profile, rules as RulesA));
  const result = replayObservationSequence({ initialMemory: memory as Memory, events: [
    { sequence: 0, trigger: 'initial', bundle: bundle as Bundle, profile: profile as Profile, rulesA: rules as RulesA },
  ] });
  assert.deepEqual(result.finalTrace, think(bundle as Bundle, memory as Memory, profile as Profile, rules as RulesA));
});
