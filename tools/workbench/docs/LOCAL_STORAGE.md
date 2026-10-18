# Current Mac storage, startup and recovery

[English](LOCAL_STORAGE.md) | [日本語](LOCAL_STORAGE.ja.md)

The configured Mac keeps source code and private research data in separate directory trees:

| Item | Configured location |
|---|---|
| Stable source entrance | `~/Documents/workSpace/rugby-player-model` |
| Private research session | `~/Research/rugby-player-model/sessions/owner-primary` |
| Shared path configuration | `~/Library/Application Support/RugbyPlayerModel/paths.json` |
| Dedicated Node 24 runtime | `~/Library/Application Support/RugbyPlayerModel/runtime/` |

The configuration contains absolute `sourceRoot`, `dataRoot`, `sessionDir`, `nodePath` and `port` values. The launchers validate their real paths. They refuse missing sessions, source/data overlap and a session outside `dataRoot`; they do not fall back to an empty development session.

## Start, stop and resume

From the configured stable source, run `./start-rpm.command` and open its displayed local URL. Stop with Control-C in the starting terminal. Use `./bridge-rpm.command status` to inspect the same session through the command line. Resume with the same launcher; do not initialize a replacement session.

The launchers follow `paths.json`, even when invoked from a different copy of the repository. To test an uninstalled checkout, follow [FIRST_RUN.md](FIRST_RUN.md) with an explicit new synthetic `RPM_SESSION_DIR`. Development `npm run dev` and `npm run bridge` otherwise default to `.rpm/` in that checkout. Tutorial data and actual owner research must remain separate.

In the current CLI, `npm run bridge -- stop` also stops the server instance identified by that same session. Historical binaries may not have this command. Control-C is also available. Do not stop unrelated processes or clear a running writer's lock.

## What is stored

`state.json` is the session's authoritative state: scene versions, snapshots, candidates, player model / judgment principles versions, decisions, experiment results and reviews. `work/` holds explicit scene/context/edit files; `exports/` holds selected output copies. Use UI/CLI operations rather than editing internal state. Keep private feedback, real data and credentials out of Git and public proposals.

CLI `--file`, `--out` and shell redirection paths are not automatically moved into the session. Use explicit absolute paths for actual research files. Browser downloads follow the browser's chosen destination and do not replace session state.

## Historical migration and installation procedure

During the architecture migration, the stable source was pinned at `ecc5c298b928ff860e124735decc587c0f7537af` while the candidate was reviewed in a separate checkout. This records the migration boundary, not the current running source identity. No stable source switch, owner-session migration or owner research approval is implied by candidate tests. The older `9467c34` placement is recorded in [storage history](LOCAL_STORAGE_HISTORY.md), not the procedure for this migration.

After exact-head verification and independent review, the M7 installation sequence is:

1. Confirm that the research server and all session writers are stopped. Leave unrelated jobs running.
2. Preserve a restoration point for the current source, configuration and private data, including new records. Record their hashes and any existing user changes.
3. Prepare the reviewed source and its locked Node 24 dependencies in a durable location. Test with a separate synthetic session first.
4. Atomically update the source entrance/configuration while retaining the same `dataRoot` and `sessionDir`. Do not copy a tutorial state over the owner state.
5. Check startup, shutdown, command-line access and the unchanged private destination. The owner's first research walkthrough and player model / judgment principles adoption remain separate actions.

## State compatibility and rollback

Normal processing uses the [current format](../../../docs/decisions/ADR-003-current-format.md). The import boundary accepts historical session envelopes and converts copies, without rewriting original records or digests. A new session or a successful write uses outer format 2 while preserving historical records and hashes. The previous stable binary accepts only format 1 and therefore refuses format 2.

Changing an active player model mode back to baseline does not make format 2 readable by an old binary. If records have been written using the current format, preserve that entire session and use a format-2-compatible reader when reverting the source entrance. Do not overwrite newer records with an older backup or delete them to force compatibility. If an old compatible snapshot is needed for diagnosis, work on a separate copy and keep the current session intact.

For a stale writer lock after a crash, first confirm all session writers are stopped and preserve the session. Then remove only that session's stale `.lock`; never remove a live lock or silently initialize a corrupt state. The [genuine synthetic legacy fixture](../../../evaluation/baselines/LEGACY_SESSION.md) documents the tested compatibility boundary.

Mac headless checks verify software behavior. They are not evidence that the owner used the screen or accepted a research principle.
