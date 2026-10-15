# Names and compatibility

[English](NAMING.md) | [日本語](NAMING.ja.md)

Use **player model** for executable cognition and **judgment principles** for independently usable decision documents. Their canonical directories are `models/player` and `models/judgment`; simulation, experiments and workbench remain under `tools/`.

| Previous path | Current path |
| --- | --- |
| `tools/experiments/src/b-standalone.ts` | `tools/experiments/src/judgment-evaluation.ts` |
| `tools/workbench/tests/b-standalone.test.ts` | `tools/workbench/tests/judgment-evaluation.test.ts` |
| `tools/workbench/docs/B_STANDALONE.md` | `tools/workbench/docs/JUDGMENT_EVALUATION.md` |
| `models/judgment/docs/B_REVIEW.md` | Current guide: `models/judgment/docs/REVIEW.md`; original: `models/judgment/archive/review-protocol.md` |
| `models/judgment/docs/B_EVALUATION_SCENES.md` | Current guide: `models/judgment/docs/EVALUATION_SCENES.md`; original: `models/judgment/archive/evaluation-scenes.md` |
| `models/judgment/docs/versions/RUGBY_JUDGMENT-B0.md` | `models/judgment/archive/judgment-principles-initial.md` |
| `evaluation/baselines/b-evaluation-baseline.v1.json` | `evaluation/baselines/judgment-evaluation.v1.json` |

The frozen draft previously at `models/judgment/RUGBY_JUDGMENT.md` is preserved in `models/judgment/archive/judgment-principles-0.1-draft.md`. The canonical path now contains the current English reading edition, with a Japanese companion. Neither publishing nor translating it adopts a document into a private session.

The hash-pinned mechanism source formerly at `models/player/spec/H-WM-1.md` is preserved in `models/player/spec/archive/receiver-deliberation-v1.md`. Its stable mechanism record points to those unchanged bytes; the current specification and translation are reading editions.

## Existing data

Historical source bytes, observation records, principle references, hashes and adoption decisions are not rewritten. Session fields and wire tags such as `A`, `B`, `rulesA`, `patchA`, `rulesBVersion`, `A0`, `B0` and `rpm.b-standalone-packet` remain compatibility identifiers, not names of the research outputs. Public API exports such as `RulesA` and `defaultRulesA` remain stable. [Legacy path resolution](../tools/workbench/server/legacy-paths.json) maps historical logical names to the byte-identical archives. Old embedded relative links may remain unresolved when a raw archive is opened alone; use the [archive index](../models/judgment/archive/README.md).

The CLI accepts `--target player`, `--target judgment`, `--targets player,judgment`, and `undo player|judgment`. Descriptive commands include `judgment-evaluation-packet`, `judgment-evaluation-review`, `judgment-packet`, `judgment-evaluator-map`, `judgment-review`, `export-judgment` and `export-judgment-json`. Original command spellings continue to work. Version arguments use the exact IDs returned by the session; changing a label does not create a new approved version.

Moving source files changes the current engine source manifest. It does not relabel old engine records as current. Reproduce historical experiments with their recorded source revision. This change performs no owner-data migration or approval.

## Languages

Current documentation uses English `NAME.md` and Japanese `NAME.ja.md`, with reciprocal language links. Change both when behavior, commands or limitations change. Code identifiers and JSON fields stay identical across languages. A translation used for an experiment is a distinct text artifact: fix its language, exact text and hash rather than claiming the English and Japanese inputs are experimentally interchangeable.

The documentation index distinguishes current bilingual guides from immutable archives, dated verification evidence and third-party legal originals. Original licenses and historical evidence remain authoritative for their own scope. `npm run check:docs` checks language pairs and local links; `npm run manifest:check` checks the public inventory and preserved source hashes.
