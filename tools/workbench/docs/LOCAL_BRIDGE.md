# Local file/CLI bridge for conversational research

[English](LOCAL_BRIDGE.md) | [日本語](LOCAL_BRIDGE.ja.md)

Use [player-view controls](PLAYER_VIEW.md) for looking and [presentation transport](PRESENTATION.md) to bind conversational coaching to the displayed snapshot. Browser text entry is a manual alternative. On the configured Mac follow [MAC_START](MAC_START.md) and [storage](LOCAL_STORAGE.md): replace `npm run bridge --` below with `./bridge-rpm.command` and `.rpm/` paths with absolute session `work/` or `exports/` paths. UI and CLI must use the same session.

[Dynamic scenes](DYNAMIC_SCENES.md) support fixed-step research with one controlled player and scripted stimuli; v3 optionally supports independent actors. Work with local files in an ordinary Codex conversation or manually. No paid API, key, AI submission or automatic prose-to-rule conversion exists. `propose` only stores a scene-linked **candidate**.

[Freeze evaluation conditions](../../../evaluation/PROTOCOL.md) before coaching when testing unused conditions. The fixed eight cases preserve the candidate profile and are regressions, not unseen validation. Manual looking history is stored/replayed as observation research.

Use the [discovery-first research protocol](RESEARCH_LOOP.md) for ongoing dialogue: save each response immediately, collect varied evidence and periodically summarize provisional principles. Synthesis does not trigger model editing; implementation and model evaluation belong to a later research stage. The commands below describe individual operations, not a requirement to execute the whole sequence after each response or small group of cases.

## Start from the UI

1. Run `npm run dev`; look, play and pause in first person.
2. Enter feedback and save a candidate. Scene/seed/time/player, observation bundle, memory, individual conditions and both deliverable versions are captured.
3. Give the candidate ID to Codex and export observation-only context:

```sh
npm run --silent bridge -- context CANDIDATE_ID > .rpm/context.json
```

Keep the displayed `revision`. Copy `editable.patchA` and `editable.principle` to `.rpm/edit.json`; see the [conditional example](../examples/conditional-coaching-edit.json). Add rationale, predicted effect and counterexample to `notes`. `contextRules` replaces the entire array, so include retained rules. Fill principle conditions, criteria, priority, exceptions, uncertainty and evidence.

```sh
npm run bridge -- edit CANDIDATE_ID --file .rpm/edit.json --revision CONFIRMED_REVISION
```

Example request: “Review this context using only player-available evidence. Preserve observation timestamps and do not infer empty space from invisibility. Write a testable player-model parameter patch and independent judgment candidate, then save with bridge edit. Explain rationale, exceptions and possible refutations. I will decide adoption, rejection and undo.”

4. The UI reflects CLI changes within seconds. The owner confirms content and independently adopts, rejects or returns each target; return requires a reason. Confirmation clears after each action.
5. Before adoption, preview the saved revision plus fixed regressions. Unsaved edits suppress stale results and block comparison until saved. Preview overlays the captured base without changing active versions or execution. Active-version comparison is separate. The eight strata cover possession, pressure, missing observations, memory and audio. Quick preview is one decision; recorded runs contain 1–20 steps, inputs, reasons and versions. Judgment documents are evaluated independently through experiment packets. See [research loop](RESEARCH_LOOP.md). These are not win-rate or full-match causal effects.
6. Owner-confirmed undo changes only its target. Historical “approved” labels remain; inspect active versions for current state.

## The same loop from CLI

```sh
npm run bridge -- snapshot --scene support --seed 42 --head -2
npm run bridge -- propose SNAPSHOT_ID --feedback "Consider rechecking support"
npm run --silent bridge -- context CANDIDATE_ID > .rpm/context.json
npm run bridge -- edit CANDIDATE_ID --file tools/workbench/examples/candidate-edit.json --revision 1
npm run --silent bridge -- context CANDIDATE_ID > .rpm/context.json
npm run --silent bridge -- preview CANDIDATE_ID --revision 2 > .rpm/preview.json
```

