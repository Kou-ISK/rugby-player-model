import { readFileSync, writeFileSync } from 'node:fs';
import { Store, type Target } from './store';
import { capture } from '../src/research';
import type { SceneId } from '../src/contracts';
import { sense } from '../src/simulation';
const [command = 'help', id, ...rest] = process.argv.slice(2);
const args = process.argv.slice(2);
const flag = (name: string, fallback = '') => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const store = new Store();
let result: unknown;
try {
  switch (command) {
    case 'status': result = { directory: store.dir, active: store.active(), candidates: Object.values(store.read().candidates).map(c => ({ id: c.id, revision: c.revision, feedback: c.feedback, decisions: c.decisions })) }; break;
    case 'snapshot': {
      const active = store.active(); const scene = flag('--scene', 'support') as SceneId;
      if (!['support','occluded','audio','heldout'].includes(scene)) throw new Error('Unknown scene');
      const snapshot = capture(scene, Number(flag('--seed', '42')), active.A, active.B.version);
      snapshot.world.body.headYaw = Number(flag('--head', '0')); snapshot.bundle = sense(snapshot.world);
      result = { snapshotId: store.saveSnapshot(snapshot) }; break;
    }
    case 'propose': result = store.propose(id, flag('--feedback')); break;
    case 'context': {
      const c = store.read().candidates[id]; if (!c) throw new Error('Unknown candidate');
      const { scene, seed, bundle, memoryBefore, profile, rulesA, rulesBVersion } = c.context;
      result = { id, revision: c.revision, feedback: c.feedback, scene, seed, bundle, memoryBefore, profile, rulesA, rulesBVersion,
        editable: { patchA: c.patchA, principle: c.principle }, decisions: c.decisions }; break;
    }
    case 'edit': { const edit = JSON.parse(readFileSync(flag('--file'), 'utf8')); result = store.edit(id, edit.patchA, edit.principle, Number(flag('--revision'))); break; }
    case 'approve': case 'reject': store.review(id, flag('--target') as Target, command, flag('--by'), Number(flag('--revision'))); result = store.active(); break;
    case 'undo': store.undo(id as Target, flag('--by'), flag('--version')); result = store.active(); break;
    case 'compare': result = store.comparison(id); break;
    case 'preview': result = store.comparison(id, { mode: 'preview', expectedRevision: Number(flag('--revision')) }); break;
    case 'export-b': {
      const path = flag('--out'); if (!path) throw new Error('--out required, e.g. .rpm/RUGBY_JUDGMENT.local.md');
      writeFileSync(path, store.exportB(), { mode: 0o600 }); result = { path, version: store.active().B.version }; break;
    }
    default: result = { usage: ['status', 'snapshot --scene support --seed 42 --head -2',
      'propose SNAPSHOT --feedback "your correction"', 'context CANDIDATE', 'edit CANDIDATE --file .rpm/edit.json --revision N',
      'approve|reject CANDIDATE --target A|B --by owner --revision N', 'preview CANDIDATE --revision N', 'compare CANDIDATE', 'undo A|B --by owner --version A1|B1',
      'export-b --out .rpm/RUGBY_JUDGMENT.local.md'] };
  }
  console.log(JSON.stringify(result, null, 2));
} catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; }
