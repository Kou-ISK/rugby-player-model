# 判断原則の単独レビュー

[English](REVIEW.md) | [日本語](REVIEW.ja.md)

手動評価手順であり、自動モデル結果ではありません。workbenchは外部AIを呼びません。初期文書とローカル改訂は選手モデルの試験から独立して評価します。

出力した原則全文と未経験場面だけを一般AIへ渡し、判断、短い続き、自己レビューを求めます。場面に期待行動や対象原則の引用を入れません。全文回答と本人評価を文書版付きでローカル保存します。

最初は [EVALUATION_SCENES](EVALUATION_SCENES.ja.md) の共通依頼と8合成場面を使えます。runner、Node、JSON parser、workbenchは不要です。一場面ずつ新会話で実行し、02の観客情報を選手知識へ混ぜません。合格の根拠ではなく自作評価素材であり、公開・使用後は回帰として扱い、未見評価には新しい本人作成の変化条件を確保します。

名前・配置・方向・圧力を変えて、少なくとも次を比較します。

- 古い支援位置、接近するDF、背後の声。記憶を現在情報にしないか。
- 語り手だけが知る遮蔽DF。選手判断と観客説明の両方向の漏れ。
- チームのパス指定と不明な合法性・受け手位置。戦術が上位制約を覆さないか。
- 低い実能力と高い自己推定。能力、信念、選好、成功を分けるか。
- 実行モデル外のキック・ruck・タックルで局面やonsideが不明。独立性と必要質問、判定捏造の回避。
- 見回すこと自体が危険な切迫条件。機械的scanではなく例外・tradeoffを扱うか。

各回答に二つの評価票を使い、重大失敗を隠す平均得点へまとめません。

| 評価票 | 観点 | 採点 |
|---|---|---|
| 原則遵守 | 情報境界、記憶の古さ、安全・規則優先、能力・意図・結果、代替、不明、全区間、順序、依頼意図、データと描画、自己review | 各項目pass/fail/insufficient evidenceと短い理由 |
| 競技妥当性 | 適用局面・規則、選手・球の実行可能性、到達順序・相互作用、空間・圧力・支援、情報に即した戦術、依頼への忠実さ | 知識を持つ評価者が各項目を別採点 |

描画検査はinspected/not-provided/not-runで別記します。文章だけでデータ整合は評価できても画像忠実度は合格にできません。一件の隠れた真値漏れ、危険な優先、成立しない必須順序でも該当条件の採用を止めます。既知例だけの改善は不十分です。経路失敗は区間・入力値を引用し、不足運動を補って合格にしません。

比較は**原則なし／凍結初期原則／ドラフト0.1**、または正確な旧・新ローカル全文の3armです。同じ課題・場面を新会話へ渡し、原則だけを変えます。評価票・期待回答は渡しません。可能なら評価者にarm名を伏せ順序を入れ替えます。モデル・版・生成設定を記録し、非決定性を認め、僅差なら反復を検討します。違う回答を改善と扱わず、改訂後には新場面も使います。選手モデルの固定8件は代替になりません。

現在の [RUGBY_JUDGMENT](../RUGBY_JUDGMENT.ja.md) は提案版で、[凍結初期文書](../archive/judgment-principles-initial.md)は旧原本です。bridgeは初期原本と承認済み追加原則を出力し、repo編集で本人の採用版を変えません。このpackはbaseline全文を採用しません。

ローカル記録例（field名は日英共通）：

```json
{"arm":"none|old|new","sceneId":"unfamiliar-01","model":"ローカルに記録","owner":"ローカルに記録","compliance":{"boundary":"not-run","memory":"not-run","priority":"not-run","feasibility":"not-run","alternatives":"not-run","unknown":"not-run","interval":"not-run","arrivalOrder":"not-run","intent":"not-run","dataVsRendering":"not-run","selfReview":"not-run"},"rugby":{"lawContext":"not-run","motion":"not-run","interactions":"not-run","spaceAndSupport":"not-run","tactics":"not-run","requestedAction":"not-run"},"rendering":"not-provided","notes":""}
```
