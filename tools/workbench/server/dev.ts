import {writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import { parseStrict } from '../../experiments/src/strict-json';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { Store, ConflictError } from './store';
import { PresentationHub } from './presentation';
const presentation = new PresentationHub();
import { digest } from '../../experiments/src/evaluation';
import { experimentSummary } from '../../experiments/src/records';
if(Number(process.versions.node.split('.')[0])!==24)throw new Error('Node 24 is required by the pinned research runtime');
const port = Number(process.env.PORT || 5173);
const store = new Store();
const server = createServer();
const leasePath=join(store.dir,'.server.json'),instanceToken=randomUUID();
function releaseLease(){if(existsSync(leasePath)&&JSON.parse(readFileSync(leasePath,'utf8')).token===instanceToken)rmSync(leasePath);}
// Share loopback HTTP rather than opening Vite's global default WebSocket port.
const vite = await createViteServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true, host: '127.0.0.1', allowedHosts: ['localhost', '127.0.0.1'], ws: { server, port, clientPort: port } }, appType: 'spa' });
server.on('request', async (req, res) => {
  // Loopback binding plus Host/Origin validation protects the local write bridge.
  const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!hosts.includes(req.headers.host || '')) { res.writeHead(403).end('Invalid Host'); return; }
  if (!req.url?.startsWith('/api/')) { vite.middlewares(req, res); return; }
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.headers.origin && !hosts.map(h => `http://${h}`).includes(req.headers.origin)) throw new Error('Invalid Origin');
    if (req.method === 'GET') {
      if (req.url === '/api/state') { const state = store.current(); res.end(JSON.stringify({ apiVersion: 11, state:{...state,evidenceGraph:{nodeCount:state.evidenceGraph.nodes.length,linkCount:state.evidenceGraph.links.length,decisionCount:state.evidenceGraph.decisions.length},publicExports:state.publicExports.map(({package:pkg,...entry})=>({...entry,proposalId:pkg.manifest.proposalId})),importedProposals:Object.fromEntries(Object.entries(state.importedProposals).map(([id,{package:pkg,runs,...entry}])=>[id,{...entry,title:pkg.manifest.title,targets:pkg.manifest.targets.map(t=>t.kind),runs:runs.map(r=>({id:r.run.id,matches:r.matches,resultDigest:r.run.resultDigest}))}])),scenes:Object.fromEntries(Object.entries(state.scenes).map(([id,versions])=>[id,versions.map(({definition,trackingIds,...ref})=>({...ref,durationTicks:definition.durationTicks,actorCount:definition.actors.length}))])),evaluationSets:Object.fromEntries(Object.entries(state.evaluationSets).map(([id,set])=>[id,{id,at:set.at,digest:set.digest,caseCount:set.draft.cases.length}])),experiments:Object.fromEntries(Object.entries(state.experiments).map(([id,e])=>[id,experimentSummary(e)]))}, active: store.active(state) })); }
      else if (req.url === '/api/export-b') res.end(JSON.stringify(store.exportBData()));
      else { res.writeHead(404).end('{}'); }
      return;
    }
    if (req.method !== 'POST' || req.headers['x-rpm-local'] !== '1' || !req.headers['content-type']?.startsWith('application/json')) throw new Error('Local JSON request required');
    const chunks:Buffer[]=[];let bytes=0;const limit=req.url?.startsWith('/api/proposal-')?110*1024*1024:2_000_000;
    for await (const chunk of req) { bytes+=chunk.length;if(bytes>limit)throw new Error('Request too large');chunks.push(chunk); }
    const data = parseStrict(Buffer.concat(chunks)) as Record<string,any>; let result: unknown;
    switch (req.url) {
      case '/api/display-poll': {
        const command=presentation.poll(data.clientId,data.display);
        result={command,...(command?.kind==='present'?{snapshot:store.getSnapshot(command.snapshotId!)}:{})};break;
      }
      case '/api/display-complete': {
        const old=store.read().presentationReceipts?.[data.id];if(old){if(old.clientId!==data.clientId)throw new Error('Receipt client mismatch');result=old;break;}
        if(data.comparison){const c=data.comparison,e=store.read().experiments[c.experimentId],frame=e?.results.recorded[c.arm as 'before'|'after']?.frames[c.frame];if(!frame||data.display?.time!==frame.time)throw new Error('Comparison frame mismatch');}
        result=presentation.complete(data,snapshot=>store.saveSnapshot(snapshot));if((result as any).status==='completed')store.recordPresentation(result as any);break;
      }
      case '/api/display-control': {
        if(data.token!==instanceToken)throw new Error('Wrong session instance');
        if(data.action==='views')result=presentation.list();
        else if(data.action==='request'){const old=store.read().presentationReceipts?.[data.request?.id];if(old){for(const key of ['clientId','expectedRevision','kind','snapshotId','experimentId','arm','frame'] as const)if(old[key]!==data.request[key])throw new Error('Request ID already used with different input');result=old;}else result=presentation.request(data.request,id=>!!store.read().snapshots[id],(id,arm,index)=>!!store.read().experiments[id]?.results.recorded[arm as 'before'|'after']?.frames[index]);}
        else if(data.action==='result')result=store.read().presentationReceipts?.[data.id]??presentation.result(data.id);
        else throw new Error('Unknown display control');break;
      }
      case '/api/stop': if(data.token!==instanceToken)throw new Error('Wrong session instance');result={status:'stopping'};setImmediate(()=>void stop());break;
      case '/api/proposal-export': result=store.exportProposal(data.id,data.expectedRevision,data.scope);break;
      case '/api/proposal-validate': result=store.validateProposal(data.packageText);break;
      case '/api/proposal-import': result=store.importProposal(data.packageText);break;
      case '/api/proposal-reproduce': result=store.reproduceProposal(data.id,data.manifestSha256,data.targets);break;
      case '/api/proposal-rebase': result=store.rebaseProposal(data.id,data.expectedSessionRevision,data.reason,data.scope);break;
      case '/api/proposal-review': result=store.reviewProposal(data.id,data.target,data.decision,data.actor,data.expectedSessionRevision,data.manifestSha256,data.runId,data.reason);break;
      case '/api/research-review': result=store.researchReview(data.id,data.runId,data.status,data.scope,data.limits,data.reason,data.synthetic);break;
      case '/api/research-withdraw': result=store.withdrawEvidence(data.id,data.version,data.reason);break;
      case '/api/research-evidence': result=store.evidence();break;
      case '/api/b-standalone-packet': result=store.standaloneBPacket(data.cases,data.selection);break;
      case '/api/b-standalone-review': result=store.saveStandaloneBReview(data.packet,data.model,data.output,data.assessment);break;
      case '/api/scene-compare': result=store.compareScenes(data.beforeId,data.afterId,data.rulesVersion,data.steps);break;
      case '/api/scene': result=store.getScene(data.id,data.revision);break;
      case '/api/scene-create': result=store.createScene(data.definition,data.generationSeed??null);break;
      case '/api/scene-revise': result=store.reviseScene(data.id,data.expectedRevision,data.definition);break;
      case '/api/application': result=store.recordApplication(data.point);break;
      case '/api/snapshot': result = { id: store.saveSnapshot(data.snapshot,data.requestId), sha256:digest(data.snapshot) }; break;
      case '/api/propose': result = store.propose(data.snapshotId, data.feedback,data.evaluationSetId,data.window); break;
      case '/api/edit': result = store.edit(data.id, data.patchA, data.principle, data.expectedRevision,data.notes,data.executionMode,data.replaceB); break;
      case '/api/review': store.review(data.id, data.target, data.decision, data.actor, data.expectedRevision,data.reason); result = store.active(); break;
      case '/api/revise': result=store.revise(data.id,data.reason,data.expectedRevision);break;
      case '/api/run': result=store.runExperiment(data.id,data.expectedRevision,data.steps,data.mode);break;
      case '/api/experiment': result=store.read().experiments[data.id];if(!result)throw new Error('Unknown experiment');break;
      case '/api/freeze-evaluation': result=store.freezeEvaluation(data.draft);break;
      case '/api/b-packet': result=store.bPacket(data.id,data.arm,data.group);break;
      case '/api/b-evaluator-map': result=store.bEvaluatorMap(data.id);break;
      case '/api/b-review': result=store.saveBReview(data.id,data.model,data.output,data.assessment,data.arm,data.group);break;
      case '/api/undo': store.undo(data.target, data.actor, data.expectedVersion); result = store.active(); break;
      case '/api/mode-study': result=store.modeStudy(data.id,data.expectedRevision,data.k);break;
      case '/api/compare': result = store.comparison(data.id, { mode: data.mode || 'active', expectedRevision: data.expectedRevision }); break;
      default: res.writeHead(404).end('{}'); return;
    }
    res.end(JSON.stringify(result));
  } catch (e) { res.writeHead(e instanceof ConflictError ? 409 : 400).end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) })); }
});
writeFileSync(leasePath,JSON.stringify({port,token:instanceToken,pid:process.pid}),{mode:0o600,flag:'wx'});
server.on('error',async(error)=>{releaseLease();await vite.close();console.error(error);process.exitCode=1;});
server.listen(port, '127.0.0.1', () => console.log(`Research workbench: http://127.0.0.1:${port} (local session: ${store.dir})`));
async function stop() { server.close();await vite.close();releaseLease();process.exit(0); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
