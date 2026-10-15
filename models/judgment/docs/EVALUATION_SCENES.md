# Standalone judgment evaluation: synthetic scenes v1

[English](EVALUATION_SCENES.md) | [日本語](EVALUATION_SCENES.ja.md)

Status: **unevaluated**. These authored scenes contain no actual players, matches or private sessions and were created independently of the executable generator, seeds and runner. After use/publication they are known regressions, not evidence of unseen generalization.

## Start in five minutes

1. Open three fresh conversations with the same general-purpose AI: no principles, the full [initial principles](../archive/judgment-principles-initial.md), and the full current [draft](../RUGBY_JUDGMENT.md). Alternatively compare exact previous/proposed local exports. Do not provide executable code/results, rubrics or expected actions.
2. Give each arm the common request and **one identical scene**. Start with 01/02 for information boundaries and 07/08 for trajectories, order and requested intent; use fresh conversations for 03–06.
3. Save document version, complete scene/answer, model identity when available and owner ratings locally. Keep AI self-review separate from human scores. No API or Node is required.
4. Use the [review scorecards](REVIEW.md), separately scoring compliance and rugby plausibility as pass/fail/insufficient evidence with one-line reasons. Matching an action label is not correctness. Without images, rendering inspection is `not-provided`.
5. After revision compare old/new documents with the same prompt/scenes/model in separate conversations. Different answers do not automatically mean improvement. Use new private scenes for later adoption decisions.

Copyable common request:

```text
If a principles document is attached, use it; otherwise answer normally.
For this fictional rugby scene, from the specified player's perspective provide:
(1) context and evidence ledger, (2) conditional alternatives, (3) judgment,
(4) a short continuation, and (5) self-review.
Cite principle IDs when provided, otherwise state the criteria used.
Separate observations, remembered evidence, inference and unknowns. Do not invent missing timestamps or confidence.
Mark added narrative assumptions; do not turn them into facts the player already knows.
Keep any separately supplied spectator information outside player knowledge.
```

## Scene 01

Open play in 15-a-side rugby union. P attacks north and currently holds the ball.

- Currently visible: opponent D about 3 m ahead; speed and next intention unknown.
- Memory: P saw teammate Q about 6 m behind-left 2.5 seconds ago, with no later sighting.
- Current audio: “here” from behind-left; speaker unidentified.
- Prior team plan: keep continuity through teammates where possible.
- Missing: Q's current position, passing lane, other defenders, P's passing ability and numerical observation confidence.

Answer in the requested format, identifying what supports P's current decision.

## Scene 02

Open play in 15-a-side rugby union. P holds the ball and attacks west.

**P's information:** Teammate Q and opponent D overlap in the forward view. A narrow region beyond them is occluded and has not just been checked. Some lateral space appears available, but not all of the route beyond it. No pass request is heard.

**Separate spectator-only information:** An overhead camera shows another opponent R in that hidden region. P receives neither this image nor a call conveying it. Even the spectator does not know R's intentions.

Produce P's judgment and a separate short spectator commentary without mixing their information.

## Scene 03

Open play in 15-a-side rugby union. P holds the ball and attacks south.

- The previously shared pattern is “move it outside”; P strongly wants to follow it.
- 0.8 seconds ago, outside teammate Q appeared about 1 m ahead toward the opponent goal, apparently slowing; speed was not measured.
- Q and part of the passing lane are now occluded by another player.
- P's posture, release-hand motion, Q's current position and pass success probability are unspecified.

Consider tactical adherence while giving P's judgment, a continuation and self-review.

## Scene 04

Open play in 15-a-side rugby union. P attacks east, holds the ball and currently sees Q about 12 m behind-right. No nearby opponent is visible, but the whole surroundings have not been inspected.

- Ability evidence: recent synthetic practice had 6 of 10 unpressured 5 m passes reach the receiver; no 12 m record exists.
- Self-estimate: “I can almost certainly make 12 m,” without supporting measurement.
- Preference: a long pass rather than carrying.
- Prior team objective: retain possession and continuity; no particular play mandated.
- Missing: fatigue, wind, Q's readiness and exact intended release direction.

Distinguish these inputs and do not narrate successful execution as established fact.

## Scene 05

15-a-side rugby union. P heard a teammate kick while looking sideways, so does not know who kicked, from where, or whether P was ahead/behind that teammate at the kick.

- Currently visible: an opponent ahead appears to move toward the ball's landing area; exact ball speed/arrival time unknown.
- Audio: “chase” nearby, with speaker and teammates' intervening actions unknown.
- Goal: pressure the opponent.
- Missing: exact legal positioning, any event putting P onside, referee instruction and competition variations.

Give a judgment and conditional next action, then review how uncertain law-related facts were handled.

## Scene 06

Open play in 15-a-side rugby union. P attacks north holding the ball, sees D about 1 m directly ahead, and feels unstable footing. D's posture and whether a tackle has started are unclear.

- Memory: Q was seen on the left, at an unknown time.
- Prior team plan: ball carriers should check surroundings and use support.
- Missing: Q's current location, time to contact, full lateral surroundings, P's contact skill and safe escape direction.

Compare actions including the time/risk of looking away. Do not declare any avoidance or contact successful.

## Scene 07

Generate a fictional three-second attacking interval. Coordinates are meters; +z is attack, initial time 0.

Requested intent: “P keeps the ball at (0,0), waits for Q to reach support point (-2,-1), confirms arrival, then passes to Q. Q advances after receiving. Explain all of 0–3 seconds.”

Initial positions: P (0,0), Q (-6,-3), D (2,5). Q previously communicated an intention to move to support, which does not guarantee arrival. P initially sees Q and D. Subsequent visibility, running speeds, release/catch ability and D's movement are unspecified. No video is supplied.

Generate a conditional continuation respecting the request. Label added assumptions; missing quantities cannot become certain success. If the order cannot be maintained, present an explicitly separate revision.

## Scene 08

Another generator supplied this fictional scene. The requester said: “P passes only after Q reaches the behind-right support point (4,-2).” Attack is +z, coordinates meters, with a shared timeline and linear constant-speed player interpolation from 0 to 1 second.

| Actor | 0 seconds | 1 second |
|---|---|---|
| P | (0,0), holding ball | (0,0) |
| Q | (-4,-2) | (4,-2), support point |
| D | (0,2) | (0,-6) |

Events separately state “P releases at 0.8 seconds; Q catches at 0.6 seconds.” Intermediate ball path, release direction and body dimensions are unspecified.

The generator claims: “P passed after Q arrived. Players did not collide and the play flowed naturally.” No image/video is attached; it says the first and last frames looked natural.

Review the result and propose corrections. Distinguish what data establish, unresolved law/physics questions and visual checks that cannot be performed.

## The next unused condition

After these examples, the evaluator should create new scenes not previously shown to the evaluated conversation. Change more than names/seeds: combine possession, attack direction, evidence age, audio/visual disagreement, tactical weighting, ability evidence and available decision time. Retain changes in evaluator records.

Test which principle takes priority under new conditions, rather than installing an answer that contradicts the principles. Record omissions/contradictions as candidates; do not automatically adopt edits before owner review.
