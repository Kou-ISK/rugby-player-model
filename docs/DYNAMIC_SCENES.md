# 動的な場面で研究する

この追加は、任意の小さい合成配置と動線を既存のCodex会話で作り、同じローカルbridgeへ保存して研究するためのものです。1人をAが操作し、他の選手は定義済みの刺激として移動します。他選手が学習・自律判断する実装ではありません。本人の競技的な評価と実AIによるB評価は、合成テストとは別に実施します。

## 起動と場面作成

Node 24、固定lockfileで `npm ci` を済ませ、repoで `npm run dev`。表示されたlocalhostを開きます。停止はそのターミナルでCtrl-C。`RPM_SESSION_DIR` を設定した場合は、サーバーとCLIで**同じ値**を使ってください。未設定なら `.rpm/` に私的保存します。プロセス再起動ではデータを削除しません。

既存のCodex会話で [合成例](../examples/dynamic-support.scene.json) を参照し、目的に合う配置・動線JSONを作ります。理由は本人の必須入力ではありません。Codexと対象・条件・例外を確認し、必要なJSONへ整理します。新しいGUI編集器、外部API、自動的な原則採用はありません。

```sh
npm run bridge -- scene-create --file examples/dynamic-support.scene.json
npm run bridge -- scenes
npm run bridge -- scene-authoring SCENE_ID --revision 1
npm run bridge -- scene-revise SCENE_ID --revision 1 --file .rpm/revised-scene.json
```

create/reviseの出力と `scene-authoring` は**作者・監査用**で、未来の動線と作者IDの対応表を含みます。選手として推論するAや盲検B評価へ渡してはいけません。場面を作った会話は未来を知っているため、同じ会話によるB評価を盲検とは呼べません。

UIの「場面」へ保存版が追加されます。版を選び「再現 / reset」で明示的に開始します。現在の観測は切替前にsnapshot保存します。別CLIでr2を作っても、再生中のr1やそこに結び付いた候補を自動変更しません。

## 場面契約と制御

- `SceneDefinition` v1は0.2秒刻み、1–200ticks、1–32人、1人だけ `controlled`。他は始点0と終端tickを含む順序付きkeyframesで動きます。位置は区分線形、yawは最短回転。範囲はx ±32m、z ±48m、yaw ±π。上限は小規模研究の運用制限で、競技や人間の限界ではありません。
- 対象選手の移動・首・callはAの対応済み出力に従います。その選手へのscripted motion/call指定を拒否します。対象側の攻撃方向を+zで定義し、味方/相手は対象のteamから決めます。色で役割を固定しません。
- 球は固定した保持者への追従、またはscripted軌跡。途中の保持者変更、実際のパス・捕球・接触解決は未対応です。重なりは監査診断に残し、タックル成功と扱いません。
- raw actor IDは作者の情報です。知覚には作者名・未来動線に依存せずslotごとに安定した不透明tracking IDを使い、対応表を観測contextやB packetに入れません。音は粗い方角・cueのみで、発声者ID・真の座標・未来のcallを渡しません。
- 全選手・球・音・sensor・描画は同じframeを使います。現在観測→A判断→対象身体出力→次tickの刺激→次観測の順です。pause中の首/身体の回転は同じ時刻の別sequenceです。壁時計の待ち時間や描画遅延から反応速度を主張しません。
- 終端で停止します。履歴は256件で停止し、黙って切り捨てません。途中seek、無制限ログ、別区間への自動継続は未実装です。
- 明示JSONのgenerationSeedはnullです。seedを記録する場合も、再現元は固定definition/contentHashです。ブラウザとNode間のframe検査は三角関数の丸め誤差を1e-9m/radまで許容します。

各版は新しいrevisionとして保存し、期待する最新revisionと違う改訂はHTTP409／CLIエラーになります。actor IDだけの改名は内容hashを変えません。IDを知っていることを相手の意図を知っていることへ変換する処理はありません。

## 見た区間への指導

UIは対象 `observer-0`、場面ID/revision/hash、指導の開始tickと現在の終了tickを候補へ固定します。取得した範囲外を指定できません。短いフィードバックで候補を保存でき、理由・予測・反例はCodexとの編集で補います。実験記録を保存する前には、反例を含むnotesを記入します。

