import { importSnapshot, importCoachingWindow } from './import';
import { baselineMode, type ExecutionMode } from '../../../models/player/reference/src/execution-mode.js';
import { canonicalJson, validate, validateSnapshot } from './validation';
import { sceneWorld, sceneDiagnostics, updateSceneFrame, sceneRef } from '../../simulation/src/scene';
import type { CoachingWindow, Snapshot } from './contracts';
import type { RulesA, Profile } from '../../../models/player/reference/src/contracts.js';
import { thinkWithMode } from '../../../models/player/reference/src/cognition.js';
import { sense } from '../../simulation/src/sensing';
import { advance } from '../../simulation/src/body';
import { replayObservationHistory, assertSnapshotHistory } from './history';
import type { ExperimentResults, ReplayResult } from './records';
export type RegressionCase = {id:string;seed:number;strata:string[];snapshot:Snapshot};
export function compare(snapshot: Snapshot, after: RulesA,afterMode:ExecutionMode=snapshot.executionMode??baselineMode()) {
  const run = (rules: RulesA,mode:ExecutionMode) => thinkWithMode(snapshot.bundle, snapshot.memoryBefore, snapshot.profile, rules,mode);
  return { scene: snapshot.scene, seed: snapshot.seed, time: snapshot.bundle.time, playerId: snapshot.bundle.playerId,
    before: run(snapshot.rulesA,snapshot.executionMode??baselineMode()), after: run(after,afterMode), sameConditions: true,comparisonKind:'fixed-observation' as const };
}
// Published fixed cases are regression probes, never a fresh holdout claim.
export function regressionCompare(before: RulesA, after: RulesA, profile: Profile, cases: RegressionCase[],beforeMode:ExecutionMode=baselineMode(),afterMode:ExecutionMode=baselineMode()) {
  return cases.map(c => ({ caseId: c.id, strata: c.strata, profile:structuredClone(profile), ...compare({...c.snapshot,executionMode:beforeMode}, after,afterMode) }));
}
export function coachingReplayInput(snapshot:Snapshot,window?:CoachingWindow){
  window=importCoachingWindow(window,snapshot);snapshot=importSnapshot(snapshot);
  if(!window)return {snapshot:structuredClone(snapshot),source:'captured-snapshot' as const,sourceSequence:null,window:null};
  validate('CoachingWindow',window);validateSnapshot(snapshot);assertSnapshotHistory(snapshot);
  const d=snapshot.world.dynamic;
  if(!d||canonicalJson(sceneRef(d.scene))!==canonicalJson(sceneRef(window))||window.playerId!==snapshot.bundle.playerId||window.toTick!==d.tick||window.fromTick>window.toTick)throw new Error('Coaching replay window does not match the captured scene/player/interval');
  const history=snapshot.observationHistory;
  if(!history){
    if(window.fromTick!==d.tick)throw new Error('Cannot rewind without an acquired observation prefix');
    return {snapshot:structuredClone(snapshot),source:'captured-snapshot' as const,sourceSequence:null,window:structuredClone(window)};
  }
  if(history.events[0].bundle.time!==0&&!snapshot.observationAnchor)throw new Error('Cannot reconstruct an earlier call/body state without a history starting at tick 0 or a saved continuation anchor');
  if(snapshot.observationAnchor&&(canonicalJson(snapshot.observationAnchor.dynamic?.scene)!==canonicalJson(d.scene)||canonicalJson(sense(snapshot.observationAnchor))!==canonicalJson(history.events[0].bundle)))throw new Error('Observation continuation anchor mismatch');
  // First acquisition at fromTick: later head turns at that tick and later memory are excluded.
  const start=history.events.findIndex(e=>e.bundle.time===Math.round(window.fromTick*.2*1000)/1000);
  if(start<0)throw new Error('Coaching start tick was not acquired');
  const prefix={...structuredClone(history),events:structuredClone(history.events.slice(0,start+1))};
  const observed=replayObservationHistory(prefix);
  let world=snapshot.observationAnchor?structuredClone(snapshot.observationAnchor):sceneWorld(d.scene);
  for(let i=0;i<=start;i++){
    const event=prefix.events[i];
    // Only recorded step events applied the preceding A output, including call rate limiting.
    if(i&&event.trigger==='step')world=advance(world,observed.frames[i-1].trace);
    world.body=structuredClone(event.bundle.self);world.time=event.bundle.time;world.dynamic!.tick=Math.round(event.bundle.time/.2);if(world.runtime)world.runtime.actors.find(a=>a.id===world.dynamic!.scene.definition.controlledPlayerId)!.body=structuredClone(world.body);updateSceneFrame(world);
  }
  const bundle=structuredClone(prefix.events[start].bundle);
  if(canonicalJson(sense(world))!==canonicalJson(bundle))throw new Error('Acquired start frame cannot be reconstructed from its frozen scene');
  const initial:Snapshot={contractVersion:2,scene:'dynamic',seed:snapshot.seed,world,bundle,memoryBefore:structuredClone(observed.memoryBeforeLast),profile:structuredClone(snapshot.profile),rulesA:structuredClone(snapshot.rulesA),rulesBVersion:snapshot.rulesBVersion,...(snapshot.executionMode?{executionMode:structuredClone(snapshot.executionMode)}:{})};
  validateSnapshot(initial);
  return {snapshot:initial,source:'coaching-window-first-acquisition' as const,sourceSequence:start,window:structuredClone(window)};
}
export function replay(snapshot: Snapshot, rules: RulesA, steps: number, endTick?:number,mode:ExecutionMode=snapshot.executionMode??baselineMode()):ReplayResult {
  snapshot=importSnapshot(snapshot);
  const limit=snapshot.world.runtime?201:20;
  if (!Number.isInteger(steps) || steps < 1 || steps > limit) throw new Error(`steps must be 1–${limit}`);
  if(endTick!==undefined&&(!snapshot.world.dynamic||!Number.isInteger(endTick)||endTick<snapshot.world.dynamic.tick||endTick>snapshot.world.dynamic.scene.definition.durationTicks))throw new Error('Replay end tick is outside the captured scene interval');
  let world = structuredClone(snapshot.world), memory = structuredClone(snapshot.memoryBefore);
  const frames = [];
  for (let i = 0; i < steps; i++) {
    const trace = thinkWithMode(sense(world), memory, snapshot.profile, rules,mode);
    frames.push({ ...(world.runtime?{runtime:structuredClone(world.runtime)}:{}),time: world.time, body:structuredClone(world.body), diagnostics:sceneDiagnostics(world), trace });memory = trace.longTermMemory;
    if(world.dynamic&&world.dynamic.tick>=(endTick??world.dynamic.scene.definition.durationTicks))break;
    world = advance(world, trace);
  }
  return { frames, termination:world.dynamic&&world.dynamic.tick>=world.dynamic.scene.definition.durationTicks?'scene-end':endTick!==undefined&&world.dynamic!.tick>=endTick?'coaching-window-end':'step-budget', finalTime:world.time, finalTick:world.dynamic?.tick??null, finalSelf: world.body, emittedCalls: world.emittedCalls ?? [] };
}
export function experimentRun(snapshot: Snapshot, after: RulesA, steps: number, frozen: {id:string;snapshot:Snapshot}[], window:CoachingWindow|undefined, cases:RegressionCase[],afterMode:ExecutionMode=snapshot.executionMode??baselineMode()):ExperimentResults {
  window=importCoachingWindow(window,snapshot);snapshot=importSnapshot(snapshot);
  const limit=snapshot.world.runtime?201:20;if(!Number.isInteger(steps)||steps<1||steps>limit)throw new Error(`steps must be 1–${limit}`);
  const pair = (s: Snapshot,endTick?:number) => ({ comparisonKind:'same-scene-closed-loop' as const,sameInitialConditions: true, before: replay(s, s.rulesA, s.world.runtime?steps:Math.min(20,steps),endTick), after: replay(s, after, s.world.runtime?steps:Math.min(20,steps),endTick,afterMode) });
  const recordedInput=coachingReplayInput(snapshot,window);
  const frozenCases=frozen.map(c=>({...c,snapshot:importSnapshot({...c.snapshot,profile:structuredClone(snapshot.profile),rulesA:structuredClone(snapshot.rulesA),...(snapshot.executionMode?{executionMode:snapshot.executionMode}:{})})}));
  cases=cases.map(c=>({...c,snapshot:importSnapshot(c.snapshot)}));
  const trials = cases.map(c => ({ caseId: c.id, seed: c.seed, strata: c.strata, ...pair({...c.snapshot,executionMode:snapshot.executionMode}) }));
  const frozenTrials=frozenCases.map(c=>({caseId:c.id,...pair(c.snapshot)}));
  const actions = [...new Set(trials.map(t => t.after.frames[0].trace.intention.action))];
  return { steps, dt: .2, profilePolicy:'candidate-profile-fixed' as const, regressionKind:'published-fixed-regression' as const, recordedInput, recorded: pair(recordedInput.snapshot,window?.toTick), trials, frozenTrials,
    observedHistory:snapshot.observationHistory?{before:replayObservationHistory(snapshot.observationHistory,{profile:snapshot.profile,rulesA:snapshot.rulesA,executionMode:snapshot.executionMode??baselineMode()}),after:replayObservationHistory(snapshot.observationHistory,{profile:snapshot.profile,rulesA:after,executionMode:afterMode})}:null,
    diagnostic: { distinctFirstActions: actions, homogeneousWarning: actions.length < 2,
      interpretation: 'Synthetic counterexamples, not human validity or an automatic adoption decision. Future observations can diverge after actions.' },
    observationCases: [{ group:'recorded' as const,caseId: 'recorded', snapshot }, ...cases.map(c => ({group:'regression' as const, caseId: c.id, snapshot: c.snapshot })),...frozenCases.map(c=>({group:'frozen' as const,caseId:c.id,snapshot:c.snapshot}))].map(({group,caseId,snapshot:s}) =>
      ({ group,caseId, scene: s.scene, seed: s.seed, bundle: s.bundle, memoryBefore: s.memoryBefore, profile: s.profile, ...(s.observationHistory?{initialMemory:structuredClone(s.observationHistory.initialMemory),observations:s.observationHistory.events.map(e=>structuredClone(e.bundle))}:{}) })) };
}
