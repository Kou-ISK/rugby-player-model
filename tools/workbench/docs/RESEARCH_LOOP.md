# Conduct a conversational research experiment

[English](RESEARCH_LOOP.md) | [日本語](RESEARCH_LOOP.ja.md)

The purpose is to turn coaching into a conditional hypothesis, test both supporting conditions and counterexamples, and preserve the evidence. Changed behavior alone is not improvement. Session records establish actual execution, human assessment and adoption status.

## Facilitation and handoffs

Research concerns how limited perception and memory support relational/affordance inference, goal-directed choice and revision after new observations. Generated scenes discriminate mechanisms; a coach's explanation alone does not measure human cognition.

The owner confirms scene meaning and supplies coaching, decisive cues and exceptions. Codex facilitates, prepares/presents scenes, separates original wording from interpretation, and records hypotheses, controls and outcomes. Do not stop the conversation by asking the owner to select CLI procedures.

1. State the current question, stage and one requested owner action. Label the display as a motor trial, hypothesis-forming layout comparison or model evaluation.
2. Confirm meaning before coaching; fix ambiguous teams, target or body direction. Save displayed inputs and normally ask one concrete question. Do not score control mistakes as cognitive decisions.
3. Restate the hypothesis as information → predicted relation → selection/continuation/cancellation conditions. Separate explicit coaching, assistant interpretation and unresolved points. Ask only about ambiguities that affect the decision.
4. Continue to a discriminating comparison rather than ending after saving text. Choose one variation in distance, orientation, motion or observation freshness; record fixed/changed quantities and the question before presenting. Never invent the owner's answer or acceptance.
5. Separate executable mechanisms from judgment-text candidates. Unsupported mechanisms require code proposals. Weight changes, forced actions and successful rendering are not cognitive learning. Evaluate documents with identical observations in independent no-principles/previous/proposed arms.
6. State findings, remaining counterexamples and the next comparison/question. Wait for the owner's independent target/version decisions when adopting. Scene counts and success counts alone do not end research.

Keep a private `work/` checkpoint with question/stage, source snapshots and receipts, original coaching and interpretation, hypothesis/counterexamples, next scene/question and limitations. Preserve the distinction between forced motor previews and autonomous mechanism evaluation. For a configured Mac use [MAC_START](MAC_START.md); replace development `.rpm/` paths below with absolute private-session paths. For a new installation use [FIRST_RUN](FIRST_RUN.md).

## 1. Capture coaching and acquired evidence

Look, play and pause in first person; capture through [presentation transport](PRESENTATION.md) or save manual feedback in the UI. Preserve scene/seed/time/player, body/head, observations/history, profile and both baseline versions. `context CANDIDATE_ID` exports player-available evidence without world truth. Clarify unclear application conditions and invariants; Codex may edit candidates but cannot make real adoption decisions for the owner.

## 2. Write conditions, exceptions, predictions and counterexamples

The [synthetic example](../examples/conditional-coaching-edit.json) requests reobservation when holding the ball without fresh receiver evidence, except under an observed close threat. Fill `notes.rationale`, `expectedEffect` and `counterexample`; independently fill principle conditions, criteria, priority, exceptions, uncertainty and evidence.

```sh
npm run --silent bridge -- context CANDIDATE_ID > .rpm/context.json
npm run bridge -- edit CANDIDATE_ID --file .rpm/edit.json --revision CONFIRMED_REVISION
```

| Field | Meaning |
|---|---|
| `when.possession` | `any`, `has-ball`, `no-ball`: synthetic self possession |
| `when.evidence` | `no-fresh-receiver`, `fresh-receiver`, `stale-player`, `heard-call`, `missing-player-vision`, `observed-ball`: acquired evidence only |
| `when.unlessCloseThreat` | Skip under an observed close threat; does not prove unseen threats absent |
| `action` / `weight` | Add −2 to 2 to scan/hold/carry/pass/support scores before tactical mixing; cannot override eligibility |
| Optional `call` | `support-call` / `warning-call`, emitted only if the rule's action is selected |

`contextRules` holds at most 32 unique IDs; editing replaces the entire list. Retain existing rules and review overlapping additive weights. Strong preferences/tactical adherence can change results and must be tested. Calls are semantic events, not voice, teammate response or new self-hearing. There is no scene/seed/hidden-player/future-truth predicate. A new mechanism needs a code change, not an invented JSON patch.

## 3. Record before adoption

Run 1–20 steps of 0.2 seconds for the captured scene and eight fixed regressions, using the candidate's entire profile in both arms. Frozen sets selected before coaching add separate `frozenTrials`. Later observations may diverge after different actions.

```sh
npm run --silent bridge -- run CANDIDATE_ID --revision CONFIRMED_REVISION --steps 5 --mode preview > .rpm/experiment-preview.json
npm run bridge -- experiments
npm run --silent bridge -- experiment EXPERIMENT_ID > .rpm/experiment.json
```

