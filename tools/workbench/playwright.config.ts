import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export default defineConfig({
  testDir: './tests/browser', workers: 1, fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:5174', viewport: { width: 1440, height: 1000 },
    launchOptions: { ...(process.env.RPM_CHROMIUM ? { executablePath: process.env.RPM_CHROMIUM } : {}), chromiumSandbox:process.platform==='darwin', args: process.platform==='darwin'?['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-vsync']:['--no-sandbox','--enable-unsafe-swiftshader'] } },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5174', reuseExistingServer: false,
    env: { PORT: '5174', RPM_SESSION_DIR: mkdtempSync(join(tmpdir(),'rpm-browser-')) } },
});
