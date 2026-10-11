# Mac headless verification — local review branch

On 2026-10-11 UTC, the owner's Mac ran the research foundation from a fresh checkout of PR #1 head `9bb52f4563254ae35fb2ed54ce722492e165e44c`, followed by this local P2P adapter branch. macOS 26.6.2 / arm64, dedicated Node 24.21.0 / npm 11.19.0 / Chrome 154.0.8037.98, unchanged package-lock. Screen unlock and system/browser safety settings were not changed. Existing video processing was not controlled or stopped.

This is **automated synthetic Mac evidence**, not owner screen acceptance, approval of real research principles, a B AI evaluation, human validity or an OSS license decision. The owner's default `.rpm/` remains empty; test sessions were stored separately. No paid API or external model was used.

## Checks and scope

- Baseline: manifest, typecheck, 27 unit tests and production build passed.
- Baseline browser run: 3/4 passed. Running normal workbench and browser-test server together reproduced a Vite HMR WebSocket collision on port 24678; the loop reached its final assertion but recorded WebSocket errors. The local fix attaches Vite WS to each loopback HTTP server. Errors are not suppressed.
- P2P adapter: original kit ZIP and all four file hashes/sizes verified, plus the original models.ts Git blob. Source bytes remain unchanged; only the RPM wrapper and view lifecycle changed. No P2P engine, world-truth camera, core types, Auth, Blob or GLB was imported.
- 29 unit tests passed, including paired head-turn/memory/audio tests, hidden-truth invariance, independent A/B review, candidate revision CAS, source hash identity and disposal of shared resources/skeletons.
- Existing 4 browser tests passed on the adapter branch: UI research loop, request guards, 409/reconfirmation race and old-bridge refusal.
- Additional lifecycle/pixel test passed: three mounts, repeated removal/recreation with stable renderer geometry/texture counts, no idle renders, complete canvas removal and unchanged first-person pixels when a hidden ball changes. The first attempt exceeded the default 30-second limit under software WebGL; two removal/recreation cycles per mount and a 90-second test budget passed (about 21 seconds). No application assertion was relaxed.
- Dedicated end-to-end Mac script passed: first-person head turn and original observation time; scene/seed/time/player snapshot; UI candidate → actual CLI observation-only context → CLI edit visible in UI; pending preview without state writes; eight comparison strata; stale revision HTTP 409; separate synthetic A then B confirmation; same-input carry→scan comparison; B Markdown export; real server process restart preserving approval state; independent A/B undo; second process restart preserving snapshots, candidates and audit history.
- Synthetic first-person and spectator screenshots were visually inspected: procedural player and pitch are rendered, with evidence and review controls. They are private local evidence, outside Git.

Browser checks use one headless Chrome worker and SwiftShader software rendering in a temporary profile with Chromium sandbox enabled, at low process priority. The default research screen renders only on input, simulation step, resize or spectator orbit changes. Paused sessions do not run a continuous rendering loop.

Final verification of this tree: `npm run check` passed (manifest, typecheck, 29 unit tests, build); all **5 browser tests passed together in 41.6 seconds**. The build retains its advisory large-bundle warning. A 1,000-decision spike and the 10-step support/42 CLI replay also ran locally; their timings are plumbing evidence, not performance guarantees.

## Remaining owner work

Follow [MAC_ACCEPTANCE.md](MAC_ACCEPTANCE.md) after unlocking the screen normally. The owner must actually view the scene, give feedback and decide which real candidates to adopt. Safari and interactive native-GPU rendering have not been verified. B's independent AI evaluation and scientific calibration remain separate. A physical pass, contact, gait or muscle model has not been added.

This branch is local and pending parent review. P2P source remains UNLICENSED with its original notices; public push requires the separate publication/license decision described in [PROVENANCE.md](PROVENANCE.md). Cloud CI evidence belongs to the original PR head; no new remote CI is claimed for this local branch.
