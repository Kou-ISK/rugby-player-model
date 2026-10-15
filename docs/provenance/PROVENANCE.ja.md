# 来歴と公開許諾

[English](PROVENANCE.md) | [日本語](PROVENANCE.ja.md)

## 確認済みの入力

許諾された研究計画v4と手続き描画kitは、本人MacでLibraryのprepare/materialize経路から取得しました。計画全文とZIPはGit外です。公開仕様には成果物の独立、本人の採否、観測と真値の分離、描画だけへの再利用を反映しています。有料モデルやAPIは接続していません。

kitが示す原本はP2P commit `51e4b9d64f5b0e728e22fe74071a582eafccad32` の `src/web/three/models.ts`、Git blobは `ea0174e38b2c23ebca6804a1062d4be9c3c23415` です。blobおよびkit全ファイルのサイズ・hashはローカルで独立確認しました。commitへの所属を再証明するための原本repoの再cloneは行っていません。

- ZIP SHA256: `0b24168eb6874b1bb2cacaea5b5926346050ac4baa5acebf32a31b6bcefa07bd`。
- `models.ts` SHA256: `07b7965746b80d1cb222b5e13254369a257620bc42781a95821e23b550226d86`。

現在の原本保存先は `tools/workbench/src/rendering/vendor/phrase2play/`、adapterは `tools/workbench/src/rendering/models.ts` です。[再利用通知](../../tools/workbench/src/rendering/vendor/phrase2play/REUSE-NOTICE.md)と[kit manifest](../../tools/workbench/src/rendering/vendor/phrase2play/kit-manifest.json)に受渡しの根拠を残しています。GLB、真値を見るカメラ、P2P engine/core型、Auth、Blob、試合データ、無関係なソースは導入していません。Three.jsは別ライセンスの依存物です。

## 公開とライセンスの経緯

2026-10-12に、レビュー済みRPMコード、自作合成fixture、文書、および限定された描画原本と最小姿勢型の公開を本人が許諾しました。動的実装 `9467c34`、安定版設定 `7fa228c` まで独立レビューを実施しています。これは範囲の要約であり、私的な許諾会話の公開ではありません。

抽出した二つのコードファイルはbyte単位で同一です。原本の通知とkit manifestを維持し、`published: false` は受渡し当時を表します。その後の限定MIT許諾は [LICENSE-SCOPE](../../LICENSE-SCOPE.ja.md) と [LICENSE](../../LICENSE) が定義します。指定した自作物と二つの描画ファイルに限り、P2P全体や他の素材へ拡張しません。過去のUNLICENSED記載は当時の来歴として書き換えません。

packageの `private: true` は誤ったnpm公開を防ぎます。依存物は独自のライセンスを保持し、外部画像、実選手データ、私的計画・sessionは許諾範囲に含めません。論文・規則はリンクと短い要約であり、文書集の転載ではありません。

[公開範囲](PUBLICATION_SCOPE.ja.md)、[モデルカード](../../models/player/MODEL_CARD.ja.md)、[データカード](../../evaluation/DATA_CARD.ja.md)、[再現manifest](../../reproducibility.json)を参照してください。整合性確認、公開許諾、ライセンスは、人間の認知的妥当性、本人の画面受入、研究候補の採用を意味しません。
