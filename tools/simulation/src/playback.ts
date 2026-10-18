import { importSceneRevision } from './scene';
import type { Body } from '../../../models/player/reference/src/contracts.js';
import type { World } from './contracts';
import { updateSceneFrame } from './scene';

// Read-only presentation of a saved experiment. Never advances A or mutates a session.
export function recordedWorld(source:{world:World},frame:{time:number;body?:Body;runtime?:import('./contracts').MotorRuntime},calls:World['emittedCalls']=[]):World {
  if(!frame.body)throw new Error('This legacy experiment has no recorded body frames; record a new comparison');
  const world=structuredClone(source.world);if(world.dynamic)world.dynamic.scene=importSceneRevision(world.dynamic.scene);world.time=frame.time;world.body=structuredClone(frame.body);
  if(world.runtime){if(!frame.runtime)throw new Error('Motor comparison requires the recorded runtime frame');world.runtime=structuredClone(frame.runtime);world.runtime.actors.find(a=>a.id===world.dynamic!.scene.definition.controlledPlayerId)!.body=structuredClone(frame.body);}
  world.emittedCalls=structuredClone((calls??[]).filter(c=>c.at<frame.time));
  if(world.dynamic){
    const tick=Math.round(frame.time/.2);
    if(Math.abs(tick*.2-frame.time)>1e-9||tick<0||tick>world.dynamic.scene.definition.durationTicks)throw new Error('Saved frame time is outside the frozen scene');
    world.dynamic.tick=tick;updateSceneFrame(world);
  }else if(world.body.hasBall){
    const ball=world.entities.find(e=>e.id==='ball');if(ball)ball.position={x:world.body.position.x,z:world.body.position.z+.4};
  }
  return world;
}
