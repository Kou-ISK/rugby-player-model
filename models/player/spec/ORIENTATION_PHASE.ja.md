# 身体方向と保持局面の仮説 v1

[English](ORIENTATION_PHASE.md) | [日本語](ORIENTATION_PHASE.ja.md)

版付きの工学的仮説です。見えた身体方向と不確実な局面推定を既存の認知循環へ加えます。人間の機構の実証や、指導文からのpolicy学習ではありません。

## 版と情報境界

場面はschema 3、`observationMode: oriented`、`ownAttackDirection: 1 | -1`（+z / −z）を使います。方向は事前戦術であり保持の真値ではありません。sensorの出力はすべてBundle 3です。`positions` は位置だけの取得を維持し、向き・文脈を補いません。条件変更は新しい場面・履歴で扱い、過去観測は実際の情報を保持したコピーだけを変換します。[ADR-003](../../../docs/decisions/ADR-003-current-format.ja.md)を参照してください。

Bundle 3は元の自己位置、body yaw、相対head yaw、自己保持を含み、正確な合成固有感覚と仮定します。各perceptは `evidenceVersion: 2` を持ち、現在見える選手には `bodyOrientation: {yaw, halfWidth, confidence}` を付けられます。pitch共通座標のradianであり、移動・視線・意図・未来動作ではありません。sensorは三角関数正規化をせず整数binでwrapし、browser/Nodeの観測bytesを合わせます。15°刻み、±7.5°、確信度0.8（親観測0.9未満）は工学的仮定です。欠損は欠損のままです。

見える球が合成の前方保持位置から0.2m以内にあり、その選手も見える場合だけ `ballControl: {holding: true, confidence: 0.85}` を付けます。欠損は非保持の証拠ではありません。真のcarrier/attachmentではなく可視geometryだけを使い、同じ位置のscripted loose ballも同じcueを作ります。画像分類器や全体保持の真値ではありません。`attachedBallFrame: body` の保持球は身体正面0.65mに置き、正面から見え、背面から保持者に遮られ得ます。点・円の近似で人体妥当性は未確認、`attachedBallFrame: world` は世界座標軸に沿った配置を使います。

音は発声者の向き・位置・ID・保持を含めず、遮蔽・画面外選手は視覚証拠を出しません。作者名、予定経路、未来の球をBundleへ入れません。記憶前の注意4件は維持し、任意のH-WM-1受け手検討容量と区別します。

## 推定と記録

Trace 4は `modelRevision: cognition-0.4.0` と `situation` を記録します。

- 自己body yaw、相対head yaw、正規化した和であるview yaw。
- 他選手の観測yaw、元source ID/時刻、相対角、派生確信度と角度不確実性。取得で時刻・元確信度を更新しません。確信度は `memoryHalfLife`、角度幅は90°/秒で180°まで拡大します。age=0、十分な確信度、曖昧でない区間のときだけtoward/away、それ以外は `uncertain` です。
- 自己保持→`attack-carrier`、単一の新鮮な味方保持cue→`attack-support`、相手cue→`defense`、欠損・競合→`unknown`。新鮮とは0.5秒以内かつ派生確信度が `minimumConfidence` 以上です。現行コード定数であり人間測定値ではありません。根拠source/時刻/確信度を保持します。
- defense/unknownはscan/holdのみでcarry/pass/supportは不適格。非保持だけでsupportにしません。攻撃移動は身体方向に従うもので経路計画ではなく、後方受け手は既知の攻撃方向で判定します。他選手の向きは**関係推定の記録に作用し、行動得点や経路選択にはまだ作用しません**。

baselineとH-WM-1はどちらも現行入力を扱い、Trace 4は有効時の受け手検討を記録します。容量は受け手専用です。挙動は入力内容・設定、engine source hash、profile、ルールで識別し、`A0` だけでは特定できません。sensor/engine追加はレビューするコード変更であり、パラメータpatchや指導原則の採用ではありません。凍結判断文書と採否は変わりません。

## 研究順序

1. 選手視点でチーム、攻撃方向、正面・背面、見える球を確認。意味が違えば旧版を残して修正します。
2. 表示bridgeで捕捉しsnapshotへ指導を結びます。sensorと推定を分け、隠れた向きを補わず、首振り後の観測を追加します。
3. 仮説・予測・失敗条件を凍結。位置・経路・視認性を可能な限り固定してbody yawだけを変え、head yaw、遮蔽、保持、攻撃方向は別に変えます。球が隠れる条件では保持不明を期待します。
4. 固定観測の認知比較と行動による閉ループ再生を分けます。無変更比較は再現性で、指導効果ではありません。公開fixtureは既知の開発条件です。
5. 回避、カバー、タックル、遅延パスの評価前に必要技能を実装します。本人が候補・コード・反例を確認して成果物別に採否を判断します。

公開fixtureは `evaluation/fixtures/orientation-{attack,support,defense}.scene.json` です。同じscene-create、scene-snapshot、表示、propose、edit、previewを使い、ソフトウェア試験は別合成sessionに限ります。本人sessionを初期化・採用しません。kinematic設定は保持者固定・一人制御・他者scriptedのままで、保持切替、自律反応、自己組織化はこの設定の対象外です。
