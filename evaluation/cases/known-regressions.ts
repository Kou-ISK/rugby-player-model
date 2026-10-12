import type { RulesA, Profile } from '../../models/player/reference/src/contracts.js';
import type { Snapshot } from '../../tools/experiments/src/contracts';
import { capture } from '../../tools/experiments/src/capture';
import { sense } from '../../tools/simulation/src/sensing';
export function regressionCases(before: RulesA, profile: Profile) {
  const cases: { id: string; seed: number; strata: string[]; snapshot: Snapshot }[] = [];
  const add = (id: string, seed: number, strata: string[], setup: (s: Snapshot) => void) => {
    const s = capture('heldout', seed, before, 'B0'); s.profile=structuredClone(profile);s.world.body.yaw = 0;
    setup(s);
    const ball = s.world.entities.find(e => e.id === 'ball')!;
    ball.position = s.world.body.hasBall ? { x: s.world.body.position.x, z: s.world.body.position.z + .4 } : { x: 2, z: 9 };
    s.bundle = sense(s.world); cases.push({ id, seed, strata, snapshot: s });
  };
  add('carrier-open', 900, ['possession', 'open'], s => { s.world.body.hasBall = true; });
  add('carrier-pressure', 901, ['possession', 'pressure'], s => {
    s.world.body.hasBall = true; s.world.entities.find(e => e.id === 'defender-1')!.position = { x: 0, z: 2 };
  });
  add('carrier-receiver', 1230, ['possession', 'fresh-receiver'], s => { s.world.body.hasBall = true; s.world.body.headYaw = 1.95; });
  add('noncarrier-open', 1231, ['no-possession', 'open'], s => { s.world.body.hasBall = false; });
  add('carrier-missing', 65536, ['possession', 'missing-vision'], s => {
    s.world.body.hasBall = true; s.world.body.headYaw = 2.4;
    for (const [i,e] of s.world.entities.entries()) e.position = { x: 0, z: 10 + i * 3 };
  });
  add('carrier-memory', 65537, ['possession', 'stale-threat-memory'], s => {
    s.world.body.hasBall = true; s.world.time = 1;
    s.memoryBefore = { lastTime: 0, episodes: [{ id: 'remembered-opponent@0', entityId: 'remembered-opponent', kind: 'player', relation: 'opponent', modality: 'vision', position: { x: 0, z: 3 }, confidence: .9, observedAt: 0 }] };
  });
  add('noncarrier-audio-left', 104728, ['no-possession', 'audio-left'], s => {
    s.world.body.hasBall = false; s.world.calls = [{ id: 'unlocated-call', position: { x: -8, z: -4 }, cue: 'support-call' }];
  });
  add('noncarrier-audio-right', 104729, ['no-possession', 'audio-right'], s => {
    s.world.body.hasBall = false; s.world.calls = [{ id: 'unlocated-call', position: { x: 8, z: -4 }, cue: 'support-call' }];
  });
  return cases;
}
