# Reproducibility and unsupported work

## What is reproducible

The four scene generators (`support`, `occluded`, `audio`, `heldout`) use a uint32 seed. Time advances by fixed 0.2s steps. UI reset reproduces the initial geometry with current profile/rules. Snapshot stores the full selected world plus the exact observation bundle, prior episodic memory, profile and rule versions. Comparison fixes those decision inputs; only A rules differ. CLI and browser share the cognition and sensor code. Snapshot restore preserves recorded body/head state and memory but uses the currently active approved rules.

The evaluation suite now explicitly stratifies eight synthetic conditions: carrier/open (900), carrier/pressure (901), carrier/fresh receiver (1230), noncarrier/open (1231), carrier/missing vision (65536), carrier/stale threat memory (65537), noncarrier/left call (104728), noncarrier/right call (104729). Possession is set explicitly rather than accidentally determined by seed parity. This is a regression/parameter-generalization probe, **not evidence of general rugby competence**, and published cases are not permanently unseen. Both fixed-regression paths preserve the candidate's profile. Prospective condition sets freeze profile, inputs and criteria before feedback, with explicit first-use/reuse records. Unrecorded prior knowledge and exposure cannot be detected. B's actual AI execution and scoring are manual and separate.

`examples/` contains three public synthetic snapshots, reproducible with `npm run samples`. Run the headless model with `npm run --silent model -- --input examples/support-42.snapshot.json --steps 10`. It emits the staged trace as JSON and does not modify the private session. A replay starts from the snapshot's world/memory/profile/rules; each later observation is produced by the sensor adapter, never taken from a future world state.

## Unsupported or simplified

- All other players are static during a run. No opposing agent, realistic tackle, collision response, pass/release/catch, kicking, match scoring, fatigue, set-piece dynamics or complete law engine.
- Movement is capped kinematic translation. Model intent may select a pass, but output reports it unsupported and never claims success. Joints, muscles, posture, voice production and independent eye gaze are extension points only.
- Flat pitch, circular 2D occlusion and horizontal FOV. First-person renderer masks unobservable entities using the same adapter, conservatively removing an entire occluded model. No partial body visibility, vertical visual attention, detailed hearing propagation or reaction-time fit. Own ball possession and body location are synthetic accurate proprioception assumptions.
- Perceptual attention is a 4-item heuristic. Bounded episodic storage expires after 30 simulation seconds; it is not a validated human long-term-memory system. Semantic knowledge is supplied as explicit rule configuration. No spontaneous learning from prose or neuronal reproduction.
- Predictions hold the last observation and widen uncertainty. No true velocity or future ball path enters the player model or camera.
- In cognition-0.2, stale visual uncertainty regions penalize approach and create re-observation value; audio cue/direction can select a head turn. Region growth, risk/information weights and cue weights are engineering hypotheses, not fitted human behavior. They do not prove a hidden opponent is present or make stale receivers eligible for passes. There is no negative-observation update yet: failure to re-detect a remembered entity does not independently establish that it has left.
- Audio stores the observer's yaw at observation time. Recalled direction remains coarse and uncertain; translation cannot be corrected into an exact new bearing without range. Legacy audio with no yaw frame cannot steer a remembered head turn. Neither source coordinates nor identity are invented.
- Quick comparison is one captured decision. Recorded experiments run 1–20 steps from matching initial conditions; after actions diverge the observations can diverge. Neither is a paired full-match intervention. A conditional rule changes scores in a limited predicate vocabulary; it does not prove improvement or learn automatically from coaching. Constant-action negative controls detect a trivial all-scan result in the supplied hypothesis only; they do not establish generalization.
- The browser restarts at the initial scene until “restore latest” is chosen. Saved UI snapshots/candidates now include the ordered head/body observation tape, capped at 256 events without silent truncation. Unsaved resets and unsubmitted text do not survive. Paused turns share simulation time; no real-time reaction-speed claim is supported. Legacy snapshots cannot recover unrecorded trajectories.
- A/B baseline versions are drafts. Local owner approval is a procedural self-attestation, not identity verification. Approved candidate labels are historical; undo changes active versions without erasing the approval record.
- Candidate edits/reviews require the confirmed content revision; undo requires the confirmed active version. Conflicts are rejected rather than automatically retried. Existing sessions gain candidate revisions for new operations; legacy approval events remain legacy evidence.
- The root B0.1-draft is available for independent evaluation, while local B exports remain frozen B0 plus approved amendments. This draft does not silently modify the owner's active B.
- Snapshot rules identify parameter versions, not an archived executable. The current trace reports `modelRevision: cognition-0.3`; before/after comparisons recompute both sides with the current engine. To reproduce old engine outputs, use the recorded Git commit. Upgrading code and replaying an old snapshot is not the original historical execution.
- The Mac bridge exports one B arm with anonymous cases, excluding evaluation labels/scene/seed/world/A outputs. A separate evaluator map retains metadata and criteria. External responses are tied to experiment, arm, case group and input hash. No external AI is called; the Mac acceptance response is a synthetic mock. No B benefit or owner screen acceptance is inferred. Prior B work reported elsewhere is separate evidence.
- Meaningful call selection emits a semantic event only, with a bounded history/cooldown. Voice, acoustics and teammate reaction remain unsupported.
- JSON state is a single-file local store. Long research histories and many full-trace experiments may require migration to a larger storage backend; no multi-user authentication or distributed writer support is claimed.
- P2P procedural source is hash-verified and reused under the owner-authorized publication scope; UNLICENSED is retained. These display models do not establish body skills; the self-model is hidden in first person. Other players use scripted paths in dynamic scenes and remain static in legacy scenes. Mac headless evidence is distinct from owner interaction.

## Verification commands

```sh
npm ci
npm run check
npm run spike
npx playwright install chromium
npm run test:browser
```

With an already installed browser, `RPM_CHROMIUM=/absolute/path/to/chromium npm run test:browser` avoids a browser download. Cloud used its installed Chromium because the browser-download service was unavailable. Do not reinterpret that download failure as a test failure: actual tests ran against the installed browser. First dependency/browser installation and GitHub CI provisioning are network operations; core tests and app execution after installation need no remote service.

CI uses only package install, typechecking, Node tests, build, a small spike and browser tests. No paid cloud resources, secrets or production deployment. Repository workflows are provided; local Cloud command success is distinct from a remotely completed CI run. See [verification evidence](./verification/VERIFICATION.md).
