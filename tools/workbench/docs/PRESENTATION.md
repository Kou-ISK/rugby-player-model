# Local connection between conversation and browser display

[English](PRESENTATION.md) | [日本語](PRESENTATION.ja.md)

Coaching and interpretation happen in a conversation such as Codex; the browser presents 3D scenes and acquires observations. Neither an AI API nor Computer Use is required. Browser free-text fields are for manual records, not AI submission or interpretation.

On the configured Mac use `./start-rpm.command` and `./bridge-rpm.command`. Elsewhere follow [RESEARCH_START](RESEARCH_START.md), use a dedicated session and substitute `npm run --silent bridge --` below. Save generated scenes, contexts and edits at absolute paths inside the private session.

## Freeze the displayed state for coaching

1. Open the startup URL and list connected displays:

```sh
./bridge-rpm.command views
```

Each display reports `clientId`, `display.revision`, scene ID/revision/tick, player/spectator/comparison mode and paused state. Tabs have separate IDs. Select the intended display explicitly, not the first tab or latest snapshot by assumption.

2. Request a pause and capture of its actual acquired history:

```sh
./bridge-rpm.command view-request capture --client DISPLAY_ID --revision N
./bridge-rpm.command view-result REQUEST_ID
```

Acceptance of a request is not completion. Wait for `completed` and `result.snapshotId` before binding coaching. A changed display revision rejects the request: inspect `views` again before a new request. Save receipt JSON to an absolute private work path when retaining it as evidence.

3. Read player-only information and bind the conversation's coaching to the snapshot:

```sh
./bridge-rpm.command snapshot-context SNAPSHOT_ID
./bridge-rpm.command propose SNAPSHOT_ID --feedback 'Original coaching from the conversation'
./bridge-rpm.command context CANDIDATE_ID
```

For intervals use `--from-tick N --to-tick M --player observer-0` within the saved acquired history. A separately simulated CLI trajectory is not the interval the owner saw. Coaching is researcher intervention, not instantaneous player audio.

`context` is observation-based editing material, distinct from anonymous evaluation packets. `snapshot-export` includes author-only world truth and must not go to a player-role LLM. Continue with [LOCAL_BRIDGE](LOCAL_BRIDGE.md) for editing/comparison.

## Present a fixed snapshot

Save a scene with `scene-create` and prepare a starting snapshot, for example `scene-snapshot SCENE_ID --revision N --tick 0`. Computing it does not present it.

```sh
./bridge-rpm.command view-request present --client DISPLAY_ID --revision N --snapshot SNAPSHOT_ID
./bridge-rpm.command view-result REQUEST_ID
```

The browser saves the original acquired history, restores/renders the requested snapshot in first person and pauses. Present also works from spectator view, switching after preservation without adding overhead camera angles or world truth to player history. Changes to research state or view mode during preservation reject the operation. `previousSnapshotId` identifies the saved prior state; `snapshotId` identifies the newly rendered saved state. Histories are not mixed. A snapshot with different active deliverable versions or execution settings is rejected; use recorded experiment comparison instead of replacing adopted versions.

## Receipt meaning and limitations

- `completed` means the local UI finished rendering and saved the corresponding snapshot. It does not prove a person saw or accepted the scene.
- Displays without heartbeat for 5 seconds are unavailable. Requests expire after 15 seconds; unfinished/failed requests remain queryable for up to 5 minutes. Completed receipts/snapshots persist in `state.json` and can be queried after restart; pending requests never replay.
- A fixed `--request-id` makes identical retries refer to the same request. Different content under the same ID is rejected. After expiry/disconnection, inspect fresh views and saved records rather than assuming success.
- Manual looking/scene changes invalidate stale revisions. Spectator accepts present only; capture/compare/return are rejected. Comparison mode accepts compare/return only.
- Commands are limited to capture/present/compare/return. They provide no arbitrary JavaScript, natural-language execution or model/principle adoption. CLI uses the same-session server lease and loopback/Host/Origin restrictions; this is not authentication against the local user.
- Snapshot and receipt writes are separate transactions. Interruption may leave a snapshot without a completed receipt. Do not treat an unacknowledged display as confirmed coaching evidence or invent receipts for older records.

Team-color, possession, attack-direction and foot-arrow overlays aid scene comprehension; they are not a biological vision model. Version 2 observes visible body orientation and uses it in relational inference; v1 retains its old boundary. Version 3 adds abstract routes/defensive skills without establishing rugby validity. See [observation contracts](../../../models/player/spec/ORIENTATION_PHASE.md).

## Compare recorded experiments from conversation

```sh
./bridge-rpm.command view-request compare --client DISPLAY_ID --revision N --experiment EXPERIMENT_ID --arm before --frame 2
./bridge-rpm.command view-result REQUEST_ID
# Read the new revision from views before selecting the same after frame.
./bridge-rpm.command view-request compare --client DISPLAY_ID --revision M --experiment EXPERIMENT_ID --arm after --frame 2
./bridge-rpm.command view-request return --client DISPLAY_ID --revision K
./bridge-rpm.command research-log --out /absolute/private/work/research-log.json
```

Comparison displays frozen frames without recomputation. Receipts bind experiment/arm/frame, and the clock shows that frame's time. Return restores the original paused research state and saves a snapshot. Comparison does not advance research time, memory or approved versions. `research-log` lists durable receipts, candidate snapshot references, coaching intervals, experiments and reviews; absent historical links remain null.
