# Reproduction manifest

The machine-readable [manifest](../reproducibility.json) binds public source, contracts, fixtures, test instructions and cards by SHA256. Use the **Git commit containing that manifest** to check out the exact tree; the manifest excludes itself to avoid a circular hash. The reference commit `5886a70` records the independently reviewed earlier baseline and exact CI evidence, not a claim that later UI/document changes existed at that commit.

```sh
npm ci
npm run manifest:check
npm run check
npm run --silent model -- --input evaluation/fixtures/support-42.snapshot.json --steps 10
```

For browser verification, install a supported Chromium through Playwright or set `RPM_CHROMIUM` to an existing executable, then `npm run test:browser`. The first install requires network access; model, manifest verification and tests run locally after dependencies are installed. See [Mac acceptance](./verification/MAC_ACCEPTANCE.md) for the separate owner demonstration.

`npm run manifest:check` verifies both the file inventory/hashes and the frozen B reference. A mismatch fails with the affected paths. It does not rewrite anything. `npm run manifest:write` regenerates only the public manifest after an intentional source change; it still refuses a change to frozen B inputs. Updating the B evaluation reference is a separate explicit decision, not part of normal manifest regeneration.

## What to keep for a research comparison

| Record | Where it comes from | Why it matters |
| --- | --- | --- |
| Exact code and runtime | Git commit, manifest/file hashes, `node --version`, lockfile | A parameter version does not identify an engine binary. |
| Initial world and player evidence | Original snapshot JSON and hash | Preserve seed/time/body/head, observation bundle and prior memory without giving spectator truth to cognition. |
| Individual/rule conditions | Snapshot profile and RulesA; active A/B versions | Separate ability, self-estimate, preferences, tactics and rule changes. |
| Candidate and review | Candidate revision/content, approval target/receipt and undo events | Distinguish preview from adoption and retain what the owner actually confirmed. |
| Evaluation conditions/results | Durable experiment ID/engine fingerprint/frozen traces, chosen strata; pinned B materials and linked external responses/assessment notes | A deterministic output is not evidence of improvement. Keep B compliance and rugby plausibility separate. |
| Limitations and acceptance | Cards, unsupported capability report, Mac/B evaluation status | Do not convert missing evaluation into a pass. |

Keep private experiment material in `.rpm/` or another excluded local directory. The public manifest only covers the authored public fixtures; it is not a harvest/export of that directory. UUIDs, wall-clock feedback timestamps and arbitrary interactive input sequences are not controlled by a scenario seed. Numerical trace equality is tested under the same environment; no bitwise identity across every browser/platform or human outcome is promised.

The current B document, frozen B0, review method and eight-scene packet are byte-pinned to `5886a70` in [b-evaluation-baseline.json](../evaluation/baselines/b-evaluation-baseline.v1.json). There are no results for the separately conducted preliminary comparison in this repository, so the manifest makes no claim about its success or completion.
