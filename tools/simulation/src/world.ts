import type { Body, Vec } from '../../../models/player/reference/src/contracts.js';
import type { SceneId, World, WorldEntity } from './contracts';
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
