import type {World,MotorRuntime} from './contracts';
import type {Body,Trace,Vec} from '../../../models/player/reference/src/contracts.js';
import {defaultProfile,emptyMemory} from '../../../models/player/reference/src/defaults.js';
import {think} from '../../../models/player/reference/src/cognition.js';
import {sampleMotion,trackingMap} from './scene';
import {sense} from './sensing';
const dist=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.z-b.z),clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const angle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
export const motorLimits={acceleration:4,turnRate:2,headTurnRate:3,ballSpeed:15,releaseDelay:.2,catchRadius:.75,contactRadius:.9,substeps:10};
export function initialiseRuntime(w:World){
 const s=w.dynamic!.scene.definition;
 const actors=s.actors.map(a=>({id:a.id,body:{position:{...a.initial.position},yaw:a.initial.yaw,headYaw:0,eyeHeight:1.68,hasBall:s.ball.kind==='attached'&&s.ball.carrierId===a.id,motor:{velocity:{x:0,z:0},stoppedUntil:0,result:{action:'hold',status:'idle' as const,at:0,reason:'Initial state'}}},memory:emptyMemory(),profile:a.motion.kind==='autonomous'?structuredClone(a.motion.profile):defaultProfile()}));
 const carrier=actors.find(a=>a.body.hasBall)!;
 w.runtime={version:1,actors,ball:{mode:'held',carrierId:carrier.id,position:{...carrier.body.position},velocity:{x:0,z:0},releasedAt:-1},events:[],decisions:[]};
}
export function renderRuntime(w:World):World {
 const r=w.runtime!,s=w.dynamic!.scene.definition;
 for(const a of r.actors)a.body.hasBall=r.ball.mode==='held'&&r.ball.carrierId===a.id;
 const self=r.actors.find(a=>a.id===s.controlledPlayerId)!;w.body=structuredClone(self.body);
 if(r.ball.mode==='held'){const b=r.actors.find(a=>a.id===r.ball.carrierId)!.body;r.ball.position={x:b.position.x+Math.sin(b.yaw)*.65,z:b.position.z+Math.cos(b.yaw)*.65};}
 w.entities=r.actors.filter(a=>a.id!==s.controlledPlayerId).map(a=>({id:a.id,kind:'player',team:s.actors.find(p=>p.id===a.id)!.team,position:{...a.body.position},yaw:a.body.yaw,radius:.45}));
 w.entities.push({id:'@ball',kind:'ball',team:'none',position:{...r.ball.position},radius:.18});
 w.calls=s.calls.flatMap((c,i)=>w.dynamic!.tick>=c.startTick&&w.dynamic!.tick<=c.endTick?[{id:`@sound-${i}`,position:{...r.actors.find(a=>a.id===c.sourceActorId)!.body.position},cue:c.cue}]:[]);
 return w;
}
export function senseActor(world:World,id:string){
 const w=structuredClone(world),s=w.dynamic!.scene.definition,original=s.actors.find(a=>a.id===s.controlledPlayerId)!,actor=s.actors.find(a=>a.id===id)!;
 s.ownAttackDirection=(original.team===actor.team?1:-1)*s.ownAttackDirection! as 1|-1;s.controlledPlayerId=id;w.playerId=trackingMap(w.dynamic!.scene)[id];renderRuntime(w);return sense(w);
}
export function advanceSkills(world:World,controlled:Trace,dt:number):World {
 if(dt!==.2)throw new Error('Motor clock must be 0.2s');
 const w=structuredClone(world),s=w.dynamic!.scene.definition,r=w.runtime!,aliases=trackingMap(w.dynamic!.scene);
 const primary=r.actors.find(a=>a.id===s.controlledPlayerId)!;
 // Manual turns are explicit proprioceptive changes to the selected body.
 primary.body=structuredClone(world.body);
 primary.profile.ability=structuredClone(controlled.loop!.ability);
 const decisions=new Map<string,Trace>([[primary.id,controlled]]);
 // All agents acquire the same pre-step world before any motor state changes.
 for(const a of r.actors.filter(a=>s.actors.find(x=>x.id===a.id)!.motion.kind==='autonomous').sort((a,b)=>a.id.localeCompare(b.id))){const trace=think(senseActor(w,a.id),a.memory,a.profile,controlled.loop!.configuration);decisions.set(a.id,trace);}
 r.decisions=[...decisions].map(([id,trace])=>({id,trace:structuredClone(trace)}));
 const action=(id:string)=>decisions.get(id)?.intention.action;
 const command=(id:string,channel:string)=>decisions.get(id)?.output.find(c=>c.channel===channel&&c.status==='supported')?.value;
 for(const a of r.actors){const t=decisions.get(a.id);if(t){a.memory=structuredClone(t.longTermMemory);a.body.motor!.result={action:t.intention.action,status:'running',at:world.time,reason:'Request accepted for bounded motor execution'};}}
 const event=(id:string,kind:MotorRuntime['events'][number]['kind'],reason:string,at:number)=>{r.events.push({at,actorId:id,kind,reason});const a=r.actors.find(a=>a.id===id)!;a.body.motor!.result={action:action(id)??kind,status:kind==='failure'?'failed':'completed',at,reason};};
 for(const a of r.actors){const v=command(a.id,'pass');if(v&&typeof v==='object'&&'x' in v&&r.ball.mode==='held'&&r.ball.carrierId===a.id&&!r.ball.pending)r.ball.pending={at:world.time+motorLimits.releaseDelay,actorId:a.id,target:{x:v.x,z:v.z}};}
 if(r.ball.pending&&action(r.ball.pending.actorId)!=='pass'){event(r.ball.pending.actorId,'failure','Release cancelled by revised intention',world.time);delete r.ball.pending;}
 const h=dt/motorLimits.substeps;
 for(let step=1;step<=motorLimits.substeps;step++){
  const at=Math.round((world.time+step*h)*1000000)/1000000;
  for(const a of r.actors){const def=s.actors.find(x=>x.id===a.id)!;
   if(def.motion.kind==='scripted'){const p=sampleMotion(def.motion.keyframes,w.dynamic!.tick+step/motorLimits.substeps),old=a.body.position;a.body.motor!.velocity={x:(p.position.x-old.x)/h,z:(p.position.z-old.z)/h};a.body.position=p.position;a.body.yaw=p.yaw;continue;}
   const b=a.body,m=b.motor!,requested=command(a.id,'locomotion'),moving=requested&&typeof requested==='object'&&'x' in requested;
   let target=moving?{x:requested.x,z:requested.z}:{x:0,z:0};const speed=Math.hypot(target.x,target.z),limit=a.profile.ability.maxSpeed;
   if(speed>limit)target={x:target.x*limit/speed,z:target.z*limit/speed};if(m.stoppedUntil>at)target={x:0,z:0};
   const dv={x:target.x-m.velocity.x,z:target.z-m.velocity.z},change=Math.hypot(dv.x,dv.z),factor=change?Math.min(1,motorLimits.acceleration*h/change):0;
   m.velocity={x:m.velocity.x+dv.x*factor,z:m.velocity.z+dv.z*factor};
   b.position={x:clamp(b.position.x+m.velocity.x*h,-32,32),z:clamp(b.position.z+m.velocity.z*h,-48,48)};
   const yaw=command(a.id,'heading'),head=command(a.id,'headYaw');
   if(typeof yaw==='number')b.yaw=angle(b.yaw+clamp(angle(yaw-b.yaw),-motorLimits.turnRate*h,motorLimits.turnRate*h));
   if(typeof head==='number')b.headYaw=clamp(b.headYaw+clamp(head-b.headYaw,-motorLimits.headTurnRate*h,motorLimits.headTurnRate*h),-2.4,2.4);
  }
  if(r.ball.mode==='held'){
   const holder=r.actors.find(a=>a.id===r.ball.carrierId)!,team=s.actors.find(a=>a.id===holder.id)!.team;
   for(const defender of r.actors.filter(a=>s.actors.find(x=>x.id===a.id)!.team!==team).sort((a,b)=>a.id.localeCompare(b.id))){
    const requested=command(defender.id,'tackle');if(requested!==aliases[holder.id]||holder.body.motor!.stoppedUntil>at||dist(holder.body.position,defender.body.position)>motorLimits.contactRadius||Math.abs(angle(Math.atan2(holder.body.position.x-defender.body.position.x,holder.body.position.z-defender.body.position.z)-defender.body.yaw))>Math.PI/2)continue;
    holder.body.motor!.velocity={x:0,z:0};holder.body.motor!.stoppedUntil=at+1;defender.body.motor!.velocity={x:0,z:0};defender.body.motor!.stoppedUntil=at+.4;r.ball.pending=undefined;event(defender.id,'contact','Abstract contact completed; holder stopped; no ruck/turnover inference',at);event(holder.id,'failure','Contact stopped movement/release',at);
   }
   const pending=r.ball.pending;
   if(pending&&pending.at<=at){
    const actor=r.actors.find(a=>a.id===pending.actorId)!,team=s.actors.find(a=>a.id===actor.id)!.team,ownTeam=s.actors.find(a=>a.id===s.controlledPlayerId)!.team,dir=s.ownAttackDirection!*(team===ownTeam?1:-1),distance=dist(actor.body.position,pending.target);
    if(actor.body.motor!.stoppedUntil>at||(pending.target.z-actor.body.position.z)*dir>0||distance>actor.profile.ability.passRange||distance<.1){event(actor.id,'failure','Release cancelled: contact, forward target or range',at);delete r.ball.pending;}
    else{r.ball={mode:'flight',position:{...actor.body.position},velocity:{x:(pending.target.x-actor.body.position.x)/distance*motorLimits.ballSpeed,z:(pending.target.z-actor.body.position.z)/distance*motorLimits.ballSpeed},releasedAt:at};event(actor.id,'release','Ball released; catch outcome pending',at);}
   }
  }else{
   if(r.ball.mode==='flight'){r.ball.position.x+=r.ball.velocity.x*h;r.ball.position.z+=r.ball.velocity.z*h;if(at-r.ball.releasedAt>2||Math.abs(r.ball.position.x)>32||Math.abs(r.ball.position.z)>48){r.ball.mode='loose';r.ball.velocity={x:0,z:0};r.ball.position={x:clamp(r.ball.position.x,-32,32),z:clamp(r.ball.position.z,-48,48)};}}
   if(at-r.ball.releasedAt>=.06){const eligible=r.actors.filter(a=>a.body.motor!.stoppedUntil<=at&&dist(a.body.position,r.ball.position)<=motorLimits.catchRadius&&(s.actors.find(x=>x.id===a.id)!.motion.kind==='scripted'||['receive','support','defend'].includes(action(a.id)??''))).sort((a,b)=>dist(a.body.position,r.ball.position)-dist(b.body.position,r.ball.position)||a.id.localeCompare(b.id));
    if(eligible[0]){r.ball={mode:'held',carrierId:eligible[0].id,position:{...eligible[0].body.position},velocity:{x:0,z:0},releasedAt:at};event(eligible[0].id,'catch','Abstract catch completed; possession transferred',at);}}
  }
 }
 // Quantize derived motor quantities for stable browser/Node replay; acquired evidence is untouched.
 const q=(n:number)=>Math.round(n*1e9)/1e9;
 for(const a of r.actors){a.body.position={x:q(a.body.position.x),z:q(a.body.position.z)};a.body.yaw=q(a.body.yaw);a.body.headYaw=q(a.body.headYaw);a.body.motor!.velocity={x:q(a.body.motor!.velocity.x),z:q(a.body.motor!.velocity.z)};}
 r.ball.position={x:q(r.ball.position.x),z:q(r.ball.position.z)};r.ball.velocity={x:q(r.ball.velocity.x),z:q(r.ball.velocity.z)};
 r.events=r.events.slice(-128);w.time=Math.round((world.time+dt)*1000)/1000;w.dynamic!.tick++;return renderRuntime(w);
}

export function assertRuntime(w:World){
 const r=w.runtime!,s=w.dynamic!.scene.definition,ids=r.actors.map(a=>a.id);
 if(new Set(ids).size!==ids.length||s.actors.some(a=>!ids.includes(a.id)))throw new Error('Runtime actor identity mismatch');
 for(const a of r.actors){if(!a.body.motor||a.memory.lastTime>w.time||a.body.motor.result.at>w.time)throw new Error('Invalid motor evidence clock');}
 if(r.ball.mode==='held'&&!ids.includes(r.ball.carrierId!))throw new Error('Invalid runtime carrier');
 if(r.ball.pending&&(r.ball.mode!=='held'||r.ball.pending.actorId!==r.ball.carrierId))throw new Error('Invalid pending release');
 if(r.decisions.some(d=>!ids.includes(d.id)||d.trace.sensation.time>w.time))throw new Error('Invalid synchronous decision record');
}
