# Reproduction manifest

[English](REPRODUCTION.md) | [日本語](REPRODUCTION.ja.md)

The machine-readable [manifest](../reproducibility.json) binds public source, contracts, fixtures, test instructions and cards by SHA256. Use the **Git commit containing that manifest** to check out the exact tree; the manifest excludes itself to avoid a circular hash. The reference commit `5886a70` records the independently reviewed earlier baseline and exact CI evidence, not a claim that later UI/document changes existed at that commit.

```sh
npm ci
npm run manifest:check
npm run check
npm run --silent model -- --input evaluation/fixtures/support-42.snapshot.json --steps 10
```

For browser verification, install a supported Chromium through Playwright or set `RPM_CHROMIUM` to an existing executable, then `npm run test:browser`. The first install requires network access; model, manifest verification and tests run locally after dependencies are installed. See [Mac acceptance](./verification/MAC_ACCEPTANCE.md) for the separate owner demonstration.

`npm run manifest:check` verifies both the file inventory/hashes and the frozen judgment principles reference. A mismatch fails with the affected paths. It does not rewrite anything. `npm run manifest:write` regenerates only the public manifest after an intentional source change; it still refuses a change to frozen judgment principles inputs. Updating the judgment principles evaluation reference is a separate explicit decision, not part of normal manifest regeneration.

## What to keep for a research comparison

| Record | Where it comes from | Why it matters |
| --- | --- | --- |
| Exact code and runtime | Git commit, manifest/file hashes, `node --version`, lockfile | player model parameter version does not identify an engine binary. |
| Initial world and player evidence | Original snapshot JSON and hash | Preserve seed/time/body/head, observation bundle and prior memory without giving spectator truth to cognition. |
| Individual/rule conditions | Snapshot profile and RulesA; active player model and judgment principles versions | Separate ability, self-estimate, preferences, tactics and rule changes. |
| Candidate and review | Candidate revision/content, approval target/receipt and undo events | Distinguish preview from adoption and retain what the owner actually confirmed. |
| Evaluation conditions/results | Durable experiment ID/engine fingerprint/frozen traces, chosen strata; pinned judgment principles materials and linked external responses/assessment notes | A deterministic output is not evidence of improvement. Keep judgment principles compliance and rugby plausibility separate. |
| Limitations and acceptance | Cards, unsupported capability report, Mac/judgment principles evaluation status | Do not convert missing evaluation into a pass. |

Keep private experiment material in `.rpm/` or another excluded local directory. The public manifest only covers the authored public fixtures; it is not a harvest/export of that directory. UUIDs, wall-clock feedback timestamps and arbitrary interactive input sequences are not controlled by a scenario seed. Numerical trace equality is tested under the same environment; no bitwise identity across every browser/platform or human outcome is promised.

The archived draft, initial judgment document, review method and eight-scene packet are byte-pinned to `5886a70` in [judgment-evaluation.v1.json](../evaluation/baselines/judgment-evaluation.v1.json). There are no results for the separately conducted preliminary comparison in this repository, so the manifest makes no claim about its success or completion.

Current reading editions and translations are separate text artifacts. See the [archive index](../models/judgment/archive/README.md) and [naming/compatibility](NAMING.md) for their mapping.
