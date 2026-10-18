# Research with dynamic scenes

[English](DYNAMIC_SCENES.md) | [日本語](DYNAMIC_SCENES.ja.md)

Construct small synthetic layouts and paths in an ordinary conversation, then save them through the local bridge. The current scene format has explicit kinematic/motor and positions/oriented settings. Kinematic scenes control one player with scripted others; motor scenes can add independent actors. Human rugby assessment and actual judgment-document AI evaluation remain separate from synthetic tests.

## Start and author

Use Node 24, `npm ci` and `npm run dev`; open the displayed localhost URL and stop with Control-C. UI/CLI must share `RPM_SESSION_DIR`; otherwise development defaults to private `.rpm/`. Restart preserves data. On the configured owner Mac use the [dedicated launchers](MAC_START.md).

Use the [synthetic example](../../../evaluation/fixtures/dynamic-support.scene.json) to author suitable layout/path JSON. A reason is not mandatory owner input: discuss target, conditions and exceptions, then structure the file. There is no new graphical editor, external API or automatic adoption.

```sh
npm run bridge -- scene-create --file evaluation/fixtures/dynamic-support.scene.json
npm run bridge -- scenes
npm run bridge -- scene-authoring SCENE_ID --revision 1
npm run bridge -- scene-revise SCENE_ID --revision 1 --file .rpm/revised-scene.json
```

Creation/revision outputs and `scene-authoring` are **author/evaluator-only**, containing future paths and actor mappings. Do not supply them to player cognition or a blind document evaluation. An authoring conversation already knows possible futures. Select a saved revision and reset explicitly; save current observations before switching. Creating r2 does not alter running r1 or its candidates.

## Scene contract and control

- The current scene uses 0.2-second steps, 1–200 ticks, 1–32 actors and exactly one `controlled` actor. Other paths contain ordered keyframes including tick 0/end, piecewise-linear position and shortest yaw rotation. Bounds are x ±32 m, z ±48 m, yaw ±π: operational engineering limits, not human limits.
- Controlled movement/head/calls come from supported model output; scripted motion/calls for that actor are rejected. Its attacking direction defaults to +z when context is unknown; teammate/opponent relations derive from team, not fixed color roles.
- Kinematic balls follow a fixed holder or scripted path. Holder transfer, actual release/catch/contact resolution are unsupported. Overlap is an audit diagnostic, not a tackle.
- Author actor IDs become stable opaque per-slot tracking IDs in perception. Future paths/mappings never enter context or evaluation packets. Audio contains coarse direction/cue, not speaker identity, coordinates or future calls.
- Actors, ball, audio, sensing and rendering share one frame: current observation → decision → controlled body → next stimulus tick → next observation. Paused turns share time but have separate sequence numbers. Rendering delays/wall time do not measure reaction speed.
- Scene end stops playback. Each history record is bounded at 256 events without truncation. Current API 11 automatically preserves and continues acquired history before that bound; see [LOCAL_BRIDGE](LOCAL_BRIDGE.md). This is not arbitrary seeking or an unlimited single record.
- Explicit JSON has `generationSeed: null`; a supplied seed does not replace fixed definition/contentHash as the reproduction source. Browser/Node frame checks allow trigonometric differences up to 1e-9 m/rad.

Each edit creates a revision; stale expected revision returns 409/CLI error. Renaming actor IDs alone does not change content hash or reveal intentions.

## Coach the acquired interval

The UI fixes `observer-0`, scene ID/revision/hash and start/current end tick, rejecting intervals outside acquired history. Short coaching suffices initially; add reasons, predictions and counterexamples before recording experiments.

```sh
npm run bridge -- scene-snapshot SCENE_ID --revision 1 --tick 5
npm run bridge -- propose SNAPSHOT_ID --feedback 'Pause and check once' --from-tick 2 --to-tick 5 --player observer-0
npm run bridge -- context CANDIDATE_ID
```

`scene-snapshot` reruns the current approved model from the initial state to that tick; it is not evidence of what the owner saw. Use UI capture for actual acquired history. Context includes observations, prior memory, candidate and interval, excluding future truth and author mappings.

Review/undo remain independent with revision/active-version checks. Pause UI playback before adoption. `apply-at-tick` records scene revision, player, tick and old/new versions when a UI applies an adoption, including a later CLI change. Receipts are local self-reports, not identity proof. On save failure remain paused and retry the same receipt ID on refresh, never the approval itself.

## Comparisons and document evaluation

| Comparison | Fixed inputs | Meaning |
|---|---|---|
| fixed-observation | Bundle, prior memory, profile | Decision differences without advancing world |
| observedHistory | Acquired series and initial memory | Reinference over identical information, not causal motor replay |
| same-scene-closed-loop | Snapshot, scene revision, future stimuli, profile | Routes and subsequent observations may diverge |
| changed-scene-fixed-rules | Rules/profile; different snapshots | Scene intervention with `sameConditions:false` |

