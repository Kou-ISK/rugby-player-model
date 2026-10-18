import Ajv from 'ajv';
import schema from '../../spec/contracts.schema.json' with { type: 'json' };
import type { Bundle, Memory } from './contracts.js';
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(schema);
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
  if((memory.intent||bundle.self.motor)&&(!bundle.self.motor||!bundle.context))throw new Error('Motor cognition requires motor evidence and known direction');
  if(bundle.self.motor&&bundle.self.motor.result.at>bundle.time)throw new Error('Motor result is from the future');
  if(memory.intent&&(memory.intent.startedAt>bundle.time||memory.intent.reviewAt<memory.intent.startedAt))throw new Error('Intention is from the future');
  if (memory.lastTime > bundle.time) throw new Error('Memory is from the future');
  for (const p of [...bundle.percepts, ...memory.episodes]) {
    if (p.observedAt > bundle.time) throw new Error('Future evidence');
    if((p.bodyOrientation?.confidence??0)>p.confidence||(p.ballControl?.confidence??0)>p.confidence)throw new Error('Feature confidence cannot exceed its source observation');
  }
  for (const p of memory.episodes) if (p.observedAt > memory.lastTime) throw new Error('Evidence is newer than its memory record');
  if (new Set(bundle.percepts.map(p => p.id)).size !== bundle.percepts.length) throw new Error('Duplicate percept');
}
