# 選手モデルを実行せず判断原則を比較する

[English](JUDGMENT_EVALUATION.md) | [日本語](JUDGMENT_EVALUATION.ja.md)

**none**（原則なし）、**old**（固定した旧文書）、**new**（固定した提案文書）の独立入力を作ります。人が評価するか、任意のAIで別々の新しい会話を使います。選手モデルの実験やAIサービスは不要で、ツールから呼び出しません。

Node 24でrepo直下の `npm ci` を実行し、[初回手順](FIRST_RUN.ja.md)で新しい合成sessionを用意します。同じterminalの `RPM_SESSION_DIR` を維持します。同梱caseは合成の観測、初期記憶、profileだけです。

```sh
npm run --silent bridge -- judgment-evaluation-packet --file models/judgment/examples/observation-cases.json --arm none > "$RPM_SESSION_DIR/judgment-none.json"
npm run --silent bridge -- judgment-evaluation-packet --file models/judgment/examples/observation-cases.json --arm old --version B0 > "$RPM_SESSION_DIR/judgment-old.json"
npm run --silent bridge -- judgment-evaluation-packet --file models/judgment/examples/observation-cases.json --arm new --text-file models/judgment/RUGBY_JUDGMENT.md > "$RPM_SESSION_DIR/judgment-new.json"
```

`B0` はsessionの凍結初期文書を指す既存版IDで、repoの新しいドラフトではありません。`--text-file` は一度読んだ全文とSHA256を固定します。代わりに `--document FILE.json` で `{ "ref": { "id": "your-stable-document-id", "version": 1, "sha256": "actual-64-character-text-hash", "hashFormat": "sha256-bytes" }, "text": "the exact document" }` を渡せます。不正hashを拒否し、old/newは一つの文書sourceだけ、noneは文書なしを要求します。

評価対象へは保存packetの **`modelInput` だけ**を渡します。case IDは匿名です。外側のarm名、文書参照、ローカル版、input hashは評価記録で、promptへ入れません。noneはprinciples欄自体を省きます。同じ観測と別の新会話で比較し、既知の公開例は回帰で未見検証ではありません。

元packetを回答と一緒に残し、後のactive文書から作り直しません。次はAIを呼ばずreviewファイルを作る完全な合成例です。

```sh
node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const directory = process.env.RPM_SESSION_DIR;
const packet = JSON.parse(readFileSync(join(directory, 'judgment-none.json'), 'utf8'));
writeFileSync(join(directory, 'judgment-review.json'), JSON.stringify({
  packet,
  model: 'Manual synthetic walkthrough; no AI called',
  output: 'Transport example only; no judgment result claimed.',
  assessment: {
    principleConformance: { result: 'insufficient-evidence', reason: 'No principles in the none arm.' },
    rugbyValidity: { result: 'insufficient-evidence', reason: 'This is a software example, not rugby validation.' }
  }
}, null, 2));
JS
npm run bridge -- judgment-evaluation-review --file "$RPM_SESSION_DIR/judgment-review.json"
```

実際のreviewでは原回答を記録し、**原則遵守**と**競技妥当性**を別に採点します。それぞれpass/fail/insufficient-evidenceと理由を受け付けます。packet全文、実modelInputのhash、packet全体の別hash、arm、文書参照を再起動後も保持します。未検証のままでどちらの成果物も採用しません。hashは内容一致を示すだけで、実AIへの送付や回答妥当性を証明しません。

保存形式は互換識別子 `rpm.b-standalone-packet` version 2です。旧版なし記録は過去記録として読み、3arm研究へ読み替えません。実験へ結び付ける `judgment-packet` 系も従来の用途で利用できます。
