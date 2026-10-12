import { readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, relative, resolve, join, dirname, delimiter, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const within = (root, path) => { const r = relative(root, path); return r === '' || (!r.startsWith(`..${sep}`) && r !== '..' && !isAbsolute(r)); };
export const defaultPathsFile = () => join(homedir(), 'Library/Application Support/RugbyPlayerModel/paths.json');
export function readPaths(file, sessionOverride) {
  const config = JSON.parse(readFileSync(file, 'utf8'));
  const checked = (value, name, directory = true) => {
    if (typeof value !== 'string' || !isAbsolute(value)) throw new Error(`${name} must be an absolute path`);
    const path = realpathSync(value); // Never create or silently initialize a missing session.
    if (directory ? !statSync(path).isDirectory() : !statSync(path).isFile()) throw new Error(`Invalid ${name}`);
    return path;
  };
  const sourceRoot = checked(config.sourceRoot, 'sourceRoot');
  const dataRoot = checked(config.dataRoot, 'dataRoot');
  const sessionDir = checked(sessionOverride ?? config.sessionDir, 'sessionDir');
  const nodePath = checked(config.nodePath, 'nodePath', false);
  if (within(sourceRoot, dataRoot) || within(dataRoot, sourceRoot)) throw new Error('Source and private data must be separate directory trees');
  if (!within(dataRoot, sessionDir) || sessionDir === dataRoot) throw new Error('sessionDir must be inside dataRoot');
  if (JSON.parse(readFileSync(join(sourceRoot, 'package.json'), 'utf8')).name !== 'rugby-player-model') throw new Error('Wrong sourceRoot');
  const port = config.port ?? 5173;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port');
  return { sourceRoot, dataRoot, sessionDir, nodePath, port };
}

export function launch(args = process.argv.slice(2), file = process.env.RPM_PATHS_FILE || defaultPathsFile()) {
  try {
    if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Use the dedicated Node 24 runtime');
    const [mode, ...rest] = args;
    if (!['start', 'bridge'].includes(mode)) throw new Error('Usage: local-launcher.mjs start | bridge COMMAND ...');
    if (mode === 'start' && rest.length) throw new Error('start accepts no additional arguments');
    const p = readPaths(file, process.env.RPM_SESSION_DIR);
    if (mode === 'start') console.log(`Research workbench: http://127.0.0.1:${p.port}\nPrivate session: ${p.sessionDir}\nStop: Control-C`);
    const child = spawn(p.nodePath, ['--import', 'tsx', mode === 'start' ? 'tools/workbench/server/dev.ts' : 'tools/workbench/server/cli.ts', ...rest], {
      cwd: p.sourceRoot, stdio: 'inherit',
      env: { ...process.env, RPM_SESSION_DIR: p.sessionDir, PORT: String(p.port), PATH: `${dirname(p.nodePath)}${delimiter}${process.env.PATH || ''}` },
    });
    const interrupt = () => child.kill('SIGINT'), terminate = () => child.kill('SIGTERM');
    process.on('SIGINT', interrupt); process.on('SIGTERM', terminate);
    const cleanup = () => { process.off('SIGINT', interrupt); process.off('SIGTERM', terminate); };
    child.on('error', error => { cleanup(); console.error(error.message); process.exitCode = 1; });
    child.on('exit', (code, signal) => { cleanup(); process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1); });
    return child;
  } catch (error) { console.error(`Local setup error: ${error.message}`); process.exitCode = 1; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) launch();
