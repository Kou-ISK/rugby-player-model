import type {Belief,Bundle,RulesA,Situation} from './contracts.js';
const angle=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
/** Engineering hypothesis; uses attended remembered evidence, never the scene or true carrier. */
export function assessSituation(bundle:Bundle,beliefs:Belief[],rules:RulesA):Situation{
 const carriers=beliefs.filter(b=>b.kind==='player'&&b.modality==='vision'&&b.ballControl?.holding&&b.age<=.5&&b.ballControl.confidence*2**(-b.age/rules.memoryHalfLife)>=rules.minimumConfidence);
 let phase:Situation['phase']='unknown',reason='No single recent observed carrier. Non-possession does not establish defense.';
 if(bundle.self.hasBall&&carriers.length===0){phase='attack-carrier';reason='Own proprioceptive possession.';}
 else if(!bundle.self.hasBall&&carriers.length===1&&carriers[0].relation!=='neutral'){
  phase=carriers[0].relation==='teammate'?'attack-support':'defense';reason='Recent visual holding evidence; this is an uncertain possession estimate, not current world truth.';
 }else if(carriers.length)reason='Conflicting possession evidence; re-observe rather than silently choose a carrier.';
 const goal:Record<Situation['phase'],Situation['goal']>={'attack-carrier':'advance-with-ball','attack-support':'support-observed-carrier',defense:'protect-own-goal',unknown:'locate-possession'};
 return {hypothesis:'orientation-phase-v1',selfOrientation:{bodyYaw:bundle.self.yaw,headYaw:bundle.self.headYaw,viewYaw:angle(bundle.self.yaw+bundle.self.headYaw)},phase,goal:goal[phase],ownAttackDirection:bundle.context!.ownAttackDirection,
  possessionSources:bundle.self.hasBall?[{sourceId:'self-proprioception',observedAt:bundle.time,confidence:1},...carriers.map(b=>({sourceId:b.id,observedAt:b.observedAt,confidence:b.ballControl!.confidence*2**(-b.age/rules.memoryHalfLife)}))]:carriers.map(b=>({sourceId:b.id,observedAt:b.observedAt,confidence:b.ballControl!.confidence*2**(-b.age/rules.memoryHalfLife)})),
  reason,actionScope:phase==='defense'||phase==='unknown'?'confirmation-and-hold-only':'kinematic-attack-skills',
  orientations:beliefs.filter(b=>b.bodyOrientation&&b.kind==='player'&&b.modality==='vision').map(b=>{
   const o=b.bodyOrientation!,half=Math.min(Math.PI,o.halfWidth+b.age*Math.PI/2),confidence=o.confidence*2**(-b.age/rules.memoryHalfLife);
   const delta=b.position?Math.abs(angle(o.yaw-Math.atan2(bundle.self.position.x-b.position.x,bundle.self.position.z-b.position.z))):Math.PI/2;
   return {sourceId:b.id,entityId:b.entityId,relation:b.relation,observedAt:b.observedAt,yaw:o.yaw,currentConfidence:confidence,angularHalfWidth:half,bodyRelativeYaw:angle(o.yaw-bundle.self.yaw),
    facingObserver:confidence<rules.minimumConfidence||!b.position||b.age>0?'uncertain':delta+half<Math.PI/2?'toward':delta-half>Math.PI/2?'away':'uncertain'};
  })};
}
