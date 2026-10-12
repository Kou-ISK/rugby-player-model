# Rugby Player Model — research foundation

See [dynamic scene contracts, CLI and acceptance scope](./tools/workbench/docs/DYNAMIC_SCENES.md) for the new fixed-step workflow: one A-controlled player and scripted stimuli.
選手の観測から判断する実行モデル **A** と、生成AIが単独で使える原則文書 **B** を別々に育てるローカル研究基盤です。人間再現や筋骨格技能の完成モデルではありません。

## Use or contribute

- **Use A:** [observation-only player model](./models/player/README.md). Run the small reference package without a world, B, viewer or private session.
- **Use B:** [independent judgment principles](./models/judgment/RUGBY_JUDGMENT.md). Read or supply the document directly; no runner or A installation is required.
- **Research and contribute:** [contribution workflow](./CONTRIBUTING.md). Work with synthetic inputs, propose changes, inspect counterexamples, and review A/B separately.

The reference model is an uncalibrated engineering hypothesis. Software checks do not establish human cognition or rugby performance. Attention encodes four inputs; the legacy `workingMemory` trace is a display excerpt, not a decision bottleneck. The selectable [H-WM-1 mode](./models/player/spec/H-WM-1.md) and strict proposal import/reproduction are available as unvalidated research tools.

## Start a synthetic research session

Follow the [complete first-time manual UI/CLI tutorial](./tools/workbench/docs/FIRST_RUN.md): new session, observations, candidate, preview, independent A/B adoption, undo, export, inert import and reproduction in a second session. No owner-specific setup or paid API is required.

## Research workbench

新しい開発環境ではNode.js 24 と Git を用意し、このブランチで実行します。

```sh
npm ci
npm run dev
```

表示された `http://127.0.0.1:5173` を開く。首振り → フィードバック → 候補保存 → Codexと条件・例外・反例を編集 → 未採用の複数step実験と保存3D比較 → 本人の差戻し／A/B別採用 → 同場面＋対照比較 → undo。開発起動は `.rpm/`、本人の共通launcherはrepo外の私的sessionへ保存します。APIキーもクラウド契約も不要です。

```sh
npm run bridge -- status
npm run check
npm run spike
npm run --silent model -- --input evaluation/fixtures/support-42.snapshot.json --steps 10
```

- [B: models/judgment/RUGBY_JUDGMENT.md](./models/judgment/RUGBY_JUDGMENT.md) — runnerなしで読めるB0.1-draft。[単独評価packet](./models/judgment/docs/B_EVALUATION_SCENES.md)は原則なし/旧B/新Bを比較。私的sessionのB出力は凍結B0＋本人承認済み原則です。
- [事前凍結・匿名B入力・首振り履歴の手順](./evaluation/PROTOCOL.md) — 固定回帰を未見評価と区別。自然言語の解釈は本人とCodexの共同作業。
- [研究開始条件の点検](./docs/verification/RESEARCH_READINESS.md)、[共同研究loop全手順](./tools/workbench/docs/RESEARCH_LOOP.md)、[今回のMac合成検証](./docs/verification/MAC_RESEARCH_CYCLE.md)
- [設計と情報境界](./docs/ARCHITECTURE.md)、[言語選択ADR](./docs/decisions/ADR-001-runtime.md)
- [Codex local bridge](./tools/workbench/docs/LOCAL_BRIDGE.md)、[Mac実証手順](./docs/verification/MAC_ACCEPTANCE.md)、[Mac headless記録](./docs/verification/MAC_HEADLESS.md)
- [制約・再現性](./docs/LIMITATIONS.md)、[権利と来歴](./docs/provenance/PROVENANCE.md)
- [再現manifest](./reproducibility.json)と[再現手順](./docs/REPRODUCTION.md)、[モデルカード](./models/player/MODEL_CARD.md)、[データカード](./evaluation/DATA_CARD.md)、[公開範囲](./docs/provenance/PUBLICATION_SCOPE.md)

Cloudの検証合格と、本人Macでの共同研究loop実証は別です。検証済みP2P手続き描画と最小姿勢型を表示adapterで再利用し、これらを含むコード・合成fixture・文書の公開は本人承認済みです。私的研究sessionは公開対象外です。列挙した自作範囲へMITを適用しました。[ライセンス範囲](./LICENSE-SCOPE.md)を参照してください。[公開範囲](./docs/provenance/PUBLICATION_SCOPE.md)を参照してください。

## Configured owner Mac

The existing owner entrance remains `./start-rpm.command` and `./bridge-rpm.command`; see [Mac instructions](./tools/workbench/docs/MAC_START.md) and [private storage](./tools/workbench/docs/LOCAL_STORAGE.md). Public tutorials use a separate synthetic session.

Those wrappers follow the configured stable source directory. To test a separate checkout before its reviewed installation, use the explicit `RPM_SESSION_DIR` and `npm run dev` commands in the first-run guide; copying the wrapper does not select this checkout.
