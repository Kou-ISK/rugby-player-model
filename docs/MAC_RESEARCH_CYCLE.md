# Mac上の追加研究loop検証（90f7154の履歴）

対象はローカル `codex/research-loop-acceptance`。基点は `af313597ece951f888bb1e13824ad79a66d5ea45`、そのP2P adapter基点はPR #1 head `9bb52f4563254ae35fb2ed54ce722492e165e44c`。このファイルを含むcommitと再現manifestで最終ソースを特定します。公開push・remote CI・新しい独立レビューは未実施です。

Node24.21.0、既存のChrome154 headless、1worker、software描画、低いプロセス優先度を使用。専用temp sessionだけで試験し、本人の `.rpm/` や他のjobを変更しません。画面ロック解除・安全設定変更はしていません。

## 追加した受入試験

`tests/browser/research-cycle.spec.ts` が専用port5176に所有serverを起動し、次を実行します。終了時にそのserverと試験sessionだけを片付けます。既存browser suiteの5174とは独立です。

1. 一人称・首振り・記憶の観測時刻を確認し、合成指導を候補保存。
2. 実CLIでscene/seed/time/playerの観測contextを取得し、世界envelope不在を確認。条件付きA・B・理由／予測／反例を保存してUI反映。
3. 仮の本人操作として理由付きA差戻し。元候補を残して親ID付きの新候補を作成し、UI編集。
4. 未採用previewでactive A0/B0を維持。5step×記録場面＋8対照の実験を保存。
5. 記録場面carry→scan、別場面scan、圧力下hold、受け手pass、非保持support。B previewはNOT approved。
6. 旧revisionでの採用をHTTP409で拒否。合成操作でAのみ、次にBのみ採用。
7. active実験を保存。観測だけのB packet9ケースをCLIとUI downloadで照合。外部AIは呼ばずsynthetic mock回答を未検証として記録。
8. 実serverを停止／再起動し、全状態・版・保存結果保持。候補場面を復元してscan。
9. A undo、B undo、復元でcarry。2回目の実server再起動でも履歴・固定実験結果・差戻し親候補を保持。

`tests/research-readiness.test.ts` は同条件での転用、5つの定数行動stubおよび旧global scanBiasの失敗、隠れた真値変更に対する不変性、scene/seed selector拒否、pass資格維持、意味的callの条件差・cooldown・履歴上限・自己聴覚への非還流、B同一ID更新／undo、旧sessionの保全を検証します。既存の首振り・記憶・音・個人条件・戦術・競合・P2P資源試験も維持します。

## 証拠の範囲

Macのheadlessソフトウェア実証です。本人が画面を見て指導したこと、研究原則を実際に承認したこと、Bの外部AI品質、人間や試合への改善は示しません。固定回帰ケースは公開後も未知であり続けるわけではありません。最初の本人実験で未使用条件・反例と成功／失敗基準を本人が選びます。

90f7154時点の確認は34単体／6ブラウザ、型検査、build、65ファイルのmanifest照合が合格。固定B入力は5886a70のままです。buildのbundleサイズ警告は残ります。

旧29単体／5ブラウザの記録は [MAC_HEADLESS.md](MAC_HEADLESS.md) に保存。この拡張の集計と機械可読合成証跡は作業フォルダの `evidence/readiness-final-check.log`、`evidence/readiness-final-browser.log`、`evidence/readiness-browser.json`、`evidence/research-cycle-summary.json` を参照します。

## 独立レビュー修正後

現行はprofile固定の回帰試験、指導前の評価条件凍結、匿名B入力、首振り観測履歴を追加。[評価手順と制約](EVALUATION_PROTOCOL.md)参照。追加単体7件と拡張したresearch-cycleブラウザ試験を実装し、証跡は `evidence/evaluation-final-check.log`、`evidence/evaluation-final-browser.log`、`evidence/evaluation-cycle-summary.json` に分離して保存する。旧B packetに状況ラベルがあった事実や、旧版が全首振り軌跡を保存していなかったことは上書きしない。

修正後の最終Mac確認は41単体／6ブラウザ、型検査、build、69ファイルmanifestが合格。事前凍結2条件、首振り4イベント（同時刻3件＋0.2秒step）、匿名B入力、再利用表示、実server再起動2回を合成sessionで確認した。本人受入と実AI評価の完了は主張しない。
