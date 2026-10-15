import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PresentationHub} from '../server/presentation';
import {capture,snapshotObservationContext} from '../research';
import {defaultRulesA} from '../../../models/player/reference/src/defaults';
import {appendObservation,continueObservationHistory,newHistory,replayObservationHistory,assertSnapshotHistory} from '../../experiments/src/history';
import {think} from '../../../models/player/reference/src/cognition';
import {sense,advance} from '../../simulation/src/index';
import {captureSceneAt} from '../../experiments/src/capture';
import {coachingReplayInput} from '../../experiments/src/compare';
import {Store} from '../server/store';
import {digest} from '../../experiments/src/evaluation';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('a continued dynamic coaching interval replays its saved motor world instead of restarting movement',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rpm-dynamic-continuation-'));
 try{
  const store=new Store(dir),scene=store.createScene(JSON.parse(readFileSync('evaluation/fixtures/loop-attack.scene.json','utf8')));
  const source=captureSceneAt(scene,defaultRulesA(),'B0',7),parentId=store.saveSnapshot(source),s=structuredClone(source);
  const trace=think(s.bundle,s.memoryBefore,s.profile,s.rulesA);s.memoryBefore=trace.longTermMemory;s.world=advance(s.world,trace);s.bundle=sense(s.world);
  appendObservation(s.observationHistory!,s.bundle,s.profile,s.rulesA,'step');
  s.observationHistory=continueObservationHistory(s.observationHistory!,source);s.observationPredecessor={snapshotId:parentId,sha256:digest(source)};s.observationAnchor=structuredClone(source.world);
  const id=store.saveSnapshot(s),candidate=store.propose(id,'Synthetic continued interval');
  assert.equal(candidate.coaching!.fromTick,7);
  const start=coachingReplayInput(s,candidate.coaching).snapshot;
  assert.deepEqual(start.world,source.world);assert.deepEqual(start.bundle,source.bundle);assert.deepEqual(start.memoryBefore,source.memoryBefore);
  const atEnd=coachingReplayInput(s,{...candidate.coaching!,fromTick:8}).snapshot;assert.deepEqual(atEnd.world,s.world);
  const tampered=structuredClone(s);tampered.observationAnchor!.body.yaw+=.1;
  assert.throws(()=>store.saveSnapshot(tampered),/predecessor/);
  assert.throws(()=>coachingReplayInput(tampered,candidate.coaching),/anchor mismatch/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('history continuation preserves evidence, cognition and position across durable retries and restart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rpm-history-continuation-'));
 try{
  const store=new Store(dir),s=capture('support',42,defaultRulesA(),'B0');
  s.observationHistory=newHistory(s.memoryBefore);let source:typeof s|undefined;
  for(let i=0;i<240;i++){
   if(i)s.memoryBefore=think(s.bundle,s.memoryBefore,s.profile,s.rulesA).longTermMemory;
   s.world.body.headYaw=i%2?-1:1;s.bundle=sense(s.world);
   appendObservation(s.observationHistory,s.bundle,s.profile,s.rulesA,i?'head-turn':'initial');
   if(i===223)source=structuredClone(s);
  }
  const original=structuredClone(s),before=store.active(),request='synthetic-history-request';
  const id=store.saveSnapshot(source,request);assert.equal(store.saveSnapshot(source,request),id);
  const mismatch=structuredClone(source!);mismatch.rulesBVersion='other';assert.throws(()=>store.saveSnapshot(mismatch,request),/different content/);
  const resumed=continueObservationHistory(s.observationHistory,source!);
  assert.deepEqual(replayObservationHistory(resumed).memoryBeforeLast,replayObservationHistory(s.observationHistory).memoryBeforeLast);
  s.observationHistory=resumed;s.observationPredecessor={snapshotId:id,sha256:digest(source)};s.observationAnchor=structuredClone(source!.world);
  assertSnapshotHistory(s);const childId=store.saveSnapshot(s);
  const restarted=new Store(dir);assert.deepEqual(restarted.read().snapshots[childId],s);assert.deepEqual(restarted.active(),before);
  assert.deepEqual(s.world,original.world);assert.deepEqual(s.memoryBefore,original.memoryBefore);
  assert.equal(source!.observationHistory!.events.length+resumed.events.length-1,240);
  assert.deepEqual(resumed.events[0],{...source!.observationHistory!.events.at(-1),sequence:0,trigger:'initial'});
  const wrong=structuredClone(s);wrong.observationPredecessor!.sha256='0'.repeat(64);assert.throws(()=>store.saveSnapshot(wrong),/predecessor/);
  assert.throws(()=>continueObservationHistory({...original.observationHistory!,events:[]},source!),/saved prefix/);
  assert.equal('world' in snapshotObservationContext(s),false);assert.equal('observationAnchor' in snapshotObservationContext(s),false);
  assert.deepEqual(restarted.researchLog().observationContinuations[0].predecessor,s.observationPredecessor);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
const display={revision:1,mode:'player' as const,time:0,tick:null,sceneId:'support',sceneRevision:null,paused:true};
test('display requests bind to an explicit live client and revision, and expire without replay',()=>{
 let now=0;const hub=new PresentationHub(()=>now);
 hub.poll('client-1',display);hub.poll('client-2',display);
 assert.equal(hub.list().length,2);
 assert.throws(()=>hub.request({id:'request-1',clientId:'client-1',expectedRevision:0,kind:'capture'},()=>true),/changed/);
 const request={id:'request-1',clientId:'client-1',expectedRevision:1,kind:'capture'};
 assert.equal(hub.request(request,()=>true).status,'pending');
 assert.equal(hub.poll('client-2',display),null);
 assert.equal(hub.poll('client-1',display)?.status,'delivered');
 assert.throws(()=>hub.request({...request,kind:'approve'},()=>true),/Only/);
 assert.throws(()=>hub.request({...request,clientId:'client-2'},()=>true),/different/);
 now=16000;assert.equal(hub.result('request-1').status,'failed');assert.equal(hub.poll('client-1',display),null);
 assert.equal(hub.list().length,1);
});
test('capture acknowledgement validates frame and persists once on retries; context has no world',()=>{
 const hub=new PresentationHub();hub.poll('client-1',display);
 hub.request({id:'request-1',clientId:'client-1',expectedRevision:1,kind:'capture'},()=>true);hub.poll('client-1',display);
 const snapshot=capture('support',42,defaultRulesA(),'B0');let writes=0;
 const save=()=>{writes++;return 'snapshot-1';};
 const completion={id:'request-1',clientId:'client-1',display:{...display,revision:2},snapshot};
 assert.throws(()=>hub.complete({...completion,clientId:'client-2'},save),/Unknown/);
 assert.throws(()=>hub.complete({...completion,display:{...display,revision:2,time:1}},save),/match/);
 assert.equal(writes,0);
 assert.equal(hub.complete(completion,save).result?.snapshotId,'snapshot-1');
 assert.equal(hub.complete(completion,save).result?.snapshotId,'snapshot-1');assert.equal(writes,1);
 const context=snapshotObservationContext(snapshot);assert.equal('world' in context,false);assert.deepEqual(context.bundle,snapshot.bundle);
 assert.throws(()=>hub.request({id:'new',clientId:'client-1',expectedRevision:2,kind:'capture',script:'bad'},()=>true),/Unknown/);
});
test('spectator can present only, must preserve delivery and acknowledge a player frame',()=>{
 const hub=new PresentationHub();hub.poll('client-1',{...display,mode:'spectator'});
 const base={id:'request-1',clientId:'client-1',expectedRevision:1};
 assert.throws(()=>hub.request({...base,kind:'capture'},()=>true),/player view/);
 assert.throws(()=>hub.request({...base,kind:'compare',experimentId:'experiment-1',arm:'before',frame:0},()=>true,()=>true),/player view/);
 const req={...base,kind:'present',snapshotId:'snapshot-1'};
 assert.throws(()=>hub.request(req,()=>false),/Unknown snapshot/);
 assert.equal(hub.request(req,()=>true).status,'pending');
 assert.throws(()=>hub.complete({id:'request-1',clientId:'client-1',error:'no'},()=>''),/not delivered/);
 hub.poll('client-1',{...display,mode:'spectator'});
 const snapshot=capture('support',42,defaultRulesA(),'B0');
 const completion={id:'request-1',clientId:'client-1',display:{...display,revision:2},snapshot,previousSnapshotId:'old-snapshot'};
 assert.throws(()=>hub.complete({...completion,display:{...completion.display,mode:'spectator'}},()=>''),/match/);
 assert.equal(hub.complete(completion,()=> 'new-snapshot').result?.previousSnapshotId,'old-snapshot');
});
test('a rejected snapshot reports its cause once instead of retrying until the display request expires',()=>{
 const hub=new PresentationHub();hub.poll('client-1',display);
 hub.request({id:'request-1',clientId:'client-1',expectedRevision:1,kind:'capture'},()=>true);hub.poll('client-1',display);
 const completion={id:'request-1',clientId:'client-1',display:{...display,revision:2},snapshot:capture('support',42,defaultRulesA(),'B0')};let attempts=0;
 const save=():string=>{attempts++;throw new Error('Snapshot does not match the recorded observation history');};
 const result=hub.complete(completion,save);assert.equal(result.status,'failed');assert.match(result.error!,/observation history/);assert.equal(result.result,undefined);
 assert.deepEqual(hub.complete(completion,save),result);assert.equal(attempts,1);
});
