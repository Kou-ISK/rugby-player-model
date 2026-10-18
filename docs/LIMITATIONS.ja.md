# 再現性と限界

[English](LIMITATIONS.md) | [日本語](LIMITATIONS.ja.md)

## 再現できる挙動

静的generatorのsupport/occluded/audio/heldoutはuint32 seedと0.2秒stepを使います。resetは現在profile/rulesで初期配置を再現します。snapshotは世界、正確な観測、直前記憶、profile、版を保持し、固定入力比較は選択したルールだけを変えます。CLI/browserは認知・sensorを共有します。復元は身体・首・記憶を戻し、ルールは現在承認版を使います。

公開回帰8件は保持・開放(900)、圧力(901)、新鮮な受け手(1230)、非保持・開放(1231)、視覚欠損(65536)、古い脅威(65537)、非保持の左右の声(104728/104729)です。保持はseedの偶奇でなく明示し、候補profileを保持します。既知の回帰・parameter比較で、一般競技能力の証拠ではありません。事前条件は指導前にprofile・入力・基準を凍結し、初回/再利用を記録しますが記録外の知識は検出できません。文書の実AI実行・採点は独立した手動工程です。

公開snapshot3件は `evaluation/fixtures/` にあり `npm run samples` で生成します。

```sh
npm run --silent model -- --input evaluation/fixtures/support-42.snapshot.json --steps 10
```

私的sessionを変えずJSONを出します。後の観測も未来の真値でなくsensor由来です。動的definition/hash、取得履歴、source fingerprintも再現条件であり、seedだけで未保存の任意操作、UUID、指導の壁時計時刻は再現できません。

## 版ごとの範囲

| 領域 | 限界 |
|---|---|
| 静的場面とkinematic設定 | 他者は静止/指定経路、移動は制限した運動学的平行移動。パスは意図だけで放出・捕球・接触処理なし |
| [方向・局面](../models/player/spec/ORIENTATION_PHASE.ja.md) | oriented設定は可視方向・保持cueと不確実局面を追加。守備/不明はscan/holdだけ。向きは関係記録に使い経路得点には使わない。保持者切替なし |
| [閉ループ](../models/player/spec/CLOSED_LOOP.ja.md) | 任意motor設定は加減速・旋回、2D放出・捕球・接触、観測速度、小目標、独立少人数actorを追加。指定経路の刺激は反応しない |
| 全版 | 完全な規則・得点、人体運動、現実的タックル後処理、キック、疲労、全セットプレー、独立眼球、音声生成、学習挙動の実証なし |

motor設定の接触は抽象eventで、合法・安全なタックル、傷害、ruck、turnoverの証拠ではありません。技能追加と認知policy変更は別介入です。公開除去比較は開発資料で、自己組織化、人間同等性、未見転移、本人受入の証明ではありません。

## 知覚・認知の仮定

- 平面pitch、水平視野、2D円形遮蔽、model全体の可視maskです。部分的身体、上下注意、周辺精度、詳細音響はなく、自己位置・保持は正確な合成固有感覚です。
- 注意4件、128episode/30秒、減衰、不確実性、重みは工学的仮説で、人間定数・生物学的長期記憶ではありません。workingMemory表示は容量制約ではなく、H-WM-1は受け手検討だけを制限します。
- kinematicの予測は最終位置と拡大不確実性、motor設定の速度は複数取得観測と限定外挿です。真の速度・未来球は渡しません。
- 古い不確実性は接近・再観測へ、声の意味・方向は見回しへ作用します。隠れた相手の存在や新鮮な受け手を証明せず、未再検出だけで不在にもなりません。
- 音は元observer yawと粗い不確実方向を保持します。距離なしに移動後の正確な方角を求めず、yawのない旧音は記憶から首を向けられません。真の座標・IDを作りません。
- kinematicのcallは上限・cooldown付き意味eventで、音声や味方反応ではありません。motor policyの個別制限は契約に記載します。

## 研究・保存の限界

簡易比較は一判断、通常実験は1–20stepです。motor機構studyは契約の拡大期間を使えます。行動で後の観測は変わり、全試合の対比較ではありません。条件得点規則は改善を証明せず、原文から学習しません。定数行動対照がall-scanを除くのは指定仮説だけです。

停止中の手動見回しは同じ時刻で情報を増やし、実時間認知・首速度・反応時間を測りません。一保存区間256件、API 11は通常224件で不変参照を残して継続します。現在区間再生と過去保存区間を分けます。未保存文字・履歴、旧版の未記録経路は復元できず、再起動後は明示復元が必要です。

成果物は研究ドラフトで独立した版・採否を持ち、本人承認は自己申告です。確認revision/active版で競合・古いundoを拒否し、採用を自動再試行しません。undo後も過去approvedは残り、旧承認に新確認根拠を後付けしません。

現行判断文書は私的出力を置換せず、凍結初期原本と明示承認済み原則を維持します。ルール版は実行binaryではありません。両比較armを現在engineで計算し、旧実行の再現には未commit変更を含む元source/runtime/hashが必要です。翻訳も別hashの実験入力です。

匿名packetは評価label、scene/seed、world、選手モデル出力を除きます。回答はarm/group/input hashへ結びますが未検証です。AIは呼ばず、mock保存は実AI評価や本人画面受入ではありません。別途行った研究は別根拠です。

JSON storeは単一writerで、多人数認証・分散書込はありません。長期履歴には保存基盤拡大が必要になり得ます。P2P形状は描画専用・hash固定・限定許諾で、一人称は自己形状を隠します。Mac headless結果は本人操作ではありません。

## 検証

```sh
npm ci
npm run check
npm run spike
npx playwright install chromium
npm run test:browser
```

既存Chromiumは `RPM_CHROMIUM=/absolute/path/to/chromium npm run test:browser` で指定します。初回導入とCI準備には通信が必要で、導入後のmodel/test/appは外部サービス不要です。download失敗と既存browserで実行した試験は別です。CI設定はinstall/check/build/spike/browserで、有料deployやproduction秘密は不要です。ローカル成功はremote CI完了ではありません。[過去の検証](verification/VERIFICATION.md)を参照してください。
