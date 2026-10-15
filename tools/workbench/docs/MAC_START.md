# Start research on Mac with generated 3D scenes and conversation

[English](MAC_START.md) | [日本語](MAC_START.ja.md)

See [player-view controls](PLAYER_VIEW.md) for pointer-lock, drag and arrow-key looking, and [presentation transport](PRESENTATION.md) for conversational coaching tied to a displayed snapshot. Browser text entry below is the manual-recording alternative.

1. Open `~/Documents/workSpace/rugby-player-model` in Codex. Ask to start with this guide, construct scenes together and leave adoption decisions to you.
2. Run `./start-rpm.command` and open the displayed `http://127.0.0.1:5173`. The launcher uses the dedicated Node 24 runtime and configured private session. Stop with Control-C in its terminal. A busy port fails startup; do not stop unrelated jobs.
3. Describe the desired arrangement/movement. Codex uses the [synthetic fixture](../../../evaluation/fixtures/dynamic-support.scene.json) and [scene contract](DYNAMIC_SCENES.md), writes JSON at an absolute session `work/` path and runs `./bridge-rpm.command scene-create --file ABSOLUTE_SCENE_JSON`. Creating scenes adopts neither deliverable. To start with the supplied example:

```sh
./bridge-rpm.command scene-create --file evaluation/fixtures/dynamic-support.scene.json
```

4. In the research tools, select the saved dynamic revision and reset explicitly. Observe in first person with step, play/pause and looking. In this scripted example the model controls one player and other actors follow paths. Starting playback alone does not save a record.
5. Pause and give short coaching, for example “check around once here.” For manual entry choose “この場面で候補を保存,” confirm interval start/end tick, player and scene revision, then give the candidate ID to Codex. A reason is optional at this stage.
6. Read observation context together and save conditions, exceptions, predictions and counterexamples. Unsupported cognitive mechanisms require a separate code proposal. The authoring conversation knows possible futures, so its review is not blind evaluation.

```sh
./bridge-rpm.command context CANDIDATE_ID > "$HOME/Research/rugby-player-model/sessions/owner-primary/work/context.json"
./bridge-rpm.command edit CANDIDATE_ID --file "$HOME/Research/rugby-player-model/sessions/owner-primary/work/edit.json" --revision CONFIRMED_REVISION
```

7. Confirm the saved revision and run/record the unadopted candidate. Display saved before/after frames at the same tick, then return to research. Records contain at most 20 frames and may not complete the whole interval; inspect termination reasons. These operations do not adopt either deliverable.

The owner reviews adoption, return and undo independently for each deliverable. Codex does not perform those decisions without specific instruction. Test other conditions and record independent judgment-document inputs, responses and scores. Pause for genuine owner interpretation when required.

After browser/server restart, select the saved scene or restore the latest snapshot/candidate scene. Saved experiments remain available; unsaved text and playback history do not. Canonical state is `~/Research/rugby-player-model/sessions/owner-primary/state.json`; drafts belong in `work/`, exports in `exports/`. See [storage](LOCAL_STORAGE.md). No additional API key or paid AI connection is needed.

The original S1–S5 acceptance covered synthetic implementation. Owner walkthrough S6 and actual AI evaluation require separate evidence; headless checks and mock adoption do not approve real principles. Check session records for subsequent human decisions. Publication follows [scope](../../../docs/provenance/PUBLICATION_SCOPE.md); private sessions remain excluded.
