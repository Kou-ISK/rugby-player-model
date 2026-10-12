import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execute, think, defaultProfile, defaultRulesA, emptyMemory, finiteMode, unlimitedMode, legacyMode, rankRetrieved, type Bundle, type Percept, type Memory, type ExecutionMode } from '../reference/src/index.js';
const player=(id:string,observedAt=.9,confidence=.9):Percept=>({id,entityId:id,kind:'player',relation:'teammate',modality:'vision',observedAt,confidence,position:{x:1,z:-3}});
const call=(id:string,confidence=1):Percept=>({id,entityId:id,kind:'call',relation:'neutral',modality:'audio',observedAt:1,confidence,bearing:1,observerYaw:.5,cue:'support-call'});
const ball:Percept={id:'ball-observation',entityId:'ball',kind:'ball',relation:'neutral',modality:'vision',observedAt:1,confidence:1,position:{x:0,z:0}};
const bundle=(percepts:Percept[]=[],time=1):Bundle=>({contractVersion:1,playerId:'observer-0',time,self:{position:{x:0,z:0},yaw:0,headYaw:0,eyeHeight:1.7,hasBall:true},vision:{horizontalFov:Math.PI/2,range:35},percepts});
const profile={...defaultProfile(),tactics:{preferredAction:'pass' as const,adherence:0}};
const rules={...defaultRulesA(),passBias:2}; // Predeclared: an eligible pass wins; execution is unsupported.
const run=(b:Bundle,m:Memory,mode:ExecutionMode)=>execute({executionContractVersion:2,executionMode:mode,bundle:b,memory:m,profile,rules});
const pass=(t:ReturnType<typeof run>)=>t.trace.evaluation.find(e=>e.action==='pass')!;
const mem=(episodes:Percept[]):Memory=>({episodes,lastTime:1});
function pairInvariant(a:ReturnType<typeof run>,b:ReturnType<typeof run>){
 for(const key of ['encoded','retrieved','ranked'] as const)assert.deepEqual(a.trace.deliberation![key],b.trace.deliberation![key],key+' content, original times, confidence and identity');
 assert.deepEqual(a.nextMemory,b.nextMemory);assert.deepEqual(a.trace.assessment,b.trace.assessment);assert.deepEqual(a.trace.appliedRules,b.trace.appliedRules);
}
test('W1 retrieval neither reobserves nor refreshes confidence, episodes or freshness',()=>{
 const m=mem([player('receiver')]);const b=bundle();const a=run(b,m,finiteMode(1)),again=run(b,a.nextMemory,finiteMode(1));
 assert.deepEqual(a,again);const later=run(bundle([],2),a.nextMemory,finiteMode(1));
 assert.equal(later.trace.beliefs[0].observedAt,.9);assert.equal(later.trace.beliefs[0].confidence,.9);
 assert(later.trace.beliefs[0].currentConfidence<a.trace.beliefs[0].currentConfidence);assert.equal(later.nextMemory.episodes.length,1);assert.equal(pass(later).allowed,false);
});
test('W2 fixed two-belief pool K1/K2 changes pass eligibility and actual intention',()=>{
 const b=bundle([ball,player('receiver')]),a=run(b,emptyMemory(),finiteMode(1)),c=run(b,emptyMemory(),finiteMode(2));pairInvariant(a,c);
 assert.equal(pass(a).allowed,false);assert.notEqual(a.trace.intention.action,'pass');assert.equal(c.trace.intention.action,'pass');assert.equal(c.trace.output.find(c=>c.channel==='pass')?.status,'unsupported');
});
test('W3 encoding four current competitors and retaining a fifth receiver distinguishes K4/K5',()=>{
 const b=bundle([1,2,3,4].map(i=>call('cue-'+i))),m=mem([player('receiver')]);
 const a=run(b,m,finiteMode(4)),c=run(b,m,finiteMode(5));pairInvariant(a,c);
 assert.equal(a.trace.deliberation!.encoded.length,4);assert.equal(a.trace.deliberation!.retrieved.length,5);
 assert.equal(pass(a).allowed,false);assert.equal(c.trace.intention.action,'pass');
});
test('W4 fixed high/low competitor pools each have finite/unlimited pairs; W4b pool change is separate',()=>{
 const receiver=player('receiver',1,1),high=[call('high')],low=[{...player('low',1,.5),relation:'neutral' as const}];
 const pairs=[high,low].map(pool=>{const b=bundle(pool),m=mem([receiver]);const finite=run(b,m,finiteMode(1)),unlimited=run(b,m,unlimitedMode());pairInvariant(finite,unlimited);return {finite,unlimited};});
 assert.equal(pass(pairs[0].finite).allowed,false);assert.equal(pairs[0].unlimited.trace.intention.action,'pass');
 assert.equal(pairs[1].finite.trace.intention.action,'pass');assert.equal(pairs[1].unlimited.trace.intention.action,'pass');
 assert.notDeepEqual(pairs[0].finite.trace.deliberation!.retrieved,pairs[1].finite.trace.deliberation!.retrieved);
 assert.notDeepEqual(pairs[0].finite.trace.assessment,pairs[1].finite.trace.assessment,'W4b changes orienting too: mixed pool intervention, not pure capacity');
});
test('W5 changing capacity preserves stored episodes and later recoverability',()=>{
 const b=bundle([ball]),m=mem([player('receiver')]),a=run(b,m,finiteMode(1)),c=run(b,m,unlimitedMode());pairInvariant(a,c);
 assert(a.nextMemory.episodes.some(e=>e.id==='receiver'));const restored=run(b,a.nextMemory,finiteMode(2));assert.equal(restored.trace.intention.action,'pass');
});
test('W6 excluded threat still constrains risk and cannot reveal an excluded receiver identity',()=>{
 const threat={...player('opponent',.2),relation:'opponent' as const,position:{x:1,z:1}},b=bundle([call('cue')]),m=mem([threat,player('receiver')]);
 const a=run(b,m,finiteMode(1)),c=run(b,m,unlimitedMode());pairInvariant(a,c);
 assert(a.trace.assessment.uncertainThreat>0);assert(!a.trace.deliberation!.selected.some(b=>b.id==='opponent'));assert.equal(pass(a).targetId,undefined);assert.equal(pass(c).targetId,'receiver');
 const close=run(b,mem([{...threat,observedAt:1}]),finiteMode(1));assert.equal(close.trace.evaluation.find(e=>e.action==='carry')!.allowed,false);
});
test('W7 selected stale vision and audio cannot become fresh receivers; audio retains original yaw/time',()=>{
 const b=bundle([],2),m=mem([{...call('cue'),observedAt:.9,observerYaw:1.2},player('receiver',.8)]),r=run(b,m,unlimitedMode());
 assert.equal(pass(r).allowed,false);const heard=r.trace.deliberation!.selected.find(b=>b.id==='cue')!;assert.equal(heard.observerYaw,1.2);assert.equal(heard.observedAt,.9);assert.equal(r.trace.assessment.scanTarget!.headYaw,2.2);
});
test('W8 fresh/no-fresh predicates are capacity-independent while pass needs selected evidence',()=>{
 const b=bundle([ball]),m=mem([player('receiver')]);const r={...rules,contextRules:[{id:'fresh',when:{possession:'has-ball' as const,evidence:'fresh-receiver' as const,unlessCloseThreat:false},action:'pass' as const,weight:.1},{id:'missing',when:{possession:'has-ball' as const,evidence:'no-fresh-receiver' as const,unlessCloseThreat:false},action:'scan' as const,weight:.1}]};
 const runMode=(mode:ExecutionMode)=>execute({executionContractVersion:2,executionMode:mode,bundle:b,memory:m,profile,rules:r});const a=runMode(finiteMode(1)),c=runMode(unlimitedMode());pairInvariant(a,c);
 assert.deepEqual(a.trace.appliedRules.map(r=>r.id),['fresh']);assert.equal(pass(a).allowed,false);assert.equal(pass(c).allowed,true);
});
test('W9 sufficiently large K/unlimited have identical selection/judgment; ranked fixed pool is permutation-stable',()=>{
 const b=bundle([call('a'),ball,player('receiver')]),a=run(b,emptyMemory(),finiteMode(128)),c=run(b,emptyMemory(),unlimitedMode());pairInvariant(a,c);
 for(const key of ['evaluation','intention','output','assessment'] as const)assert.deepEqual(a.trace[key],c.trace[key]);assert.deepEqual(a.trace.deliberation!.selected,c.trace.deliberation!.selected);
 const pool=a.trace.deliberation!.retrieved;assert.deepEqual(rankRetrieved(pool),rankRetrieved([...pool].reverse()));
 const retained=[player('receiver-z',1,.8),player('receiver-a',1,.9),ball];const ordered=run(bundle(),mem(retained),finiteMode(2)),permuted=run(bundle(),mem([...retained].reverse()),finiteMode(2));assert.deepEqual(ordered.trace.deliberation!.ranked,permuted.trace.deliberation!.ranked);assert.deepEqual(ordered.trace.deliberation!.selected,permuted.trace.deliberation!.selected);for(const key of ['evaluation','intention','output'] as const)assert.deepEqual(ordered.trace[key],permuted.trace[key]);
});
test('W10 observation-only execution rejects world/future/render fields; external changes cannot affect output',()=>{
 const input={executionContractVersion:2,executionMode:finiteMode(1),bundle:bundle([ball]),memory:mem([player('receiver')]),profile,rules};const first=execute(input);
 const exterior={world:{hiddenReceiver:1},future:{ball:3},render:'spectator'};exterior.world.hiddenReceiver=9;exterior.future.ball=40;exterior.render='player';assert.deepEqual(execute(input),first);
 for(const key of ['world','future','render'])assert.throws(()=>execute({...input,[key]:exterior[key as keyof typeof exterior]}));
});
test('Execution v2 rejects absent/unknown modes, policies, capacities; explicit legacy is byte-equivalent',()=>{
 const b=bundle([ball]),m=emptyMemory();assert.deepEqual(run(b,m,legacyMode()).trace,think(b,m,profile,rules));assert.equal(run(b,m,legacyMode()).traceVersion,1);
 for(const mode of [{},{mode:'legacy',policyVersion:'legacy-ecc5c298-v1',capacity:{kind:'unlimited'}},{mode:'h-wm-1',policyVersion:'unknown',capacity:{kind:'unlimited'}},...[0,129,1.5].map(k=>({...finiteMode(1),capacity:{kind:'finite',k}})),{...unlimitedMode(),capacity:{kind:'unlimited',k:4}}])assert.throws(()=>run(b,m,mode as ExecutionMode));
});