```sh
npm run bridge -- scene-snapshot SCENE_ID --revision 1 --tick 5
npm run bridge -- propose SNAPSHOT_ID --feedback 'いったん止まって確認' --from-tick 2 --to-tick 5 --player observer-0
npm run bridge -- context CANDIDATE_ID
```

`scene-snapshot` は初期状態からそのtickまで現在の承認済みAで合成再走行して取得します。実画面で本人が見た記録の代用ではありません。画面で取得したものはUIのsnapshot/候補保存を使います。`context` は観測・過去の記憶・候補と固定区間を返し、世界の未来や作者ID対応表は除きます。

A/B採用とundoは独立し、確認revision/active版のCASを維持します。再生中のUI操作は止めてから採用し、実際に新しい版を適用した場面版・対象・tick・変更前後のA/Bを `apply-at-tick` として記録します。CLIで変更した版をUIが後から適用する場合も、その時のtickを記録します。receiptはUIの自己申告であり本人認証ではありません。保存が失敗した場合は停止状態で次のrefresh時に同じreceipt IDを再送し、承認要求を自動再送しません。

## 比較とB評価

| 比較 | 固定するもの | 意味 |
| --- | --- | --- |
| fixed-observation | 同じbundle・過去の記憶・profile | Aの変更によるその観測への判断差。世界を進めない |
| observedHistory | 記録済み観測系列と初期記憶 | 同じ取得情報から各Aを再推論。身体を再実行した因果効果ではない |
| same-scene-closed-loop | 同じsnapshot・場面版・未来刺激・profile | 各Aで再走行。身体経路と将来の観測は分岐し得る |
| changed-scene-fixed-rules | 同じA・profile、異なる場面snapshot | 場面を変えた比較。`sameConditions:false` |

未採用のpreviewはactive A/Bを変えません。閉ループ実験は身体の各frameと終端、監査診断も保存します。UIの実験表示でbefore/afterの身体経路を確認できます。場面変更比較は次で固定保存します。

```sh
npm run bridge -- scene-compare SNAPSHOT_BEFORE --after SNAPSHOT_AFTER --rules A0 --steps 5
npm run bridge -- scene-comparisons
```

凍結評価は従来通り指導前に `freeze-evaluation`。動的snapshotには未来の定義と区間を含み、criteria/profileとともに凍結されます。stimulus digest（正規化した場面・開始/終端tick・profile）とobservation digestを別記します。UUID、actor改名、set改名だけでは未使用性を復活させません。同じ観測の再利用は `reused-not-unseen`。未来が異なっても既知の観測は既知として保守的に扱います。未使用性は本人申告であり、他の会話・sessionでの露出を検知したとはしません。

動的なB packetにはその判断時点までの匿名観測系列・初期記憶・現在bundle/直前記憶・profileを渡します。none/before/afterで観測は同一。Aのtrace/rules、未来、scene/seed、採点基準、作者IDを含みません。Bは最後のbundle時点について判断し、過去の観測を現在の真値として扱いません。対応表は評価者だけが保持します。実AI回答は別の会話で取得し、未検証回答として記録します。有料APIは呼びません。

## 互換性と受入範囲

| 対象 | 現在 |
| --- | --- |
| 観測Bundle | v1のまま（世界真値や動線を追加しない） |
| Snapshot | 静的v1／動的v2 |
| ObservationHistory | static-study v1／fixed-step-study v2＋場面参照 |
| 私的session | format1にscenes/sceneComparisonsを追加。旧データは保持 |
| bridge API | 5。古い起動済みbridgeへの書込みをUIが拒否 |
| P2P | 原本の手続き描画と来歴を維持。新しいengine/camera/型/GLBは導入しない |

`tests/dynamic-scenes.test.ts` はT01–T10の契約・境界・比較、`tests/browser/dynamic-scenes.spec.ts` はT01–T11の合成CLI/UI/実プロセス再起動を検査します。既存のmemory/audio paired tests、revision競合、独立A/B、旧snapshot検査も維持します。T12（本人が実際に画面と会話で研究する受入）と実AIでのB採点は別工程で、headless成功では完了扱いにしません。
