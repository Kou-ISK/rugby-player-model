#!/usr/bin/env node
// Explicit file I/O is an outer adapter; the A library never reads a session/world.
import { readFileSync, writeFileSync } from 'node:fs';
import { think, validate, execute } from './src/index.js';
import type { Bundle, Memory, Profile, RulesA } from './src/contracts.js';

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log('rpm-player --input observations.json [--out trace.json]\nObservation-only A: bundle, memory, profile, rules. No world, B, UI or session. V2 adds executionContractVersion:2 and executionMode. H-WM-1 limits receiver deliberation only, not all judgments or complete human working memory.');
  } else {
    if (![2, 4].includes(args.length) || args[0] !== '--input' || (args.length === 4 && args[2] !== '--out')) {
      throw new Error('Use --input FILE [--out FILE]');
    }
    const input: unknown = JSON.parse(readFileSync(args[1], 'utf8'));
    if (input && typeof input==='object' && 'executionContractVersion' in input) {
      const output=JSON.stringify(execute(input),null,2)+'\n';if(args[3])writeFileSync(args[3],output);else process.stdout.write(output);
    } else {
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        Object.keys(input).sort().join(',') !== 'bundle,memory,profile,rules') {
      throw new Error('A input requires only bundle, memory, profile, rules');
    }
    const { bundle, memory, profile, rules } = input as { bundle: Bundle; memory: Memory; profile: Profile; rules: RulesA };
    validate('Bundle', bundle); validate('Memory', memory); validate('Profile', profile); validate('RulesA', rules);
    const output = JSON.stringify(think(bundle, memory, profile, rules), null, 2) + '\n';
    if (args[3]) writeFileSync(args[3], output); else process.stdout.write(output);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
