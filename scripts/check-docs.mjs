import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(resolve(root, path), 'utf8');
const catalog = JSON.parse(read('docs/languages.json'));
const inventory = JSON.parse(read('public-files.json'));
const declared = new Set();
const failures = [];
let linkCount = 0;
const prose = text => text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
const anchors = text => {
  const counts = new Map();
  return new Set([...prose(text).matchAll(/^#{1,6}\s+(.+)$/gm)].map(([, title]) => {
    const slug = title.toLowerCase().replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[^\p{Letter}\p{Number}\p{Mark}_\-\s]/gu, '').replace(/ /g, '-');
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1);
    return count ? `${slug}-${count}` : slug;
  }));
};
const declare = path => {
  assert(typeof path === 'string' && !path.startsWith('/') && !path.split('/').includes('..'), 'Invalid documentation path');
  assert(!declared.has(path), `Duplicate documentation entry: ${path}`);
  declared.add(path);
  if (!existsSync(resolve(root, path))) failures.push(`Missing document: ${path}`);
  if (!inventory.includes(path)) failures.push(`Document outside public inventory: ${path}`);
};

assert.equal(catalog.schemaVersion, 1);
for (const pair of catalog.pairs) {
  assert.equal(pair.ja, pair.en.replace(/\.md$/, '.ja.md'));
  for (const path of [pair.en, pair.ja]) {
    declare(path);
    if (!existsSync(resolve(root, path))) continue;
    const body = read(path);
    const nav = `[English](${basename(pair.en)}) | [日本語](${basename(pair.ja)})`;
    if (!body.split('\n').slice(0, 6).includes(nav)) failures.push(`Missing reciprocal language navigation: ${path}`);
    if (!body.startsWith('# ')) failures.push(`Missing document title: ${path}`);
    if (/(?:^|[-_])[AB](?:[-_.]|$)|^b-/i.test(basename(path))) failures.push(`Opaque deliverable filename: ${path}`);
    for (const [, target] of prose(body).matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) continue;
      linkCount++;
      const [file, fragment] = target.split('#');
      const absolute = file ? resolve(root, dirname(path), decodeURIComponent(file)) : resolve(root, path);
      if (relative(root, absolute).startsWith('..')) failures.push(`Link leaves repository: ${path} → ${target}`);
      else if (!existsSync(absolute)) failures.push(`Broken link: ${path} → ${target}`);
      else if (fragment && absolute.endsWith('.md') && !anchors(readFileSync(absolute, 'utf8')).has(decodeURIComponent(fragment))) failures.push(`Broken heading link: ${path} → ${target}`);
    }
  }
}
for (const original of catalog.originals) {
  assert(['historical', 'frozen', 'legal-original'].includes(original.kind));
  declare(original.path);
}
for (const path of inventory.filter(path => path.endsWith('.md'))) {
  if (!declared.has(path)) failures.push(`Unclassified public documentation: ${path}`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Documentation verified: ${catalog.pairs.length} language pairs, ${catalog.originals.length} preserved originals, ${linkCount} local links.`);
}
