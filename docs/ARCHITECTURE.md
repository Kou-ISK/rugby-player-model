# Research architecture

Two independent deliverables share research context, not an approval switch:

- **A** is a deterministic executable prototype. The `think(Bundle, Memory, Profile, RulesA)` function accepts a validated observation boundary and returns an inspectable trace and capability-labelled body requests.
- **B** is [RUGBY_JUDGMENT.md](../RUGBY_JUDGMENT.md), a standalone principle system with conditions, criteria, priorities, exceptions, uncertainty and evidence. Any general-purpose AI can use it without A. Its local approved amendments are exported into a complete Markdown document.

## Data boundaries

```mermaid
flowchart LR
  W[Seeded synthetic world] --> S[Sensor adapter: view / occlusion / sound]
  S --> O[JSON observation bundle]
  O --> A[Attention]
  A --> M[Working and episodic memory]
  M --> B[Beliefs / uncertain prediction]
  B --> E[Candidate evaluation]
  P[Ability / self-estimate / preference / tactics] --> E
  E --> I[Intention]
  I --> C[Capability-labelled body output]
  C --> W
  W --> V[Spectator renderer]
  O --> R[Player evidence panel]
```

Only `src/simulation.ts::sense` reads simulation truth to construct observations. `src/cognition.ts` imports contracts and validation, never the world/simulation/renderer. JSON Schema rejects unknown fields; an opponent's internal state cannot enter through extra properties. Vision gives currently visible positions; audio gives a coarse body-relative bearing and a cue, not a source's exact coordinates, identity or intent. Own position, heading, head angle and ball possession are synthetic proprioceptive inputs, explicitly assumed accurate in v1.

`Snapshot` is a **research envelope** and deliberately contains world truth for reproduction/spectator use. A receives only `snapshot.bundle`, `memoryBefore`, `profile` and `rulesA`. `bridge context` omits the world, while the private snapshot remains available for explicit experimental inspection. Do not give the full world envelope to an AI asked to reason from the player's perspective. Tests alter occluded or behind-player state and require complete A traces to remain identical.

## Cognition and evidence status

| Stage | Prototype behavior | Status |
| --- | --- | --- |
| Sensation | 90° horizontal cone, 35m range, 2D circular occlusion; calls within 20m | Engineering assumptions; no retinal/acoustic model |
| Attention | At most 4 percepts; calls, ball, then players | Explicit heuristic, not measured human attention |
| Working memory | At most 4 currently usable beliefs | Engineering capacity; not a universal human constant |
| Long-term/episodic store | Bounded 128 observation episodes, 30s simulation window; snapshot persists across process restart | Infrastructure for a later long-term model; 30s is not a biological LTM claim |
| Semantic knowledge | Approved A rule configuration supplied separately; B is independently authored | No automatic extraction from text into A |
| Belief | Latest per entity/modality, original `observedAt` and `confidence`; derived confidence decays by age | Exponential half-life is an experiment parameter |
| Prediction | Last observed position with growing uncertainty; no velocity inference; uncertainty overlap contributes to risk | Conservative engineering hypothesis; no hidden future state |
| Evaluation | Hard eligibility, risk/information assessment, then weighted preference/self-estimate and team adherence; heard direction can select head yaw | Inspectable heuristic; not fitted behavior |
| Intention/body | Scan, hold, carry, pass, support; supported kinematic translation and head yaw | Pass remains intention-only; joints/muscles/posture/voice/gaze unsupported |

[Baddeley 2012](https://pubmed.ncbi.nlm.nih.gov/21961947/) motivates separating working-memory functions at a conceptual level. It does not establish the numeric capacities, decay constants, ranking function, body model, rugby outcomes or brain equivalence used here. Those choices must be revised through research and evidence.

`Profile.ability` limits physical speed/range; `selfEstimate` is the player's belief about passing reliability; `preference` weights individual choices; `tactics.adherence` mixes individual score with the preferred team action. A team score cannot enable a forbidden pass or unsupported skill. New channels should extend `BodyCommand` and capability reporting, not force cognition into a renderer or legacy P2P type.

In `cognition-0.2`, a stale opponent's uncertainty disk can overlap a 4m near region, weighted by decayed confidence. This reduces carry/support scores and speeds and increases the value of re-observation. A remembered player also creates a directional information request. Audio `support-call` / `warning-call` cues have explicit heuristic weights; the coarse bearing and original observer yaw determine an uncertain head-turn target. No audio coordinates or source identity are inferred. New observations are still required for fresh-receiver pass eligibility. The trace exposes assessment values and the exact source observation used for a head turn. Paired tests fix current visual input/profile and vary only old memory, cue presence, meaning or direction.

## Research transaction

1. Capture immutable scene/seed/time/player/body/observation/memory/profile and A/B versions.
2. Store feedback as a candidate with empty A patch and unfinished B principle fields. This does not change rules.
3. Human and Codex edit the A numeric patch and B structured principle. Editing never approves. Once either target is reviewed the candidate is immutable; fork a new candidate to revise it.
4. Before adoption, preview the candidate patch over its captured base without mutating any state. Explicit active comparison remains separate. Run the stratified suite; B gets an independent document review.
5. Owner explicitly approves/rejects **A** and **B** independently. Edit/review must supply the revision actually displayed/confirmed, compared inside the writer lock; conflicts return 409 and require refresh/reconfirmation. The receipt freezes that revision and the reviewed content. A refuses empty patches; B refuses TODO fields. A/B reject stale base versions. Approval is a local self-attestation, not cryptographic identity proof.
6. Undo supplies and checks the confirmed active version inside the same lock, then pops only that target. Historical versions and decision events remain. Candidate `approved` means historically approved, not currently active after undo.

The new B0.1-draft adds full-interval trajectory, arrival order, user-intent and separate data/rendering review. Existing local B exports are pinned to the archived B0 text plus owner-approved amendments; changing the repository draft never silently changes them. A code revision is identified by `modelRevision` and the Git commit; comparing stored parameter versions uses the current engine on both sides, not an old binary.

The JSON session is written atomically under a single-writer directory lock. Failed validation leaves active rules untouched. CLI and UI share the same store. No hosted AI or hidden network submission is involved. API binds to loopback and rejects invalid Host, foreign Origin and missing local JSON header. This protects against casual browser cross-site writes; it is not a multi-user service or a defense against code already running as the local user.

## Scope of extensibility

[JSON Schema](../schemas/contracts.schema.json) is language-independent. Units: meters, radians, seconds; +z is the synthetic attacking direction. A later Python/Rust model can consume the same observation contract without importing Three.js. No P2P compiler, BoardDocument, authentication, Blob, GLB or external asset is included. Renderer reuse belongs behind the view adapter. Supporting real match rules, agent interaction, biomechanics, speech production or learned behavior requires new validated implementations and tests.
