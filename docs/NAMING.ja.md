# 命名と互換性

[English](NAMING.md) | [日本語](NAMING.ja.md)

実行可能な認知を**選手モデル / Player model**、独立利用できる判断文書を**判断原則 / Judgment principles**と呼びます。正本ディレクトリは `models/player` と `models/judgment` です。シミュレーション・実験・ワークベンチは `tools/` 配下を維持します。

| 旧パス | 新パス |
| --- | --- |
| `tools/experiments/src/b-standalone.ts` | `tools/experiments/src/judgment-evaluation.ts` |
| `tools/workbench/tests/b-standalone.test.ts` | `tools/workbench/tests/judgment-evaluation.test.ts` |
| `tools/workbench/docs/B_STANDALONE.md` | `tools/workbench/docs/JUDGMENT_EVALUATION.md` |
| `models/judgment/docs/B_REVIEW.md` | 現行手順：`models/judgment/docs/REVIEW.md`、原文：`models/judgment/archive/review-protocol.md` |
| `models/judgment/docs/B_EVALUATION_SCENES.md` | 現行手順：`models/judgment/docs/EVALUATION_SCENES.md`、原文：`models/judgment/archive/evaluation-scenes.md` |
| `models/judgment/docs/versions/RUGBY_JUDGMENT-B0.md` | `models/judgment/archive/judgment-principles-initial.md` |
| `evaluation/baselines/b-evaluation-baseline.v1.json` | `evaluation/baselines/judgment-evaluation.v1.json` |

以前の `models/judgment/RUGBY_JUDGMENT.md` の凍結原文は `models/judgment/archive/judgment-principles-0.1-draft.md` に保持します。正本パスには現行の英語版を置き、日本語版を併設します。公開や翻訳だけで私的sessionの判断原則は採用されません。

機構レコードがhashで固定する旧 `models/player/spec/H-WM-1.md` は、`models/player/spec/archive/receiver-deliberation-v1.md` へ原文のまま保存します。機構レコードは同じbytesを参照し、現行仕様と翻訳は読むための版として分けます。

## 既存データ

過去のソースバイト列、観測記録、原則参照、hash、採否は書き換えません。`A`、`B`、`rulesA`、`patchA`、`rulesBVersion`、`A0`、`B0`、`rpm.b-standalone-packet` などは保存形式の互換識別子として残します。研究成果物の名称としては使いません。公開APIの `RulesA`、`defaultRulesA` なども互換性を維持します。[旧パス対応表](../tools/workbench/server/legacy-paths.json)は、過去の論理名をバイト単位で同一の原資料へ解決します。原資料を単体で開くと昔の相対リンクが解決しない場合があるため、[アーカイブ一覧](../models/judgment/archive/README.ja.md)から参照してください。

CLIでは `--target player`、`--target judgment`、`--targets player,judgment`、`undo player|judgment` を使えます。コマンドも `judgment-evaluation-packet`、`judgment-evaluation-review`、`judgment-packet`、`judgment-evaluator-map`、`judgment-review`、`export-judgment`、`export-judgment-json` を公開名にします。旧コマンドも互換のため受け付けます。版引数にはsessionが返す正確なIDを使い、表示名の変更で新しい承認版を作りません。

ソース移動により現行engineのmanifestは変わります。過去の実験を現行engineで実施したことにはしません。過去の再現には記録されたソースrevisionを使います。この変更による本人データの移行・採用操作はありません。

## 言語

現行文書は英語 `NAME.md` と日本語 `NAME.ja.md` を相互リンクします。挙動・コマンド・限界を変えたら両方を更新します。コード識別子とJSON fieldは翻訳しません。実験に使う翻訳は別のテキスト成果物として言語・全文・hashを固定し、日英の入力を実験的に同一とは扱いません。

文書一覧では、現行の日英ガイドと、凍結原資料・日付付き検証記録・第三者ライセンス原文を分けます。原ライセンスと過去の証拠は、それぞれの対象範囲で正本を維持します。`npm run check:docs` が言語ペアとローカルリンク、`npm run manifest:check` が公開一覧と保存原文hashを検査します。

0.4.0内の通常処理は[現行形式](decisions/ADR-003-current-format.ja.md)に統一します。選択肢は能力・仮説で命名し、旧版/新版の世代名で分けません。過去の名称は読取変換と不変の原資料に限定します。
