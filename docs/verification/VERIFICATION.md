# Cloud verification record

This section is historical Cloud evidence. The local Mac follow-up and verified P2P adapter are recorded separately in [MAC_HEADLESS.md](./MAC_HEADLESS.md). Owner screen acceptance remains pending.

Environment: Linux, Node.js 24.19.0. Initial working commit: `641e6e1`. Subsequent test/document changes are recorded in Git history.

| Check | Result | Scope |
| --- | --- | --- |
| `npm run typecheck` | Pass | Strict TypeScript across model, UI, server, scripts and tests |
| `npm test` | Pass, 27 tests after review fixes | Schema/trace serialization; leakage pairs; causal memory/audio tests; preferences/tactics; preview vs active compare; stratified cases; revision CAS; approval receipts; undo/restart; CLI and deterministic replay |
| `npm run build` | Pass | Vite production build; large-bundle warning due to Three + local validation code |
| `npm run spike` | Pass | 1,000 validated headless decisions, approximately 54ms in initial run; not a performance guarantee |
| `RPM_CHROMIUM=/usr/bin/chromium npm run test:browser` | Pass, 4 tests after review fixes | Actual WebGL, head/body camera, player/spectator separation, playback, candidate preview, approval/compare/undo/reload, API guards, stale UI approval returning 409 with reconfirmation, and old-bridge write refusal |
| Screenshot visual inspection | Pass for Cloud rendering | Pitch, player, first-person frame and research controls visible; synthetic test data only; screenshot kept outside Git |
| Library input bytes / expected ZIP hash | Blocked | Normal materialization and one retry failed; original kit reuse incomplete |
| Remote GitHub Actions | Not asserted here | Workflow provided; check PR status for actual remote result |
| Owner Mac acceptance | Not run | Requires the owner's Mac and feedback session |
| Standalone B AI review | Not run | Protocol supplied; no external AI called |

No passing Cloud check is a claim of human cognitive validity, complete rugby rules, biomechanics, successful physical passing or final Mac acceptance. Follow [Mac acceptance](./MAC_ACCEPTANCE.md) for the remaining final demonstration.

## Independent review reproductions

Five new regression tests failed against the original implementation before the fixes: an unseen competing edit could be approved; a pending patch was not previewed; a remembered nearby threat did not affect judgment; audio direction/presence did not affect output; the reserved seeds all lacked possession. They now pass, with additional tests for lost edits, undo version conflicts, pinned approval content, sound frame/decay, stale pass exclusion and unchanged approved B exports.

The browser race test deliberately freezes background state polling, edits the candidate through another client, then clicks approval against the old displayed revision. The server returns 409, keeps A unchanged, reloads the candidate and clears owner confirmation. A separate Node test uses an actual CLI subprocess as the competing writer.

B0.1-draft adds whole-interval motion/arrival/intent/data-rendering principles. The eight-scene evaluation packet and no-principles/B0/B0.1 comparison are executable as a manual AI evaluation procedure. **This Cloud implementation has not performed that AI evaluation or incorporated external results.** No outcome is inferred from document completeness.

## Publication and reproduction additions

The B document, frozen B0, review protocol and eight-scene packet remain byte-identical to `5886a70`. A frozen baseline record and executable manifest check enforce that comparison reference. The manifest covers public source/configuration/fixtures/tests/cards; it excludes itself, private sessions and installed dependencies. It is an integrity aid, not scientific validation or a license grant.

The browser loop test additionally verifies that preview with unsaved candidate JSON sends no comparison request, clears the old comparison and asks the user to save first. A successful preview explicitly names the saved revision. The model/data cards and publication scope retain uncalibrated/provisional status, UNLICENSED, incomplete P2P reuse and unperformed owner Mac acceptance. No external B preliminary-evaluation results are incorporated or claimed by these additions.
