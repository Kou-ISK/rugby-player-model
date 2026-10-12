import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readPaths } from '../scripts/local-launcher.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'rpm-paths-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const sourceRoot = join(root, 'source'), dataRoot = join(root, 'private');
  const sessionDir = join(dataRoot, 'sessions', 'owner'), file = join(root, 'paths.json');
  mkdirSync(sourceRoot); mkdirSync(sessionDir, { recursive: true });
  writeFileSync(join(sourceRoot, 'package.json'), JSON.stringify({ name: 'rugby-player-model' }));
  const config = { sourceRoot, dataRoot, sessionDir, nodePath: process.execPath };
  const save = () => writeFileSync(file, JSON.stringify(config)); save();
  return { root, file, config, save };
}
test('moving source preserves the independent session destination', t => {
  const f = fixture(t), before = readPaths(f.file);
  const moved = join(f.root, 'moved source'); renameSync(f.config.sourceRoot, moved); f.config.sourceRoot = moved; f.save();
  const after = readPaths(f.file); assert.equal(after.sessionDir, before.sessionDir); assert.notEqual(after.sourceRoot, before.sourceRoot);
});
test('missing or relative session paths fail without creating an empty replacement', t => {
  const f = fixture(t), missing = join(f.config.dataRoot, 'missing');
  assert.throws(() => readPaths(f.file, missing)); assert.equal(existsSync(missing), false);
  assert.throws(() => readPaths(f.file, '.rpm'), /absolute/);
});
test('private sessions cannot escape via symlinks or live in the source tree', t => {
  const f = fixture(t), link = join(f.config.dataRoot, 'escape'); symlinkSync(f.config.sourceRoot, link);
  assert.throws(() => readPaths(f.file, link), /inside dataRoot/);
  f.config.dataRoot = f.config.sourceRoot; f.config.sessionDir = f.config.sourceRoot; f.save();
  assert.throws(() => readPaths(f.file), /separate directory trees/);
});
test('explicit synthetic session selection leaves the owner destination unchanged', t => {
  const f = fixture(t), synthetic = join(f.config.dataRoot, 'synthetic'); mkdirSync(synthetic);
  assert.notEqual(readPaths(f.file, synthetic).sessionDir, readPaths(f.file).sessionDir);
  assert.equal(readPaths(f.file).sessionDir, readPaths(f.file, f.config.sessionDir).sessionDir);
});
