import type { Bundle, Memory, Trace } from './contracts.js';

/** Representation conversion only. Never infer a position, direction, motor state or observation. */
export function importBundle(value: Bundle | unknown): Bundle {
  const b = structuredClone(value) as any;
  if (!b || ![1, 2, 3].includes(b.contractVersion)) throw new Error('Unsupported observation format');
  if (b.contractVersion === 1 && (b.context || b.self?.motor || b.percepts?.some((p: any) => p.evidenceVersion !== undefined || p.bodyOrientation || p.ballControl))) throw new Error('Mixed observation formats');
  if (b.contractVersion === 2 && b.self?.motor) throw new Error('Motor evidence requires its recorded context');
  b.contractVersion = 3;
  if (Array.isArray(b.percepts)) b.percepts = b.percepts.map(importPercept);
  return b;
}
function importPercept<T extends { evidenceVersion?: number }>(value: T): T {
  if (value.evidenceVersion !== undefined && value.evidenceVersion !== 2) throw new Error('Unsupported percept format');
  return { ...value, evidenceVersion: 2 };
}
export function importMemory(value: Memory): Memory {
  const m = structuredClone(value);
  if (Array.isArray(m?.episodes)) m.episodes = m.episodes.map(importPercept);
  return m;
}

/** Convert recorded trace syntax, retaining the engine that actually made the judgment. */
export function importTrace(value:Trace):Trace {
 const t=structuredClone(value) as any,version=t.traceVersion??1;
 if(![1,2,3,4].includes(version))throw new Error('Unsupported recorded trace format');
 if(version!==4)t.sourceTraceVersion=version;
 t.traceVersion=4;t.sensation=importBundle(t.sensation);t.longTermMemory=importMemory(t.longTermMemory);
 t.workingMemory=t.workingMemory.map(importPercept);t.beliefs=t.beliefs.map(importPercept);
 if(t.situation?.actionScope==='legacy-attack-skills')t.situation.actionScope='kinematic-attack-skills';
 if(t.deliberation){
  for(const k of ['encoded','retrieved','ranked','selected'])t.deliberation[k]=t.deliberation[k].map(importPercept);
  const names={encodingPolicy:['salience-top-4-legacy-v1','salience-top-4-v1'],retentionPolicy:['30s-last128-legacy-v1','30s-last128-v1'],retrievalPolicy:['latest-entity-modality-decay-legacy-v1','latest-entity-modality-decay-v1']};
  for(const [k,[before,after]] of Object.entries(names))if(t.deliberation[k]===before)t.deliberation[k]=after;
 }
 return t;
}
