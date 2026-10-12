import { sceneContent } from '../src/scene';
import { createHash, randomUUID } from 'node:crypto';
import type { Bundle, Memory, Profile, Snapshot } from '../src/contracts';
import type { experimentRun } from '../src/research';
import { validateSnapshot, canonicalJson as canonical } from '../src/validation';
import { sense } from '../src/simulation';
import { assertSnapshotHistory } from '../src/observation-history';

export { canonical };
export const digest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
// Changing a label, seed, rules, or hidden world alone does not make known evidence new.
export function conditionDigest(s:Pick<Snapshot,'bundle'|'memoryBefore'|'profile'>){
  if(s.bundle.playerId!=='observer-0')return digest({bundle:s.bundle,memoryBefore:s.memoryBefore,profile:s.profile});
  // Session-specific tracking UUIDs are not fresh evidence. Normalize by acquired evidence order.
  const value=structuredClone({bundle:s.bundle,memoryBefore:s.memoryBefore,profile:s.profile});
  const aliases=new Map<string,string>(),observations=new Map<string,string>();
  for(const p of [...value.memoryBefore.episodes,...value.bundle.percepts]){
    if(!aliases.has(p.entityId))aliases.set(p.entityId,`entity-${aliases.size}`);
    if(!observations.has(p.id))observations.set(p.id,`observation-${observations.size}`);
    p.entityId=aliases.get(p.entityId)!;p.id=observations.get(p.id)!;
  }
  return digest(value);
}
export const stimulusDigest=(s:Snapshot)=>s.world.dynamic?digest({scene:sceneContent(s.world.dynamic.scene.definition),fromTick:s.world.dynamic.tick,toTick:s.world.dynamic.scene.definition.durationTicks,profile:s.profile}):null;
export type ExposureEvidence=Pick<Snapshot,'bundle'|'memoryBefore'|'profile'> & Partial<Pick<Snapshot,'world'|'observationHistory'>> & {observations?:Bundle[]};
export const EXPOSURE_POLICY='dynamic-lineage-and-acquired-observations-v1' as const;
export type ExposureReason='same-input'|'same-scene-lineage'|'same-dynamic-stimulus'|'shared-acquired-observation';
export const stimulusFamilyDigest=(s:ExposureEvidence)=>s.world?.dynamic?digest(sceneContent(s.world.dynamic.scene.definition)):null;
function acquiredEvidence(s:ExposureEvidence){
  // IDs and percept order are transport details, not independent evidence of novelty.
  const bundles=s.observationHistory?.events.map(e=>e.bundle)??s.observations??[s.bundle];
  return new Set(bundles.map(({playerId,percepts,...bundle})=>digest({...bundle,percepts:percepts.map(({id,entityId,...p})=>p).sort((a,b)=>canonical(a).localeCompare(canonical(b)))})));
}
export function exposureReasons(a:ExposureEvidence,b:ExposureEvidence):ExposureReason[]{
  const reasons:ExposureReason[]=[];
  if(conditionDigest(a)===conditionDigest(b))reasons.push('same-input');
  if(a.bundle.playerId!=='observer-0'||b.bundle.playerId!=='observer-0')return reasons;
  const left=a.world?.dynamic?.scene,right=b.world?.dynamic?.scene;
  if(left&&right&&left.sceneId===right.sceneId)reasons.push('same-scene-lineage');
  const family=stimulusFamilyDigest(a);
  if(family&&family===stimulusFamilyDigest(b))reasons.push('same-dynamic-stimulus');
  const acquired=acquiredEvidence(a);
  if([...acquiredEvidence(b)].some(key=>acquired.has(key)))reasons.push('shared-acquired-observation');
  return reasons;
}
export type EvaluationDraft={criteria:string;noveltyAttestation:'not-used-for-coaching';cases:{label:string;snapshot:Snapshot}[]};
export type FrozenEvaluation={id:string;at:string;frozenAtRevision:number;digest:string;profile:Profile;draft:EvaluationDraft;
  novelty:'owner-declared-not-independently-verified';stimuli?:{stimulusDigest:string|null;observationDigest:string}[]};
