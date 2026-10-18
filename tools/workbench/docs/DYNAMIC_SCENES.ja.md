# 動的な場面で研究する

[English](DYNAMIC_SCENES.md) | [日本語](DYNAMIC_SCENES.ja.md)

この追加は、任意の小さい合成配置と動線を既存のCodex会話で作り、同じローカルbridgeへ保存して研究するためのものです。現行の場面形式にはkinematic/motorとpositions/orientedの設定があります。kinematicは一人を操作し他は指定刺激、motorでは独立した観測・記憶を持つ選手を追加できます。本人の競技的な評価と実AIによる判断原則評価は、合成テストとは別に実施します。

## 起動と場面作成

Node 24、固定lockfileで `npm ci` を済ませ、repoで `npm run dev`。表示されたlocalhostを開きます。停止はそのターミナルでCtrl-C。`RPM_SESSION_DIR` を設定した場合は、サーバーとCLIで**同じ値**を使ってください。未設定なら `.rpm/` に私的保存します。プロセス再起動ではデータを削除しません。

既存のCodex会話で [合成例](../../../evaluation/fixtures/dynamic-support.scene.json) を参照し、目的に合う配置・動線JSONを作ります。理由は本人の必須入力ではありません。Codexと対象・条件・例外を確認し、必要なJSONへ整理します。新しいGUI編集器、外部API、自動的な原則採用はありません。

```sh
npm run bridge -- scene-create --file evaluation/fixtures/dynamic-support.scene.json
npm run bridge -- scenes
npm run bridge -- scene-authoring SCENE_ID --revision 1
npm run bridge -- scene-revise SCENE_ID --revision 1 --file .rpm/revised-scene.json
```

create/reviseの出力と `scene-authoring` は**作者・監査用**で、未来の動線と作者IDの対応表を含みます。選手として推論する選手モデルや盲検判断原則評価へ渡してはいけません。場面を作った会話は未来を知っているため、同じ会話による判断原則評価を盲検とは呼べません。

UIの「場面」へ保存版が追加されます。版を選び「再現 / reset」で明示的に開始します。現在の観測は切替前にsnapshot保存します。別CLIでr2を作っても、再生中のr1やそこに結び付いた候補を自動変更しません。

## 場面契約と制御

- `SceneDefinition` 現行形式は0.2秒刻み、1–200ticks、1–32人、1人だけ `controlled`。scriptedの他選手は始点0と終端tickを含む順序付きkeyframesで動きます。motorではautonomousも選べます。位置は区分線形、yawは最短回転。範囲はx ±32m、z ±48m、yaw ±π。上限は小規模研究の運用制限で、競技や人間の限界ではありません。
- 対象選手の移動・首・callは選手モデルの対応済み出力に従います。その選手へのscripted motion/call指定を拒否します。既知の攻撃方向はownAttackDirectionで定義し、方向不明の位置だけの入力では+zを仮定し、味方/相手は対象のteamから決めます。色で役割を固定しません。
- kinematic設定の球は固定した保持者への追従、またはscripted軌跡。途中の保持者変更、実際のパス・捕球・接触解決は未対応です。重なりは監査診断に残し、タックル成功と扱いません。
- raw actor IDは作者の情報です。知覚には作者名・未来動線に依存せずslotごとに安定した不透明tracking IDを使い、対応表を観測contextや判断原則 packetに入れません。音は粗い方角・cueのみで、発声者ID・真の座標・未来のcallを渡しません。
- 全選手・球・音・sensor・描画は同じframeを使います。現在観測→選手モデル判断→対象身体出力→次tickの刺激→次観測の順です。pause中の首/身体の回転は同じ時刻の別sequenceです。壁時計の待ち時間や描画遅延から反応速度を主張しません。
- 終端で停止します。各保存区間は256件までで黙って切り捨てません。現行API 11は通常224件で保存して同じ状態から継続します（LOCAL_BRIDGE参照）。任意seekや無制限の単一記録ではありません。
- 明示JSONのgenerationSeedはnullです。seedを記録する場合も、再現元は固定definition/contentHashです。ブラウザとNode間のframe検査は三角関数の丸め誤差を1e-9m/radまで許容します。

各版は新しいrevisionとして保存し、期待する最新revisionと違う改訂はHTTP409／CLIエラーになります。actor IDだけの改名は内容hashを変えません。IDを知っていることを相手の意図を知っていることへ変換する処理はありません。

## 見た区間への指導

UIは対象 `observer-0`、場面ID/revision/hash、指導の開始tickと現在の終了tickを候補へ固定します。取得した範囲外を指定できません。短いフィードバックで候補を保存でき、理由・予測・反例はCodexとの編集で補います。実験記録を保存する前には、反例を含むnotesを記入します。

