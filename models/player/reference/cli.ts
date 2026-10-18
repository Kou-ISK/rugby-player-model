#!/usr/bin/env node
// Explicit file I/O is an outer adapter; the A library never reads a session/world.
import { readFileSync, writeFileSync } from 'node:fs';
import { execute, importBundle, importMemory, importExecutionMode, baselineMode } from './src/index.js';

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log('rpm-player --input observations.json [--out trace.json]\nObservation-only A: bundle, memory, profile, rules. No world, B, UI or session. Use the current executionContractVersion:2 envelope with explicit executionMode. H-WM-1 limits receiver deliberation only, not all judgments or complete human working memory.');
  } else {
    if (![2, 4].includes(args.length) || args[0] !== '--input' || (args.length === 4 && args[2] !== '--out')) {
      throw new Error('Use --input FILE [--out FILE]');
    }
    const input: unknown = JSON.parse(readFileSync(args[1], 'utf8'));
    if (!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Invalid player input');
    const raw=input as any;
    const keys=Object.keys(raw).sort().join(',');
    if(keys!=='bundle,memory,profile,rules'&&keys!=='bundle,executionContractVersion,executionMode,memory,profile,rules')throw new Error('Unexpected player input fields');
    if(raw.executionContractVersion!==undefined&&raw.executionContractVersion!==2)throw new Error('Unsupported execution contract');
    const output=JSON.stringify(execute({...raw,executionContractVersion:2,executionMode:importExecutionMode(raw.executionMode??baselineMode()),bundle:importBundle(raw.bundle),memory:importMemory(raw.memory)}),null,2)+'\n';
    if(args[3])writeFileSync(args[3],output);else process.stdout.write(output);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
