import { launch } from '../tools/workbench/platform/macos/local-launcher.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export * from '../tools/workbench/platform/macos/local-launcher.mjs';
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) launch();
