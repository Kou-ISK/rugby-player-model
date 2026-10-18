import type {Trace,Memory,Profile,RulesA,LoopEstimate,LoopPlan,Evaluation,Vec,Action,Mechanisms} from './contracts.js';
const length=(v:Vec)=>Math.hypot(v.x,v.z),sub=(a:Vec,b:Vec)=>({x:a.x-b.x,z:a.z-b.z});
const add=(a:Vec,b:Vec,k=1)=>({x:a.x+b.x*k,z:a.z+b.z*k});
const q=(n:number)=>Math.round(n*1e9)/1e9,vec=(v:Vec):Vec=>({x:q(v.x),z:q(v.z)});
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export const defaultMechanisms=():Mechanisms=>({motion:true,intention:true,local:true,tactics:true});
/** A hypothesis over acquired evidence only. No scene labels, paths or other agents' state. */
export function enhanceLoop(base:Trace,previous:Memory,profile:Profile,rules:RulesA):Trace {
 const b=base.sensation,self=b.self,now=b.time,m={...defaultMechanisms(),...rules.mechanisms},dir=b.context!.ownAttackDirection;
 const estimates:LoopEstimate[]=base.beliefs.filter(p=>p.modality==='vision'&&p.position&&p.age<=2).map(p=>{
  const old=previous.episodes.filter(q=>q.entityId===p.entityId&&q.modality==='vision'&&q.position&&q.observedAt<p.observedAt&&p.observedAt-q.observedAt<=2).sort((a,b)=>b.observedAt-a.observedAt)[0];
  const delta=old?sub(p.position!,old.position!):{x:0,z:0},dt=old?p.observedAt-old.observedAt:1;
  let velocity=m.motion&&old?{x:delta.x/dt,z:delta.z/dt}:{x:0,z:0};const speed=length(velocity);if(speed>10)velocity={x:velocity.x*10/speed,z:velocity.z*10/speed};
  return {entityId:p.entityId,sourceIds:old&&m.motion?[old.id,p.id]:[p.id],observedAt:p.observedAt,velocity,position:add(p.position!,velocity,Math.min(p.age,.5)),uncertainty:p.uncertaintyRadius+(old?.position&&m.motion?p.age:0),method:old&&m.motion?'two-observations':'last-observation'};
 });
 const fresh=base.beliefs.filter(p=>p.modality==='vision'&&p.kind==='player'&&p.position&&p.age<=.5);
 const estimate=(id:string)=>estimates.find(e=>e.entityId===id)!;
 const peers=fresh.filter(p=>p.relation==='teammate'),opponents=fresh.filter(p=>p.relation==='opponent').sort((a,b)=>length(sub(a.position!,self.position))-length(sub(b.position!,self.position)));
 const threat=opponents[0],carrier=fresh.find(p=>p.ballControl?.holding),phase=base.situation!.phase;
 const options:Evaluation[]=[];const goals=new Map<Action,Vec>();
 const offer=(action:Action,score:number,allowed:boolean,goal:Vec,reason:string,targetId?:string)=>{options.push({action,score,allowed,reason,...(targetId?{targetId}:{})});goals.set(action,goal);};
 offer('hold',.05,true,self.position,'A supported stop remains available.');
 offer('scan',(phase==='unknown'?.9:.1)+rules.scanBias,true,self.position,'Acquire evidence; unseen space is not empty.');
 const forward={x:Math.sin(self.yaw),z:Math.cos(self.yaw)},attack={x:0,z:dir};
 if(self.hasBall){
  const close=threat?length(sub(threat.position!,self.position)):Infinity;
  offer('carry',.6+rules.carryBias,true,add(self.position,m.tactics?attack:forward,5),'Advance subject to observed pressure and body limits.');
  if(threat&&m.local){
   const e=estimate(threat.entityId),to=sub(e.position,self.position),relative=sub(e.velocity,self.motor!.velocity);
   const t=Math.max(0,-(to.x*relative.x+to.z*relative.z)/Math.max(.01,length(relative)**2));
   const front=threat.bodyOrientation?.yaw??Math.atan2(-to.x,-to.z),lateral={x:Math.cos(self.yaw),z:-Math.sin(self.yaw)};
   // Choose the side with more observed space; body orientation breaks equal space, not intent.
   const room=(side:number)=>Math.min(20,...opponents.map(p=>length(sub(p.position!,add(self.position,lateral,side*2)))));
   const side=room(1)===room(-1)?(Math.sin(front-self.yaw)>=0?-1:1):room(1)>room(-1)?1:-1;
   const danger=close<6||t<1.2&&length(add(to,relative,t))<2;
   offer('evade',danger?1:.2,true,add(add(self.position,lateral,side*2),attack,3),'Observed position, relative approach and body orientation suggest a lateral corridor; response is uncertain.');
  }
  const selected=base.deliberation?.selected.map(p=>p.entityId);
  const receivers=peers.filter(p=>(p.position!.z-self.position.z)*dir<-.5&&length(sub(p.position!,self.position))<=profile.ability.passRange&&(!selected||selected.includes(p.entityId)));
  const receiver=receivers.sort((a,b)=>length(sub(a.position!,self.position))-length(sub(b.position!,self.position)))[0];
  const free=receiver&&!opponents.some(o=>length(sub(o.position!,receiver.position!))<1.5);
  const passScore=close<4.5?.95:.35;
  offer('pass',passScore+rules.passBias,!!free,receiver?add(receiver.position!,estimate(receiver.entityId).velocity,Math.min(.5,length(sub(receiver.position!,self.position))/15)):self.position,'Release only toward an observed backward receiver; prediction can be wrong and execution reports failure.',receiver?.entityId);
 }else if(phase==='defense'&&carrier){
  const e=estimate(carrier.entityId),goal=m.tactics?add(e.position,{x:0,z:-dir},1.5):e.position;
  offer('defend',.8,true,m.local?add(goal,e.velocity,.3):goal,'Protect own-goal side of the observed carrier; uncertain extrapolation is bounded.',carrier.entityId);
  offer('tackle',1,length(sub(carrier.position!,self.position))<1.3,carrier.position!,'Attempt abstract contact only near a freshly observed carrier. No full rugby tackle or ruck model.',carrier.entityId);
 }else if(phase==='attack-support'&&carrier){
  const e=estimate(carrier.entityId),side=self.position.x>=e.position.x?1:-1;
  offer('support',.8,true,m.local?{x:e.position.x+side*3,z:e.position.z-dir*2}:add(self.position,forward,3),'Maintain observed support width and depth; do not assume the carrier will pass.',carrier.entityId);
 }
 const ball=base.beliefs.find(p=>p.kind==='ball'&&p.modality==='vision'&&p.position&&p.age<=.2);
 if(!self.hasBall&&ball&&!carrier){const e=estimate(ball.entityId);offer('receive',1,true,add(e.position,e.velocity,.15),'Move toward the observed loose ball; interception/catch requires physical proximity.',ball.entityId);}
 for(const o of options)for(const rule of base.appliedRules)if(rule.action===o.action)o.score+=rule.weight;
 if(self.motor!.stoppedUntil>now){for(const o of options)o.allowed=o.action==='hold';}
 const ranked=options.filter(o=>o.allowed).sort((a,b)=>b.score-a.score||a.action.localeCompare(b.action));let choice=ranked[0];
 const old=previous.intent,oldOption=old?options.find(o=>o.action===old.action&&o.targetId===old.targetId&&o.allowed):undefined;
 const canContinue=m.intention&&self.motor!.result.status!=='failed'&&old&&old.phase===phase&&now<old.reviewAt&&oldOption&&choice.score-oldOption.score<.25&&length(sub(old.goal,self.position))>.5;
 if(canContinue)choice=oldOption!;
 const transition=canContinue?'continued':old?'switched':'started';
 const plan:LoopPlan={action:choice.action,...(choice.targetId?{targetId:choice.targetId}:{}),startedAt:canContinue?old!.startedAt:now,reviewAt:canContinue?old!.reviewAt:now+.6,goal:structuredClone(canContinue?old!.goal:goals.get(choice.action)!),phase,basis:base.attention.slice()};
 plan.goal=vec(plan.goal);plan.reviewAt=q(plan.reviewAt);
 const delta=sub(plan.goal,self.position),d=length(delta),speed=['carry','evade','defend','support','receive'].includes(choice.action)?Math.min(profile.ability.maxSpeed,d/.2):0;
 const velocity=d?{x:delta.x/d*speed,z:delta.z/d*speed}:{x:0,z:0};
 const output:Trace['output']=[{channel:'locomotion',status:'supported',value:velocity}];
 if(speed)output.push({channel:'heading',status:'supported',value:Math.atan2(delta.x,delta.z)});
 if(choice.action==='scan')output.push({channel:'headYaw',status:'supported',value:base.assessment.scanTarget?.headYaw??Math.sin(now+.5)*2.1});
 if(choice.action==='pass')output.push({channel:'pass',status:'supported',value:{x:plan.goal.x,z:plan.goal.z},reason:'2D motor request, not a completed pass.'});
 if(choice.action==='tackle')output.push({channel:'tackle',status:'supported',value:choice.targetId!,reason:'2D contact request, not a completed tackle.'});
 for(const e of estimates){e.velocity=vec(e.velocity);e.position=vec(e.position);e.uncertainty=q(e.uncertainty);}
 for(const o of options)o.score=q(o.score);
 for(const c of output){if(typeof c.value==='number')c.value=q(c.value);else if(c.value&&typeof c.value==='object'&&'x' in c.value)c.value=vec({x:c.value.x,z:c.value.z});}
 return {...base,situation:{...base.situation!,actionScope:'bounded-motor-skills'},modelRevision:'cognition-0.4.0',traceVersion:4,evaluation:options,intention:choice,output,longTermMemory:{...base.longTermMemory,intent:plan},loop:{hypothesis:'closed-loop-v1',configuration:structuredClone(rules),ability:structuredClone(profile.ability),mechanisms:m,estimates,plan,transition,reason:canContinue?'Continue a still-eligible plan until review; urgent alternatives can interrupt.':'Reassess phase, evidence, body outcome and eligibility.',goalConstraints:m.tactics?['known attack direction','support depth','own-goal protection']:[]}};
}
