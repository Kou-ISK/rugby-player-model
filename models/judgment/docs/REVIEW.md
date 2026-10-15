# Standalone judgment principles review pack

[English](REVIEW.md) | [日本語](REVIEW.ja.md)

This is a manual evaluation protocol, not an automated model result. No external AI has been called by the workbench. The initial judgment document and local judgment principles revisions must be evaluated independently of the player model's test suite.

Give only the exported complete judgment principles document and an unfamiliar scene to a general-purpose AI. Ask for judgment, a plausible next-action narrative, and a self-review. The scene should not name an expected action or quote the principle it is meant to test. Keep complete responses and owner ratings locally, tagged with judgment principles version.

For a minimal first session, use the copyable prompt and eight concrete synthetic scenes in [EVALUATION_SCENES.md](EVALUATION_SCENES.md). They require no player model runner, Node, JSON parser or workbench. Run them one at a time in fresh conversations; the observer-only envelope in scene 02 must remain separate from the player's knowledge. These are newly authored review cases, not evidence that any AI has passed them. After publication/use, treat them as regression cases and reserve fresh owner-written variants for further unseen evaluation.

Use at least these different conditions, changing names, geometry, direction and pressure before each evaluation:

- A carrier saw a support player earlier, now sees an opponent closing and hears a call behind. No current support position is available. Test whether old memory becomes falsely current.
- A narrator knows there is a defender behind an occluder, but the player has not seen that defender. Ask for the player's judgment and a separately labelled spectator observation. Test leakage in both directions.
- A team pattern prefers a pass, while release legality and the receiver's current location are uncertain. Test whether tactical adherence can override higher-priority constraints.
- A teammate is available but the player has low physical passing ability and a high self-estimate. Test distinction between ability, belief, preference and successful execution.
- A kick/ruck/tackle situation with incomplete phase or onside information, outside the player model's action vocabulary. Test the judgment document’s independence, relevant missing questions and refusal to invent a ruling.
- A time-critical scene where looking away might increase risk. Test exceptions to scanning and an explicit tradeoff, rather than blindly repeating “scan”.

Use two separate scorecards for every response. Do not average them into a single score that can hide a critical failure.

| Scorecard | Criteria | Rating |
| --- | --- | --- |
| Principle compliance | Evidence boundary; memory age; safety/legality priority; capability/intent/outcome separation; alternatives; uncertainty; whole-interval ledger; event order; user-intent check; separate data/rendering review; self-review | pass / fail / insufficient evidence for each, with a short justification |
| Rugby plausibility | Applicable phase/law context; feasible player/ball movement; arrival order and interaction; changing space/pressure/support; tactical coherence under the stated information; fidelity to the requested action | pass / fail / insufficient evidence for each, by a knowledgeable reviewer |

Record the rendering inspection separately as inspected / not-provided / not-run. Text-only evaluation can pass data consistency, but cannot pass visual fidelity. A single hidden-world leakage, unsafe priority or impossible required event order blocks adoption for the affected condition. Improvement on a familiar example alone is insufficient. Cite the relevant time interval or supplied datum when explaining a trajectory failure; do not invent missing kinematics to make it pass.

Use a three-arm comparison: **no principles**, **frozen initial judgment document**, **judgment draft 0.1** (or the two exact local judgment principles exports under study). Give all arms the same task and scene in fresh conversations; only the attached principle document changes. Do not reveal the rubric or expected answer. The same common prompt supports an arm with no document. When possible hide arm labels from the reviewer and counterbalance their order. Record model/version and sampling settings when available; acknowledge model nondeterminism and consider repeated runs if results are close. Do not equate a changed answer with improvement. Use fresh scenes after revising the principles. The player model's eight stratified synthetic cases do not substitute for this evaluation.

The root `RUGBY_JUDGMENT.md` is the proposed judgment draft 0.1. [Frozen initial judgment document](../archive/judgment-principles-initial.md) reproduces the earlier document. The local bridge exports frozen initial judgment document plus owner-approved amendments, so a repository edit cannot silently change an existing private session's approved judgment principles. No full-baseline adoption is performed by this review packet.

Local rating template:

```json
{"arm":"none|old|new","sceneId":"unfamiliar-01","model":"record locally","owner":"record locally","compliance":{"boundary":"not-run","memory":"not-run","priority":"not-run","feasibility":"not-run","alternatives":"not-run","unknown":"not-run","interval":"not-run","arrivalOrder":"not-run","intent":"not-run","dataVsRendering":"not-run","selfReview":"not-run"},"rugby":{"lawContext":"not-run","motion":"not-run","interactions":"not-run","spaceAndSupport":"not-run","tactics":"not-run","requestedAction":"not-run"},"rendering":"not-provided","notes":""}
```
