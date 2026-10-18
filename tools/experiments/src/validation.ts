import { validateEvidence } from '../../../models/player/reference/src/validation.js';
import playerSchema from '../../../models/player/spec/contracts.schema.json';
import simulationSchema from '../../simulation/schema/scene.schema.json';
import recordsSchema from '../schema/records.schema.json';
import { horizontalFov } from '../../simulation/src/world';
import { assertDynamicWorld } from '../../simulation/src/scene';
import Ajv from 'ajv';
import schema from '../../../schemas/contracts.schema.json';
import type { Bundle, Memory } from '../../../models/player/reference/src/contracts.js';
import type { Snapshot } from './contracts';
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(playerSchema); ajv.addSchema(simulationSchema); ajv.addSchema(recordsSchema); ajv.addSchema(schema);
export { canonicalJson } from './canonical';
export function validate<T>(kind: keyof typeof schema.$defs, value: unknown): asserts value is T {
  const check = ajv.getSchema(`${schema.$id}#/$defs/${kind}`)!;
  if (!check(value)) throw new Error(`${kind}: ${ajv.errorsText(check.errors)}`);
  if (kind === 'RulesA' || kind === 'PatchA') {
    const rules = (value as { contextRules?: { id: string }[] }).contextRules ?? [];
    if (new Set(rules.map(r => r.id)).size !== rules.length) throw new Error('Duplicate context rule id');
  }
}
export { validateEvidence } from '../../../models/player/reference/src/validation.js';
export function validateSnapshot(value: unknown): asserts value is Snapshot {
  validate<Snapshot>('Snapshot', value);
  validateEvidence(value.bundle, value.memoryBefore);
  if(!!value.observationPredecessor!==!!value.observationAnchor)throw new Error('Observation continuation requires both provenance and a replay anchor');
  if((value.scene==='dynamic')!==!!value.world.dynamic)throw new Error('Snapshot scene/contract mismatch');
  if(!value.world.dynamic&&value.seed===null)throw new Error('Static snapshots require a uint32 seed');
  assertDynamicWorld(value.world);
  if(value.bundle.vision.horizontalFov!==horizontalFov(value.world))throw new Error('Snapshot field of view differs from the authored optical condition');
  const oriented=value.world.dynamic?.scene.definition.observationMode==='oriented';
  if(oriented&&value.bundle.context?.ownAttackDirection!==value.world.dynamic!.scene.definition.ownAttackDirection)throw new Error('Known direction differs from authored context');
  if (value.world.time !== value.bundle.time || value.world.seed !== value.seed || value.world.scene !== value.scene || value.world.playerId !== value.bundle.playerId) throw new Error('Snapshot context mismatch');
}
