import { replayObservationSequence } from '../models/player/reference/src/replay.js';
import { sceneRef } from './scene';
import type { Bundle, Memory, ObservationEvent, ObservationHistory, Profile, RulesA, Snapshot, World } from './contracts';
import { think } from './cognition';
import { validate, validateEvidence, canonicalJson } from './validation';
export const HISTORY_LIMIT=256;
export const newHistory=(initialMemory:Memory,world?:World):ObservationHistory=>({version:world?.dynamic?2:1,mode:world?.dynamic?'fixed-step-study':'static-study',...(world?.dynamic?{sceneRef:sceneRef(world.dynamic.scene)}:{}),initialMemory:structuredClone(initialMemory),events:[]});
export function appendObservation(history:ObservationHistory,bundle:Bundle,profile:Profile,rulesA:RulesA,trigger:ObservationEvent['trigger']){
  if(history.events.length>=HISTORY_LIMIT)throw new Error('観測履歴は256件まで。snapshotを保存してresetしてください。履歴は切り捨てません。');
  history.events.push({sequence:history.events.length,trigger,bundle:structuredClone(bundle),profile:structuredClone(profile),rulesA:structuredClone(rulesA)});
}
export function replayObservationHistory(history:ObservationHistory,override?:{profile:Profile;rulesA:RulesA}){
  validate('ObservationHistory',history);
  if((history.version===2)!==(history.mode==='fixed-step-study')||(history.version===2)!==!!history.sceneRef)throw new Error('Observation history version/mode/ref mismatch');
  return {mode:history.mode,...replayObservationSequence({initialMemory:history.initialMemory,events:history.events},override)};
}
export function assertSnapshotHistory(snapshot:Snapshot){
  if(!snapshot.observationHistory)return;
  const d=snapshot.world.dynamic;
  if((!!d)!==(snapshot.observationHistory.version===2)||(d&&canonicalJson(snapshot.observationHistory.sceneRef)!==canonicalJson(sceneRef(d.scene))))throw new Error('Snapshot/history scene revision mismatch');
  const history=snapshot.observationHistory,last=history.events.at(-1)!;
  const replay=replayObservationHistory(history);
  // Snapshot.rulesA can be an explicitly rebased candidate; events retain the actually recorded rule configuration.
  for(const [actual,expected] of [[last.bundle,snapshot.bundle],[last.profile,snapshot.profile],[replay.memoryBeforeLast,snapshot.memoryBefore]])
    if(canonicalJson(actual)!==canonicalJson(expected))throw new Error('Snapshot does not match the recorded observation history');
}