export function checkEvaluationDraft(value:unknown):asserts value is EvaluationDraft {
  const d=value as EvaluationDraft;
  if(!d||typeof d!=='object'||Object.keys(d).some(k=>!['criteria','noveltyAttestation','cases'].includes(k))||typeof d.criteria!=='string'||!d.criteria.trim()||d.criteria.length>4000||d.noveltyAttestation!=='not-used-for-coaching'||!Array.isArray(d.cases)||d.cases.length<1||d.cases.length>12)throw new Error('Evaluation requires criteria, not-used-for-coaching attestation and 1–12 cases');
  for(const c of d.cases){
    if(!c||Object.keys(c).some(k=>!['label','snapshot'].includes(k))||typeof c.label!=='string'||!c.label.trim()||c.label.length>400)throw new Error('Evaluation case requires an evaluator-only label and snapshot');
    validateSnapshot(c.snapshot);
    assertSnapshotHistory(c.snapshot);
    if(canonical(sense(c.snapshot.world))!==canonical(c.snapshot.bundle))throw new Error('Evaluation snapshot does not match sensor adapter');
    if(canonical(c.snapshot.profile)!==canonical(d.cases[0].snapshot.profile))throw new Error('Freeze one identical player profile across all evaluation cases');
  }
  if(new Set(d.cases.map(c=>conditionDigest(c.snapshot))).size!==d.cases.length)throw new Error('Duplicate evaluation observations');
}
export type CaseGroup='regression'|'frozen';
export type BArm='none'|'before'|'after';
export type AnonymousCase={id:string;bundle:Bundle;memoryBefore:Memory;profile:Profile;observations?:Bundle[];initialMemory?:Memory};
export type BCaseMap={id:string;group:'recorded'|CaseGroup;caseId:string;scene:string;seed:number|null;entityAliases:Record<string,string>};
export function anonymizeCases(cases:ReturnType<typeof experimentRun>['observationCases']){
  const modelCases:AnonymousCase[]=[],evaluatorMap:BCaseMap[]=[];
  for(const c of cases){
    const id=randomUUID(),aliases:Record<string,string>=Object.create(null),observations:Record<string,string>=Object.create(null);
    const entity=(original:string)=>aliases[original]??=(original===c.bundle.playerId?'observer':`entity-${Object.keys(aliases).length+1}`);
    const observation=(original:string)=>observations[original]??=`observation-${Object.keys(observations).length+1}`;
    const bundle=structuredClone(c.bundle),memoryBefore=structuredClone(c.memoryBefore);
    bundle.playerId=entity(bundle.playerId);
    for(const p of [...bundle.percepts,...memoryBefore.episodes]){p.entityId=entity(p.entityId);p.id=observation(p.id);}
    const timeline=c.observations?structuredClone(c.observations):undefined;
    const initialMemory=c.initialMemory?structuredClone(c.initialMemory):undefined;
    for(const b of timeline??[]){b.playerId=entity(b.playerId);for(const p of b.percepts){p.entityId=entity(p.entityId);p.id=observation(p.id);}}
    for(const p of initialMemory?.episodes??[]){p.entityId=entity(p.entityId);p.id=observation(p.id);}
    modelCases.push({id,bundle,memoryBefore,profile:structuredClone(c.profile),...(timeline?{observations:timeline,initialMemory}:{})});
    evaluatorMap.push({id,group:c.group,caseId:c.caseId,scene:c.scene,seed:c.seed,entityAliases:{...aliases}});
  }
  // Stable across arms, shuffled relative to the publicly known regression order.
  modelCases.sort((a,b)=>a.id.localeCompare(b.id));
  return {modelCases,evaluatorMap};
}
