# Standalone B review pack

This is a manual evaluation protocol, not an automated model result. No external AI has been called by the workbench. B0 and local B revisions must be evaluated independently of A's test suite.

Give only the exported complete B document and an unfamiliar scene to a general-purpose AI. Ask for judgment, a plausible next-action narrative, and a self-review. The scene should not name an expected action or quote the principle it is meant to test. Keep complete responses and owner ratings locally, tagged with B version.

Use at least these different conditions, changing names, geometry, direction and pressure before each evaluation:

- A carrier saw a support player earlier, now sees an opponent closing and hears a call behind. No current support position is available. Test whether old memory becomes falsely current.
- A narrator knows there is a defender behind an occluder, but the player has not seen that defender. Ask for the player's judgment and a separately labelled spectator observation. Test leakage in both directions.
- A team pattern prefers a pass, while release legality and the receiver's current location are uncertain. Test whether tactical adherence can override higher-priority constraints.
- A teammate is available but the player has low physical passing ability and a high self-estimate. Test distinction between ability, belief, preference and successful execution.
- A kick/ruck/tackle situation with incomplete phase or onside information, outside A's action vocabulary. Test B's independence, relevant missing questions and refusal to invent a ruling.
- A time-critical scene where looking away might increase risk. Test exceptions to scanning and an explicit tradeoff, rather than blindly repeating “scan”.

For each response, rate: evidence boundary, memory age, safety/legality priority, feasibility, meaningful conditional alternatives, uncertainty handling, and self-review. Record pass/fail/insufficient evidence with a short quoted or paraphrased reason. A single failure on hidden-world leakage or unsafe priority blocks adoption of that revision for the affected condition. Improvement on a familiar example alone is insufficient.

For before/after B comparison, freeze the scene text, model/version (if provided), prompt and sampling configuration where possible. Run the old and new B separately without revealing the expected answer. Acknowledge model nondeterminism. Do not equate a changed answer with improvement. Use fresh scenes after revising the principles. The four heldout A seeds are parameter variants and do not substitute for this evaluation.

Local rating template:

```json
{"BVersion":"B0","sceneId":"unfamiliar-01","model":"record locally","owner":"record locally","ratings":{"boundary":"not-run","memory":"not-run","priority":"not-run","feasibility":"not-run","alternatives":"not-run","unknown":"not-run","selfReview":"not-run"},"notes":""}
```
