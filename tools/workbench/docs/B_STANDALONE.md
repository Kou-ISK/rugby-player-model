# Compare judgment principles without running the player model

This workflow prepares three independent inputs: **none** (no principle text), **old** (a fixed earlier document), and **new** (a fixed proposed document). You can evaluate them by hand or in separate fresh conversations with any AI. No player-model experiment or AI service is required or called.

From the repository root, install the locked dependencies with Node 24 and `npm ci`. Initialize a new synthetic session using the [first-run guide](FIRST_RUN.md). Keep the same `RPM_SESSION_DIR` in this terminal. The bundled cases contain only synthetic observations, initial memory and a player profile.

```sh
npm run --silent bridge -- b-standalone-packet --file models/judgment/examples/observation-cases.json --arm none > "$RPM_SESSION_DIR/B-none.json"
npm run --silent bridge -- b-standalone-packet --file models/judgment/examples/observation-cases.json --arm old --version B0 > "$RPM_SESSION_DIR/B-old.json"
npm run --silent bridge -- b-standalone-packet --file models/judgment/examples/observation-cases.json --arm new --text-file models/judgment/RUGBY_JUDGMENT.md > "$RPM_SESSION_DIR/B-new.json"
```

`B0` is the session's frozen initial document, not the repository's newer draft. `--text-file` reads a document once and fixes its exact text and SHA256 reference. You can instead use `--document FILE.json` with `{ "ref": { "id": "your-stable-document-id", "version": 1, "sha256": "actual-64-character-text-hash", "hashFormat": "sha256-bytes" }, "text": "the exact document" }`. Incorrect hashes are rejected. Choose exactly one document source for old/new; none must have no document source.

Only send the saved packet's **`modelInput`** to an evaluator. Its case IDs are anonymous. The surrounding arm label, document reference, local B version and input hash are evaluator records and should not be included in the model prompt. The none input omits the `principles` field entirely. Use the same observation cases and separate fresh conversations to compare documents. Known public examples are regression cases, not unseen validation data.

Save the original packet with the response. Do not regenerate it from whichever B happens to be active later. This complete synthetic example creates a review file without calling an AI:

```sh
node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const directory = process.env.RPM_SESSION_DIR;
const packet = JSON.parse(readFileSync(join(directory, 'B-none.json'), 'utf8'));
writeFileSync(join(directory, 'B-review.json'), JSON.stringify({
  packet,
  model: 'Manual synthetic walkthrough; no AI called',
  output: 'Transport example only; no judgment result claimed.',
  assessment: {
    principleConformance: { result: 'insufficient-evidence', reason: 'No principles in the none arm.' },
    rugbyValidity: { result: 'insufficient-evidence', reason: 'This is a software example, not rugby validation.' }
  }
}, null, 2));
JS
npm run bridge -- b-standalone-review --file "$RPM_SESSION_DIR/B-review.json"
```

For real reviews, record the actual answer and assess **principle conformance** and **rugby validity** independently. Each accepts `pass`, `fail` or `insufficient-evidence`, with a reason. Records retain the exact packet, the hash of the actual `modelInput`, a separate whole-packet hash, arm and document reference through restart. They remain unverified and do not adopt A or B. A hash proves content consistency, not that an AI actually received it or that the answer is valid.

The packet format is `rpm.b-standalone-packet`, version 2. Existing unversioned standalone records remain readable as historical records; they are not relabeled as three-arm studies. The older experiment-linked `b-packet` commands remain available for their original workflow.
