import type { Bundle, Memory, ObservationEvent, ObservationHistory, Profile, RulesA, Snapshot } from './contracts';
import { think } from './cognition';
import { validate, validateEvidence, canonicalJson } from './validation';
export const HISTORY_LIMIT=256;
export const newHistory=(initialMemory:Memory):ObservationHistory=>({version:1,mode:'static-study',initialMemory:structuredClone(initialMemory),events:[]});
export function appendObservation(history:ObservationHistory,bundle:Bundle,profile:Profile,rulesA:RulesA,trigger:ObservationEvent['trigger']){
  if(history.events.length>=HISTORY_LIMIT)throw new Error('観測履歴は256件まで。snapshotを保存してresetしてください。履歴は切り捨てません。');
  history.events.push({sequence:history.events.length,trigger,bundle:structuredClone(bundle),profile:structuredClone(profile),rulesA:structuredClone(rulesA)});
}
export function replayObservationHistory(history:ObservationHistory,override?:{profile:Profile;rulesA:RulesA}){
  validate('ObservationHistory',history);
  let memory=structuredClone(history.initialMemory),memoryBeforeLast=memory;
  const frames=history.events.map((e,i)=>{
    if(e.sequence!==i)throw new Error('Observation sequence is not contiguous');
    if(i===0&&e.trigger!=='initial')throw new Error('Observation history must start with an initial acquisition');
    const previous=history.events[i-1];
    if(previous){
      const expected=e.trigger==='step'?Math.round((previous.bundle.time+.2)*1000)/1000:previous.bundle.time;
      if(e.bundle.time!==expected)throw new Error('Static-study event clock mismatch: only step advances simulation time by 0.2s');
      if(e.bundle.playerId!==previous.bundle.playerId)throw new Error('Observation player changed');
    }
    validateEvidence(e.bundle,memory);memoryBeforeLast=structuredClone(memory);
    const trace=think(e.bundle,memory,override?.profile??e.profile,override?.rulesA??e.rulesA);memory=trace.longTermMemory;
    return {sequence:e.sequence,trigger:e.trigger,time:e.bundle.time,trace};
  });
  return {mode:history.mode,frames,memoryBeforeLast,finalTrace:frames.at(-1)!.trace,
    timing:'Manual head/body turns share simulation time; sequence orders acquisition. No wall-clock reaction-time claim.'};
}
export function assertSnapshotHistory(snapshot:Snapshot){
  if(!snapshot.observationHistory)return;
  const history=snapshot.observationHistory,last=history.events.at(-1)!;
  const replay=replayObservationHistory(history);
  // Snapshot.rulesA can be an explicitly rebased candidate; events retain the actually recorded rule configuration.
  for(const [actual,expected] of [[last.bundle,snapshot.bundle],[last.profile,snapshot.profile],[replay.memoryBeforeLast,snapshot.memoryBefore]])
    if(canonicalJson(actual)!==canonicalJson(expected))throw new Error('Snapshot does not match the recorded observation history');
}
