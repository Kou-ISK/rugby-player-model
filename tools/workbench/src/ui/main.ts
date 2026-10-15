/// <reference types="vite/client" />
import { legacyMode, finiteMode, unlimitedMode, type ExecutionMode } from '../../../../models/player/reference/src/execution-mode.js';
import './style.css';
import { recordedWorld } from '../../../simulation/src/playback';
import { sceneWorld, updateSceneFrame, sceneRef, sceneDiagnostics, type SceneRef } from '../../../simulation/src/scene';
import { defaultProfile, defaultRulesA, emptyMemory } from '../../../../models/player/reference/src/defaults.js';
import type { Memory, Profile, RulesA, Trace } from '../../../../models/player/reference/src/contracts.js';
import type { Candidate, Snapshot, ApplicationPoint } from '../../../experiments/src/contracts';
import type { SceneId, World } from '../../../simulation/src/contracts';
import { thinkWithMode } from '../../../../models/player/reference/src/cognition';
import { advance, makeWorld, sense } from '../../../simulation/src/index';
import { View } from '../rendering/view';
import { PlayerLookControls, type LookTarget } from './player-look';
import { observationContext } from '../../research';
import { newHistory, appendObservation, replayObservationHistory, continueObservationHistory, HISTORY_LIMIT, HISTORY_ARCHIVE_AT } from '../../../experiments/src/history';
import type { ObservationEvent } from '../../../../models/player/reference/src/contracts.js';
import type { Experiment } from '../../../experiments/src/records';
type ServerState = { apiVersion: 11; state: { importedProposals:Record<string,{localCandidateId:string;proposalId:string;revision:number;manifestSha256:string;status:string;title:string;targets:string[];decisions:{A:string;B:string};runs:{id:string;matches:boolean|null;resultDigest:unknown}[]}>; modeStudies:Record<string,{candidateId:string;arms:unknown[]}>; scenes:Record<string,(SceneRef&{durationTicks:number;actorCount:number})[]>; revision: number; snapshots: Record<string, Snapshot>; candidates: Record<string,Candidate>; evaluationSets:Record<string,{id:string;at:string;digest:string;caseCount:number}>; experiments: Record<string,{id:string;at:string;candidateId:string;mode:string}>; bReviews: {experimentId:string;model:string;assessment:string}[] }; active: { executionMode:ExecutionMode; A: RulesA; B: { version: string } } };
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header><div><span class="eyebrow">RUGBY PLAYER MODEL</span><h1>判断の研究</h1></div><div class="badge">LOCAL / PRIVATE</div></header>
<main><section class="stage" aria-label="場面の観察">
<div class="team-legend"><p id="situation-self"></p></div>
<div id="comparison-controls" class="toolbar" hidden><strong>保存実験の比較再生</strong><button id="comparison-before">before</button><button id="comparison-after">after</button><button id="comparison-play">比較を再生</button><button id="comparison-step">比較1 frame</button><label>frame<input id="comparison-frame" type="range" min="0" value="0" step="1"></label><button id="comparison-exit">研究へ戻る</button><p id="comparison-status" role="status"></p></div>
<div id="viewport">
  <div class="viewport-top"><div class="camera-switch"><span id="view-tag">一人称 · 選手の視界</span><button id="view" title="一人称と三人称（俯瞰）を切り替える">三人称へ</button></div><div id="clock">0.0s</div></div>
  <div class="crosshair" aria-hidden="true">＋</div>
  <div class="viewport-bottom"><div class="playback-actions"><button id="play" class="primary">再生</button><button id="step" title="0.2秒進める">1 step</button></div><div class="camera-actions"><button id="look-start">マウスで見回す</button><button id="look-center" title="位置・時刻は維持し、首を身体の正面に戻します（R）">視線を正面へ</button></div></div>
