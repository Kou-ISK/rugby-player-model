# 再現manifest

[English](REPRODUCTION.md) | [日本語](REPRODUCTION.ja.md)

[manifest](../reproducibility.json)は公開ソース、契約、fixture、試験手順、cardをSHA256で結びます。**そのmanifestを含むGit commit**で正確なtreeを取得します。循環hashを避けるため自身は除外します。参照commit `5886a70` は独立review済みの旧基準とCI根拠で、その後のUI・文書が当時存在したという主張ではありません。

```sh
npm ci
npm run manifest:check
npm run check
npm run --silent model -- --input evaluation/fixtures/support-42.snapshot.json --steps 10
```

ブラウザはPlaywrightで対応Chromiumを入れるか `RPM_CHROMIUM` で指定し `npm run test:browser` を実行します。初回導入は通信が必要で、以後のmodel/manifest/testはlocalです。[Mac受入](verification/MAC_ACCEPTANCE.md)は別の本人確認に関する過去記録です。

`manifest:check` は一覧・hash・凍結原本を読み取り確認し、不一致pathで失敗します。書換はしません。意図した変更後に `manifest:write` で現行公開manifestだけを更新しますが、凍結原本変更は依然拒否します。評価参照の更新は通常の再生成と別の明示判断です。

## 比較時に残すもの

| 記録 | 入手元と意味 |
|---|---|
| 正確なcode/runtime | commit、manifest/hash、node版、lock。パラメータ版だけでengineを識別しない |
| 初期世界と選手証拠 | 元snapshotとhash。seed/time/body/head、bundle、直前記憶を維持し、観客真値を選手へ渡さない |
| 個人・ルール条件 | snapshot profile/RulesA、成果物別active版。能力・自己推定・選好・戦術・ルール差を分ける |
| 候補とreview | revision/内容、対象/receipt、undo。previewと本人の確認・採用を区別 |
| 条件と結果 | experiment ID、engine fingerprint、固定trace、層別、固定文書と外部回答・採点。決定論は改善の証拠でない |
| 限界・受入 | card、非対応能力、Mac/文書評価状況。未実施を合格にしない |

私的実験は `.rpm/` またはGit外の専用場所へ保存します。manifestは自作公開fixtureだけを扱い、その場所を収集しません。UUID、壁時計、任意操作列はseedで制御しません。同一環境で数値一致を検査しますが、全platformのbit一致や人間の結果は保証しません。

[凍結評価参照](../evaluation/baselines/judgment-evaluation.v1.json)は `5886a70` の原則ドラフト、初期文書、review方法、8場面のbytesを固定します。現在の読み物・翻訳は別版であり、[archive一覧](../models/judgment/archive/README.ja.md)と[命名・互換性](NAMING.ja.md)から対応を辿れます。別途行われた予備比較の結果は本repoにないため、成功・完了をmanifestから主張しません。
