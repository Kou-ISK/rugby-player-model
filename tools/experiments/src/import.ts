import { importBundle, importMemory, importExecutionMode, importTrace } from '../../../models/player/reference/src/index.js';
import { importSceneRevision, sceneRef } from '../../simulation/src/scene';
import type { World } from '../../simulation/src/contracts';
import type { Candidate, CoachingWindow, ObservationHistory, Snapshot } from './contracts';

/** Copies at the archive boundary; source records, approvals and hashes stay untouched. */
export function importWorld(value:World):World {
 const w=structuredClone(value);
 if(w.dynamic)w.dynamic.scene=importSceneRevision(w.dynamic.scene);
 if(w.runtime){for(const a of w.runtime.actors)a.memory=importMemory(a.memory);
  w.runtime.decisions=w.runtime.decisions.map(d=>({...d,trace:importTrace(d.trace)}));
 }
 return w;
}
export function importHistory(value:ObservationHistory):ObservationHistory {
 const h=structuredClone(value);
 if(![1,2].includes(h.version))throw new Error('Unsupported observation history format');
 if(Number(h.version)===1&&(h.mode!=='static-study'||h.sceneRef))throw new Error('Mixed history formats');
 h.version=2;h.initialMemory=importMemory(h.initialMemory);
 h.events=h.events.map(e=>({...e,bundle:importBundle(e.bundle),...(e.executionMode?{executionMode:importExecutionMode(e.executionMode)}:{})}));
 return h;
}
export function importSnapshot(value:Snapshot):Snapshot {
 const s=structuredClone(value);
 if(![1,2].includes(s.contractVersion))throw new Error('Unsupported snapshot format');
 if(Number(s.contractVersion)===1&&s.world.dynamic)throw new Error('Mixed snapshot formats');
 s.contractVersion=2;s.bundle=importBundle(s.bundle);s.memoryBefore=importMemory(s.memoryBefore);
 if(s.executionMode)s.executionMode=importExecutionMode(s.executionMode);
 const source=s.world.dynamic?.scene;
 s.world=importWorld(s.world);
 if(s.observationAnchor)s.observationAnchor=importWorld(s.observationAnchor);
 if(s.observationHistory){
  s.observationHistory=importHistory(s.observationHistory);
  const ref=s.observationHistory.sceneRef;
  if(source&&ref?.sceneId===source.sceneId&&ref.revision===source.revision&&ref.contentHash===source.contentHash)s.observationHistory.sceneRef=sceneRef(s.world.dynamic!.scene);
 }
 return s;
}

/** Translate only an exactly bound reference; mismatches must still fail validation. */
export function importCoachingWindow(window:CoachingWindow|undefined,source:Snapshot):CoachingWindow|undefined {
 if(!window)return undefined;
 const w=structuredClone(window),scene=source.world.dynamic?.scene;
 if(scene&&w.sceneId===scene.sceneId&&w.revision===scene.revision&&w.contentHash===scene.contentHash)Object.assign(w,sceneRef(importSceneRevision(scene)));
 return w;
}
export function importCandidate(value:Candidate):Candidate {
 return {...structuredClone(value),context:importSnapshot(value.context),
  ...(value.coaching?{coaching:importCoachingWindow(value.coaching,value.context)}:{}),
  ...(value.executionMode?{executionMode:importExecutionMode(value.executionMode)}:{})};
}