```sh
npm run bridge -- scene-snapshot SCENE_ID --revision 1 --tick 5
npm run bridge -- propose SNAPSHOT_ID --feedback 'いったん止まって確認' --from-tick 2 --to-tick 5 --player observer-0
npm run bridge -- context CANDIDATE_ID
```

`scene-snapshot` は初期状態からそのtickまで現在の承認済み選手モデルで合成再走行して取得します。実画面で本人が見た記録の代用ではありません。画面で取得したものはUIのsnapshot/候補保存を使います。`context` は観測・過去の記憶・候補と固定区間を返し、世界の未来や作者ID対応表は除きます。

選手モデル／判断原則採用とundoは独立し、確認revision/active版のCASを維持します。再生中のUI操作は止めてから採用し、実際に新しい版を適用した場面版・対象・tick・変更前後の選手モデル／判断原則を `apply-at-tick` として記録します。CLIで変更した版をUIが後から適用する場合も、その時のtickを記録します。receiptはUIの自己申告であり本人認証ではありません。保存が失敗した場合は停止状態で次のrefresh時に同じreceipt IDを再送し、承認要求を自動再送しません。

## 比較と判断原則評価

| 比較 | 固定するもの | 意味 |
| --- | --- | --- |
| fixed-observation | 同じbundle・過去の記憶・profile | 選手モデルの変更によるその観測への判断差。世界を進めない |
| observedHistory | 記録済み観測系列と初期記憶 | 同じ取得情報から各選手モデルを再推論。身体を再実行した因果効果ではない |
| same-scene-closed-loop | 同じsnapshot・場面版・未来刺激・profile | 各選手モデルで再走行。身体経路と将来の観測は分岐し得る |
| changed-scene-fixed-rules | 同じ選手モデル・profile、異なる場面snapshot | 場面を変えた比較。`sameConditions:false` |

未採用のpreviewは有効な選手モデル／判断原則を変えません。閉ループ実験は身体の各frameと終端、監査診断も保存します。UIの実験表示でbefore/afterの身体経路を確認できます。場面変更比較は次で固定保存します。

```sh
npm run bridge -- scene-compare SNAPSHOT_BEFORE --after SNAPSHOT_AFTER --rules A0 --steps 5
npm run bridge -- scene-comparisons
```

凍結評価は従来通り指導前に `freeze-evaluation`。動的snapshotには未来の定義と区間を含み、criteria/profileとともに凍結されます。stimulus digest（正規化した場面・開始/終端tick・profile）とobservation digestを別記します。UUID、actor改名、set改名だけでは未使用性を復活させません。同じ観測の再利用は `reused-not-unseen`。未来が異なっても既知の観測は既知として保守的に扱います。未使用性は本人申告であり、他の会話・sessionでの露出を検知したとはしません。

動的な判断原則 packetにはその判断時点までの匿名観測系列・初期記憶・現在bundle/直前記憶・profileを渡します。none/before/afterで観測は同一。選手モデルのtrace/rules、未来、scene/seed、採点基準、作者IDを含みません。判断原則は最後のbundle時点について判断し、過去の観測を現在の真値として扱いません。対応表は評価者だけが保持します。実AI回答は別の会話で取得し、未検証回答として記録します。有料APIは呼びません。

## 互換性と受入範囲

| 対象 | 現在 |
| --- | --- |
| 観測Bundle | すべてBundle 3。positions/orientedの設定で取得する情報を明示 |
| Snapshot | 静的・動的ともsnapshot 2 |
| ObservationHistory | どちらもhistory 2。modeで静的・動的を区別し、動的だけ場面参照を持つ |
| 私的session | 現行の外側formatは2。旧format1の記録は保持 |
| bridge API | 現行11。動的場面導入時の9は過去の版。旧serverへの書込みをUIが拒否 |
| P2P | 原本の手続き描画と来歴を維持。新しいengine/camera/型/GLBは導入しない |

`tools/experiments/tests/dynamic-records.test.ts` はT01–T10の契約・境界・比較、`tools/workbench/tests/browser/dynamic-scenes.spec.ts` はT01–T11の合成CLI/UI/実プロセス再起動を検査します。既存のmemory/audio paired tests、revision競合、独立選手モデル／判断原則、旧snapshot検査も維持します。T12（本人が実際に画面と会話で研究する受入）と実AIでの判断原則採点は別工程で、headless成功では完了扱いにしません。

## 独立レビュー後の修正仕様

指導区間の再走行は、保存した終端snapshotからではなく **fromTickの最初の取得frame** から始めます。開始前の観測prefixを当時のprofile/選手モデルで順に再生し、開始直前の記憶と、実際にstepで適用されたcall履歴を復元します。同じtick内でも開始取得より後の首振りや、その後の記憶を開始入力へ入れません。開始world・bundle・memory・sourceSequenceを実験の `recordedInput` に固定保存し、before/afterへ同じものを渡します。比較profileと選手モデルの基準版は候補の保存時に固定したものです。開始後の手動首振りを両枝に強制する処理はありません。固定観測系列の再推論は別のobservedHistory比較です。