Quick `preview` does not change session files. `run --mode preview` stores an experiment without changing adoption/active versions. It freezes candidate/revision/notes, initial input, both rule sets, judgment Markdown/amendments, traces and engine identity. Runtime/platform/architecture, Git commit/dirty status and lock/snapshot/result/document hashes accompany it. Snapshot/result SHA256 uses UTF-8 `JSON.stringify` of the saved object. Unavailable Git metadata is null. Viewing results does not recompute them; restart after source changes before recording.

The example expects carry → scan in the recorded and carrier-open conditions while retaining hold under pressure, pass with a fresh receiver and support without possession. All five constant-action controls and the old `scanBias:2` change fail this acceptance condition. This is a regression of the mechanism, not unseen validation. Real research requires separately chosen unused conditions, predictions and failure criteria before proposing.

## 4. Owner return and adoption

Return requires a reason. Once either target is reviewed the original candidate becomes immutable. `revise` creates a pending child with the same evidence/profile and current bases, retaining the parent ID. Recheck copied patches against new bases, especially whole-list rules.

```sh
# Only when the owner explicitly requests this review action:
npm run bridge -- return CANDIDATE_ID --target player --by owner --revision CONFIRMED_REVISION --reason "Reason for return"
npm run bridge -- revise CANDIDATE_ID --revision CONFIRMED_REVISION --reason "Revision plan"
```

The owner may adopt the player model while leaving principles pending. A revised principle ID replaces text in the active document while old versions retain old text. Revision conflicts reject with 409 and require renewed review; never fetch latest automatically for adoption. After adoption, use `run --mode active` and compare with preview. Synthetic owner flags do not approve actual research principles.

## 5. Evaluate judgment principles independently

```sh
npm run --silent bridge -- judgment-packet EXPERIMENT_ID --arm after --cases frozen > .rpm/judgment-after.json
npm run --silent bridge -- judgment-evaluator-map EXPERIMENT_ID > .rpm/judgment-evaluator-only.json
npm run --silent bridge -- export-judgment-json > .rpm/judgment-current.json
npm run bridge -- judgment-review EXPERIMENT_ID --file .rpm/judgment-response.json
```

Send only one arm's document/amendments and anonymous cases. Use `--arm none` or `before` for controls, `--cases regression` for known regressions. Keep labels, scene/seed, criteria, model outputs and world truth in the evaluator-only map. Structured amendments do not imply the entire baseline has been structured.

Use separate fresh conversations with identical observations and settings. Do not share other-arm answers, coaching, evaluator maps or executable traces. Follow [review protocol](../../../models/judgment/docs/REVIEW.md) for decisions, cited principles, uncertainty, counterexamples and self-review. Save responses through UI or JSON:

```json
{"arm":"after","group":"frozen","model":"Actual model/settings/date","output":"Full answer with case IDs","assessment":"Owner scores, unresolved points and counterexamples"}
```

Saving links a response; it does not certify correctness. Records remain `unverified-external-response` / `humanValidated:false`. Score compliance and rugby validity separately. No API/payment/submission is added; synthetic mocks are not real AI evaluation.

## 6. Restore and continue

Independent owner undo retains review history, parents, experiments and responses. After restart, restore the candidate scene to its body/head/history/profile with current approved rules. Saved old results remain unchanged; rerunning an old engine requires its recorded source version. Back up private state before long-term use and consider storage capacity. Record actual viewing, coaching meaning, conditions/counterexamples, independent reviews and restoration in private acceptance records; [Mac acceptance](../../../docs/verification/MAC_ACCEPTANCE.md) is the historical template/evidence boundary.

## Historical compatibility checkpoint

The 0.3.0 change retained observation contract 1 and three original fixtures, added cognition-0.3/appliedRules while reading cognition-0.2, and read missing experiments/bReviews/evaluationSets as empty in format 1. Bridge API moved from 2/3 to 4 and required server restart. Frozen baseline and approved amendments remained separate from repository draft 0.1. These are historical milestones, not today's package/API versions; current storage is described in [LOCAL_STORAGE](LOCAL_STORAGE.md), with API 11 observation continuation in [LOCAL_BRIDGE](LOCAL_BRIDGE.md). Research undo is distinct from code downgrade; preserve newer records and backups.

## Try forward from the captured point

`run CANDIDATE_ID --revision N --steps 7 --mode preview --start snapshot` starts at the candidate snapshot's position/time/acquired memory. Default `--start coaching` rewinds to the coaching start and stops at its end. Keep future trials distinct from historical revalidation.

The record uses `recordedInput.source: captured-snapshot` and `window: null`, retaining the original interval in the candidate. Use existing `view-request compare` for presentation. Temporary weights or forced-action assistance must be labeled in notes; they do not establish general principles or owner acceptance.
