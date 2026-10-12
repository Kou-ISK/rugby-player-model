import type { Vec } from '../models/player/reference/src/contracts.js';
import type { World, Keyframe, SceneDefinition, SceneRef, SceneRevision } from '../tools/simulation/src/contracts';
export type { Keyframe, SceneDefinition, SceneRef, SceneRevision } from '../tools/simulation/src/contracts';
export type { CoachingWindow, ApplicationPoint } from '../tools/experiments/src/contracts';
export const sceneRef = (s:SceneRef):SceneRef=>({sceneId:s.sceneId,revision:s.revision,contentHash:s.contentHash});

function object(v:any, keys:string[]) {
  if (!v || typeof v!=='object' || Array.isArray(v) || Object.keys(v).length!==keys.length || keys.some(k=>!Object.hasOwn(v,k))) throw new Error('Unexpected or missing scene fields');
}
function number(v:any,min:number,max:number,integer=false){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))throw new Error('Scene number out of range');}
function id(v:any){if(typeof v!=='string'||!v.trim()||v.startsWith('@')||v.length>80)throw new Error('Invalid actor id');}
function pose(v:any){object(v,['position','yaw']);object(v.position,['x','z']);number(v.position.x,-32,32);number(v.position.z,-48,48);number(v.yaw,-Math.PI,Math.PI);}
export function validateSceneDefinition(value:unknown):asserts value is SceneDefinition {
  const s=value as any;object(s,['sceneSchemaVersion','tickSeconds','durationTicks','controlledPlayerId','actors','ball','calls']);
  if(s.sceneSchemaVersion!==1||s.tickSeconds!==.2)throw new Error('Unsupported scene contract/clock');
  number(s.durationTicks,1,200,true);id(s.controlledPlayerId);
  if(!Array.isArray(s.actors)||s.actors.length<1||s.actors.length>32)throw new Error('Use 1–32 actors');
  const ids=new Set<string>();let controlled=0;
  const frames=(f:any)=>{
    if(!Array.isArray(f)||f.length<2||f.length>201)throw new Error('Use 2–201 keyframes');
    f.forEach((p:any,i:number)=>{object(p,['tick','position','yaw']);number(p.tick,0,s.durationTicks,true);pose({position:p.position,yaw:p.yaw});if(i&&p.tick<=f[i-1].tick)throw new Error('Keyframes must be strictly ordered');});
    if(f[0].tick!==0||f.at(-1).tick!==s.durationTicks)throw new Error('Keyframes must cover the complete interval');
  };
  for(const a of s.actors){
    object(a,['id','team','initial','motion']);id(a.id);if(ids.has(a.id))throw new Error('Duplicate actor id');ids.add(a.id);
    if(!['blue','red'].includes(a.team))throw new Error('Unknown team');pose(a.initial);
    if(a.motion?.kind==='controlled'){object(a.motion,['kind']);controlled++;if(a.id!==s.controlledPlayerId)throw new Error('Wrong controlled actor');}
    else if(a.motion?.kind==='scripted'){
      object(a.motion,['kind','keyframes']);frames(a.motion.keyframes);
      const first=a.motion.keyframes[0];if(first.position.x!==a.initial.position.x||first.position.z!==a.initial.position.z||first.yaw!==a.initial.yaw)throw new Error('Initial pose must match the first keyframe');
      if(a.id===s.controlledPlayerId)throw new Error('A output and scripted motion cannot control the same actor');
    }else throw new Error('Unknown motion kind');
  }
  if(controlled!==1||!ids.has(s.controlledPlayerId))throw new Error('Exactly one controlled actor is required');
  if(s.ball?.kind==='attached'){object(s.ball,['kind','carrierId']);if(!ids.has(s.ball.carrierId))throw new Error('Unknown ball carrier');}
  else if(s.ball?.kind==='scripted'){object(s.ball,['kind','keyframes']);frames(s.ball.keyframes);}else throw new Error('Unknown ball mode');
  if(!Array.isArray(s.calls)||s.calls.length>128)throw new Error('Too many calls');
  for(const c of s.calls){object(c,['startTick','endTick','sourceActorId','cue']);number(c.startTick,0,s.durationTicks,true);number(c.endTick,0,s.durationTicks,true);
    if(c.endTick<c.startTick||!ids.has(c.sourceActorId)||!['support-call','warning-call'].includes(c.cue))throw new Error('Invalid call event');
    if(c.sourceActorId===s.controlledPlayerId)throw new Error('Controlled actor calls must come from A, never from a script');
  }
}
// Author names are not identity. Normalize references before computing the content digest.
export function sceneContent(s:SceneDefinition){
  const index=(id:string)=>s.actors.findIndex(a=>a.id===id);
  return {...s,controlledPlayerId:index(s.controlledPlayerId),actors:s.actors.map(({id,...a})=>a),
    ball:s.ball.kind==='attached'?{kind:s.ball.kind,carrierId:index(s.ball.carrierId)}:s.ball,
    calls:s.calls.map(c=>({...c,sourceActorId:index(c.sourceActorId)}))};
}
export function sampleMotion(frames:Keyframe[],tick:number){
  if(tick<=0)return structuredClone(frames[0]);
  const end=frames.findIndex(f=>f.tick>=tick);if(end<0)return structuredClone(frames.at(-1)!);
  const a=frames[end-1],b=frames[end],t=(tick-a.tick)/(b.tick-a.tick),delta=Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw));
  return {tick,position:{x:a.position.x+(b.position.x-a.position.x)*t,z:a.position.z+(b.position.z-a.position.z)*t},yaw:Math.atan2(Math.sin(a.yaw+delta*t),Math.cos(a.yaw+delta*t))};
}
export function trackingMap(s:SceneRevision){return Object.fromEntries(s.definition.actors.map((a,i)=>[a.id,s.trackingIds[i]]));}
export function updateSceneFrame(world:World):World {
  const d=world.dynamic!;const s=d.scene.definition;const positions=new Map<string,{position:Vec;yaw:number}>();
  for(const a of s.actors)positions.set(a.id,a.motion.kind==='controlled'?world.body:sampleMotion(a.motion.keyframes,d.tick));
  world.entities=s.actors.filter(a=>a.id!==s.controlledPlayerId).map(a=>({id:a.id,kind:'player',team:a.team,position:{...positions.get(a.id)!.position},yaw:positions.get(a.id)!.yaw,radius:.45}));
  const ball=s.ball.kind==='attached'?positions.get(s.ball.carrierId)!.position:sampleMotion(s.ball.keyframes,d.tick).position;
  world.entities.push({id:'@ball',kind:'ball',team:'none',position:{x:ball.x,z:ball.z+(s.ball.kind==='attached'?.4:0)},radius:.18});
  world.body.hasBall=s.ball.kind==='attached'&&s.ball.carrierId===s.controlledPlayerId;
  world.calls=s.calls.flatMap((c,i)=>d.tick>=c.startTick&&d.tick<=c.endTick?[{id:`@sound-${i}`,position:{...positions.get(c.sourceActorId)!.position},cue:c.cue}]:[]);
  return world;
}
export function sceneWorld(scene:SceneRevision):World {
  validateSceneDefinition(scene.definition);
  if(scene.trackingIds.length!==scene.definition.actors.length||new Set(scene.trackingIds).size!==scene.trackingIds.length||scene.trackingIds.some(id=>!/^track-[0-9a-f-]{36}$/.test(id)))throw new Error('Invalid observation tracking identifiers');
  const a=scene.definition.actors.find(a=>a.id===scene.definition.controlledPlayerId)!;
  return updateSceneFrame({scene:'dynamic',seed:scene.generationSeed,time:0,playerId:'observer-0',
    body:{position:{...a.initial.position},yaw:a.initial.yaw,headYaw:0,eyeHeight:1.68,hasBall:false},entities:[],calls:[],dynamic:{scene:structuredClone(scene),tick:0}});
}
// Browser and Node trigonometric functions may differ in their last bits.
// Frame verification uses a 1e-9 m/rad tolerance, far below sensor resolution.
function sameFrame(a:any,b:any):boolean {
  if(typeof a==='number'&&typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-9;
  if(a&&b&&typeof a==='object'&&typeof b==='object'){
    const keys=Object.keys(a).sort();return JSON.stringify(keys)===JSON.stringify(Object.keys(b).sort())&&keys.every(k=>sameFrame(a[k],b[k]));
  }
  return a===b;
}
export function assertDynamicWorld(world:World){
  const d=world.dynamic;if(!d)return;
  sceneWorld(d.scene);number(d.tick,0,d.scene.definition.durationTicks,true);
  if(world.scene!=='dynamic'||world.playerId!=='observer-0'||world.time!==Math.round(d.tick*.2*1000)/1000||world.seed!==d.scene.generationSeed)throw new Error('Dynamic frame clock/observer mismatch');
  const expected=updateSceneFrame(structuredClone(world));
  if(!sameFrame(expected.entities,world.entities)||!sameFrame(expected.calls,world.calls)||expected.body.hasBall!==world.body.hasBall)throw new Error('Dynamic frame does not match the frozen scene');
}

// Audit diagnostics only: geometric overlap does not simulate contact or a successful tackle.
export function sceneDiagnostics(world:World){
  if(!world.dynamic)return null;
  const aliases=trackingMap(world.dynamic.scene),players=[{id:'observer-0',position:world.body.position,radius:.45},...world.entities.filter(e=>e.kind==='player').map(e=>({...e,id:aliases[e.id]}))];
  const overlaps:string[][]=[];
  players.forEach((a,i)=>players.slice(i+1).forEach(b=>{if(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)<a.radius+b.radius)overlaps.push([a.id,b.id]);}));
  return {overlaps,contactResolution:'unsupported',ballPhysics:'unsupported',otherActors:'scripted-stimuli'};
}
