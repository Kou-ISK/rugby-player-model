# First research session with synthetic data

[English](FIRST_RUN.md) | [日本語](FIRST_RUN.ja.md)

This tutorial starts with public examples and a new private session. The **player model** is executable cognition; **judgment principles** is an independent document. You will save a proposed change, preview it, adopt player model and judgment principles separately, undo them, and reproduce a shared proposal in another session. These are synthetic software exercises, not approval of research principles.

You need Node.js 24 and this repository's public files. No AI product, API key, paid service or owner-specific configuration is required. Judgment principles can also be evaluated [without any player model experiment](JUDGMENT_EVALUATION.md).

For actual collaborative research, start with [RESEARCH_START](RESEARCH_START.md). It creates a private checkpoint and begins with the broad research framework. Do not use this tutorial's synthetic approvals or immediate edit/preview cycle as the default after coaching.

## 1. Create a session

Run these commands from the repository root:

```sh
npm ci
export RPM_SESSION_DIR="$PWD/.rpm/tutorial"
npm run bridge -- session init --dir "$RPM_SESSION_DIR" --synthetic
```

The session holds observations, candidates, versions and decisions. Initialization refuses an existing state file. Choose another new directory instead of deleting an existing session. To resume, set the same `RPM_SESSION_DIR` and omit initialization.

To use the browser, run `npm run dev` and open the displayed local URL. Keep that terminal open. For command-line work at the same time, open a second terminal in the repository and set the same `RPM_SESSION_DIR`. The commands below use the same storage as the browser.

## 2. Capture the player's observations

```sh
npm run bridge -- snapshot --scene support --seed 42 --head -2
npm run bridge -- snapshot-turn SNAPSHOT_ID --head 0
npm run bridge -- propose TURNED_SNAPSHOT_ID --feedback 'Synthetic study: check receiver freshness and uncertainty'
npm run --silent bridge -- context CANDIDATE_ID
```

Read the IDs in each JSON response and replace the uppercase placeholders in the next command. The first capture looks behind the player; the next turns forward at the same simulation time. The saved history keeps their order and original observation times. Only a simulation step advances time.

The context contains permitted observations, memory and player settings for a collaborator. It omits world truth. A full snapshot also contains synthetic world state for reproduction and spectator display; do not give that full envelope to an evaluator restricted to the player's perspective.

## 3. Edit and preview a candidate

```sh
npm run bridge -- edit CANDIDATE_ID --revision 1 --file tools/workbench/examples/conditional-coaching-edit.json
npm run bridge -- mode-edit CANDIDATE_ID --revision 2 --mode finite --k 1
npm run --silent bridge -- preview CANDIDATE_ID --revision 3
npm run bridge -- mode-study CANDIDATE_ID --revision 3 --k 1
```

The example includes a proposed player model rule, an independent judgment principle, a reason, an expected effect and a counterexample. Editing and previewing do not adopt either output.

The saved comparison has three arms: legacy, the receiver-selection policy with unlimited capacity, and that same policy with finite capacity. Finite versus unlimited tests capacity; legacy versus unlimited tests the policy change. Encoding, retrieved evidence and retained memory stay fixed within the capacity pair. Risk and orienting still use retained evidence. This is an unvalidated receiver-selection hypothesis, not a completed human memory model.

## 4. Adopt and undo each output separately

The following commands are explicit **synthetic tutorial decisions**. Check the displayed candidate contents and revision first. Do not automatically fetch a newer revision and pass it into an approval command.

```sh
npm run bridge -- approve CANDIDATE_ID --target player --by owner --revision 3
npm run bridge -- status
npm run bridge -- approve CANDIDATE_ID --target judgment --by owner --revision 3
npm run bridge -- compare CANDIDATE_ID
npm run bridge -- undo player --by owner --version A1
npm run bridge -- undo judgment --by owner --version B1
```

In this new session, player model adoption produces `A1 / B0`; judgment principles adoption produces `A1 / B1`. Undoing the player model preserves judgment principles. Undoing judgment principles restores the original judgment principles text and amendment order. The candidate and historical decisions remain. Use the actual displayed version numbers if you have performed additional operations.

A stale revision is rejected with a conflict, represented as HTTP 409 in the browser. Failed operations leave the state unchanged. A judgment principles full-text replacement is another explicit proposal: it creates a new baseline reference and judgment principles version, preserving the old baseline for undo.

## 5. Stop and restart

If the browser server is running, stop it with Control-C in its terminal, or run this from a terminal with the same session setting:

```sh
npm run bridge -- stop
```

This checks the session's running instance rather than killing an arbitrary process. Start again with the same `RPM_SESSION_DIR` and `npm run dev`. Candidates, active versions, decisions and saved comparisons persist. Saved animation frames are replayed without rerunning cognition. Stop this test server before starting another server on the same port; do not stop unrelated jobs.

## 6. Share a permitted synthetic proposal

Even an unadopted or undone candidate can be exported:

