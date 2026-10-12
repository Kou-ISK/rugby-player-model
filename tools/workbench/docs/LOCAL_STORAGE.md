# 本人の継続研究の保存場所

ソース・仕様・合成fixtureは `~/Documents/workSpace/rugby-player-model`、私的な研究sessionは `~/Research/rugby-player-model/sessions/owner-primary` に分けます。対象は生成scene、観測履歴、短い指導、候補、採否、実験記録です。今回、実試合映像の保管や入力資料の集約は行いません。

`state.json` が場面版・snapshot・候補・A/B版・採否・評価・実験を一体で保存します。分割して手編集せず、UI/bridgeを使います。`work/` はscene生成案・context・候補編集案、`exports/` は研究記録から出力したコピー用です。私的sessionをGitへ追加しません。

このMacの `~/Library/Application Support/RugbyPlayerModel/paths.json` に絶対パスの `sourceRoot`、`dataRoot`、`sessionDir`、`nodePath`、`port` を保存します。専用Node 24は同じ場所の `runtime/` です。設定・runtimeは研究データや公開成果物ではありません。

repo直下の `start-rpm.command` と `bridge-rpm.command` が同じ設定を使います。`tools/workbench/platform/macos/local-launcher.mjs` は実在する絶対パスを確認し、source/dataの重なりやdata外のsessionを拒否します。保存先がないときに `.rpm/` へ切り替えたり空の代替sessionを作ったりしません。初回の空sessionは配置工程で明示的に用意します。

開発用 `npm run dev` / `npm run bridge` は従来どおり `.rpm/` が既定です。本人の通常研究には上記commandを使ってください。`RPM_PATHS_FILE` で別の明示設定、`RPM_SESSION_DIR` でdataRoot内の既存sessionを選べます。合成試験は本人sessionと別にし、試験を本人の採用や研究成果に数えません。

CLIの `--file` / `--out` とshellのリダイレクトは自動移動しません。通常はsessionの `work/` / `exports/` の絶対パスを指定します。ブラウザのダウンロードもブラウザの保存先へ出るため、必要な出力だけ `exports/` へ保存してください。exportはsession正本を置き換えません。

配置変更時はserverと書込みCLIを止め、全sessionを控え、まずコピーしてhash・commit・作業差分を確認します。新配置の読み出しが一致するまで元を残します。ソースだけを移すときは `sourceRoot` だけを更新し、sessionを変えません。Nodeと依存もrepo旧パスへのリンクに依存させません。

今回の移行は受入済み `9467c34` からの独立コピーです。基点 `00e74f6` に保留15編集がある元repo、その保全manifest・patch、私的な入力原本・検証証拠は以前の作業場所に保持します。保留差分を一括適用せず、launcherとテストを選択採用し、保存場所案と案内は今回の範囲に合わせて書き直しています。P2P公開準備の文言は採用していません。

起動と本人の最初の一周は [MAC_START.md](./MAC_START.md)。S1–S5の合成実装受入と、S6の本人実画面受入・B実AI評価は別です。配置変更は原則採用や公開を意味しません。
