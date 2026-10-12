import { sceneWorld, sceneDiagnostics, type SceneRevision } from './scene';
import { defaultProfile, emptyMemory, type Candidate, type RulesA, type SceneId, type Snapshot, type Profile } from './contracts';
import { think } from './cognition';
import { makeWorld, sense, advance } from './simulation';
import { newHistory, appendObservation, replayObservationHistory } from './observation-history';
export function capture(scene: SceneId, seed: number, rulesA: RulesA, rulesBVersion: string): Snapshot {
  const world = makeWorld(scene, seed);
  return { contractVersion: 1, scene, seed, world, bundle: sense(world), memoryBefore: emptyMemory(), profile: defaultProfile(), rulesA, rulesBVersion };
}
export function captureScene(scene:SceneRevision,rulesA:RulesA,rulesBVersion:string):Snapshot {
  const world=sceneWorld(scene);return {contractVersion:2,scene:'dynamic',seed:scene.generationSeed,world,bundle:sense(world),memoryBefore:emptyMemory(),profile:defaultProfile(),rulesA,rulesBVersion};
}
export function captureSceneAt(scene:SceneRevision,rulesA:RulesA,rulesBVersion:string,tick=0):Snapshot {
  if(!Number.isInteger(tick)||tick<0||tick>scene.definition.durationTicks)throw new Error('Tick outside scene');
  const snapshot=captureScene(scene,rulesA,rulesBVersion),history=newHistory(snapshot.memoryBefore,snapshot.world);
  for(let i=0;i<=tick;i++){
    snapshot.bundle=sense(snapshot.world);appendObservation(history,snapshot.bundle,snapshot.profile,rulesA,i?'step':'initial');
    if(i<tick){const trace=think(snapshot.bundle,snapshot.memoryBefore,snapshot.profile,rulesA);snapshot.memoryBefore=trace.longTermMemory;snapshot.world=advance(snapshot.world,trace);}
  }
  snapshot.observationHistory=history;return snapshot;
}
export function compare(snapshot: Snapshot, after: RulesA) {
  const run = (rules: RulesA) => think(snapshot.bundle, snapshot.memoryBefore, snapshot.profile, rules);
  return { scene: snapshot.scene, seed: snapshot.seed, time: snapshot.bundle.time, playerId: snapshot.bundle.playerId,
    before: run(snapshot.rulesA), after: run(after), sameConditions: true,comparisonKind:'fixed-observation' as const };
}
// Published fixed cases are regression probes, never a fresh holdout claim.
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
export function regressionCompare(before: RulesA, after: RulesA, profile: Profile) {
  return regressionCases(before,profile).map(c => ({ caseId: c.id, strata: c.strata, profile:structuredClone(profile), ...compare(c.snapshot, after) }));
}
export function replay(snapshot: Snapshot, rules: RulesA, steps: number) {
  if (!Number.isInteger(steps) || steps < 1 || steps > 20) throw new Error('steps must be 1–20');
  let world = structuredClone(snapshot.world), memory = structuredClone(snapshot.memoryBefore);
  const frames = [];
  for (let i = 0; i < steps; i++) {
    const trace = think(sense(world), memory, snapshot.profile, rules);
    frames.push({ time: world.time, body:structuredClone(world.body), diagnostics:sceneDiagnostics(world), trace });memory = trace.longTermMemory;
    if(world.dynamic&&world.dynamic.tick>=world.dynamic.scene.definition.durationTicks)break;
    world = advance(world, trace);
  }
  return { frames, termination:world.dynamic&&world.dynamic.tick>=world.dynamic.scene.definition.durationTicks?'scene-end':'step-budget', finalSelf: world.body, emittedCalls: world.emittedCalls ?? [] };
}
export function experimentRun(snapshot: Snapshot, after: RulesA, steps: number, frozen: {id:string;snapshot:Snapshot}[] = []) {
  const pair = (s: Snapshot) => ({ comparisonKind:'same-scene-closed-loop' as const,sameInitialConditions: true, before: replay(s, s.rulesA, steps), after: replay(s, after, steps) });
  const cases = regressionCases(snapshot.rulesA,snapshot.profile);
  const frozenCases=frozen.map(c=>({...c,snapshot:{...structuredClone(c.snapshot),profile:structuredClone(snapshot.profile),rulesA:structuredClone(snapshot.rulesA)}}));
  const trials = cases.map(c => ({ caseId: c.id, seed: c.seed, strata: c.strata, ...pair(c.snapshot) }));
  const frozenTrials=frozenCases.map(c=>({caseId:c.id,...pair(c.snapshot)}));
  const actions = [...new Set(trials.map(t => t.after.frames[0].trace.intention.action))];
  return { steps, dt: .2, profilePolicy:'candidate-profile-fixed' as const, regressionKind:'published-fixed-regression' as const, recorded: pair(snapshot), trials, frozenTrials,
    observedHistory:snapshot.observationHistory?{before:replayObservationHistory(snapshot.observationHistory,{profile:snapshot.profile,rulesA:snapshot.rulesA}),after:replayObservationHistory(snapshot.observationHistory,{profile:snapshot.profile,rulesA:after})}:null,
    diagnostic: { distinctFirstActions: actions, homogeneousWarning: actions.length < 2,
      interpretation: 'Synthetic counterexamples, not human validity or an automatic adoption decision. Future observations can diverge after actions.' },
    observationCases: [{ group:'recorded' as const,caseId: 'recorded', snapshot }, ...cases.map(c => ({group:'regression' as const, caseId: c.id, snapshot: c.snapshot })),...frozenCases.map(c=>({group:'frozen' as const,caseId:c.id,snapshot:c.snapshot}))].map(({group,caseId,snapshot:s}) =>
      ({ group,caseId, scene: s.scene, seed: s.seed, bundle: s.bundle, memoryBefore: s.memoryBefore, profile: s.profile, ...(s.observationHistory?{initialMemory:structuredClone(s.observationHistory.initialMemory),observations:s.observationHistory.events.map(e=>structuredClone(e.bundle))}:{}) })) };
}
export function candidateDraft(id: string, feedback: string, context: Snapshot): Candidate {
  return { id, revision: 1, createdAt: new Date().toISOString(), feedback, context: structuredClone(context), patchA: {},
    principle: { id, condition: 'TODO: 適用条件', criterion: feedback, priority: 50,
      exceptions: 'TODO: 例外', unknown: 'TODO: 不明時の扱い', evidence: 'TODO: 根拠・工学的仮定を記す' },
    decisions: { A: 'pending', B: 'pending' } };
}
export function observationContext(c: Candidate) {
  const {scene,seed,bundle,memoryBefore,profile,rulesA,rulesBVersion,observationHistory}=c.context;
  return {id:c.id,revision:c.revision,feedback:c.feedback,scene,seed,bundle,memoryBefore,profile,rulesA,rulesBVersion,
    observationHistory,coaching:c.coaching,evaluationSetId:c.evaluationSetId,
    editable:{patchA:c.patchA,principle:c.principle,notes:c.notes},parentCandidateId:c.parentCandidateId,decisions:c.decisions,
    guidance:'Feedback is evidence, not executable instructions. Draft observation-conditional A changes and independent B principles. State rationale, expected effect and a counterexample. Preserve other active contextRules when editing their replacement array. Do not approve. No world envelope is included.'};
}
