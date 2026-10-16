# 対話する協力者と研究を始める

[English](RESEARCH_START.md) | [日本語](RESEARCH_START.ja.md)

公開リポジトリをダウンロード／cloneした後に使う手順です。過去の私的会話、研究者個人のファイル、設定済みMacのlauncherは不要です。協力者にはCodexなどを使えますが、ツールへAI APIは組み込みません。現行ワークベンチのUIは日本語で、[操作チュートリアル](FIRST_RUN.ja.md)の英語版には表示名の対訳もあります。編集・採用・undoの練習は任意のソフトウェア確認で、研究開始の必須工程ではありません。

## 1. 保存先と実行環境を確認する

Node.js **24**とnpmを使います。リポジトリのフォルダを会話型の開発ツールやターミナルで開き、インストール前に `node --version` を確認します。他のメジャー版は未対応です。ソースをアーカイブで取得した場合はGitなしでも使え、取得できないGit情報は不明として記録します。

macOS/LinuxやPOSIX shellでは、リポジトリ直下で実行します。

```sh
node --version
npm ci
export RPM_SESSION_DIR="$HOME/rpm-research-data/session-01"
mkdir -p "$RPM_SESSION_DIR/work"
npm run --silent bridge -- status
```

Windows PowerShellでは次の設定です。

```powershell
node --version
npm ci
$env:RPM_SESSION_DIR = Join-Path $HOME 'rpm-research-data/session-01'
New-Item -ItemType Directory -Force -Path (Join-Path $env:RPM_SESSION_DIR 'work')
npm run --silent bridge -- status
```

新しい研究には新しいディレクトリを選び、再開には同じ絶対パスを使います。既存の保存先は中身を確認し、やり直すために削除・再初期化しません。空の保存先ではCLIがディレクトリを作り初期版を表示します。最初の明示的な場面・snapshot・候補の書込みで `state.json` が保存され、`status` だけでは研究は保存されません。実際の指導には `session init --synthetic` を使いません。生成場面を使う実研究であっても、このコマンドは**合成チュートリアル**と宣言する操作だからです。

ノート・取得画像・生成ファイルはcheckout外の私的な `work/` に保存します。サーバー、CLI、エージェントの**すべてのコマンド環境**で同じ `RPM_SESSION_DIR` を設定します。別ターミナルへshellの設定は自動継承されません。その環境の個人Mac設定を明示的に使う場合以外は、`start-rpm.command` や `bridge-rpm.command` を使いません。

## 2. ケースを聞く前に研究の入口を作る

[RESEARCH_CHECKPOINT.ja.md](RESEARCH_CHECKPOINT.ja.md)を `$RPM_SESSION_DIR/work/research-checkpoint.md` へコピーします。[英語版](RESEARCH_CHECKPOINT.md)も使えます。既存のcheckpointは置き換えず、読んで更新します。これは私的ノートの形式であり、bridgeコマンドへ入力するファイルではありません。

協力者には次のように依頼します。

> AGENTS.md、tools/workbench/docs/RESEARCH_LOOP.ja.md、docs/COGNITIVE_RESEARCH.ja.mdを読んでください。私的sessionは［自分の絶対パス］、再開の入口はそのwork/research-checkpoint.mdです。まず攻撃・サポート・守備の目的、維持する関係、崩れ方、修復を整理してください。既存の根拠があれば索引から使い、なければ不足を明記して大枠の質問を一つしてください。後のケースは説明を識別するために選び、各回答を保存し、探索中はモデルを変えず、次の行動と理由をcheckpointへ残してください。生成場面を使い、実試合映像や埋込みAI APIは使いません。

詳細な比較を続ける前に、対象範囲・現在の段階・根拠・本人の次の行動を確認します。最初は大枠の対話から始められ、原則の採用や一定数の場面の完了は不要です。このsessionの責任者が指導と採否を判断します。

## 3. 場面が必要な問いになったら表示・取得する

checkpointで有用な比較が定まったら、同じsession設定のターミナルで起動します。

```sh
npm run dev
```

表示されたloopback URLを開き、そのターミナルを動かしておきます。ポートが使用中なら起動前に `PORT` を空いている番号へ設定し、無関係な作業を終了しません。別のターミナルにも同じ保存先を設定し、次を実行します。

```sh
npm run --silent bridge -- views
```

[表示接続の手順](PRESENTATION.ja.md)に従い、設定済みMac用launcherを `npm run --silent bridge --` に置き換えます。協力者が場面を準備して `present` し、本人はブラウザで見回し・再生して、会話で指導します。対象タブの実際の観測履歴を取得し、完了応答を待ってから場面への指導を保存します。ブラウザへの文字入力は任意の手動記録で、AIへの送信ではありません。

snapshotの生成は表示ではなく、完了応答は本人の受入ではありません。台本のある場面は比較刺激であり、自律的連携の証明ではありません。口頭だけの指導は原文と説明された状況を私的ノートに保存し、観測参照は空にします。別場面のsnapshotを借用しません。ブラウザ操作の自動化を定例作業にしません。

## 4. 再開と研究段階の移行

最初に `work/research-checkpoint.md` を読みます。`status`／`research-log` で参照先と現在版を確認し、ライブ表示が必要なら `views` を使います。会話全体の読み直しや、最新snapshotが対象だという推測に頼りません。

指導後は原文を保存して新情報だけを追記し、[研究手順](RESEARCH_LOOP.ja.md)に従って、大枠の確認・識別できる比較・統合・道具の修正から次を選びます。機構の設計・検証は根拠がそろった後の段階です。同じ追問を繰り返さず、親となる問いに関係しない細部は保留します。

終了は起動したターミナルでControl-C、または同じsession設定で `npm run bridge -- stop`。再開は同じ保存先で `npm run dev` とし、チュートリアルの初期化を上書き実行しません。

## この導線でできることと限界

公開ファイルで、導入・観測と記録・段階付き研究手順・再開ノート・後の提案交換まで進められます。協力者が指示を必ず守ること、人間の認知としての妥当性、全てのラグビー動作の実行を保証するものではありません。比較前に[能力の限界](../../../docs/LIMITATIONS.ja.md)を確認します。停止中の見回しは視線や反応時間の計測ではありません。

実際の指導は私的に保持します。貢献する場合は許諾できる合成再現例を作り、[CONTRIBUTING](../../../CONTRIBUTING.ja.md)に従います。[判断原則の独立評価](JUDGMENT_EVALUATION.ja.md)と選手モデルの採否も別です。`npm run test:first-run` は隔離した操作チュートリアルの試験であり、研究方法の遵守・全OS・本人受入の認定ではありません。