```sh
npm run bridge -- proposal export CANDIDATE_ID --revision 3 --targets player,judgment --author 'Synthetic tutorial' --rights 'Authored synthetic example within the stated MIT scope' --public-synthetic --out "$RPM_SESSION_DIR/proposal.rpm-proposal.json"
```

The confirmation applies only to the selected candidate and listed synthetic inputs. It does not authorize sharing a whole private session. The package contains fixed inputs, base versions, proposed changes, expectations, counterexamples, references and a reference run. It does not contain local adoption events or absolute session paths.

In another copy of the public source, install the locked dependencies with `npm ci`. Transfer the proposal file, then start a separate session:

```sh
export RPM_SESSION_DIR="$PWD/.rpm/tutorial-receiver"
npm run bridge -- session init --dir "$RPM_SESSION_DIR" --synthetic
npm run bridge -- proposal validate --file /absolute/path/proposal.rpm-proposal.json
npm run bridge -- proposal import --file /absolute/path/proposal.rpm-proposal.json
npm run bridge -- proposal reproduce LOCAL_CANDIDATE_ID --manifest CONFIRMED_MANIFEST_SHA256
npm run bridge -- proposal list
```

Import is inert: player model and judgment principles remain unapproved. Reproduction creates a new execution ID, timestamp and environment record, then compares a semantic result hash with the reference run. That hash includes observation identity/time/confidence, scores, intentions, body requests, next memory and judgment principles text/order. It excludes the new run's management ID, wall clock and environment.

To adopt an imported result, inspect its before/after contents, manifest hash, local run and session revision. Then use a separate command for each target:

```sh
npm run bridge -- proposal adopt LOCAL_CANDIDATE_ID --target player --by owner --session-revision CONFIRMED_SESSION_REVISION --manifest CONFIRMED_MANIFEST_SHA256 --run LOCAL_RUN_ID --reason 'Explicit synthetic tutorial decision'
```

Repeat for judgment principles only after checking the newly displayed session revision. Undo uses the commands above. If the active baseline changed, `proposal rebase` requires a reason and explicit rights confirmation, creates a new unapproved revision, and requires another reproduction. The current data-only rebase supports one fixed-observation case; multiple cases and code-review references require a reviewed revision. Judgment principles text and amendment order must be reviewed against the new baseline rather than automatically merged.

## Browser controls

The current browser labels are Japanese. The [Japanese guide](FIRST_RUN.ja.md) gives the same workflow; these translations identify the main controls:

| Label | Action |
|---|---|
| `snapshot保存` | Save the current scene, player, seed, time and observations |
| `この場面で候補を保存` | Save feedback as a candidate |
| `AI不要の手動候補入力` | Enter rules, conditions, reasons and counterexamples by hand |
| `保存済み候補をpreview＋固定回帰` | Preview the saved candidate and fixed regression cases |
| `同じ観測で従来・無制限・有限を保存比較` | Save the three research-mode arms |
| `本人としてこの内容を確認しました` | Confirm the displayed contents for one decision |
| `共有提案` | Export, validate, import and reproduce proposals |

Choose the support scene and seed 42, use the first-person view, turn the head to about −110° and back to 0°, then save a snapshot. The observation/memory panel is separate from spectator world truth. The player model and judgment principles adoption and undo have separate buttons. Judgment principles replacement requires a new text and an explicit ordered list of principles to retain. Selecting a different imported proposal clears its displayed preview and confirmation; reproduce that proposal before adopting it. A concurrent write clears confirmation and requires another check.

## Evaluation records and limits

For judgment principles alone, use the complete [none / old / new comparison guide](JUDGMENT_EVALUATION.md). It saves the actual input packet and fixed document reference, with separate principle-conformance and rugby-validity assessments. No player model experiment or external AI call is required.

`research-review` records an explicit review of an actual local proposal run, including scope, limits and reason. In a tutorial, pass `--synthetic` and identify it as a mock software review. `research-evidence` follows fixed references from mechanisms and principles through hypotheses, counterexamples, runs, reviews and proposed artifacts. `research-withdraw` appends a reason without removing negative evidence or old versions.

The `.rpm-proposal.json` format accepts only listed data entries. It rejects unknown versions/fields, duplicate decoded JSON keys, unsafe paths, executable entries, broken hashes and missing references. The player-model contract hash must match its referenced engine's execution schema. If an exact engine reference is complete but its binary is unavailable, import remains inert and player model execution is blocked; judgment principles text reproduction remains independent. Hashes do not authenticate an author.

New sessions use outer state format 2. Format 1 can be read without rewriting its records or hashes; the first explicit write upgrades the outer session format. Old binaries reject format 2. Recovery must preserve newer records and use a compatible reader; do not overwrite them with an older backup. See the [storage and recovery guide](LOCAL_STORAGE.md).

Automated acceptance uses only synthetic sessions. Mac headless success, a person's actual screen walkthrough, human cognitive validity and real AI evaluation of judgment principles are separate outcomes.