</div>
<div class="scene-caption"><p id="situation-visible"></p><p id="field-of-view" class="hint"></p></div>
<p id="look-status" class="hint" role="status"></p>
<details id="camera-settings"><summary>見回しの設定・操作方法</summary><div class="look-controls" aria-label="一人称の見回し"><div class="look-actions"><label>感度<select id="look-sensitivity"><option value="0.5">ゆっくり</option><option value="1">従来</option><option value="2" selected>標準（速め）</option><option value="3">さらに速い</option></select></label></div><p id="look-help">マウス左右で見回す · 首の端からは身体も追従 · Shiftで身体を直接旋回 · Rで視線を正面へ</p><p class="hint">左右の見回し専用。操作すると時間を止め、表示した向きの観測を記録します。位置と時間は動きません。これは研究者の介入で、モデル自身の見回し能力や反応速度の評価ではありません。</p></div>
<div class="view-controls"><label>首振り <input id="head" type="range" min="-137" max="137" value="0"><output id="head-value">0°</output></label><label>身体の向き <input id="body" type="range" min="-180" max="180" value="0"></label></div>
</details>
<p class="conversation-prompt">場面を見て、選手への指導をCodexチャットへ。記録と次の比較は会話から進めます。</p>
<p id="history-status" class="hint"></p><button id="history-retry" hidden>保存を再試行</button>
<div id="status" role="status">ローカルbridge接続中…</div>
</section>
<details id="research-tools"><summary>研究ツール <span>場面・保存・候補の編集と検証</span></summary><div class="research-layout"><section>
<h2>場面と記録</h2><div class="toolbar">
<label>場面<select id="scene"><option value="support">01 支援と選択</option><option value="occluded">02 遮蔽</option><option value="audio">03 背後の声</option><option value="heldout">04 未見パラメータ</option></select></label>
<label>seed<input id="seed" type="number" value="42" min="0" max="4294967295"></label><button id="reset" title="位置と時間を開始点へ戻します。直前の状態は自動保存します。">場面を最初から</button>
<button id="snapshot">この時点を保存</button>
</div><div class="toolbar recovery-controls"><label>保存した時点<select id="restore-point"><option value="">最新の保存</option></select></label><button id="restore">保存した時点へ戻る</button><p class="hint">「場面を最初から」は移動もやり直します。向きだけを直すには、3D画面内の「視線を正面へ」。</p>
</div>
<p id="situation-phase"></p><p id="situation-orientation"></p><p class="hint">味方・相手は上のチーム色で見分けます。足元の矢印は身体の向きです。</p>
<section class="conversation-entry" aria-label="会話で研究する"><h2>この場面を見ながら、Codexで相談</h2><p>指導は隣のCodexチャットへ。ここでは場面を止めて記録します。ブラウザからCodexへの自動送信・自動解釈はありません。</p><button id="capture-chat" class="primary">この時点を会話用に記録</button><div id="chat-handoff" hidden><label for="chat-reference">Codexチャットに貼る場面参照</label><textarea id="chat-reference" readonly></textarea><p class="hint">記録した時点は固定です。その後に再生・resetしても変わりません。参照と一緒に指導をチャットへ送ってください。</p></div><p id="capability-note" class="capability-note">現在検証できること：観測・記憶・行動の選択。観測v2の場面では身体方向の入力と攻守の推定を記録します。向きに応じた走路選択、守備移動・タックル、接触時機、パス・捕球の実行は未対応です。</p></section><button id="replay-history">現在の観測履歴を再生</button><pre id="history-report"></pre><p id="actor-capability" class="hint">動的場面では他選手が定義済み経路を移動し、対象選手だけを選手モデルが操作します。他選手の学習や自律判断は未実装。停止中の首・身体の回転は同じシミュレーション時刻で取得順を記録。再生は0.2秒刻みで、実時間の反応速度測定ではありません。</p><p class="hint">一人称は身体位置＋目の高さ＋身体/頭部の向きに接続。spectatorの世界情報は認知入力に入りません。視野・遮蔽は簡略モデル。画角は場面ごとに記録し、表示と認知入力を一致させます。P2P手続き描画を再利用（表示用mock・実身体技能ではありません）。一人称では自分の模型を非表示。</p>
<div class="metrics"><div><small>現在の意図</small><strong id="intention">—</strong></div><div><small>観測 / 記憶</small><strong id="counts">—</strong></div><div><small>独立した版</small><strong id="versions">A0 / B0</strong></div></div>
<details><summary>選手の観測・記憶と候補評価</summary><div id="beliefs"></div><pre id="trace"></pre></details>
<details><summary>個人差と戦術（試行条件）</summary><p>能力・自己推定・選好・戦術遵守を別々に変更。snapshotに保存されます。</p><label>走速度上限<input id="speed" type="number" min="0" max="12" value="5"></label><label>パス能力範囲<input id="pass-range" type="number" min="0" max="50" value="15"></label><label>パス自己推定<input id="reliability" type="range" min="0" max="1" step="0.05" value="0.7"></label><label>carry選好<input id="preference" type="range" min="0" max="1" step="0.05" value="0.5"></label><label>チームの優先行動<select id="tactic"><option>pass</option><option>carry</option><option>support</option><option>scan</option><option>hold</option></select></label><label>戦術遵守<input id="adherence" type="range" min="0" max="1" step="0.05" value="0.3"></label></details>
</section><aside><span class="eyebrow">共同研究 LOOP</span><h2>指導の記録と候補レビュー</h2><p>下の入力欄は手動保存用です。文章を保存してもモデルは変わりません。Codexとの会話で解釈・実装・比較を進め、本人が選手モデル／判断原則を別に採用します。</p>
<label>指導前に凍結した評価条件<select id="evaluation-sets"><option value="">なし（固定回帰のみ）</option></select></label><p class="hint">未使用条件と同じprofile・評価基準をCLIで先にfreeze。自然言語の意味解釈とJSON化はCodexと手動で行います。</p><label>指導する区間の開始tick<input id="from-tick" type="number" min="0" value="0"></label><p id="coaching-window" class="hint"></p><label for="feedback">フィードバック</label><textarea id="feedback" placeholder="例：見失った支援選手の位置を断定せず、首を振って確認したい。"></textarea><button id="propose" class="primary">この場面で候補を保存</button>
<label>保存済み候補<select id="candidates"><option value="">候補なし</option></select></label><p id="candidate-context" class="hint"></p><p id="candidate-readiness" class="capability-note" role="status"></p>
<details open><summary>候補を編集（自動解釈なし）</summary><label>候補の選手モデル研究モード<select id="execution-mode"><option value="legacy">従来</option><option value="finite">H-WM-1：容量指定</option><option value="unlimited">H-WM-1：無制限</option></select></label><label>K<input id="execution-k" type="number" min="1" max="128" value="4"></label><p class="hint">未検証の研究モード。受け手の比較・選択に対する容量制約です。全判断をK件に制限する、人間作業記憶の完成モデルではありません。保持観測による危険／定位と既存のfresh判定は容量制約外です。選択だけでは実行中の選手モデルを変更しません。</p><button id="mode-study">同じ観測で従来・無制限・有限を保存比較</button><pre id="mode-study-result"></pre><label>選手モデル · 実行パラメータの差分 JSON<textarea id="patch" spellcheck="false">{}</textarea></label><label>判断原則変更方法<select id="b-change-kind"><option value="amend">原則を追加・更新</option><option value="replace">新baselineへ全文置換</option></select></label><label>置換する本文（旧本文は残ります）<textarea id="b-replacement-text"></textarea></label><label>置換時に明示して引き継ぐ原則配列<textarea id="b-replacement-principles">[]</textarea></label><label>判断原則 · 原則 JSON<textarea id="principle" spellcheck="false"></textarea></label><label>変更理由・予測・反例 JSON<textarea id="study-notes" placeholder='{"rationale":"理由","expectedEffect":"対象条件で予測する変化","counterexample":"変えない条件／反例"}'></textarea></label><button id="save-edit">候補の編集を保存</button><p class="hint">選手モデル: contextRules（観測条件・例外・行動／模擬call）、scanBias等。contextRulesは配列全体を置換するため既存原則を保持して編集。判断原則: TODO欄をCodexと記述。承認前は実行に影響しません。</p></details>
<button id="codex-context">Codex用の観測contextを保存</button><button id="restore-candidate">候補の場面を復元</button><label>差戻し・再提案の理由<textarea id="review-reason"></textarea></label><button id="revise">同場面で新候補（現承認版基準）</button><label class="confirm"><input type="checkbox" id="owner">本人としてこの内容を確認しました</label>
<div class="review"><button id="approve-a">選手モデル 採用</button><button id="reject-a">選手モデル 却下</button><button id="return-a">選手モデル 差戻し</button><button id="undo-a">選手モデル undo</button><button id="approve-b">判断原則 採用</button><button id="reject-b">判断原則 却下</button><button id="return-b">判断原則 差戻し</button><button id="undo-b">判断原則 undo</button></div>
<p class="hint">選手モデルの変更がない比較は挙動の改善を検証しません。判断原則の文面比較・独立評価とは分けて確認してください。</p><button id="preview">保存済み候補をpreview＋固定回帰</button><button id="compare">現在の承認版と比較＋固定回帰</button><button id="export-b">判断原則文書をダウンロード</button><pre id="comparison"></pre>
<details open><summary>実験記録と判断原則の独立評価</summary><label>再実行step数<input id="experiment-steps" type="number" min="1" max="20" value="5"></label><button id="run-preview">未採用候補で再実行・記録</button><button id="run-active">現在の承認版で再実行・記録</button><label>保存実験<select id="experiments"></select></label><button id="load-experiment">保存結果を表示</button><button id="download-experiment">結果JSON</button><button id="show-comparison-before">beforeを3Dで見る</button><button id="show-comparison-after">afterを3Dで見る</button><label>判断原則比較群<select id="b-arm"><option value="none">原則なし</option><option value="before">変更前の判断原則</option><option value="after">変更後の判断原則</option></select></label><label>判断原則評価ケース<select id="b-cases"><option value="frozen">事前凍結</option><option value="regression">固定回帰（未見ではない）</option></select></label><button id="b-packet">匿名判断原則入力</button><button id="b-evaluator-map">評価側だけの対応表</button><p id="experiment-summary" class="capability-note"></p><pre id="experiment-report"></pre><label>判断原則に使った生成AI／設定<input id="b-model" placeholder="モデル名・設定・実行日"></label><label>判断原則の回答<textarea id="b-output"></textarea></label><label>採点・未確認事項<textarea id="b-assessment"></textarea></label><button id="save-b-review">判断原則回答を実験に記録</button><p id="b-review-status" class="hint"></p><p class="hint">判断原則はpacketを既存のAIチャットに渡して独立に評価。保存は正しさの承認ではありません。外部APIは呼びません。</p></details>
<details><summary>共有提案（未承認で取込・独立再現）</summary><p>列挙した公開合成入力だけを共有します。本人session全体や採用履歴は含めません。取込は採用ではありません。</p><label>作者表示<input id="proposal-author" value=""></label><label>権利根拠<textarea id="proposal-rights" placeholder="自作合成入力への許諾範囲を記入"></textarea></label><label>共有対象<select id="proposal-targets"><option value="A,B">選手モデルと判断原則</option><option value="A">選手モデルのみ</option><option value="B">判断原則のみ</option></select></label><label><input id="proposal-public" type="checkbox">この候補と列挙入力は公開許諾した自作合成素材です</label><button id="proposal-export">共有提案を作成・保存</button><label>提案ファイル<input id="proposal-file" type="file" accept=".json"></label><button id="proposal-validate">validate</button><button id="proposal-import">import-inert（未承認）</button><label>取込提案<select id="imported-proposals"></select></label><label>再現対象<select id="proposal-run-targets"><option value="A,B">含まれる選手モデル／判断原則</option><option value="A">選手モデルのみ</option><option value="B">判断原則のみ</option></select></label><button id="proposal-reproduce">preview / reproduce</button><p>結果とsession revisionを確認してから、上の本人チェックを一操作ごとに入れてください。</p><button id="proposal-adopt-a">取込選手モデルのみ採用</button><button id="proposal-adopt-b">取込判断原則のみ採用</button><button id="proposal-reject-a">取込選手モデルのみ却下</button><button id="proposal-reject-b">取込判断原則のみ却下</button><button id="proposal-rebase">現activeを基準に明示rebase</button><p>rebaseは新しい未承認版です。判断原則は提案の本文・原則順序を明示して引継ぎ、現在判断原則との自動mergeはしません。多case・code-review提案は手動のレビュー付き改版が必要です。</p><pre id="proposal-context"></pre><pre id="proposal-report"></pre><label>研究review<select id="research-review-status"><option value="restrict">restrict</option><option value="support">support</option><option value="reject">reject</option></select></label><label>reviewの対象範囲<textarea id="research-review-scope"></textarea></label><label>限界<textarea id="research-review-limits"></textarea></label><label><input id="research-synthetic" type="checkbox">合成ソフトウェア試験の模擬review</label><button id="research-review-save">直前の実行へのreviewを記録</button><button id="research-evidence">永続参照を表示</button><label>撤回するID<input id="research-withdraw-id"></label><label>版<input id="research-withdraw-version" type="number" min="1" value="1"></label><button id="research-withdraw">理由を付けて撤回記録（証拠は残す）</button><pre id="research-graph"></pre></details>
<details><summary>AI不要の手動候補入力</summary><label>選手モデル scanBias<input id="manual-scan-bias" type="number" min="-2" max="2" step="0.1" value="0"></label><label>判断原則条件<textarea id="manual-condition"></textarea></label><label>判断原則判断基準<textarea id="manual-criterion"></textarea></label><label>判断原則例外<textarea id="manual-exceptions"></textarea></label><label>判断原則不明時<textarea id="manual-unknown"></textarea></label><label>判断原則根拠<textarea id="manual-evidence"></textarea></label><label>変更理由<textarea id="manual-rationale"></textarea></label><label>期待<textarea id="manual-expected"></textarea></label><label>反例<textarea id="manual-counterexample"></textarea></label><button id="manual-fill">入力を候補編集欄に反映</button><p>編集欄を確認して「候補の編集を保存」。反映だけでは保存・採用しません。</p></details>
</aside></div></details></main>`;
const $ = <T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const input=(id:string)=>$<HTMLInputElement>(id);
const area=(id:string)=>$<HTMLTextAreaElement>(id);
const select=(id:string)=>$<HTMLSelectElement>(id);
const say=(message:string)=>{$('status').textContent=message;};
let bridgeReady=false;
async function api(path:string,data?:unknown) {
  if(data!==undefined&&!bridgeReady)throw new Error('bridgeを確認できません。dev serverを停止して再起動してください。');
  const res=await fetch(`/api/${path}`,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-RPM-Local':'1'},body:JSON.stringify(data)});
  const value=await res.json();if(!res.ok){
    if(res.status===409&&path!=='application'){input('owner').checked=false;await refresh(true);throw new Error(`変更競合: 最新内容を再表示しました。再確認してください。${value.error}`);}
    throw new Error(value.error||'Bridge error');
  }return value;
}
let state:ServerState, rules=defaultRulesA(), bVersion='B0', world=makeWorld('support',42), memory:Memory=emptyMemory(), profile:Profile=defaultProfile();
let executionMode:ExecutionMode=legacyMode();
let displayRevision=0;
const displayClientId=crypto.randomUUID();
let trace:Trace, playing=false, selected='', renderedRevision=-1, displayedCandidate='';
let history=newHistory(memory);
let observationPredecessor:Snapshot['observationPredecessor'];
let observationAnchor:Snapshot['observationAnchor'];
let archiveJob:{history:typeof history;source:Snapshot;requestId:string}|undefined;
let archivePending:Promise<void>|undefined,archiveError='';
const view=new View($('viewport'));
let comparisonPlayback:{experiment:Experiment;arm:'before'|'after';index:number;playing:boolean;previousSpectator:boolean;disabled:Map<HTMLInputElement|HTMLButtonElement|HTMLSelectElement|HTMLTextAreaElement,boolean>}|null=null;
const look=new PlayerLookControls(view.renderer.domElement, $('look-start') as HTMLButtonElement, $('look-center') as HTMLButtonElement, $('look-status'), {
  unavailable:()=>!bridgeReady?'ローカルbridgeの接続を待っています。':comparisonPlayback?'保存結果の比較表示中です。見回すには「研究へ戻る」を選んでください。':view.spectator?'俯瞰表示中です。一人称に戻ると見回せます。':history.events.length>=HISTORY_LIMIT?(archiveError?'履歴の保存に失敗しました。「保存を再試行」で同じ位置から続けられます。':'観測を保存中です。位置と時間を保ったまま再開します。'):null,
  pose:()=>world.body, begin:()=>pause(), commit:turnPlayer, sensitivity:()=>Number(select('look-sensitivity').value),
});
function syncViewMode(){
  $('view').textContent=view.spectator?'一人称へ':'三人称へ';
  $('view').setAttribute('aria-label',view.spectator?'一人称に切り替える':'三人称に切り替える');
  $('view-tag').textContent=view.spectator?'三人称 · 観測外も表示':'一人称 · 選手の視界';
  $('viewport').classList.toggle('is-spectator',view.spectator);
}
function syncAngles(){input('head').value=String(world.body.headYaw*180/Math.PI);input('body').value=String(world.body.yaw*180/Math.PI);$('head-value').textContent=`${Math.round(world.body.headYaw*180/Math.PI)}°`;}
function turnPlayer(target:LookTarget,angle:number,bodyYaw?:number){
  if(comparisonPlayback||view.spectator)return false;
  const key=target==='head'?'headYaw':'yaw';
  const follows=bodyYaw!==undefined&&Math.abs(world.body.yaw-bodyYaw)>1e-8;
  if(Math.abs(world.body[key]-angle)<1e-8&&!follows)return true;
  pause();try{observe(target==='body'||follows?'body-turn':'head-turn',()=>{world.body[key]=angle;if(follows)world.body.yaw=bodyYaw!;});return true;}
  catch(e){syncAngles();say(String(e));return false;}
}
function comparisonRun(){return comparisonPlayback!.experiment.results.recorded[comparisonPlayback!.arm];}
function renderComparison(){
  displayRevision++;look.update();
  const c=comparisonPlayback!,run=comparisonRun(),frame=run.frames[c.index];
  const source=c.experiment.results.recordedInput?.snapshot??c.experiment.candidate.context;
  const display=recordedWorld(source,frame,run.emittedCalls),t=frame.trace;
  view.draw(display);renderSituation(display,t);$('view-tag').textContent=`比較 ${c.experiment.mode} / ${c.arm} · 選手一人称`;
  $('clock').textContent=`${frame.time.toFixed(1)}s · ${display.dynamic?`tick ${display.dynamic.tick} · r${display.dynamic.scene.revision}`:`seed ${display.seed}`}`;
  $('intention').textContent=t.intention.action;$('counts').textContent=`${t.sensation.percepts.length} / ${t.beliefs.length}`;
  $('versions').textContent=`比較 ${t.rulesVersion} / 実行中 ${rules.version}・${bVersion}`;
  $('history-status').textContent='保存された身体・観測・判断を表示中。研究の時計・記憶・選手モデル／判断原則版は停止して保持しています。';
  $('beliefs').textContent=t.beliefs.map(b=>`${b.entityId} ${b.modality} · 観測 ${b.observedAt.toFixed(1)}s / 現在確信 ${b.currentConfidence.toFixed(2)}`).join('\n')||'未観測';
  $('trace').textContent=JSON.stringify({recordedExperiment:c.experiment.id,arm:c.arm,time:frame.time,body:display.body,situation:t.situation,loop:t.loop,intention:t.intention,bodyOutput:t.output,assessment:t.assessment},null,2);
  input('head').value=String(display.body.headYaw*180/Math.PI);input('body').value=String(display.body.yaw*180/Math.PI);$('head-value').textContent=`${Math.round(display.body.headYaw*180/Math.PI)}°`;
  input('comparison-frame').max=String(run.frames.length-1);input('comparison-frame').value=String(c.index);
  $('comparison-play').textContent=c.playing?'比較を停止':'比較を再生';
  $('comparison-status').textContent=`${c.arm} · ${c.index+1}/${run.frames.length} frame · ${frame.time.toFixed(1)}秒 · ${display.playerId}${display.dynamic?` · scene ${display.dynamic.scene.sceneId.slice(0,8)} / r${display.dynamic.scene.revision}`:""} · ${c.experiment.results.recordedInput?.window?`指導tick ${c.experiment.results.recordedInput.window.fromTick}–${c.experiment.results.recordedInput.window.toTick}`:'保存snapshotから'}。再計算・採用はしません。`;
}
async function startComparison(arm:'before'|'after',experimentId=select('experiments').value,index=0){
  if(comparisonPlayback)await exitComparison();
  look.stop();pause();await refresh(true);
  const e:Experiment=await api('experiment',{id:experimentId});
  recordedWorld(e.results.recordedInput?.snapshot??e.candidate.context,e.results.recorded[arm].frames[index]);
  const disabled=new Map<HTMLInputElement|HTMLButtonElement|HTMLSelectElement|HTMLTextAreaElement,boolean>();
  for(const control of Array.from(app.querySelectorAll<HTMLInputElement|HTMLButtonElement|HTMLSelectElement|HTMLTextAreaElement>('button,input,select,textarea')))if(!control.closest('#comparison-controls')){disabled.set(control,control.disabled);control.disabled=true;}
  comparisonPlayback={experiment:e,arm,index,playing:false,previousSpectator:view.spectator,disabled};view.spectator=false;syncViewMode();
  $('comparison-controls').hidden=false;renderComparison();$('comparison-controls').scrollIntoView({block:'start'});say('保存実験の比較表示です。before/afterを同じ時刻で切り替え、研究へ戻ると元の停止状態を復元します。');
}
function comparisonStep(){const c=comparisonPlayback!;if(c.index<comparisonRun().frames.length-1)c.index++;else c.playing=false;renderComparison();}

function pause(){playing=false;$('play').textContent='再生';}
function render(){
  displayRevision++;
  if(comparisonPlayback){renderComparison();return;}
  if(!history.events.length)appendObservation(history,sense(world),profile,rules,'initial',executionMode);
  look.update();input('head').disabled=view.spectator||history.events.length>=HISTORY_LIMIT;input('body').disabled=input('head').disabled;
  renderHistoryStatus();
  if(bridgeReady&&history.events.length>=HISTORY_ARCHIVE_AT&&!archiveError)void archiveHistory();
  trace=thinkWithMode(sense(world),memory,profile,rules,executionMode); view.draw(world);renderSituation(world,trace);
  $('clock').textContent=`${world.time.toFixed(1)}s · ${world.dynamic?`tick ${world.dynamic.tick}/${world.dynamic.scene.definition.durationTicks} · r${world.dynamic.scene.revision}`:`seed ${world.seed}`}`;$('intention').textContent=trace.intention.action;
  input('from-tick').disabled=!world.dynamic;input('from-tick').max=String(world.dynamic?.tick??0);
  $('coaching-window').textContent=world.dynamic?`対象 observer-0 · 終了tick ${world.dynamic.tick} · 場面 ${world.dynamic.scene.sceneId} / r${world.dynamic.scene.revision}`:'静的snapshot: 観測時刻を固定';
  $('counts').textContent=`${trace.sensation.percepts.length} / ${trace.beliefs.length}`;$('versions').textContent=`${rules.version} / ${bVersion}`;
  input('head').value=String(world.body.headYaw*180/Math.PI);$('head-value').textContent=`${Math.round(world.body.headYaw*180/Math.PI)}°`;
  input('body').value=String(world.body.yaw*180/Math.PI);
  $('beliefs').textContent=trace.beliefs.map(b=>`${b.entityId} ${b.modality} · 観測 ${b.observedAt.toFixed(1)}s / 現在確信 ${b.currentConfidence.toFixed(2)}`).join('\n')||'未観測。世界の真値から補完しません。';
  $('trace').textContent=JSON.stringify({modelRevision:trace.modelRevision,executionMode,deliberation:trace.deliberation,situation:trace.situation,loop:trace.loop,bodyOutcome:world.body.motor,attention:trace.attention,assessment:trace.assessment,appliedRules:trace.appliedRules,emittedCalls:world.emittedCalls??[],diagnostics:sceneDiagnostics(world),evaluation:trace.evaluation,intention:trace.intention,bodyOutput:trace.output},null,2);
}
function renderSituation(display:World,t:Trace){
  $('field-of-view').textContent=`水平視野 ${Math.round(t.sensation.vision.horizontalFov*180/Math.PI)}° · 場面に保存した観測条件${view.spectator?'（三人称の画角とは別）':''}`;
  const team=display.dynamic?.scene.definition.actors.find(a=>a.id===display.dynamic!.scene.definition.controlledPlayerId)?.team??'blue';
  const colors=team==='blue'?['青','赤']:['赤','青'];
  const current=t.sensation.percepts.filter(p=>p.kind==='player'&&p.modality==='vision'&&p.observedAt===t.sensation.time);
  const ownDirection=t.sensation.context?.ownAttackDirection??1;
  const relative=Math.atan2(Math.sin((ownDirection===1?0:Math.PI)-t.sensation.self.yaw-t.sensation.self.headYaw),Math.cos((ownDirection===1?0:Math.PI)-t.sensation.self.yaw-t.sensation.self.headYaw));
  const facing=relative;
  const attack=Math.abs(facing)<Math.PI/4?'正面':Math.abs(facing)>Math.PI*.75?'背後':facing>0?'左':'右';
  $('situation-self').textContent=`あなた・味方：${colors[0]} ／ 相手：${colors[1]} ｜ あなたは${t.sensation.self.hasBall?'ボール保持':'ボール非保持'}`;
  $('situation-visible').textContent=`選手の現在の視覚：味方${current.filter(p=>p.relation==='teammate').length}人・相手${current.filter(p=>p.relation==='opponent').length}人 ｜ 攻撃方向：${attack}（現在の目線に対して）${view.spectator?' ｜ 俯瞰には観測外の選手も表示':''}`;
  const phase=t.situation;
  $('capability-note').textContent=t.loop?'この場面では運動推定・意図の維持と変更、走行・パス・捕球・守備接触を比較できます。身体動作は簡略モデルです。成功の記録と、判断の妥当性の評価は別です。':'この場面では観測・記憶・行動選択を比較します。観測v2は身体方向と攻守推定を記録します。パス・捕球や守備接触の実行には場面v3が必要です。';
  $('actor-capability').textContent=t.loop?'場面v3：自律選手は各自の観測・記憶で判断し、同じ時刻の入力を得てから動きます。指定経路の選手も場面に含められます。再生は0.2秒刻みで、実時間の反応速度測定ではありません。':'他選手は定義済み経路の刺激です。対象選手だけを選手モデルが操作します。停止中の首・身体の回転は同時刻の取得順として記録します。';
  const labels={'attack-carrier':'攻撃・自己保持','attack-support':'攻撃・支援',defense:'守備',unknown:'保持不明'};
  $('situation-phase').textContent=phase?`観測からの局面推定：${labels[phase.phase]} ｜ ${phase.actionScope==='bounded-motor-skills'?'現在の実行範囲：走る・かわす・支援・守備・パス・捕球・抽象接触':phase.actionScope==='confirmation-and-hold-only'?'現在の実行範囲：確認・待機（守備技能は未実装）':'現在の実行範囲：既存の攻撃行動'} ｜ 観測v${t.sensation.contractVersion}`:'観測v1：攻守の推定・他選手の身体方向入力なし';
  const degrees=(v:number)=>`${Math.round(v*180/Math.PI)}°`;
  $('situation-orientation').textContent=phase?`自己の身体 ${degrees(phase.selfOrientation.bodyYaw)} ／ 頭の相対角 ${degrees(phase.selfOrientation.headYaw)} ／ 視線 ${degrees(phase.selfOrientation.viewYaw)} ｜ 他選手の向き ${phase.orientations.length}件（現在視覚＋記憶）`:'';
}
function snapshot():Snapshot{return {contractVersion:world.dynamic?2:1,scene:world.scene,seed:world.seed,world:structuredClone(world),bundle:sense(world),memoryBefore:structuredClone(memory),profile:structuredClone(profile),rulesA:structuredClone(rules),rulesBVersion:bVersion,executionMode:structuredClone(executionMode),observationHistory:structuredClone(history),...(observationPredecessor?{observationPredecessor:structuredClone(observationPredecessor),observationAnchor:structuredClone(observationAnchor)}:{})};}
function renderHistoryStatus(){
  if(comparisonPlayback)return;
  $('history-status').textContent=`観測 ${history.events.length}件 · ${observationPredecessor?'前の記録を保存済み · ':''}${archivePending?'自動保存中 · ':''}位置・時間を保って記録を継続${archiveError?` · 保存失敗：${archiveError}`:''}`;
  $('history-retry').hidden=!archiveError;
}
function archiveHistory(retry=false):Promise<void>{
  if(archivePending)return archivePending;
  if(!bridgeReady||history.events.length<HISTORY_ARCHIVE_AT||(!retry&&archiveError))return Promise.resolve();
  if(!archiveJob||archiveJob.history!==history)archiveJob={history,source:snapshot(),requestId:crypto.randomUUID()};
  const job=archiveJob;archiveError='';
  archivePending=(async()=>{
    try{
      const saved=await api('snapshot',{snapshot:job.source,requestId:job.requestId});
      // A reset/restore may have changed the current trial while this save was pending.
      if(history!==job.history)return;
      history=continueObservationHistory(history,job.source);
      observationPredecessor={snapshotId:saved.id,sha256:saved.sha256};
      observationAnchor=structuredClone(job.source.world);
      input('from-tick').value=String(Math.max(Number(input('from-tick').value),Math.round(history.events[0].bundle.time/.2)));
      displayRevision++;archiveJob=undefined;
    }catch(e){if(history===job.history)archiveError=e instanceof Error?e.message:String(e);}
    finally{
      archivePending=undefined;renderHistoryStatus();look.update();
      if(!comparisonPlayback){input('head').disabled=view.spectator||history.events.length>=HISTORY_LIMIT;input('body').disabled=input('head').disabled;}
      if(!archiveError&&history.events.length>=HISTORY_ARCHIVE_AT)queueMicrotask(()=>void archiveHistory());
    }
  })();
  renderHistoryStatus();return archivePending;
}
function observe(trigger:ObservationEvent['trigger'],update:()=>void=()=>{}){
  if(history.events.length>=HISTORY_LIMIT)throw new Error('履歴を保存中です。位置と時間は維持しています。保存後に操作を続けてください。');
  memory=history.events.length?structuredClone(trace.longTermMemory):structuredClone(history.initialMemory);
  update();if(world.runtime){world.runtime.actors.find(a=>a.id===world.dynamic!.scene.definition.controlledPlayerId)!.body=structuredClone(world.body);updateSceneFrame(world);}appendObservation(history,sense(world),profile,rules,history.events.length?trigger:'initial',executionMode);render();
}
function step(){if(world.dynamic&&world.dynamic.tick>=world.dynamic.scene.definition.durationTicks){pause();say('場面の終端です。snapshotを保存して比較、またはresetしてください。');return;}observe('step',()=>{world=advance(world,trace);});}
async function restoreSnapshot(saved:Snapshot){
  look.stop();pause();
  let predecessor=structuredClone(saved.observationPredecessor),anchor=structuredClone(saved.observationAnchor);
  let nextHistory=saved.observationHistory?structuredClone(saved.observationHistory):newHistory(saved.memoryBefore,saved.world);
  const changed=!!saved.observationHistory&&(JSON.stringify(saved.rulesA)!==JSON.stringify(rules)||JSON.stringify(saved.executionMode??legacyMode())!==JSON.stringify(executionMode));
  if(changed&&nextHistory.events.length>=HISTORY_LIMIT){const stored=await api('snapshot',{snapshot:saved,requestId:crypto.randomUUID()});nextHistory=continueObservationHistory(nextHistory,saved);predecessor={snapshotId:stored.id,sha256:stored.sha256};anchor=structuredClone(saved.world);}
  look.stop();pause();world=structuredClone(saved.world);memory=structuredClone(saved.memoryBefore);profile=structuredClone(saved.profile);history=nextHistory;observationPredecessor=predecessor;observationAnchor=anchor;archiveError='';
  trace=thinkWithMode(saved.bundle,saved.memoryBefore,saved.profile,saved.rulesA,saved.executionMode??legacyMode());
  if(world.dynamic){const value=`${world.dynamic.scene.sceneId}:${world.dynamic.scene.revision}`;if(!Array.from(select('scene').options).some(o=>o.value===value))select('scene').append(new Option(`動的 ${world.dynamic.scene.sceneId.slice(0,8)} / r${world.dynamic.scene.revision}`,value));}
  select('scene').value=world.dynamic?`${world.dynamic.scene.sceneId}:${world.dynamic.scene.revision}`:world.scene;input('seed').value=String(world.seed??0);input('from-tick').value=String(Math.round((history.events[0]?.bundle.time??world.time)/.2));syncProfile();
  if(changed)observe('restore');else render();
}
function loadCandidate(){
  const c=state?.state.candidates[selected];if(!c)return;displayedCandidate=JSON.stringify(c);
  select('b-change-kind').value=c.replacementB?'replace':'amend';area('b-replacement-text').value=c.replacementB?.baseline.text??'';area('b-replacement-principles').value=JSON.stringify(c.replacementB?.principles??[],null,2);
  area('study-notes').value=c.notes?JSON.stringify(c.notes,null,2):'';
  area('patch').value=JSON.stringify(c.patchA,null,2);area('principle').value=JSON.stringify(c.principle,null,2);
  $('candidate-context').textContent=`${c.id} · revision ${c.revision}\n${c.context.scene} · seed ${c.context.seed} · ${c.context.bundle.time}s · ${c.context.bundle.playerId}${c.coaching?` · r${c.coaching.revision} · tick ${c.coaching.fromTick}–${c.coaching.toTick}`:""}\n選手モデル: ${c.decisions.A} / 判断原則: ${c.decisions.B}${c.parentCandidateId?` · 親候補 ${c.parentCandidateId}`:""}`;
  const sameRules=JSON.stringify({...c.context.rulesA,...c.patchA})===JSON.stringify(c.context.rulesA);
  const sameMode=JSON.stringify(c.executionMode??c.context.executionMode??legacyMode())===JSON.stringify(c.context.executionMode??legacyMode());
  $('candidate-readiness').textContent=sameRules&&sameMode?'選手モデルの変更なし：指導の動作はまだ実装されていません。判断原則の文章候補を確認できます。':'選手モデルの変更候補あり：保存した観測と反例で効果を比較してください。実行未対応の技能は検証できません。';
  const savedStudy=Object.values(state.state.modeStudies).filter(study=>study.candidateId===c.id).at(-1);$('mode-study-result').textContent=savedStudy?JSON.stringify(savedStudy,null,2):'';
  const mode=c.executionMode??c.context.executionMode??legacyMode();select('execution-mode').value=mode.mode==='legacy'?'legacy':mode.capacity.kind;if(mode.mode==='h-wm-1'&&mode.capacity.kind==='finite')input('execution-k').value=String(mode.capacity.k);
  input('owner').checked=false;
}
let proposalPreview:{candidateId:string;manifestSha256:string;result:any}|undefined;
let proposalConfirmation:{candidateId:string;manifestSha256:string;sessionRevision:number;runId:string|null}|undefined;
function renderProposalContext(){
 const p=state?.state.importedProposals[select('imported-proposals').value];
 if(!p){proposalConfirmation=undefined;proposalPreview=undefined;$('proposal-context').textContent='';$('proposal-report').textContent='';return;}
 if(proposalPreview&&(proposalPreview.candidateId!==p.localCandidateId||proposalPreview.manifestSha256!==p.manifestSha256||!p.runs.some(r=>r.id===proposalPreview!.result.run.id)))proposalPreview=undefined;
 proposalConfirmation={candidateId:p.localCandidateId,manifestSha256:p.manifestSha256,sessionRevision:renderedRevision,runId:proposalPreview?.result.run.id??null};
 $('proposal-context').textContent=JSON.stringify({...proposalConfirmation,proposalId:p.proposalId,proposalRevision:p.revision,decisions:p.decisions,previewTargets:proposalPreview?.result.run.executedTargets??[]},null,2);
 $('proposal-report').textContent=proposalPreview?JSON.stringify(proposalPreview.result,null,2):'選択した提案のpreview / reproduceを実行し、内容を確認してください。';
}
select('imported-proposals').onchange=()=>{proposalPreview=undefined;input('owner').checked=false;renderProposalContext();};
let refreshQueue:Promise<void>=Promise.resolve(),pendingApplication:ApplicationPoint|undefined;
function refresh(force=false):Promise<void>{const run=refreshQueue.then(()=>refreshState(force));refreshQueue=run.catch(()=>{});return run;}
async function refreshState(force=false){
  if(comparisonPlayback)return;
  if(pendingApplication){await api('application',{point:pendingApplication});pendingApplication=undefined;}
  const data:ServerState=await api('state');
  if(comparisonPlayback)return;
  bridgeReady=data.apiVersion===11;
  if(!bridgeReady){pause();input('owner').checked=false;throw new Error('古いbridgeです。dev serverを停止して再起動してください。');}
  if(!force&&data.state.revision===renderedRevision)return;
  if(data.state.revision!==renderedRevision)input('owner').checked=false;
  const changed=rules.version!==data.active.A.version||bVersion!==data.active.B.version;
  const oldA=rules.version,oldB=bVersion;
  if(changed){pause();if(history.events.length>=HISTORY_LIMIT)await archiveHistory(true);if(history.events.length>=HISTORY_LIMIT)throw new Error('履歴の保存が完了するまで承認版の適用を待っています。');}
  state=data;renderedRevision=data.state.revision;rules=data.active.A;bVersion=data.active.B.version;executionMode=data.active.executionMode;
  const point=select('restore-point').value;select('restore-point').replaceChildren(new Option('最新の保存',''));
  for(const [id,s] of Object.entries(data.state.snapshots).reverse())select('restore-point').append(new Option(`${s.bundle.time.toFixed(1)}秒 · ${s.world.dynamic?`tick ${s.world.dynamic.tick} / ${s.world.dynamic.scene.sceneId.slice(0,8)}`:s.scene} · ${id.slice(0,8)}`,id));
  if(data.state.snapshots[point])select('restore-point').value=point;
  const sceneSelection=select('scene').value;
  for(const option of Array.from(select('scene').options))if(option.value.includes(':'))option.remove();
  for(const revisions of Object.values(data.state.scenes))for(const r of revisions)select('scene').append(new Option(`動的 ${r.sceneId.slice(0,8)} / r${r.revision} · ${r.actorCount}人`,`${r.sceneId}:${r.revision}`));
  select('scene').value=sceneSelection;
  const list=select('candidates');list.replaceChildren();
  for(const c of Object.values(data.state.candidates).reverse()){const option=document.createElement('option');option.value=c.id;option.textContent=c.feedback.slice(0,38);list.append(option);}
  if(!selected||!data.state.candidates[selected])selected=list.value;else list.value=selected;
  const previousSet=select('evaluation-sets').value;select('evaluation-sets').replaceChildren(new Option('なし（固定回帰のみ）',''));
  for(const set of Object.values(data.state.evaluationSets))select('evaluation-sets').append(new Option(`${set.at} · ${set.caseCount}条件 · ${set.digest.slice(0,8)}`,set.id));
  if(data.state.evaluationSets[previousSet])select('evaluation-sets').value=previousSet;
  const previousExperiment=select('experiments').value;select('experiments').replaceChildren();
  for(const e of Object.values(data.state.experiments).reverse()){const option=document.createElement('option');option.value=e.id;option.textContent=`${e.mode} · ${e.at}`;select('experiments').append(option);}
  if(data.state.experiments[previousExperiment])select('experiments').value=previousExperiment;
  const previousProposal=select('imported-proposals').value;select('imported-proposals').replaceChildren();for(const p of Object.values(data.state.importedProposals))select('imported-proposals').append(new Option(`${p.title} · ${p.status}`,p.localCandidateId));if(data.state.importedProposals[previousProposal])select('imported-proposals').value=previousProposal;renderProposalContext();
  $('b-review-status').textContent=`保存済み判断原則回答: ${data.state.bReviews.length}件（未検証の外部回答）`;
  if(JSON.stringify(state.state.candidates[selected])!==displayedCandidate)loadCandidate();if(changed){
    input('owner').checked=false;observe('configuration');
    if(world.dynamic){pendingApplication={...sceneRef(world.dynamic.scene),playerId:'observer-0',tick:world.dynamic.tick,fromA:oldA,toA:rules.version,fromB:oldB,toB:bVersion,receiptId:crypto.randomUUID()};await api('application',{point:pendingApplication});pendingApplication=undefined;}
  }else if(!trace)render(); // Record-list refresh does not change the displayed research frame.
}
function on(id:string,fn:()=>unknown){$(id).addEventListener('click',()=>{Promise.resolve().then(()=>{if(comparisonPlayback&&!id.startsWith('comparison-'))throw new Error('比較表示中です。研究へ戻ってから操作してください。');look.stop();return fn();}).catch(e=>say(`エラー: ${e.message}`));});}
on('history-retry',()=>archiveHistory(true));
on('replay-history',()=>{pause();const replay=replayObservationHistory(history);$('history-report').textContent=JSON.stringify({mode:replay.mode,timing:replay.timing,frames:replay.frames.map(f=>({sequence:f.sequence,time:f.time,trigger:f.trigger,modelRevision:f.trace.modelRevision,situation:f.trace.situation,bodyYaw:f.trace.sensation.self.yaw,headYaw:f.trace.sensation.self.headYaw,action:f.trace.intention.action,beliefs:f.trace.beliefs.map(b=>({id:b.entityId,observedAt:b.observedAt,age:b.age}))}))},null,2);say('記録した観測順序で判断を再生。世界や時計を進めず、当時のprofile・選手モデル設定を使います。');});
on('play',()=>{displayRevision++;playing=!playing;$('play').textContent=playing?'停止':'再生';});
on('step',()=>{pause();step();});
on('reset',async()=>{
  pause();const choice=select('scene').value;
  // Save acquired evidence before explicitly changing/resetting a scene.
  const before=history.events.length?await api('snapshot',{snapshot:snapshot()}):null;
  if(choice.includes(':')){const [id,revision]=choice.split(':');world=sceneWorld(await api('scene',{id,revision:Number(revision)}));}
  else world=makeWorld(choice as SceneId,Number(input('seed').value));
  memory=emptyMemory();history=newHistory(memory,world);observationPredecessor=undefined;observationAnchor=undefined;archiveError='';input('from-tick').value='0';render();await refresh();if(before)select('restore-point').value=before.id;say('開始点へ戻しました。やり直す前の状態は「保存した時点へ戻る」で復元できます。');
});
on('snapshot',async()=>{pause();const result=await api('snapshot',{snapshot:snapshot()});await refresh();select('restore-point').value=result.id;say(`snapshot保存: ${result.id}`);});
on('restore',async()=>{
  const point=select('restore-point').value,saved=point?state.state.snapshots[point]:Object.values(state.state.snapshots).at(-1);if(!saved)throw new Error('保存済みsnapshotがありません');
  await restoreSnapshot(saved);say('選んだ時点の位置・時間・観測履歴を復元。ルールは現在の承認版です。');
});
on('view',()=>{view.spectator=!view.spectator;syncViewMode();render();});
input('head').oninput=()=>{turnPlayer('head',Number(input('head').value)*Math.PI/180);};
input('body').oninput=()=>{turnPlayer('body',Number(input('body').value)*Math.PI/180);};
function syncProfile(){input('speed').value=String(profile.ability.maxSpeed);input('pass-range').value=String(profile.ability.passRange);input('reliability').value=String(profile.selfEstimate.passReliability);input('preference').value=String(profile.preference.carry);input('adherence').value=String(profile.tactics.adherence);select('tactic').value=profile.tactics.preferredAction;}
for(const id of ['speed','pass-range','reliability','preference','adherence','tactic'])input(id).onchange=()=>{pause();const next=structuredClone(profile);next.ability.maxSpeed=Number(input('speed').value);next.ability.passRange=Number(input('pass-range').value);next.selfEstimate.passReliability=Number(input('reliability').value);next.preference.carry=Number(input('preference').value);next.tactics.adherence=Number(input('adherence').value);next.tactics.preferredAction=select('tactic').value as Profile['tactics']['preferredAction'];try{thinkWithMode(sense(world),memory,next,rules,executionMode);observe('configuration',()=>{profile=next;});}catch(e){syncProfile();say(String(e));}};
on('capture-chat',async()=>{
  pause();const captured=snapshot();const saved=await api('snapshot',{snapshot:captured});
  const location=captured.world.dynamic?`場面 ${captured.world.dynamic.scene.sceneId} / r${captured.world.dynamic.scene.revision} / tick ${captured.world.dynamic.tick}`:`${captured.scene} / ${captured.bundle.time.toFixed(1)}秒`;
  area('chat-reference').value=`場面記録 ${saved.id}（${location}）について相談します。snapshot-contextでこの選手の観測を読んでください。指導：`;
  $('chat-handoff').hidden=false;await refresh();say(`会話用の場面記録を保存: ${saved.id}。参照と指導をCodexチャットへ。自動送信・候補作成・採用はしていません。`);
});
on('propose',async()=>{pause();const saved=await api('snapshot',{snapshot:snapshot()});const c=await api('propose',{snapshotId:saved.id,feedback:area('feedback').value,window:world.dynamic?{fromTick:Number(input('from-tick').value),toTick:world.dynamic.tick,playerId:'observer-0'}:undefined,evaluationSetId:select('evaluation-sets').value||undefined});selected=c.id;await refresh(true);say(`候補保存: ${c.id}。実行ルールは未変更です。`);});
select('candidates').onchange=()=>{selected=select('candidates').value;loadCandidate();};
on('mode-study',async()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');const study=await api('mode-study',{id:selected,expectedRevision:c.revision,k:Number(input('execution-k').value)});await refresh();$('mode-study-result').textContent=JSON.stringify(study,null,2);say('3 armを保存。有限対無制限が容量対照、従来対無制限はpolicy差です。採用状態は変更しません。');});
on('save-edit',async()=>{await api('edit',{id:selected,patchA:JSON.parse(area('patch').value),principle:JSON.parse(area('principle').value),expectedRevision:state.state.candidates[selected]?.revision,notes:readNotes(),executionMode:readMode(),replaceB:readReplacement()});await refresh(true);say('候補の編集を保存。選手モデル／判断原則それぞれの本人承認を待っています。');});
for(const target of ['A','B']){
  for(const decision of ['approve','reject','return'])on(`${decision}-${target.toLowerCase()}`,async()=>{
    if(!input('owner').checked)throw new Error('本人確認欄をチェックしてください');
    const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');
    if(candidateDirty(c))throw new Error('変更した編集内容を先に保存してください');
    pause();await api('review',{id:selected,target,decision,actor:'owner',expectedRevision:c.revision,reason:area('review-reason').value});await refresh(true);say(`${target==='A'?'選手モデル':'判断原則'} ${decision} を記録しました。${world.dynamic?`適用tick ${world.dynamic.tick}（停止して適用）`:''}`);
  });
  on(`undo-${target.toLowerCase()}`,async()=>{if(!input('owner').checked)throw new Error('本人確認欄をチェックしてください');pause();await api('undo',{target,actor:'owner',expectedVersion:target==='A'?rules.version:bVersion});await refresh(true);say(`${target==='A'?'選手モデル':'判断原則'} を直前の承認版へ戻しました。${world.dynamic?`適用tick ${world.dynamic.tick}`:''}`);});
}
for(const mode of ['preview','active'] as const)on(mode==='preview'?'preview':'compare',async()=>{
  pause();const c=state.state.candidates[selected];
  if(mode==='preview'){
    $('comparison').textContent='';
    if(!c)throw new Error('候補を選んでください');
    if(candidateDirty(c))throw new Error('未保存の編集があります。previewは保存済み候補を評価します。先に編集内容を保存してください。');
  }
  const report=await api('compare',{id:selected,mode,expectedRevision:c?.revision});
  $('comparison').textContent=JSON.stringify({mode:report.mode,candidateRevision:report.candidateRevision,activeVersion:report.activeVersion,staleBase:report.staleBase,sameConditions:report.recorded.sameConditions,scene:report.recorded.scene,seed:report.recorded.seed,time:report.recorded.time,before:report.recorded.before.intention,after:report.recorded.after.intention,evaluation:{before:report.recorded.before.evaluation,after:report.recorded.after.evaluation},versions:[report.recorded.before.rulesVersion,report.recorded.after.rulesVersion],regression:report.regression.map((r:any)=>({caseId:r.caseId,strata:r.strata,seed:r.seed,before:r.before.intention.action,after:r.after.intention.action})),B:report.B},null,2);
  say(mode==='preview'?`保存済み候補 revision ${report.candidateRevision} の一時previewです。実行中の選手モデル／判断原則版・承認状態は変えていません。層別ケースで効果と反例を確認してください。`:'保存時と現在の承認版選手モデルを同じ入力で比較。層別ケースは合成回帰評価で、人間妥当性の証明ではありません。');
});
function readNotes(){return area('study-notes').value.trim()?JSON.parse(area('study-notes').value):undefined;}
function readReplacement(){return select('b-change-kind').value==='replace'?{text:area('b-replacement-text').value,principles:JSON.parse(area('b-replacement-principles').value)}:null;}
function readMode():ExecutionMode {const mode=select('execution-mode').value;return mode==='legacy'?legacyMode():mode==='unlimited'?unlimitedMode():finiteMode(Number(input('execution-k').value));}
function candidateDirty(c:Candidate){return JSON.stringify(readReplacement())!==JSON.stringify(c.replacementB?{text:c.replacementB.baseline.text,principles:c.replacementB.principles}:null)||JSON.stringify(readMode())!==JSON.stringify(c.executionMode??c.context.executionMode??legacyMode())||JSON.stringify(JSON.parse(area('patch').value))!==JSON.stringify(c.patchA)||JSON.stringify(JSON.parse(area('principle').value))!==JSON.stringify(c.principle)||JSON.stringify(readNotes())!==JSON.stringify(c.notes);}
function download(name:string,value:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
on('codex-context',()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');download(`context-${c.id}.json`,observationContext(c));say('保存済み候補の観測contextです。Codexへ渡し、意味・例外・反例を共同編集してください。');});
on('restore-candidate',async()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');await restoreSnapshot(c.context);say('候補の観測条件を復元。実行ルールは現在の承認版です。');});
on('revise',async()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');if(candidateDirty(c))throw new Error('編集を先に保存してください');const child=await api('revise',{id:selected,reason:area('review-reason').value,expectedRevision:c.revision});selected=child.id;await refresh(true);say('観測を保ち、現承認版を基準に新候補を作成。元の履歴・承認は維持し、新候補は未採用です。');});
function showExperiment(e:Experiment){
  const sameA=JSON.stringify({...e.beforeA,version:''})===JSON.stringify({...e.afterA,version:''})&&JSON.stringify(e.results.recorded.before.frames[0]?.trace.deliberation?.executionMode??legacyMode())===JSON.stringify(e.results.recorded.after.frames[0]?.trace.deliberation?.executionMode??legacyMode());
  const run=e.results.recorded.after;
  $('experiment-summary').textContent=`${sameA?'選手モデル設定は同じです。指導の実装・改善を示す比較ではありません。':'選手モデル設定の比較記録です。競技上の改善は別に判断します。'} 記録場面：${run.frames.length} frame・${run.frames[0]?.time.toFixed(1)}〜${run.frames.at(-1)?.time.toFixed(1)}秒。終了理由：${run.termination}。`;

  const sequence=(run:Experiment['results']['recorded']['after'])=>run.frames.map(f=>f.trace.intention.action);
  $('experiment-report').textContent=JSON.stringify({id:e.id,at:e.at,candidateRevision:e.candidateRevision,modelRevision:e.modelRevision,engineFingerprint:e.engineFingerprint,provenance:e.provenance,notes:e.candidate.notes,A:[e.beforeA.version,e.afterA.version],B:[e.B.before.version,e.B.after.version],mode:e.mode,replayInput:e.results.recordedInput?{source:e.results.recordedInput.source,sourceSequence:e.results.recordedInput.sourceSequence,window:e.results.recordedInput.window}:null,observedHistory:e.results.observedHistory?{mode:e.results.observedHistory.before.mode,before:e.results.observedHistory.before.frames.map(f=>({sequence:f.sequence,time:f.time,action:f.trace.intention.action})),after:e.results.observedHistory.after.frames.map(f=>({sequence:f.sequence,time:f.time,action:f.trace.intention.action}))}:null,evaluation:e.evaluation?{setId:e.evaluation.set.id,digest:e.evaluation.set.digest,useIndex:e.evaluation.useIndex,status:e.evaluation.status}:'fixed-regression-only',frozenTrials:e.results.frozenTrials?.map(t=>({caseId:t.caseId,before:sequence(t.before),after:sequence(t.after)})),diagnostic:e.results.diagnostic,recorded:{comparison:'same-scene-closed-loop; future observations may diverge',before:sequence(e.results.recorded.before),after:sequence(e.results.recorded.after),bodyPaths:{before:e.results.recorded.before.frames.map(f=>({time:f.time,body:f.body})),after:e.results.recorded.after.frames.map(f=>({time:f.time,body:f.body}))}},trials:e.results.trials.map(t=>({caseId:t.caseId,seed:t.seed,before:sequence(t.before),after:sequence(t.after)}))},null,2);
}
for(const mode of ['preview','active'] as const)on(`run-${mode}`,async()=>{pause();const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');if(candidateDirty(c))throw new Error('理由・予測・反例を含む編集を先に保存してください');const e=await api('run',{id:selected,expectedRevision:c.revision,steps:Number(input('experiment-steps').value),mode});await refresh(true);select('experiments').value=e.id;showExperiment(e);say('複数step・対照場面の実験記録を保存。採用状態は変更していません。');});
on('load-experiment',async()=>{showExperiment(await api('experiment',{id:select('experiments').value}));say('保存時の版・理由・結果を表示。再計算していません。');});
for(const arm of ['before','after'] as const){
  on(`show-comparison-${arm}`,()=>startComparison(arm));
  on(`comparison-${arm}`,()=>{comparisonPlayback!.arm=arm;comparisonPlayback!.index=Math.min(comparisonPlayback!.index,comparisonRun().frames.length-1);renderComparison();});
}
on('comparison-play',()=>{const c=comparisonPlayback!;if(!c.playing&&c.index===comparisonRun().frames.length-1)c.index=0;c.playing=!c.playing;renderComparison();});
on('comparison-step',()=>{comparisonPlayback!.playing=false;comparisonStep();});
input('comparison-frame').oninput=()=>{if(!comparisonPlayback)return;comparisonPlayback.playing=false;comparisonPlayback.index=Number(input('comparison-frame').value);renderComparison();};
async function exitComparison(){
  const c=comparisonPlayback!;comparisonPlayback=null;for(const [control,disabled] of c.disabled)control.disabled=disabled;
  view.spectator=c.previousSpectator;$('comparison-controls').hidden=true;syncViewMode();
  render();await refresh();say('比較表示を終了。元の場面・時計・記憶へ戻りました。研究は停止したままです。');
}
on('comparison-exit',exitComparison);
on('download-experiment',async()=>download('experiment.json',await api('experiment',{id:select('experiments').value})));
on('b-packet',async()=>{download('judgment-input.json',await api('b-packet',{id:select('experiments').value,arm:select('b-arm').value,group:select('b-cases').value}));say('この群だけの匿名入力です。原則なし／before／afterを別々の新しい会話に渡してください。対応表は渡しません。');});
on('b-evaluator-map',async()=>download('judgment-evaluator-only.json',await api('b-evaluator-map',{id:select('experiments').value})));
on('save-b-review',async()=>{await api('b-review',{id:select('experiments').value,model:input('b-model').value,output:area('b-output').value,assessment:area('b-assessment').value,arm:select('b-arm').value,group:select('b-cases').value});await refresh(true);say('判断原則回答と採点メモを保存しました。未検証の外部回答として記録し、原則採用には使いません。');});
on('export-b',async()=>{const {markdown}=await api('export-b');const url=URL.createObjectURL(new Blob([markdown],{type:'text/markdown'}));const a=document.createElement('a');a.href=url;a.download=`RUGBY_JUDGMENT-${bVersion}.md`;a.click();URL.revokeObjectURL(url);say('現在の承認済み判断原則文書を出力しました。');});
// Draw on interaction/steps/resize/orbit changes; a paused tab need not use a GPU frame loop.
const stepTimer=setInterval(()=>{try{if(comparisonPlayback?.playing)comparisonStep();else if(playing)step();}catch(e){pause();if(comparisonPlayback)comparisonPlayback.playing=false;say(String(e));}},200);
// The local protocol controls presentation directly; it neither interprets coaching nor calls an AI.
let displayBusy=false;
let pendingDisplayCompletion:Record<string,unknown>|undefined;
function displayStatus(){const world=comparisonPlayback?recordedWorld(comparisonPlayback.experiment.results.recordedInput?.snapshot??comparisonPlayback.experiment.candidate.context,comparisonRun().frames[comparisonPlayback.index]):getResearchWorld();return {revision:displayRevision,mode:comparisonPlayback?'comparison':view.spectator?'spectator':'player',time:world.time,tick:world.dynamic?.tick??null,sceneId:world.dynamic?.scene.sceneId??world.scene,sceneRevision:world.dynamic?.scene.revision??null,paused:!playing&&!comparisonPlayback?.playing};}
function getResearchWorld(){return world;}
async function syncDisplay(){
  if(displayBusy||!bridgeReady||!trace)return;
  displayBusy=true;
  try{
    if(pendingDisplayCompletion){await api('display-complete',pendingDisplayCompletion);pendingDisplayCompletion=undefined;}
    const {command,snapshot:requested}=await api('display-poll',{clientId:displayClientId,display:displayStatus()});
    if(!command)return;
    try{
      if(command.expectedRevision!==displayRevision)throw new Error('Display changed before delivery; inspect views again');
      if(view.spectator&&command.kind!=='present')throw new Error('Research requires player view');
      if(comparisonPlayback&&!['compare','return'].includes(command.kind))throw new Error('Return from comparison before capture');
      look.stop();pause();
      let previousSnapshotId:string|undefined;
      if(command.kind==='compare'){
        await startComparison(command.arm,command.experimentId,command.frame);
        pendingDisplayCompletion={id:command.id,clientId:displayClientId,display:displayStatus(),comparison:{experimentId:command.experimentId,arm:command.arm,frame:command.frame}};
      }else{
      if(command.kind==='return')await exitComparison();
      else if(command.kind==='present'){
        // Restoring a research view must not silently replace the captured 選手モデル／判断原則 versions.
        if(!requested||JSON.stringify(requested.rulesA)!==JSON.stringify(rules)||requested.rulesBVersion!==bVersion||JSON.stringify(requested.executionMode??legacyMode())!==JSON.stringify(executionMode))throw new Error('Snapshot has different 選手モデル／判断原則 settings; use recorded comparison instead');
        const before=snapshot(),revision=displayRevision,wasSpectator=view.spectator;
        previousSnapshotId=(await api('snapshot',{snapshot:before})).id;
        if(displayRevision!==revision||playing||comparisonPlayback||view.spectator!==wasSpectator)throw new Error('Display changed while preserving the previous view');
        view.spectator=false;syncViewMode();
        await restoreSnapshot(requested);
      }else render();
      const captured=snapshot(),display=displayStatus();
      pendingDisplayCompletion={id:command.id,clientId:displayClientId,display,snapshot:captured,...(previousSnapshotId?{previousSnapshotId}:{})};
      say('会話に結び付ける場面を固定しました。指導はCodexなどの会話へ入力してください。');
      }
    }catch(error){pendingDisplayCompletion={id:command.id,clientId:displayClientId,error:error instanceof Error?error.message:String(error)};}
    await api('display-complete',pendingDisplayCompletion);pendingDisplayCompletion=undefined;
  }finally{displayBusy=false;}
}
const displayTimer=setInterval(()=>void syncDisplay().catch(e=>say(`表示接続: ${e.message}`)),500);
const refreshTimer=setInterval(()=>refresh().catch(e=>say(`bridge: ${e.message}`)),2500);
function dispose(){look.dispose();clearInterval(displayTimer);clearInterval(stepTimer);clearInterval(refreshTimer);view.dispose();}
window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
if(import.meta.hot)import.meta.hot.dispose(dispose);
try{await refresh();say('ローカルbridgeに接続。まず首を振って、観測と記憶の違いを確認してください。');}catch(e){say(`起動エラー: ${e instanceof Error?e.message:String(e)}`);}

async function selectedPackage(){const file=input('proposal-file').files?.[0];if(!file)throw new Error('提案ファイルを選択してください');if(file.size>100*1024*1024)throw new Error('提案が大きすぎます');return new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());}
on('proposal-export',async()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');if(candidateDirty(c))throw new Error('先に候補の編集を保存してください');if(!input('proposal-public').checked)throw new Error('選択した合成入力への公開許諾を確認してください');const pkg=await api('proposal-export',{id:selected,expectedRevision:c.revision,scope:{confirmation:'explicitly-authorized-synthetic-entries-only',author:input('proposal-author').value,rightsBasis:area('proposal-rights').value,targets:select('proposal-targets').value.split(',')}});download('proposal.rpm-proposal.json',pkg);input('proposal-public').checked=false;await refresh();say('列挙した合成入力と固定観測previewを共有提案に保存しました。採用は含みません。');});
for(const action of ['validate','import'])on('proposal-'+action,async()=>{const result=await api('proposal-'+action,{packageText:await selectedPackage()});await refresh();if(action==='import'){select('imported-proposals').value=result.localCandidateId;proposalPreview=undefined;input('owner').checked=false;renderProposalContext();}$('proposal-report').textContent=JSON.stringify(action==='import'?{...result,package:undefined}:result,null,2);say(action==='import'?'import-inert: 未承認で保存しました。選手モデル／判断原則は未変更です。':'validate: 内容と参照を検証しました。');});
on('proposal-reproduce',async()=>{const p=state.state.importedProposals[select('imported-proposals').value];if(!p)throw new Error('取込提案を選んでください');const result=await api('proposal-reproduce',{id:p.localCandidateId,manifestSha256:p.manifestSha256,targets:select('proposal-run-targets').value.split(',').filter(t=>p.targets.includes(t))});await refresh();proposalPreview={candidateId:p.localCandidateId,manifestSha256:p.manifestSha256,result};input('owner').checked=false;renderProposalContext();say('新しいrunとして独立再実行しました。結果と意味digestを確認してください。');});
for(const action of ['adopt','reject'])for(const target of ['A','B'])on('proposal-'+action+'-'+target.toLowerCase(),async()=>{if(!input('owner').checked)throw new Error('本人確認を行ってください');input('owner').checked=false;const p=state.state.importedProposals[select('imported-proposals').value],shown=proposalConfirmation;if(!p||!shown||shown.candidateId!==p.localCandidateId||shown.manifestSha256!==p.manifestSha256)throw new Error('画面の提案を再確認してください');if(action==='adopt'&&!shown.runId)throw new Error('選択した提案のpreview / reproduceを実行し、内容を確認してください');await api('proposal-review',{id:shown.candidateId,target,decision:action==='adopt'?'approve':'reject',actor:'owner',expectedSessionRevision:shown.sessionRevision,manifestSha256:shown.manifestSha256,runId:shown.runId,reason:area('review-reason').value});await refresh();say(`取込${target==='A'?'選手モデル':'判断原則'}の${action}を記録しました。`);});
on('manual-fill',()=>{const c=state.state.candidates[selected];if(!c)throw new Error('先に場面から候補を保存してください');area('patch').value=JSON.stringify({...c.patchA,scanBias:Number(input('manual-scan-bias').value)},null,2);area('principle').value=JSON.stringify({id:c.principle.id,condition:area('manual-condition').value,criterion:area('manual-criterion').value,priority:50,exceptions:area('manual-exceptions').value,unknown:area('manual-unknown').value,evidence:area('manual-evidence').value},null,2);area('study-notes').value=JSON.stringify({rationale:area('manual-rationale').value,expectedEffect:area('manual-expected').value,counterexample:area('manual-counterexample').value},null,2);say('手動入力を編集欄へ反映しました。確認後に保存してください。');});

on('research-review-save',async()=>{const p=state.state.importedProposals[select('imported-proposals').value];if(!p||!proposalConfirmation?.runId||proposalConfirmation.candidateId!==p.localCandidateId)throw new Error('選択した提案のpreview / reproduceを表示してください');const ref=await api('research-review',{id:p.localCandidateId,runId:proposalConfirmation.runId,status:select('research-review-status').value,scope:area('research-review-scope').value,limits:area('research-review-limits').value,reason:area('review-reason').value,synthetic:input('research-synthetic').checked});await refresh();$('research-graph').textContent=JSON.stringify(ref,null,2);say('reviewを記録しました。選手モデル／判断原則の採用操作とは別です。');});
on('research-evidence',async()=>{$('research-graph').textContent=JSON.stringify(await api('research-evidence',{}),null,2);});
on('research-withdraw',async()=>{const result=await api('research-withdraw',{id:input('research-withdraw-id').value,version:Number(input('research-withdraw-version').value),reason:area('review-reason').value});await refresh();$('research-graph').textContent=JSON.stringify(result,null,2);say('撤回理由を追記しました。反例・run・旧review・旧版を保持しています。');});

on('proposal-rebase',async()=>{const p=state.state.importedProposals[select('imported-proposals').value];if(!p||!input('proposal-public').checked)throw new Error('提案と新基準の合成素材への許諾を確認してください');const result=await api('proposal-rebase',{id:p.localCandidateId,expectedSessionRevision:state.state.revision,reason:area('review-reason').value,scope:{confirmation:'explicitly-authorized-synthetic-entries-only',author:input('proposal-author').value,rightsBasis:area('proposal-rights').value,targets:select('proposal-targets').value.split(',')}});input('proposal-public').checked=false;await refresh();select('imported-proposals').value=result.localCandidateId;proposalPreview=undefined;input('owner').checked=false;renderProposalContext();$('proposal-report').textContent=JSON.stringify({localCandidateId:result.localCandidateId,proposalId:result.proposalId,revision:result.revision,manifestSha256:result.manifestSha256},null,2);say('新しい未承認版を作りました。再度previewしてから選手モデル／判断原則を別に判断してください。');});
