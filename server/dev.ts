import { createServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { Store, ConflictError } from './store';
import { experimentSummary } from './experiment-types';
const port = Number(process.env.PORT || 5173);
const store = new Store();
const server = createServer();
// Share loopback HTTP rather than opening Vite's global default WebSocket port.
const vite = await createViteServer({ server: { middlewareMode: true, host: '127.0.0.1', allowedHosts: ['localhost', '127.0.0.1'], ws: { server, port, clientPort: port } }, appType: 'spa' });
server.on('request', async (req, res) => {
  // Loopback binding plus Host/Origin validation protects the local write bridge.
  const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!hosts.includes(req.headers.host || '')) { res.writeHead(403).end('Invalid Host'); return; }
  if (!req.url?.startsWith('/api/')) { vite.middlewares(req, res); return; }
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.headers.origin && !hosts.map(h => `http://${h}`).includes(req.headers.origin)) throw new Error('Invalid Origin');
    if (req.method === 'GET') {
      if (req.url === '/api/state') { const state = store.read(); res.end(JSON.stringify({ apiVersion: 5, state:{...state,scenes:Object.fromEntries(Object.entries(state.scenes).map(([id,versions])=>[id,versions.map(({definition,trackingIds,...ref})=>({...ref,durationTicks:definition.durationTicks,actorCount:definition.actors.length}))])),evaluationSets:Object.fromEntries(Object.entries(state.evaluationSets).map(([id,set])=>[id,{id,at:set.at,digest:set.digest,caseCount:set.draft.cases.length}])),experiments:Object.fromEntries(Object.entries(state.experiments).map(([id,e])=>[id,experimentSummary(e)]))}, active: store.active(state) })); }
      else if (req.url === '/api/export-b') res.end(JSON.stringify(store.exportBData()));
      else { res.writeHead(404).end('{}'); }
      return;
    }
    if (req.method !== 'POST' || req.headers['x-rpm-local'] !== '1' || !req.headers['content-type']?.startsWith('application/json')) throw new Error('Local JSON request required');
    let body = '';
    for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 2_000_000) throw new Error('Request too large'); }
    const data = JSON.parse(body); let result: unknown;
    switch (req.url) {
      case '/api/scene-compare': result=store.compareScenes(data.beforeId,data.afterId,data.rulesVersion,data.steps);break;
      case '/api/scene': result=store.getScene(data.id,data.revision);break;
      case '/api/scene-create': result=store.createScene(data.definition,data.generationSeed??null);break;
      case '/api/scene-revise': result=store.reviseScene(data.id,data.expectedRevision,data.definition);break;
      case '/api/application': result=store.recordApplication(data.point);break;
      case '/api/snapshot': result = { id: store.saveSnapshot(data.snapshot) }; break;
      case '/api/propose': result = store.propose(data.snapshotId, data.feedback,data.evaluationSetId,data.window); break;
      case '/api/edit': result = store.edit(data.id, data.patchA, data.principle, data.expectedRevision,data.notes); break;
      case '/api/review': store.review(data.id, data.target, data.decision, data.actor, data.expectedRevision,data.reason); result = store.active(); break;
      case '/api/revise': result=store.revise(data.id,data.reason,data.expectedRevision);break;
      case '/api/run': result=store.runExperiment(data.id,data.expectedRevision,data.steps,data.mode);break;
      case '/api/experiment': result=store.read().experiments[data.id];if(!result)throw new Error('Unknown experiment');break;
      case '/api/freeze-evaluation': result=store.freezeEvaluation(data.draft);break;
      case '/api/b-packet': result=store.bPacket(data.id,data.arm,data.group);break;
      case '/api/b-evaluator-map': result=store.bEvaluatorMap(data.id);break;
      case '/api/b-review': result=store.saveBReview(data.id,data.model,data.output,data.assessment,data.arm,data.group);break;
      case '/api/undo': store.undo(data.target, data.actor, data.expectedVersion); result = store.active(); break;
      case '/api/compare': result = store.comparison(data.id, { mode: data.mode || 'active', expectedRevision: data.expectedRevision }); break;
      default: res.writeHead(404).end('{}'); return;
    }
    res.end(JSON.stringify(result));
  } catch (e) { res.writeHead(e instanceof ConflictError ? 409 : 400).end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) })); }
});
server.listen(port, '127.0.0.1', () => console.log(`Research workbench: http://127.0.0.1:${port} (local session: ${store.dir})`));
async function stop() { server.close(); await vite.close(); process.exit(0); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
