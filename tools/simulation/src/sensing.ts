import { trackingMap } from './scene';
import { distance, angle, bearing, HORIZONTAL_FOV } from './world';
import type { Bundle, Vec } from '../../../models/player/reference/src/contracts.js';
import type { World, WorldEntity } from './contracts';
function blocked(from: Vec, to: WorldEntity, entities: WorldEntity[]): boolean {
  const dx = to.position.x - from.x, dz = to.position.z - from.z;
  const length2 = dx * dx + dz * dz;
  return entities.some(e => {
    if (e.id === to.id || e.kind !== 'player') return false;
    const t = ((e.position.x - from.x) * dx + (e.position.z - from.z) * dz) / length2;
    return t > 0 && t < 1 && distance(e.position, { x: from.x + dx * t, z: from.z + dz * t }) < e.radius;
  });
}
export function visible(world: World, entity: WorldEntity): boolean {
  const b = world.body;
  return distance(b.position, entity.position) <= 35 &&
    Math.abs(angle(bearing(b.position, entity.position) - b.yaw - b.headYaw)) <= HORIZONTAL_FOV / 2 &&
    !blocked(b.position, entity, world.entities);
}
// This adapter alone reads the world. It constructs a fresh whitelist payload.
export function sense(world: World): Bundle {
  const aliases=world.dynamic?trackingMap(world.dynamic.scene):null;
  const entityId=(id:string)=>aliases?(id==='@ball'?'object-ball':aliases[id]??id.replace('@sound-','sound-')):id;
  const team=world.dynamic?.scene.definition.actors.find(a=>a.id===world.dynamic!.scene.definition.controlledPlayerId)?.team??'blue';
  const percepts: Bundle['percepts'] = world.entities.filter(e => visible(world, e)).map(e => ({
    id: `${entityId(e.id)}@${world.time.toFixed(3)}:vision`, entityId: entityId(e.id), kind: e.kind,
    relation: e.team === 'none' ? 'neutral' : e.team === team ? 'teammate' : 'opponent',
    modality: 'vision', observedAt: world.time, confidence: .9, position: { ...e.position },
  }));
  for (const c of world.calls) if (distance(world.body.position, c.position) <= 20) percepts.push({
    id: `${entityId(c.id)}@${world.time.toFixed(3)}:audio`, entityId: entityId(c.id), kind: 'call', relation: 'neutral',
    modality: 'audio', observedAt: world.time, confidence: .55,
    bearing: Math.round(angle(bearing(world.body.position, c.position) - world.body.yaw) / .3) * .3, cue: c.cue,
    observerYaw: world.body.yaw,
  });
  return { contractVersion: 1, playerId: world.playerId, time: world.time, self: structuredClone(world.body),
    vision: { horizontalFov: HORIZONTAL_FOV, range: 35 }, percepts };
}