The following are **intentional owner review operations**, not automatic assistant steps:

```sh
npm run bridge -- approve CANDIDATE_ID --target player --by owner --revision 2
npm run bridge -- approve CANDIDATE_ID --target judgment --by owner --revision 2
npm run --silent bridge -- compare CANDIDATE_ID > .rpm/comparison.json
npm run bridge -- export-judgment --out .rpm/RUGBY_JUDGMENT.local.md
npm run bridge -- undo player --by owner --version A1
npm run bridge -- undo judgment --by owner --version B1
```

Numbers illustrate one edit of revision 1 and first adoption. Supply the revision actually confirmed and active version shown by UI/`status`, never an automatically fetched latest value. Rejection also requires a confirmed revision, for example `reject CANDIDATE_ID --target player --by owner --revision 2`.

Edit/review compares revisions inside the writer lock. Conflicts return HTTP 409/CLI errors; the UI refreshes and clears confirmation. Undo checks the confirmed active version. Do not retry adoption automatically. Receipts freeze reviewed revision/content. Older candidates gain revision 1 for new operations, without retroactively claiming old approvals confirmed a revision.

Stale captured bases cannot be adopted; preview labels their older base. Capture a new snapshot or use reasoned `revise` to create a linked child on current approved bases, preserving observations. Recheck copied patches, especially whole-array `contextRules`. Once either target has a review decision the candidate is immutable; finish both before review or create a child.

The repository's judgment draft 0.1 is a proposal. Session exports remain the frozen initial document plus owner-approved amendments; repository edits do not change private adopted principles. Full baseline replacement is a separate explicit owner decision retaining old baseline/order. See [FIRST_RUN](FIRST_RUN.md) for synthetic manual operation, sharing and standalone evaluation. No owner baseline replacement is implied.

Use `npm run --silent` for JSON redirection. Internal state is `.rpm/state.json`; modify it through UI/CLI. Keep alternate `RPM_SESSION_DIR` outside Git-tracked material.

## Restart, conflict and recovery

Candidates, reviews and history persist. The browser initially opens the starting scene; restore latest to recover recorded world/memory/profile while keeping current approved rules. Comparison uses the candidate's captured rules and current rules.

Concurrent writers may fail with `Session busy`; retry after the writer finishes. After a crash, stop all writers, back up the whole session, then remove only its stale `.lock`. Never remove a live lock. Corruption reports an error rather than silently initializing state. Unsaved text/history cannot be restored.

Do not submit private sessions, feedback, plans or credentials in PRs. Sharing requires an explicitly approved synthetic reconstruction and publication scope.

## H-WM-1 research mode (unvalidated)

This limits receiver deliberation, not all judgment to K items or a complete human working-memory model. Risk/orienting and fresh/no-fresh predicates still use all retained evidence. Legacy remains the default.

Use `mode-edit CANDIDATE --revision N --mode finite --k 4`, `--mode unlimited` or `--mode baseline`. Saving a mode candidate does not activate it. `mode-study CANDIDATE --revision N --k 4` stores baseline, unlimited-policy and finite-policy arms with identical observations; `mode-studies` retrieves them after restart. Finite versus unlimited isolates capacity; baseline versus unlimited compares policy. Only player-model adoption/undo changes active mode; judgment principles remain independent.

Missing mode in historical records means baseline. Readers do not add fields or hashes to old records. New histories store mode per event. New sessions/writes use outer format 2, rejected by old binaries. Rollback requires a format-2-compatible reader and preservation of newer data; undoing to baseline does not restore old-reader compatibility.

## Continuous observation storage (bridge API 11)

First-person history normally autosaves at 224 events and continues from the same position/time. Historical snapshots remain unchanged. Optional `observationPredecessor` binds prior ID/hash; `observationAnchor` holds the replay-only interval-start world. Context includes only the former; the latter never enters player-model/document inputs. `research-log.observationContinuations` exposes links. Replay overlaps one acquired event using unchanged time/confidence and original memory-before.

Shared proposals still export selected fixed observations/memory, not the entire private chain. Restart the server after updates so a new UI does not write to an old bridge.