指定frame予算（1–20）または指導区間の終了tickで停止します。20frame未満で区間が終われば終端で止まり、予算を使い切った場合は `step-budget` と記録します。区間開始が失われた旧履歴から過去状態を推測して生成せず、再構築できない場合はエラーにします。履歴なしで保存した現在時点だけの候補は、その時点からの比較として扱います。

凍結条件の未使用性は、末尾のbundle/memoryだけでは判定しません。動的場面では同じscene系譜、作者IDを除いた同じ刺激定義、IDや順序を除いて一致する取得済み観測の共有も照合します。tick追加、首振り、profile変更、別UUID・改名、未来部分の改訂で既知の情報を未使用へ戻せません。共有した条件を指導用に使った場合は凍結評価の実行を拒否します。過去の評価で共有した場合は `reused-not-unseen` とし、参照したexperiment IDと理由を `evaluation.exposure` に保存します。この判定は保守的で、一部でも共有する観測は完全な未使用条件とは呼びません。共有条件の研究は、未使用評価を主張しない通常比較で続けられます。

保存実験を選び「beforeを3Dで見る」「afterを3Dで見る」を押すと、既存ビューが保存結果の比較表示になります。同じframe時刻でbefore/afterを切り替え、再生・1frame・スライダーで身体位置と選手視点を確認できます。比較中は研究の操作とbridge同期を止め、選手モデル／判断原則や観測履歴へ書き込みません。「研究へ戻る」で元の場面・時計・記憶・視点設定へ戻ります。戻った後に別CLIで変更された承認版がある場合は通常の同期で適用します。比較で見せるのは記録済みframeで、新しい選手モデル判断や採用を行いません。身体frameを持たない古い実験は再記録が必要です。

描画cacheはactor IDだけでなくkind/team/appearanceを照合します。条件が変われば旧meshをdisposeして再作成し、同じIDの青→赤→青や場面切替でもsensorの関係と表示を一致させます。P2P原本のbytesは変更しません。

## 身体の向きと進行方向

yaw=0は+z、yaw=πは−z、yaw=π/2は+xを向く。身体の正面は描画モデルの+Zと一致する。teamは味方／相手の関係であり、色だけで攻撃／守備や身体方向を決めない。

標準のdynamic-supportは、保持者が+zへ進み、支援者とDFがそれぞれ指定した直線経路に身体を向けて走る接近刺激とする。DFは初期に保持者側へ正面を向ける。これは経路固定の工学的場面であり、DFが保持者を追跡して向きを調整する認知ではない。位置、速度、callsは方向の修正で変更しない。

後退・横移動・背を向けた相手も表現できる。そうした場面は位置変化とyawを意図的に別設定し、実験の作成者メモに狙いを書く。rendererは明示yawを優先し、相手だから自動反転する処理を持たない。初期poseとtick0のkeyframeは同じyawにする。旧snapshotと指導の参照版は維持し、修正はscene-reviseで新しい版にする。positions設定の他者の身体方向は描画専用で、oriented設定は可視方向を観測へ追加します。描画修正だけを認知能力の追加とは扱いません。

## 身体方向を含む攻守共通入力

`sceneSchemaVersion: 3`、`observationMode: oriented` と既知の `ownAttackDirection: 1 | -1` を指定すると、可視の身体方向と保持の手掛かりを記録する。身体角・頭の相対角・視線、推定した攻撃保持／支援／守備／不明を画面で確認できる。kinematic設定の守備と不明の動作は確認・待機まで。過去観測に見えなかった情報は追加しない。[契約・仮定・検証順序](../../../models/player/spec/ORIENTATION_PHASE.ja.md)を参照。

## 閉ループの追加契約

任意選択のmotor sceneは、身体方向を含む観測から運動を推定し、小目標の維持・切替と攻守の抽象動作、独立した少人数の相互応答を扱う。仕様・工学的仮定・機構除去比較・限界は [Closed loop](../../../models/player/spec/CLOSED_LOOP.ja.md) を参照。過去の記録はコピーを現行形式へ変換し、観測内容と結果の出典を保全する。ソフトウェア試験は人間の認知的妥当性や選手モデル／判断原則の採用ではない。

## 水平画角（任意の観測条件）

`horizontalFovDegrees` は60–120度で指定でき、未指定は従来の90度です。例えば110度の場面は通常の透視カメラとsensorの両方に110度を使います。頭・身体の向きと目の位置は同じです。場面の内容hash、snapshot、観測bundleの `vision.horizontalFov`（radian）に反映され、固定した画角の再生・比較に使います。これは工学的な観測条件で、人の周辺視の精度差は未実装です。既存場面は書き換えず、新しいsceneまたはrevisionとして保存します。
