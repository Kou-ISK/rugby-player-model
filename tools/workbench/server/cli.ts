import {mechanismStudy} from '../../experiments/src/mechanism-study';
import {currentEngineDescriptor,repositoryRoot} from './artifact-resolver';
import {newPresentationId} from './presentation';
import {fixedBDocument} from '../../experiments/src/b-standalone';
import { isAbsolute,join } from 'node:path';
import { canonicalWire,parseStrict } from '../../experiments/src/strict-json';
import { statSync } from 'node:fs';
import { finiteMode,legacyMode,unlimitedMode,thinkWithMode } from '../../../models/player/reference/src/index.js';
import { trackingMap } from '../../simulation/src/scene';
import { readFileSync, writeFileSync } from 'node:fs';
import { Store, type Target } from './store';
import { capture, captureSceneAt, observationContext, snapshotObservationContext } from '../research';
import type { SceneId } from '../../simulation/src/contracts';
import { sense } from '../../simulation/src/index';
import { replayObservationHistory,newHistory,appendObservation } from '../../experiments/src/history';
if(Number(process.versions.node.split('.')[0])!==24)throw new Error('Node 24 is required by the pinned research runtime');
const [command = 'help', id, ...rest] = process.argv.slice(2);
const args = process.argv.slice(2);
const flag = (name: string, fallback = '') => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const initDirectory=command==='session'&&id==='init'?flag('--dir'):undefined;
if(initDirectory!==undefined&&(!isAbsolute(initDirectory)||!args.includes('--synthetic')))throw new Error('New tutorial session requires --dir ABSOLUTE_PATH --synthetic');
const store = new Store(initDirectory);
let result: unknown;
try {
  switch (command) {
    case 'session': if(id!=='init')throw new Error('session init --dir ABSOLUTE_PATH --synthetic');result=store.initializeSynthetic();break;
    case 'research-log':result=store.researchLog();break;
    case 'mechanism-study':{const scene=store.getScene(id,Number(flag('--revision'))),active=store.active();result={...mechanismStudy(captureSceneAt(scene,active.A,active.B.version,0,active.executionMode),Number(flag('--steps','40'))),engine:currentEngineDescriptor()};break;}
    case 'export-player':{result={markdown:readFileSync(join(repositoryRoot,'models/judgment/PLAYER_GUIDE.md'),'utf8')+'\n\n---\n\n'+store.exportB()};break;}
    case 'views': case 'view-request': case 'view-result': {
      const lease=JSON.parse(readFileSync(join(store.dir,'.server.json'),'utf8'));
      if(!Number.isInteger(lease.port)||lease.port<1024||lease.port>65535||typeof lease.token!=='string')throw new Error('Invalid local server lease');
      const payload=command==='views'?{action:'views'}:command==='view-result'?{action:'result',id}:{action:'request',request:{id:flag('--request-id')||newPresentationId(),clientId:flag('--client'),expectedRevision:Number(flag('--revision','NaN')),kind:id,...(flag('--snapshot')?{snapshotId:flag('--snapshot')}:{}),...(flag('--experiment')?{experimentId:flag('--experiment'),arm:flag('--arm'),frame:Number(flag('--frame','0'))}:{})}};
      const response=await fetch(`http://127.0.0.1:${lease.port}/api/display-control`,{method:'POST',headers:{'Content-Type':'application/json','X-RPM-Local':'1'},body:JSON.stringify({...payload,token:lease.token}),signal:AbortSignal.timeout(5000)});
      const value=await response.json() as {error?:string};if(!response.ok)throw new Error(value.error||'Display control failed');result=value;break;
    }
    case 'stop': {
      const lease=JSON.parse(readFileSync(join(store.dir,'.server.json'),'utf8'));if(!Number.isInteger(lease.port)||lease.port<1024||lease.port>65535||typeof lease.token!=='string')throw new Error('Invalid local server lease');
      const response=await fetch(`http://127.0.0.1:${lease.port}/api/stop`,{method:'POST',headers:{'Content-Type':'application/json','X-RPM-Local':'1'},body:JSON.stringify({token:lease.token}),signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Owned session server refused stop');result=await response.json();break;
    }
    case 'proposal': {
      const localId=rest[0];
      const readPackage=()=>{const path=flag('--file');if(statSync(path).size>100*1024*1024)throw new Error('Proposal transport too large');return new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(path));};
      if(id==='export'){
        if(!args.includes('--public-synthetic'))throw new Error('--public-synthetic requires your explicit rights confirmation for the listed authored inputs');
        const pkg=store.exportProposal(localId,Number(flag('--revision')),{confirmation:'explicitly-authorized-synthetic-entries-only',author:flag('--author'),rightsBasis:flag('--rights'),targets:flag('--targets').split(',') as ('A'|'B')[]});
        const path=flag('--out');if(!path)throw new Error('--out required');writeFileSync(path,canonicalWire(pkg)+'\n',{mode:0o600});result={path,proposalId:pkg.manifest.proposalId,revision:pkg.manifest.revision};
      }else if(id==='validate')result=store.validateProposal(readPackage());
      else if(id==='import')result=store.importProposal(readPackage());
      else if(id==='rebase'){if(!args.includes('--public-synthetic'))throw new Error('Confirm the new base is authorized synthetic material with --public-synthetic');result=store.rebaseProposal(localId,Number(flag('--session-revision')),flag('--reason'),{confirmation:'explicitly-authorized-synthetic-entries-only',author:flag('--author'),rightsBasis:flag('--rights'),targets:flag('--targets').split(',') as ('A'|'B')[]});}
      else if(id==='reproduce')result=store.reproduceProposal(localId,flag('--manifest'),flag('--targets')?flag('--targets').split(',') as ('A'|'B')[]:undefined);
      else if(id==='adopt'||id==='reject')result=store.reviewProposal(localId,flag('--target') as Target,id==='adopt'?'approve':'reject',flag('--by'),Number(flag('--session-revision')),flag('--manifest'),flag('--run'),flag('--reason'));
      else if(id==='list')result=Object.values(store.read().importedProposals).map(({package:_,...record})=>record);
      else throw new Error('proposal export/validate/import/reproduce/adopt/reject/list');break;
    }
    case 'research-review': result=store.researchReview(id,flag('--run'),flag('--status') as 'support'|'restrict'|'reject',flag('--scope'),flag('--limits'),flag('--reason'),args.includes('--synthetic'));break;
    case 'research-withdraw': result=store.withdrawEvidence(id,Number(flag('--version')),flag('--reason'));break;
    case 'research-evidence': result=store.evidence();break;
    case 'b-standalone-packet': {
      const sources=['--version','--document','--text-file'].filter(f=>args.includes(f));if(sources.length>1)throw new Error('Choose one B version or fixed document');
      const selection={arm:flag('--arm'),...(flag('--version')?{bVersion:flag('--version')}:{ }),...(flag('--document')?{document:parseStrict(readFileSync(flag('--document')))}:{}),...(flag('--text-file')?{document:fixedBDocument(new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(flag('--text-file'))))}:{})};
      result=store.standaloneBPacket(parseStrict(readFileSync(flag('--file'))),selection);break;
    }
    case 'b-standalone-review': {const v=parseStrict(readFileSync(flag('--file'))) as {packet:unknown;model:string;output:string;assessment:unknown};result=store.saveStandaloneBReview(v.packet,v.model,v.output,v.assessment);break;}
    case 'scene-create': result=store.createScene(JSON.parse(readFileSync(flag('--file'),'utf8')),args.includes('--seed')?Number(flag('--seed')):null);break;
    case 'scene-revise': result=store.reviseScene(id,Number(flag('--revision')),JSON.parse(readFileSync(flag('--file'),'utf8')));break;
    case 'scene-compare': result=store.compareScenes(id,flag('--after'),flag('--rules'),Number(flag('--steps','5')));break;
    case 'scene-comparisons': result=store.read().sceneComparisons;break;
    case 'scenes': result=Object.values(store.read().scenes).flat().map(({definition,trackingIds,...ref})=>({...ref,actorCount:definition.actors.length,durationTicks:definition.durationTicks}));break;
    case 'scene-authoring': {const scene=store.getScene(id,Number(flag('--revision')));result={scene,authorToTracking:trackingMap(scene),warning:'Authoring/audit only. Includes future stimulus and author names. Never pass to A or a blinded B evaluator.'};break;}
    case 'scene-snapshot': {const active=store.active(),scene=store.getScene(id,Number(flag('--revision')));const snapshot=captureSceneAt(scene,active.A,active.B.version,Number(flag('--tick','0')),active.executionMode);result={snapshotId:store.saveSnapshot(snapshot),tick:snapshot.world.dynamic!.tick};break;}
    case 'status': result = { directory: store.dir, active: store.active(), candidates: Object.values(store.read().candidates).map(c => ({ id: c.id, revision: c.revision, feedback: c.feedback, decisions: c.decisions })) }; break;
    case 'snapshot': {
      const active = store.active(); const scene = flag('--scene', 'support') as SceneId;
      if (!['support','occluded','audio','heldout'].includes(scene)) throw new Error('Unknown scene');
      const snapshot = capture(scene, Number(flag('--seed', '42')), active.A, active.B.version,active.executionMode);
      snapshot.world.body.headYaw = Number(flag('--head', '0')); snapshot.bundle = sense(snapshot.world);
      result = { snapshotId: store.saveSnapshot(snapshot) }; break;
    }
    case 'snapshot-turn': {
      const previous=store.read().snapshots[id];if(!previous)throw new Error('Unknown snapshot');const head=Number(flag('--head'));if(!Number.isFinite(head)||head< -2.4||head>2.4)throw new Error('--head must be radians between -2.4 and 2.4');
      const next=structuredClone(previous),history=next.observationHistory??newHistory(next.memoryBefore,next.world);if(!history.events.length)appendObservation(history,next.bundle,next.profile,next.rulesA,'initial',next.executionMode);
      next.memoryBefore=thinkWithMode(next.bundle,next.memoryBefore,next.profile,next.rulesA,next.executionMode??legacyMode()).longTermMemory;next.world.body.headYaw=head;if(next.world.runtime)next.world.runtime.actors.find(a=>a.id===next.world.dynamic!.scene.definition.controlledPlayerId)!.body=structuredClone(next.world.body);next.bundle=sense(next.world);appendObservation(history,next.bundle,next.profile,next.rulesA,'head-turn',next.executionMode);next.observationHistory=history;result={snapshotId:store.saveSnapshot(next)};break;
    }
    case 'history-replay': {const snapshot=store.read().snapshots[id];if(!snapshot?.observationHistory)throw new Error('No observation event history in this snapshot; legacy snapshots have no reconstructed trajectory');result=replayObservationHistory(snapshot.observationHistory);break;}
    case 'snapshot-export': result=store.read().snapshots[id];if(!result)throw new Error('Unknown snapshot');break;
    case 'snapshot-context': {
      const snapshot=store.read().snapshots[id];if(!snapshot)throw new Error('Unknown snapshot');
      result={snapshotId:id,...snapshotObservationContext(snapshot)};break;
    }
    case 'freeze-evaluation': result=store.freezeEvaluation(JSON.parse(readFileSync(flag('--file'),'utf8')));break;
    case 'evaluation-sets': result=Object.values(store.read().evaluationSets).map(set=>({id:set.id,at:set.at,digest:set.digest,caseCount:set.draft.cases.length}));break;
    case 'propose': result = store.propose(id, flag('--feedback'),flag('--evaluation-set')||undefined,args.includes('--from-tick')?{fromTick:Number(flag('--from-tick')),toTick:Number(flag('--to-tick')),playerId:flag('--player','observer-0')}:undefined); break;
    case 'context': {
      const c = store.read().candidates[id]; if (!c) throw new Error('Unknown candidate');
      result = observationContext(c); break;
    }
    case 'edit': { const edit = JSON.parse(readFileSync(flag('--file'), 'utf8')); result = store.edit(id, edit.patchA, edit.principle, Number(flag('--revision')),edit.notes,edit.executionMode,edit.replaceB); break; }
    case 'approve': case 'reject': case 'return': store.review(id, flag('--target') as Target, command, flag('--by'), Number(flag('--revision')),flag('--reason')); result = store.active(); break;
    case 'revise': result=store.revise(id,flag('--reason'),Number(flag('--revision')));break;
    case 'undo': store.undo(id as Target, flag('--by'), flag('--version')); result = store.active(); break;
    case 'mode-study': result=store.modeStudy(id,Number(flag('--revision')),Number(flag('--k')));break;
    case 'mode-studies': result=store.read().modeStudies;break;
    case 'mode-edit': {const c=store.read().candidates[id];if(!c)throw new Error('Unknown candidate');const m=flag('--mode');if(!['legacy','finite','unlimited'].includes(m))throw new Error('--mode must be legacy/finite/unlimited');result=store.edit(id,c.patchA,c.principle,Number(flag('--revision')),c.notes,m==='legacy'?legacyMode():m==='finite'?finiteMode(Number(flag('--k'))):unlimitedMode());break;}
    case 'compare': result = store.comparison(id); break;
    case 'preview': result = store.comparison(id, { mode: 'preview', expectedRevision: Number(flag('--revision')) }); break;
    case 'run': result=store.runExperiment(id,Number(flag('--revision')),Number(flag('--steps','5')),flag('--mode','preview') as 'preview'|'active',flag('--start','coaching') as 'coaching'|'snapshot');break;
    case 'experiments': result=Object.values(store.read().experiments).map(e=>({id:e.id,at:e.at,candidateId:e.candidateId,mode:e.mode,candidateRevision:e.candidateRevision}));break;
    case 'experiment': result=store.read().experiments[id];if(!result)throw new Error('Unknown experiment');break;
    case 'b-packet': result=store.bPacket(id,flag('--arm') as 'none'|'before'|'after',flag('--cases') as 'regression'|'frozen');break;
    case 'b-evaluator-map': result=store.bEvaluatorMap(id);break;
    case 'b-review': {const input=JSON.parse(readFileSync(flag('--file'),'utf8'));result=store.saveBReview(id,input.model,input.output,input.assessment,input.arm,input.group);break;}
    case 'export-b-json': result=store.exportBData();break;
    case 'export-b': {
      const path = flag('--out'); if (!path) throw new Error('--out required, e.g. .rpm/RUGBY_JUDGMENT.local.md');
      writeFileSync(path, store.exportB(), { mode: 0o600 }); result = { path, version: store.active().B.version }; break;
    }
    default: result = { usage: ['research-log', 'mechanism-study SCENE_ID --revision N --steps 40 --out ABSOLUTE_JSON', 'export-player --out ABSOLUTE_JSON', 'view-request compare --client ID --revision N --experiment ID --arm before|after --frame N', 'view-request return --client ID --revision N', 'views', 'view-request capture|present --client DISPLAY_ID --revision N [--snapshot SNAPSHOT_ID] [--request-id REQUEST_ID]', 'view-result REQUEST_ID', 'b-standalone-packet --file CASES.json --arm none|old|new [--version B0 | --text-file PRINCIPLES.md | --document FIXED_DOCUMENT.json]', 'b-standalone-review --file REVIEW.json (packet, model, output, separate assessment scores)', 'scene-create --file .rpm/scene.json [--seed N]', 'scene-revise SCENE_ID --revision N --file .rpm/scene.json', 'scenes', 'scene-compare SNAPSHOT --after SNAPSHOT --rules A0 --steps 5', 'scene-comparisons', 'scene-authoring SCENE_ID --revision N', 'scene-snapshot SCENE_ID --revision N --tick 10', 'propose SNAPSHOT --feedback text --from-tick 3 --to-tick 10 --player observer-0','status', 'snapshot --scene support --seed 42 --head -2',
      'propose SNAPSHOT --feedback "your correction"', 'context CANDIDATE', 'edit CANDIDATE --file .rpm/edit.json --revision N',
      'approve|reject CANDIDATE --target A|B --by owner --revision N', 'preview CANDIDATE --revision N', 'compare CANDIDATE', 'undo A|B --by owner --version A1|B1',
      'return CANDIDATE --target A|B --by owner --revision N --reason "why"',
      'revise CANDIDATE --revision N --reason "change requested"',
      'run CANDIDATE --revision N --steps 5 --mode preview|active [--start coaching|snapshot]', 'experiments', 'experiment EXPERIMENT_ID',
      'snapshot-context SNAPSHOT_ID (observations only)', 'snapshot-export SNAPSHOT_ID (authoring world included)', 'history-replay SNAPSHOT_ID', 'freeze-evaluation --file .rpm/evaluation-plan.json', 'evaluation-sets',
      'propose SNAPSHOT_ID --feedback text --evaluation-set FROZEN_SET_ID',
      'b-packet EXPERIMENT_ID --arm none|before|after --cases regression|frozen', 'b-evaluator-map EXPERIMENT_ID', 'b-review EXPERIMENT_ID --file .rpm/b-review.json',
      'export-b-json', 'export-b --out .rpm/RUGBY_JUDGMENT.local.md'] };
  }
  if(['research-log','mechanism-study','export-player'].includes(command)&&flag('--out')){const path=flag('--out');if(!isAbsolute(path))throw new Error('--out must be an absolute path');writeFileSync(path,JSON.stringify(result,null,2)+'\n',{mode:0o600});result={path};}
  console.log(JSON.stringify(result, null, 2));
} catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; }
