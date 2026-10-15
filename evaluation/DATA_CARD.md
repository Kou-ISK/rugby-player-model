# Data card — synthetic fixtures and private records

[English](DATA_CARD.md) | [日本語](DATA_CARD.ja.md)

Status: **provisional synthetic test material, not an athlete or match dataset**. Public fixtures include no real names, tracking, footage, photographs, voice recordings, scraped plays or private coaching. Names such as `self` and `defender-1` are authored labels, not anonymized people.

| Material | Origin and use |
|---|---|
| Three original snapshots: support/42, occluded/77, audio/8 | `scripts/make-samples.ts`; synthetic world, bundle, memory, profile/rules. World fields are evaluator-only |
| Eight player-model regressions | `evaluation/cases/known-regressions.ts`; explicit possession/open, pressure, fresh receiver, noncarrier, missing vision, stale threat and left/right call strata |
| Candidate-edit examples | Authored perturbations and draft principles, not adopted or calibrated recommendations |
| Eight judgment prose scenes | Independently authored; original source frozen at `5886a70`, current bilingual reading editions separate; no expected action supplied to the subject |
| Dynamic, orientation and closed-loop scenes | Authored path/phase/mechanism development probes, not measured human behavior or unseen holdouts |

The [current manifest](../reproducibility.json) inventories public files; the [historical manifest](../research/reproducibility-manifest.json) and [frozen reference](baselines/judgment-evaluation.v1.json) preserve earlier identities.

## Generation and coverage

Legacy geometry uses uint32 `1664525 * state + 1013904223` modulo `2^32`, with 0.2-second steps, meters/radians/seconds and +z attack. Explicit dynamic scenes are reproduced from fixed definitions/hashes. Profiles and geometry are controlled probes, not population samples or normative athlete values.

There are no human-labeled optimal actions, match outcomes, physiological targets or statistical training/validation/test split. Tests encode invariants and known probes. Published/used examples are regressions; stronger transfer claims require independently authored, initially withheld conditions, not just changed names/seeds.

Coverage is small and simplified. Legacy scenes have static actors, dynamic v1/v2 scripted actors, optional v3 independent actors and abstract skills. Demographic fairness, accessibility, expertise, fatigue, real contact, competition context and tactical quality are not validated. No representativeness, real-world frequency or uncertainty calibration is claimed.

## Private records

Development `.rpm/` or explicit `RPM_SESSION_DIR` stores snapshots, feedback, candidates, reviews, versions and comparisons. The configured Mac uses a separate private directory. These records are not public data, automatically uploaded, trained on, included in the manifest or licensed by the public fixtures. Keep every alternative location out of Git.

For private reproduction retain original snapshot/context, exact code/runtime, candidate/revision, profile/rules, active versions and acquired manual input history. A code upgrade is a separate intervention. An unsaved arbitrary interaction is not a replay tape. Keep complete snapshots private unless an authorized synthetic replacement is prepared.

## Rights and updates

Authored synthetic material falls within the limited MIT grant in [LICENSE-SCOPE](../LICENSE-SCOPE.md). No CC0/CC BY grant is applied. Historical UNLICENSED records describe earlier permission; dependency terms and the bounded P2P display-kit provenance remain separate. The kit adds geometry, not athlete data.

Regenerate fixtures only for intentional implementation/input changes. Update/check the manifest, retain old reference commits and document changed assumptions. Do not alter frozen evaluation source bytes merely to pass integrity checks. See [publication scope](../docs/provenance/PUBLICATION_SCOPE.md).
