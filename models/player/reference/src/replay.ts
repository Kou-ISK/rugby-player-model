import type { ObservationSequence, Profile, RulesA } from './contracts.js';
import { think } from './cognition.js';
import { validate, validateEvidence } from './validation.js';
export function replayObservationSequence(history:ObservationSequence,override?:{profile:Profile;rulesA:RulesA}){
  validate('ObservationSequence',history);
  let memory=structuredClone(history.initialMemory),memoryBeforeLast=memory;
  const frames=history.events.map((e,i)=>{
    if(e.sequence!==i)throw new Error('Observation sequence is not contiguous');
    if(i===0&&e.trigger!=='initial')throw new Error('Observation history must start with an initial acquisition');
    const previous=history.events[i-1];
    if(previous){
      const expected=e.trigger==='step'?Math.round((previous.bundle.time+.2)*1000)/1000:previous.bundle.time;
      if(e.bundle.time!==expected)throw new Error('Observation event clock mismatch: only step advances simulation time by 0.2s');
      if(e.bundle.playerId!==previous.bundle.playerId)throw new Error('Observation player changed');
    }
    validateEvidence(e.bundle,memory);memoryBeforeLast=structuredClone(memory);
    const trace=think(e.bundle,memory,override?.profile??e.profile,override?.rulesA??e.rulesA);memory=trace.longTermMemory;
    return {sequence:e.sequence,trigger:e.trigger,time:e.bundle.time,trace};
  });
  return {frames,memoryBeforeLast,finalTrace:frames.at(-1)!.trace,
    timing:'Manual head/body turns share simulation time; sequence orders acquisition. No wall-clock reaction-time claim.'};
}
