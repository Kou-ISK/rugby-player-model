# ADR-002: Model, research and publication boundaries

Status: accepted implementation boundary. This decision does not approve a cognitive hypothesis or a private A/B candidate.

## Decision

Keep the existing separation rather than moving files for each experiment. The reusable outputs are an observation-only executable model (A), independent player judgment documents (B), and local research tools. An experiment changes mechanisms or evidence, not the ownership of these directories.

| Directory | Owns | Must not own |
|---|---|---|
| `models/player/` | Observation contracts, reference cognition, mode definitions, standalone API, model tests/card | World truth, renderer, filesystem session access, AI service calls |
| `models/judgment/` | Self-contained judgment texts, portable player instructions, frozen historical B texts | Dependence on A or a particular AI vendor |
| `tools/simulation/` | Synthetic world, sensing, supported body execution | Cognitive policy, candidate adoption or browser UI |
| `tools/experiments/` | Immutable inputs, candidates, comparisons, evaluation packets, provenance | UI interaction or an embedded AI service |
| `tools/workbench/` | Local presentation, CLI/HTTP bridge, persistence and rendering adapters | A second implementation of cognition or an automatic B-to-A compiler |
| `evaluation/` | Authorized synthetic stimuli, evaluator criteria and historical baselines | Private coaching or real match/player data |
| `docs/` | Architecture decisions, reusable procedures, scope and verification evidence | Owner-specific plans, private installation logs or research conversations |
| `scripts/` | Build, reproduction and boundary checks | Research rules or hidden runtime behavior |

Root `src/` and `server/` are compatibility entry points; new implementation belongs in the directories above. Preserve old imports until a separately documented compatibility change. Do not create attack-specific and defense-specific copies of perception, memory or decision state. Phase-specific goals and supported skills use the common observation boundary. Possession, role and uncertainty require explicit contracts before implementation; no-ball does not imply defending.

Imports flow from the workbench toward experiments/simulation/player, from experiments toward simulation/player, and from simulation toward player contracts. A stays independently executable. B stays independently readable. Share pure presentation contracts without importing the server into the browser. Preserve byte-pinned vendor and B sources; adapt around them.

## Changes that require a design decision

Record the rationale, information boundary, alternatives and compatibility plan before adding a new observation/state channel, possession transition, body skill, multi-player update order or a persistent/wire-format change. A new scene normally adds a fixture, not a module. New cognition mechanisms must have causal comparisons; new physical skills must be distinguishable from a cognitive improvement. Parameter changes remain distinct from code changes.

## Public history

Published commits identify prior software and research artifacts. Do not rewrite them merely to make the project look more mature. A future cleanup must preserve exact source, frozen hashes and a mapping to recorded engine versions. If exposed confidential material is found, handle that incident explicitly; rewriting Git history alone does not revoke a credential or remove existing copies.

For unpublished work, first settle boundaries and make each commit a coherent, reviewable change: design contract, implementation, then evidence where appropriate. Fixups may be folded into an unpublished change before review. Avoid omnibus commits mixing unrelated interface, model and approval changes. Use the repository's review process and explicitly authorized history operations; do not force-push existing public branches as routine cleanup.

Before publishing, inspect the exact staged diff and new-file inventory, verify permitted provenance and license scope, then run the relevant checks. Never stage an entire private work directory. State software results, human acceptance and scientific validity separately. The manifest inventories source, not private research data. No commit/push or history rewrite is implied by editing this document.

## Consequences

A small amount of compatibility plumbing and historical documentation remains. This is preferable to breaking reproducible references for cosmetic cleanliness. The top-level layout can remain stable while cognition hypotheses, defense skills and experimental protocols evolve. New contributors have one canonical location for each responsibility and do not need an AI API account to run the tools.
