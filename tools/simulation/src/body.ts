import { advanceSkills } from './skills';
import { updateSceneFrame } from './scene';
import type { Trace } from '../../../models/player/reference/src/contracts.js';
import type { World } from './contracts';
export function advance(world: World, trace: Trace, dt = .2): World {
  if(world.dynamic&&(dt!==.2||world.dynamic.tick>=world.dynamic.scene.definition.durationTicks))throw new Error('Dynamic scene ended or clock is not 0.2s');
  if(world.dynamic?.scene.definition.sceneSchemaVersion===3)return advanceSkills(world,trace,dt);
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
