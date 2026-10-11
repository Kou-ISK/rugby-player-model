# Cloud verification record

Environment: Linux, Node.js 24.19.0. Initial working commit: `641e6e1`. Subsequent test/document changes are recorded in Git history.

| Check | Result | Scope |
| --- | --- | --- |
| `npm run typecheck` | Pass | Strict TypeScript across model, UI, server, scripts and tests |
| `npm test` | Pass, 17 tests | Schema rejection and trace serialization; sensory leakage pairs; memory timing/decay; sound; preferences/tactics; deterministic compare and headless replay; approval/rejection/undo/restart; CLI and locking |
| `npm run build` | Pass | Vite production build; large-bundle warning due to Three + local validation code |
| `npm run spike` | Pass | 1,000 validated headless decisions, approximately 54ms in initial run; not a performance guarantee |
| `RPM_CHROMIUM=/usr/bin/chromium npm run test:browser` | Pass, 2 tests | Actual WebGL rendering, head/body view integration, player/spectator distinction, playback, feedback/edit/approval, compare, undo, browser reload, local API origin/host guard |
| Screenshot visual inspection | Pass for Cloud rendering | Pitch, player, first-person frame and research controls visible; synthetic test data only; screenshot kept outside Git |
| Library input bytes / expected ZIP hash | Blocked | Normal materialization and one retry failed; original kit reuse incomplete |
| Remote GitHub Actions | Not asserted here | Workflow provided; check PR status for actual remote result |
| Owner Mac acceptance | Not run | Requires the owner's Mac and feedback session |
| Standalone B AI review | Not run | Protocol supplied; no external AI called |

No passing Cloud check is a claim of human cognitive validity, complete rugby rules, biomechanics, successful physical passing or final Mac acceptance. Follow [Mac acceptance](MAC_ACCEPTANCE.md) for the remaining final demonstration.
