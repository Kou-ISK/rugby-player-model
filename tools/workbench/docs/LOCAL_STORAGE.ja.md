# Macの保存先、起動、回復

[English](LOCAL_STORAGE.md) | [日本語](LOCAL_STORAGE.ja.md)

設定済みMacではコードと私的研究データを分離します。

| 対象 | 設定された場所 |
|---|---|
| ソース入口 | `~/Documents/workSpace/rugby-player-model` |
| 私的session | `~/Research/rugby-player-model/sessions/owner-primary` |
| 共通設定 | `~/Library/Application Support/RugbyPlayerModel/paths.json` |
| 専用Node 24 | `~/Library/Application Support/RugbyPlayerModel/runtime/` |

設定のsourceRoot/dataRoot/sessionDir/nodePath/portは絶対値です。launcherはreal pathを検査し、session欠損、source/data重複、dataRoot外sessionを拒否します。空の開発sessionへ自動fallbackしません。

## 起動・停止・再開

設定済みsourceで `./start-rpm.command` を実行して表示URLを開き、起動terminalのControl-Cで停止します。`./bridge-rpm.command status` は同じsessionを読みます。再開も同じlauncherで、代わりのsessionを初期化しません。

別checkoutから実行してもlauncherはpaths.jsonに従います。未導入checkoutの試験は [FIRST_RUN](FIRST_RUN.ja.md) に従い明示的な新合成RPM_SESSION_DIRを使います。通常のnpm run dev/bridgeは未指定時にそのcheckoutの `.rpm/` を使うため、教材と本人研究を混ぜません。

現行CLIの `npm run bridge -- stop` は同じsessionが識別するserverだけを停止します。古いbinaryにはない場合があり、Control-Cは両方で使えます。無関係なprocessや実行中writerのlockは止めたり削除したりしません。

## 保存内容

state.jsonが正本で、場面版、snapshot、候補、成果物別版、採否、実験、reviewを保持します。workは場面/context/edit案、exportsは選んだ出力コピーです。内部JSONの手編集でなくUI/CLIを使い、私的指導、実データ、認証情報はGitや公開提案へ入れません。

CLIのfile/outやshell redirectは自動でsessionへ移りません。研究ファイルは明示した絶対パスを使います。browser download先はbrowser設定に従い、session正本の代わりではありません。

## 設計移行の履歴と導入手順

設計移行時はstable sourceを `ecc5c298b928ff860e124735decc587c0f7537af` に固定し、候補を別checkoutでreviewしました。これは当時の境界であり、現在動いているcodeの証明ではありません。旧 `9467c34` 配置は [保存履歴](LOCAL_STORAGE_HISTORY.md) に記載します。合成試験はsource切替、本人session移行、原則採用の証拠ではありません。

review対象の正確な版を検証してから、次の順で導入します。

1. 研究serverと全session writerの停止を確認し、無関係なjobはそのままにします。
2. 新記録・既存変更を含むsource、設定、私的データの復元点とhashを保存します。
3. review済みsourceとlockされたNode 24依存を永続場所へ準備し、別合成sessionで試します。
4. dataRoot/sessionDirを維持してsource入口・設定をatomicに更新し、教材状態で本人状態を上書きしません。
5. 起動・停止・CLI・同じ私的保存先を確認します。本人walkthroughと成果物別採用は別判断です。

## 互換性とrollback

現行readerはformat 1/2を読みます。format 1の読取は旧記録/digestを変えず、新sessionや成功書込は過去記録/hashを保持して外側format 2を使います。旧stableはformat 1だけを受け付けるため2を拒否します。

active modeをbaselineへ戻しても旧binary互換には戻りません。新版で書込済みならsession全体を残し、入口を戻す場合もformat 2対応readerを使います。新記録を旧backupで上書き・削除して互換にしません。診断用の旧snapshotは別コピーで扱います。

crash後の古いlockは、全writer停止とsession保全を確認してからその `.lock` だけを除きます。live lock削除や破損時の黙った初期化は禁止です。[旧合成fixture](../../../evaluation/baselines/LEGACY_SESSION.ja.md)が検査範囲を示します。Mac headless確認は本人の画面使用や研究原則採用の証拠ではありません。

通常の読取・実行・新規保存は[現行形式](../../../docs/decisions/ADR-003-current-format.ja.md)に統一します。過去のsessionは入口でコピーを変換し、元の観測・結果・hash・採否を保持します。
