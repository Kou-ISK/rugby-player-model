import { assertDynamicWorld } from './scene';
import Ajv from 'ajv';
import schema from '../schemas/contracts.schema.json';
import type { Bundle, Snapshot, Memory } from './contracts';
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(schema);
export function canonicalJson(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonicalJson(v)).join(',')+'}';
  return JSON.stringify(value);
}
export function validate<T>(kind: keyof typeof schema.$defs, value: unknown): asserts value is T {
  const check = ajv.getSchema(`${schema.$id}#/$defs/${kind}`)!;
  if (!check(value)) throw new Error(`${kind}: ${ajv.errorsText(check.errors)}`);
  if (kind === 'RulesA' || kind === 'PatchA') {
    const rules = (value as { contextRules?: { id: string }[] }).contextRules ?? [];
    if (new Set(rules.map(r => r.id)).size !== rules.length) throw new Error('Duplicate context rule id');
  }
}
export function validateEvidence(bundle: Bundle, memory: Memory): void {
  validate('Bundle', bundle); validate('Memory', memory);
  if (memory.lastTime > bundle.time) throw new Error('Memory is from the future');
  for (const p of [...bundle.percepts, ...memory.episodes]) {
    if (p.observedAt > bundle.time) throw new Error('Future evidence');
  }
  for (const p of memory.episodes) if (p.observedAt > memory.lastTime) throw new Error('Evidence is newer than its memory record');
  if (new Set(bundle.percepts.map(p => p.id)).size !== bundle.percepts.length) throw new Error('Duplicate percept');
}
export function validateSnapshot(value: unknown): asserts value is Snapshot {
  validate<Snapshot>('Snapshot', value);
  validateEvidence(value.bundle, value.memoryBefore);
  if((value.contractVersion===2)!==!!value.world.dynamic || (value.scene==='dynamic')!==!!value.world.dynamic)throw new Error('Snapshot scene/contract mismatch');
  if(!value.world.dynamic&&value.seed===null)throw new Error('Static snapshots require a uint32 seed');
  assertDynamicWorld(value.world);
  if (value.world.time !== value.bundle.time || value.world.seed !== value.seed || value.world.scene !== value.scene || value.world.playerId !== value.bundle.playerId) throw new Error('Snapshot context mismatch');
}
