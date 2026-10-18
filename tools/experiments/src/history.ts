import { importHistory, importSnapshot } from './import';
import type { ExecutionMode } from '../../../models/player/reference/src/execution-mode.js';
import { replayObservationSequence } from '../../../models/player/reference/src/replay.js';
import { sceneRef } from '../../simulation/src/scene';
import type { Bundle, Memory, ObservationEvent, Profile, RulesA } from '../../../models/player/reference/src/contracts.js';
import type { ObservationHistory, Snapshot } from './contracts';
import type { World } from '../../simulation/src/contracts';
import { think } from '../../../models/player/reference/src/cognition';
import { validate, validateEvidence, canonicalJson } from './validation';
export const HISTORY_LIMIT=256;
export const HISTORY_ARCHIVE_AT=224;
/** Preserve every acquired event. The saved prefix and continuation share their boundary event. */
export function continueObservationHistory(history:ObservationHistory,source:Snapshot):ObservationHistory {
  history=importHistory(history);source=importSnapshot(source);
  const prefix=source.observationHistory;
  if(!prefix?.events.length||canonicalJson(history.events.slice(0,prefix.events.length))!==canonicalJson(prefix.events))throw new Error('Observation history no longer matches the saved prefix');
  return {...structuredClone(history),initialMemory:structuredClone(source.memoryBefore),
    events:history.events.slice(prefix.events.length-1).map((e,sequence)=>({...structuredClone(e),sequence,...(sequence===0?{trigger:'initial' as const}:{})}))};
}
export const newHistory=(initialMemory:Memory,world?:World):ObservationHistory=>({version:2,mode:world?.dynamic?'fixed-step-study':'static-study',...(world?.dynamic?{sceneRef:sceneRef(world.dynamic.scene)}:{}),initialMemory:structuredClone(initialMemory),events:[]});
export function appendObservation(history:ObservationHistory,bundle:Bundle,profile:Profile,rulesA:RulesA,trigger:ObservationEvent['trigger'],executionMode?:ExecutionMode){
  if(history.events.length>=HISTORY_LIMIT)throw new Error('観測履歴は256件まで。snapshotを保存してresetしてください。履歴は切り捨てません。');
  history.events.push({sequence:history.events.length,trigger,bundle:structuredClone(bundle),profile:structuredClone(profile),rulesA:structuredClone(rulesA),...(executionMode?{executionMode:structuredClone(executionMode)}:{})});
}
export function replayObservationHistory(history:ObservationHistory,override?:{profile:Profile;rulesA:RulesA;executionMode?:ExecutionMode}){
  history=importHistory(history);validate('ObservationHistory',history);
  if((history.mode==='fixed-step-study')!==!!history.sceneRef)throw new Error('Observation history version/mode/ref mismatch');
  return {mode:history.mode,...replayObservationSequence({initialMemory:history.initialMemory,events:history.events},override)};
}
export function assertSnapshotHistory(snapshot:Snapshot){
  snapshot=importSnapshot(snapshot);
  if(!snapshot.observationHistory)return;
  const d=snapshot.world.dynamic;
  if((!!d)!==(snapshot.observationHistory.mode==='fixed-step-study')||(d&&canonicalJson(snapshot.observationHistory.sceneRef)!==canonicalJson(sceneRef(d.scene))))throw new Error('Snapshot/history scene revision mismatch');
  const history=snapshot.observationHistory,last=history.events.at(-1)!;
  const replay=replayObservationHistory(history);
  // Snapshot.rulesA can be an explicitly rebased candidate; events retain the actually recorded rule configuration.
  for(const [actual,expected] of [[last.bundle,snapshot.bundle],[last.profile,snapshot.profile],[replay.memoryBeforeLast,snapshot.memoryBefore]])
    if(canonicalJson(actual)!==canonicalJson(expected))throw new Error('Snapshot does not match the recorded observation history');
}
