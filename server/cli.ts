import { trackingMap } from '../src/scene';
import { readFileSync, writeFileSync } from 'node:fs';
import { Store, type Target } from './store';
import { capture, captureSceneAt, observationContext } from '../src/research';
import type { SceneId } from '../src/contracts';
import { sense } from '../src/simulation';
import { replayObservationHistory } from '../src/observation-history';
const [command = 'help', id, ...rest] = process.argv.slice(2);
const args = process.argv.slice(2);
const flag = (name: string, fallback = '') => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const store = new Store();
let result: unknown;
try {
  switch (command) {
    case 'scene-create': result=store.createScene(JSON.parse(readFileSync(flag('--file'),'utf8')),args.includes('--seed')?Number(flag('--seed')):null);break;
    case 'scene-revise': result=store.reviseScene(id,Number(flag('--revision')),JSON.parse(readFileSync(flag('--file'),'utf8')));break;
    case 'scene-compare': result=store.compareScenes(id,flag('--after'),flag('--rules'),Number(flag('--steps','5')));break;
    case 'scene-comparisons': result=store.read().sceneComparisons;break;
    case 'scenes': result=Object.values(store.read().scenes).flat().map(({definition,trackingIds,...ref})=>({...ref,actorCount:definition.actors.length,durationTicks:definition.durationTicks}));break;
    case 'scene-authoring': {const scene=store.getScene(id,Number(flag('--revision')));result={scene,authorToTracking:trackingMap(scene),warning:'Authoring/audit only. Includes future stimulus and author names. Never pass to A or a blinded B evaluator.'};break;}
    case 'scene-snapshot': {const active=store.active(),scene=store.getScene(id,Number(flag('--revision')));const snapshot=captureSceneAt(scene,active.A,active.B.version,Number(flag('--tick','0')));result={snapshotId:store.saveSnapshot(snapshot),tick:snapshot.world.dynamic!.tick};break;}
    case 'status': result = { directory: store.dir, active: store.active(), candidates: Object.values(store.read().candidates).map(c => ({ id: c.id, revision: c.revision, feedback: c.feedback, decisions: c.decisions })) }; break;
    case 'snapshot': {
      const active = store.active(); const scene = flag('--scene', 'support') as SceneId;
      if (!['support','occluded','audio','heldout'].includes(scene)) throw new Error('Unknown scene');
      const snapshot = capture(scene, Number(flag('--seed', '42')), active.A, active.B.version);
      snapshot.world.body.headYaw = Number(flag('--head', '0')); snapshot.bundle = sense(snapshot.world);
      result = { snapshotId: store.saveSnapshot(snapshot) }; break;
    }
    case 'history-replay': {const snapshot=store.read().snapshots[id];if(!snapshot?.observationHistory)throw new Error('No observation event history in this snapshot; legacy snapshots have no reconstructed trajectory');result=replayObservationHistory(snapshot.observationHistory);break;}
    case 'snapshot-export': result=store.read().snapshots[id];if(!result)throw new Error('Unknown snapshot');break;
    case 'freeze-evaluation': result=store.freezeEvaluation(JSON.parse(readFileSync(flag('--file'),'utf8')));break;
    case 'evaluation-sets': result=Object.values(store.read().evaluationSets).map(set=>({id:set.id,at:set.at,digest:set.digest,caseCount:set.draft.cases.length}));break;
    case 'propose': result = store.propose(id, flag('--feedback'),flag('--evaluation-set')||undefined,args.includes('--from-tick')?{fromTick:Number(flag('--from-tick')),toTick:Number(flag('--to-tick')),playerId:flag('--player','observer-0')}:undefined); break;
    case 'context': {
      const c = store.read().candidates[id]; if (!c) throw new Error('Unknown candidate');
      result = observationContext(c); break;
    }
    case 'edit': { const edit = JSON.parse(readFileSync(flag('--file'), 'utf8')); result = store.edit(id, edit.patchA, edit.principle, Number(flag('--revision')),edit.notes); break; }
    case 'approve': case 'reject': case 'return': store.review(id, flag('--target') as Target, command, flag('--by'), Number(flag('--revision')),flag('--reason')); result = store.active(); break;
    case 'revise': result=store.revise(id,flag('--reason'),Number(flag('--revision')));break;
    case 'undo': store.undo(id as Target, flag('--by'), flag('--version')); result = store.active(); break;
    case 'compare': result = store.comparison(id); break;
    case 'preview': result = store.comparison(id, { mode: 'preview', expectedRevision: Number(flag('--revision')) }); break;
    case 'run': result=store.runExperiment(id,Number(flag('--revision')),Number(flag('--steps','5')),flag('--mode','preview') as 'preview'|'active');break;
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
    default: result = { usage: ['scene-create --file .rpm/scene.json [--seed N]', 'scene-revise SCENE_ID --revision N --file .rpm/scene.json', 'scenes', 'scene-compare SNAPSHOT --after SNAPSHOT --rules A0 --steps 5', 'scene-comparisons', 'scene-authoring SCENE_ID --revision N', 'scene-snapshot SCENE_ID --revision N --tick 10', 'propose SNAPSHOT --feedback text --from-tick 3 --to-tick 10 --player observer-0','status', 'snapshot --scene support --seed 42 --head -2',
      'propose SNAPSHOT --feedback "your correction"', 'context CANDIDATE', 'edit CANDIDATE --file .rpm/edit.json --revision N',
      'approve|reject CANDIDATE --target A|B --by owner --revision N', 'preview CANDIDATE --revision N', 'compare CANDIDATE', 'undo A|B --by owner --version A1|B1',
      'return CANDIDATE --target A|B --by owner --revision N --reason "why"',
      'revise CANDIDATE --revision N --reason "change requested"',
      'run CANDIDATE --revision N --steps 5 --mode preview|active', 'experiments', 'experiment EXPERIMENT_ID',
      'snapshot-export SNAPSHOT_ID', 'history-replay SNAPSHOT_ID', 'freeze-evaluation --file .rpm/evaluation-plan.json', 'evaluation-sets',
      'propose SNAPSHOT_ID --feedback text --evaluation-set FROZEN_SET_ID',
      'b-packet EXPERIMENT_ID --arm none|before|after --cases regression|frozen', 'b-evaluator-map EXPERIMENT_ID', 'b-review EXPERIMENT_ID --file .rpm/b-review.json',
      'export-b-json', 'export-b --out .rpm/RUGBY_JUDGMENT.local.md'] };
  }
  console.log(JSON.stringify(result, null, 2));
} catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; }
