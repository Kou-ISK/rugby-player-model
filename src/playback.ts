import type { Body, Snapshot, World } from './contracts';
import { updateSceneFrame } from './scene';

// Read-only presentation of a saved experiment. Never advances A or mutates a session.
export function recordedWorld(source:Snapshot,frame:{time:number;body?:Body},calls:World['emittedCalls']=[]):World {
  if(!frame.body)throw new Error('This legacy experiment has no recorded body frames; record a new comparison');
  const world=structuredClone(source.world);world.time=frame.time;world.body=structuredClone(frame.body);
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