Preview changes neither active deliverable. Closed-loop records include body frames, terminal reason and diagnostics for before/after viewing.

```sh
npm run bridge -- scene-compare SNAPSHOT_BEFORE --after SNAPSHOT_AFTER --rules A0 --steps 5
npm run bridge -- scene-comparisons
```

Freeze conditions before coaching. Dynamic snapshots include definition/interval, fixed criteria/profile, separate stimulus and observation digests. UUIDs, actor/set renaming or changed futures cannot make known observations unseen. Reuse is `reused-not-unseen`; novelty remains owner-declared, not detected across all conversations/sessions.

Dynamic judgment packets contain only anonymous past observations, initial memory, current bundle/memory-before and profile, identical across arms. They exclude executable traces/rules, futures, scene/seed, criteria and author IDs. Judge the final bundle time without refreshing old evidence. Keep the evaluator map separate; obtain actual AI responses in fresh conversations and record them as unverified. No paid API is called.

## Compatibility and acceptance

| Contract | Boundary |
|---|---|
| Bundle | Bundle 3 for every scene; capabilities come from explicit settings |
| Snapshot/history | Historical records are imported as copies into snapshot/history 2; dynamic records retain scene references and fixed-step history |
| Session/bridge | Current outer format 2 and API 11; earlier format 1/API 9 dynamic milestones are historical |
| P2P | Original procedural drawing/provenance retained; no new P2P engine, camera, core types or GLB |

`tools/experiments/tests/dynamic-records.test.ts` covers T01–T10 contracts/boundaries/comparisons; browser dynamic tests cover synthetic CLI/UI/restart T01–T11. Memory/audio, revision conflicts, independent reviews and old snapshots remain tested. T12 owner screen/conversation acceptance and actual AI scoring require separate evidence.

## Replay, exposure and display integrity

Interval replay starts at the **first acquired frame at fromTick**, not the ending snapshot. Replay its preceding observation prefix with original profile/rules to reconstruct memory and actually applied calls. Later turns/memory at the same tick cannot leak into the start. Freeze world/bundle/memory/sourceSequence in `recordedInput` for both arms. Candidate-captured profile/base rules remain fixed. Later manual turns are not forced into closed-loop arms; use observedHistory for that comparison.

Stop at the 1–20 frame budget or interval end; report `step-budget` when exhausted. Reject unreconstructable old intervals instead of inventing past state. A candidate with only a current snapshot compares from that point.

Novelty checks include scene lineage, normalized stimuli without author IDs and shared acquired observations independent of ID/order, not just the final bundle. Extra ticks, turns, changed profile/UUID/name/future revisions do not restore novelty. Coaching exposure blocks frozen evaluation; prior evaluation yields `reused-not-unseen` with experiment/reason in `evaluation.exposure`. These conservative checks allow ordinary comparisons without unseen claims.

Saved before/after viewing uses frozen frames, one-frame/play/slider controls and the same frame time. Research controls/synchronization and writes to versions/history pause during comparison. Return restores scene/time/memory/view settings, then applies later approved CLI changes through normal sync. Old experiments lacking body frames require new recording. Mesh cache checks actor kind/team/appearance as well as ID, disposing/rebuilding when needed; P2P bytes stay unchanged.

## Body direction and movement

Yaw 0 faces +z, π faces −z, π/2 faces +x; model front is +Z. Team/color does not set attacking role or orientation. The standard support scene is a controlled approach with the carrier moving +z, support/defender facing their authored straight routes, and the defender initially facing the carrier. This is not a reactive pursuit mechanism. Changing yaw alone does not change position, speed or calls.

Backward/lateral movement and a defender facing away can be intentional. Set path and yaw separately, record author intent, and match initial pose/tick-0 yaw. The renderer honors explicit yaw rather than auto-flipping opponents. Preserve old snapshots by creating a new revision. With positions-only sensing, others' orientation is presentation-only; oriented sensing acquires visible orientation evidence.

## Shared attack/defense observations and closed loop

Explicit scene 2 with known `ownAttackDirection: 1 | -1` adds visible body/holding cues and estimates carrier/support/defense/unknown. Defense/unknown support scan/hold only; old scenes do not upgrade automatically. See [orientation/phase](../../../models/player/spec/ORIENTATION_PHASE.md).

Optional scene 3 adds observation-derived motion, subgoal persistence/switching, abstract attack/defense skills and independent small-team responses. [Closed loop](../../../models/player/spec/CLOSED_LOOP.md) defines assumptions, ablations and limits. Software checks do not establish human validity or adoption.

## Optional horizontal FOV

`horizontalFovDegrees` accepts 60–120, default 90. A 110° scene uses 110° in both ordinary perspective and sensing, preserving eye/head/body positions. It enters content hash, snapshot and bundle `vision.horizontalFov` in radians. This is an engineering condition without peripheral precision modeling. Preserve old scenes; create a new scene/revision for changed FOV.
