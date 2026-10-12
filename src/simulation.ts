import { trackingMap, updateSceneFrame } from './scene';
import type { Body, Bundle, SceneId, Vec, World, WorldEntity, Trace } from './contracts';
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);
export const angle = (v: number) => Math.atan2(Math.sin(v), Math.cos(v));
export const bearing = (a: Vec, b: Vec) => Math.atan2(b.x - a.x, b.z - a.z);
export const HORIZONTAL_FOV = Math.PI / 2;
export function makeWorld(scene: SceneId, seed: number): World {
  if(scene==='dynamic')throw new Error('Dynamic scenes require an imported scene revision');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('seed must be uint32');
  let n = seed >>> 0;
  const random = () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
  const jitter = () => (random() - .5) * 2;
  const body: Body = { position: { x: 0, z: 0 }, yaw: 0, headYaw: 0, eyeHeight: 1.68, hasBall: true };
  const player = (id: string, x: number, z: number, team: 'blue' | 'red'): WorldEntity => ({ id, position: { x, z }, kind: 'player', team, radius: .45 });
  const entities: WorldEntity[] = [player('support-1', -5, -2, 'blue'), player('defender-1', 3 + jitter(), 10 + jitter(), 'red')];
  if (scene === 'occluded') entities.push(player('screen', 0, 5, 'red'), player('hidden', 0, 12, 'red'));
  if (scene === 'audio') { body.hasBall = false; entities[0].position = { x: -8, z: -4 }; }
  if (scene === 'heldout') {
    body.yaw = .6; body.hasBall = seed % 2 === 0;
    entities[0].position = { x: 5 + jitter(), z: -3 + jitter() };
    entities.push(player('wide-threat', -9 + jitter(), 7 + jitter(), 'red'));
  }
  entities.push({ id: 'ball', position: body.hasBall ? { x: 0, z: .4 } : { x: 2, z: 9 }, kind: 'ball', team: 'none', radius: .18 });
  return { scene, seed, time: 0, playerId: 'self', body, entities,
    calls: scene === 'audio' ? [{ id: 'call-left', position: { x: -8, z: -4 }, cue: 'support-call' }] : [] };
}
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
export function advance(world: World, trace: Trace, dt = .2): World {
  if(world.dynamic&&(dt!==.2||world.dynamic.tick>=world.dynamic.scene.definition.durationTicks))throw new Error('Dynamic scene ended or clock is not 0.2s');
  const next = structuredClone(world); next.time = Math.round((world.time + dt) * 1000) / 1000;
  for (const command of trace.output) {
    if (command.status !== 'supported') continue;
    if (command.channel === 'locomotion' && typeof command.value === 'object' && 'x' in command.value) {
      next.body.position.x = Math.max(-32, Math.min(32, next.body.position.x + command.value.x * dt));
      next.body.position.z = Math.max(-48, Math.min(48, next.body.position.z + command.value.z * dt));
    }
    if (command.channel === 'headYaw' && typeof command.value === 'number') next.body.headYaw = command.value;
    if (command.channel === 'call' && typeof command.value === 'string') {
      const previous = next.emittedCalls?.at(-1);
      // A bounded, rate-limited semantic log; not fed back as fresh self-hearing.
      if (!previous || previous.cue !== command.value || world.time - previous.at >= 1)
        next.emittedCalls = [...(next.emittedCalls ?? []), { at: world.time, playerId: world.playerId, cue: command.value }].slice(-32);
    }
  }
  if(next.dynamic){next.dynamic.tick++;return updateSceneFrame(next);}
  const ball = next.entities.find(e => e.id === 'ball')!;
  if (next.body.hasBall) ball.position = { x: next.body.position.x, z: next.body.position.z + .4 };
  return next;
}
