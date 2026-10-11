import { createServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { Store, ConflictError } from './store';
const port = Number(process.env.PORT || 5173);
const store = new Store();
const vite = await createViteServer({ server: { middlewareMode: true, host: '127.0.0.1', allowedHosts: ['localhost', '127.0.0.1'] }, appType: 'spa' });
const server = createServer(async (req, res) => {
  // Loopback binding plus Host/Origin validation protects the local write bridge.
  const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!hosts.includes(req.headers.host || '')) { res.writeHead(403).end('Invalid Host'); return; }
  if (!req.url?.startsWith('/api/')) { vite.middlewares(req, res); return; }
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.headers.origin && !hosts.map(h => `http://${h}`).includes(req.headers.origin)) throw new Error('Invalid Origin');
    if (req.method === 'GET') {
      if (req.url === '/api/state') { const state = store.read(); res.end(JSON.stringify({ apiVersion: 2, state, active: store.active(state) })); }
      else if (req.url === '/api/export-b') res.end(JSON.stringify({ markdown: store.exportB() }));
      else { res.writeHead(404).end('{}'); }
      return;
    }
    if (req.method !== 'POST' || req.headers['x-rpm-local'] !== '1' || !req.headers['content-type']?.startsWith('application/json')) throw new Error('Local JSON request required');
    let body = '';
    for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 2_000_000) throw new Error('Request too large'); }
    const data = JSON.parse(body); let result: unknown;
    switch (req.url) {
      case '/api/snapshot': result = { id: store.saveSnapshot(data.snapshot) }; break;
      case '/api/propose': result = store.propose(data.snapshotId, data.feedback); break;
      case '/api/edit': result = store.edit(data.id, data.patchA, data.principle, data.expectedRevision); break;
      case '/api/review': store.review(data.id, data.target, data.decision, data.actor, data.expectedRevision); result = store.active(); break;
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
