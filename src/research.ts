import { defaultProfile, emptyMemory, type Candidate, type RulesA, type SceneId, type Snapshot } from './contracts';
import { think } from './cognition';
import { makeWorld, sense } from './simulation';
export function capture(scene: SceneId, seed: number, rulesA: RulesA, rulesBVersion: string): Snapshot {
  const world = makeWorld(scene, seed);
  return { contractVersion: 1, scene, seed, world, bundle: sense(world), memoryBefore: emptyMemory(), profile: defaultProfile(), rulesA, rulesBVersion };
}
export function compare(snapshot: Snapshot, after: RulesA) {
  const run = (rules: RulesA) => think(snapshot.bundle, snapshot.memoryBefore, snapshot.profile, rules);
  return { scene: snapshot.scene, seed: snapshot.seed, time: snapshot.bundle.time, playerId: snapshot.bundle.playerId,
    before: run(snapshot.rulesA), after: run(after), sameConditions: true };
}
export function unseen(before: RulesA, after: RulesA) {
  return [901, 1229, 65537, 104729].map(seed => compare(capture('heldout', seed, before, 'B0'), after));
}
export function candidateDraft(id: string, feedback: string, context: Snapshot): Candidate {
  return { id, createdAt: new Date().toISOString(), feedback, context: structuredClone(context), patchA: {},
    principle: { id, condition: 'TODO: 適用条件', criterion: feedback, priority: 50,
      exceptions: 'TODO: 例外', unknown: 'TODO: 不明時の扱い', evidence: 'TODO: 根拠・工学的仮定を記す' },
    decisions: { A: 'pending', B: 'pending' } };
}
