/// <reference types="vite/client" />
import { legacyMode, finiteMode, unlimitedMode, type ExecutionMode } from '../../../../models/player/reference/src/execution-mode.js';
import './style.css';
import { recordedWorld } from '../../../simulation/src/playback';
import { sceneWorld, sceneRef, sceneDiagnostics, type SceneRef } from '../../../simulation/src/scene';
import { defaultProfile, defaultRulesA, emptyMemory } from '../../../../models/player/reference/src/defaults.js';
import type { Memory, Profile, RulesA, Trace } from '../../../../models/player/reference/src/contracts.js';
import type { Candidate, Snapshot, ApplicationPoint } from '../../../experiments/src/contracts';
import type { SceneId } from '../../../simulation/src/contracts';
import { thinkWithMode } from '../../../../models/player/reference/src/cognition';
import { advance, makeWorld, sense } from '../../../simulation/src/index';
import { View } from '../rendering/view';
import { observationContext } from '../../research';
import { newHistory, appendObservation, replayObservationHistory, HISTORY_LIMIT } from '../../../experiments/src/history';
import type { ObservationEvent } from '../../../../models/player/reference/src/contracts.js';
import type { Experiment } from '../../../experiments/src/records';
type ServerState = { apiVersion: 7; state: { importedProposals:Record<string,{localCandidateId:string;proposalId:string;revision:number;manifestSha256:string;status:string;title:string;targets:string[];decisions:{A:string;B:string};runs:{id:string;matches:boolean|null;resultDigest:unknown}[]}>; modeStudies:Record<string,{candidateId:string;arms:unknown[]}>; scenes:Record<string,(SceneRef&{durationTicks:number;actorCount:number})[]>; revision: number; snapshots: Record<string, Snapshot>; candidates: Record<string,Candidate>; evaluationSets:Record<string,{id:string;at:string;digest:string;caseCount:number}>; experiments: Record<string,{id:string;at:string;candidateId:string;mode:string}>; bReviews: {experimentId:string;model:string;assessment:string}[] }; active: { executionMode:ExecutionMode; A: RulesA; B: { version: string } } };
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header><div><span class="eyebrow">RUGBY PLAYER MODEL · 研究基盤</span><h1>選手の視点から、判断を研究する。</h1></div><div class="badge">LOCAL / PRIVATE</div></header>
<main><section class="stage"><div class="toolbar">
<label>場面<select id="scene"><option value="support">01 支援と選択</option><option value="occluded">02 遮蔽</option><option value="audio">03 背後の声</option><option value="heldout">04 未見パラメータ</option></select></label>
<label>seed<input id="seed" type="number" value="42" min="0" max="4294967295"></label><button id="reset">再現 / reset</button>
<button id="play" class="primary">再生</button><button id="step">1 step</button><button id="snapshot">snapshot保存</button><button id="restore">最新を復元</button>
</div><div id="comparison-controls" class="toolbar" hidden><strong>保存実験の比較再生</strong><button id="comparison-before">before</button><button id="comparison-after">after</button><button id="comparison-play">比較を再生</button><button id="comparison-step">比較1 frame</button><label>frame<input id="comparison-frame" type="range" min="0" value="0" step="1"></label><button id="comparison-exit">研究へ戻る</button><p id="comparison-status" role="status"></p></div><div id="viewport"><div id="view-tag">選手一人称 · 観測可能な範囲</div><div id="clock">0.0s</div><div class="crosshair">＋</div></div>
<div class="view-controls"><button id="view">spectatorへ</button><label>首振り <input id="head" type="range" min="-137" max="137" value="0"><output id="head-value">0°</output></label><label>身体の向き <input id="body" type="range" min="-180" max="180" value="0"></label></div>
<p id="history-status" class="hint"></p><button id="replay-history">現在の観測履歴を再生</button><pre id="history-report"></pre><p class="hint">動的場面では他選手が定義済み経路を移動し、対象選手だけをAが操作します。他選手の学習や自律判断は未実装。停止中の首・身体の回転は同じシミュレーション時刻で取得順を記録。再生は0.2秒刻みで、実時間の反応速度測定ではありません。</p><p class="hint">一人称は身体位置＋目の高さ＋身体/頭部の向きに接続。spectatorの世界情報は認知入力に入りません。視野90°・遮蔽は簡略モデル。P2P手続き描画を再利用（表示用mock・実身体技能ではありません）。一人称では自分の模型を非表示。</p>
<div class="metrics"><div><small>現在の意図</small><strong id="intention">—</strong></div><div><small>観測 / 記憶</small><strong id="counts">—</strong></div><div><small>独立した版</small><strong id="versions">A0 / B0</strong></div></div>
<details open><summary>選手の観測・記憶と候補評価</summary><div id="beliefs"></div><pre id="trace"></pre></details>
<details><summary>個人差と戦術（試行条件）</summary><p>能力・自己推定・選好・戦術遵守を別々に変更。snapshotに保存されます。</p><label>走速度上限<input id="speed" type="number" min="0" max="12" value="5"></label><label>パス能力範囲<input id="pass-range" type="number" min="0" max="50" value="15"></label><label>パス自己推定<input id="reliability" type="range" min="0" max="1" step="0.05" value="0.7"></label><label>carry選好<input id="preference" type="range" min="0" max="1" step="0.05" value="0.5"></label><label>チームの優先行動<select id="tactic"><option>pass</option><option>carry</option><option>support</option><option>scan</option><option>hold</option></select></label><label>戦術遵守<input id="adherence" type="range" min="0" max="1" step="0.05" value="0.3"></label></details>
</section><aside><span class="eyebrow">共同研究 LOOP</span><h2>気づきを原則候補にする</h2><p>場面・時刻・選手・観測を保存。Codexと候補を編集し、本人がA/Bを別に承認します。</p>
<label>指導前に凍結した評価条件<select id="evaluation-sets"><option value="">なし（固定回帰のみ）</option></select></label><p class="hint">未使用条件と同じprofile・評価基準をCLIで先にfreeze。自然言語の意味解釈とJSON化はCodexと手動で行います。</p><label>指導する区間の開始tick<input id="from-tick" type="number" min="0" value="0"></label><p id="coaching-window" class="hint"></p><label for="feedback">フィードバック</label><textarea id="feedback" placeholder="例：見失った支援選手の位置を断定せず、首を振って確認したい。"></textarea><button id="propose" class="primary">この場面で候補を保存</button>
<label>保存済み候補<select id="candidates"><option value="">候補なし</option></select></label><p id="candidate-context" class="hint"></p>
<details open><summary>候補を編集（自動解釈なし）</summary><label>候補のA研究モード<select id="execution-mode"><option value="legacy">従来</option><option value="finite">H-WM-1：容量指定</option><option value="unlimited">H-WM-1：無制限</option></select></label><label>K<input id="execution-k" type="number" min="1" max="128" value="4"></label><p class="hint">未検証の研究モード。受け手の比較・選択に対する容量制約です。全判断をK件に制限する、人間作業記憶の完成モデルではありません。保持観測による危険／定位と既存のfresh判定は容量制約外です。選択だけでは実行中のAを変更しません。</p><button id="mode-study">同じ観測で従来・無制限・有限を保存比較</button><pre id="mode-study-result"></pre><label>A · 実行パラメータの差分 JSON<textarea id="patch" spellcheck="false">{}</textarea></label><label>B変更方法<select id="b-change-kind"><option value="amend">原則を追加・更新</option><option value="replace">新baselineへ全文置換</option></select></label><label>置換する本文（旧本文は残ります）<textarea id="b-replacement-text"></textarea></label><label>置換時に明示して引き継ぐ原則配列<textarea id="b-replacement-principles">[]</textarea></label><label>B · 原則 JSON<textarea id="principle" spellcheck="false"></textarea></label><label>変更理由・予測・反例 JSON<textarea id="study-notes" placeholder='{"rationale":"理由","expectedEffect":"対象条件で予測する変化","counterexample":"変えない条件／反例"}'></textarea></label><button id="save-edit">候補の編集を保存</button><p class="hint">A: contextRules（観測条件・例外・行動／模擬call）、scanBias等。contextRulesは配列全体を置換するため既存原則を保持して編集。B: TODO欄をCodexと記述。承認前は実行に影響しません。</p></details>
<button id="codex-context">Codex用の観測contextを保存</button><button id="restore-candidate">候補の場面を復元</button><label>差戻し・再提案の理由<textarea id="review-reason"></textarea></label><button id="revise">同場面で新候補（現承認版基準）</button><label class="confirm"><input type="checkbox" id="owner">本人としてこの内容を確認しました</label>
<div class="review"><button id="approve-a">A 採用</button><button id="reject-a">A 却下</button><button id="return-a">A 差戻し</button><button id="undo-a">A undo</button><button id="approve-b">B 採用</button><button id="reject-b">B 却下</button><button id="return-b">B 差戻し</button><button id="undo-b">B undo</button></div>
<button id="preview">保存済み候補をpreview＋固定回帰</button><button id="compare">現在の承認版と比較＋固定回帰</button><button id="export-b">B文書をダウンロード</button><pre id="comparison"></pre>
<details open><summary>実験記録とBの独立評価</summary><label>再実行step数<input id="experiment-steps" type="number" min="1" max="20" value="5"></label><button id="run-preview">未採用候補で再実行・記録</button><button id="run-active">現在の承認版で再実行・記録</button><label>保存実験<select id="experiments"></select></label><button id="load-experiment">保存結果を表示</button><button id="download-experiment">結果JSON</button><button id="show-comparison-before">beforeを3Dで見る</button><button id="show-comparison-after">afterを3Dで見る</button><label>B比較群<select id="b-arm"><option value="none">原則なし</option><option value="before">before B</option><option value="after">after B</option></select></label><label>B評価ケース<select id="b-cases"><option value="frozen">事前凍結</option><option value="regression">固定回帰（未見ではない）</option></select></label><button id="b-packet">匿名B入力</button><button id="b-evaluator-map">評価側だけの対応表</button><pre id="experiment-report"></pre><label>Bに使った生成AI／設定<input id="b-model" placeholder="モデル名・設定・実行日"></label><label>Bの回答<textarea id="b-output"></textarea></label><label>採点・未確認事項<textarea id="b-assessment"></textarea></label><button id="save-b-review">B回答を実験に記録</button><p id="b-review-status" class="hint"></p><p class="hint">Bはpacketを既存のAIチャットに渡して独立に評価。保存は正しさの承認ではありません。外部APIは呼びません。</p></details>
<details><summary>共有提案（未承認で取込・独立再現）</summary><p>列挙した公開合成入力だけを共有します。本人session全体や採用履歴は含めません。取込は採用ではありません。</p><label>作者表示<input id="proposal-author" value=""></label><label>権利根拠<textarea id="proposal-rights" placeholder="自作合成入力への許諾範囲を記入"></textarea></label><label>共有対象<select id="proposal-targets"><option value="A,B">AとB</option><option value="A">Aのみ</option><option value="B">Bのみ</option></select></label><label><input id="proposal-public" type="checkbox">この候補と列挙入力は公開許諾した自作合成素材です</label><button id="proposal-export">共有提案を作成・保存</button><label>提案ファイル<input id="proposal-file" type="file" accept=".json"></label><button id="proposal-validate">validate</button><button id="proposal-import">import-inert（未承認）</button><label>取込提案<select id="imported-proposals"></select></label><label>再現対象<select id="proposal-run-targets"><option value="A,B">含まれるA/B</option><option value="A">Aのみ</option><option value="B">Bのみ</option></select></label><button id="proposal-reproduce">preview / reproduce</button><p>結果とsession revisionを確認してから、上の本人チェックを一操作ごとに入れてください。</p><button id="proposal-adopt-a">取込Aのみ採用</button><button id="proposal-adopt-b">取込Bのみ採用</button><button id="proposal-reject-a">取込Aのみ却下</button><button id="proposal-reject-b">取込Bのみ却下</button><button id="proposal-rebase">現activeを基準に明示rebase</button><p>rebaseは新しい未承認版です。Bは提案の本文・原則順序を明示して引継ぎ、現在Bとの自動mergeはしません。多case・code-review提案は手動のレビュー付き改版が必要です。</p><pre id="proposal-report"></pre><label>研究review<select id="research-review-status"><option value="restrict">restrict</option><option value="support">support</option><option value="reject">reject</option></select></label><label>reviewの対象範囲<textarea id="research-review-scope"></textarea></label><label>限界<textarea id="research-review-limits"></textarea></label><label><input id="research-synthetic" type="checkbox">合成ソフトウェア試験の模擬review</label><button id="research-review-save">直前の実行へのreviewを記録</button><button id="research-evidence">永続参照を表示</button><label>撤回するID<input id="research-withdraw-id"></label><label>版<input id="research-withdraw-version" type="number" min="1" value="1"></label><button id="research-withdraw">理由を付けて撤回記録（証拠は残す）</button><pre id="research-graph"></pre></details>
<details><summary>AI不要の手動候補入力</summary><label>A scanBias<input id="manual-scan-bias" type="number" min="-2" max="2" step="0.1" value="0"></label><label>B条件<textarea id="manual-condition"></textarea></label><label>B判断基準<textarea id="manual-criterion"></textarea></label><label>B例外<textarea id="manual-exceptions"></textarea></label><label>B不明時<textarea id="manual-unknown"></textarea></label><label>B根拠<textarea id="manual-evidence"></textarea></label><label>変更理由<textarea id="manual-rationale"></textarea></label><label>期待<textarea id="manual-expected"></textarea></label><label>反例<textarea id="manual-counterexample"></textarea></label><button id="manual-fill">入力を候補編集欄に反映</button><p>編集欄を確認して「候補の編集を保存」。反映だけでは保存・採用しません。</p></details>
<div id="status" role="status">ローカルbridge接続中…</div><p class="hint">研究データはローカル保存。保存先は起動時のTerminalに表示。外部送信・有料API不要。筋骨格技能・人間再現・ラグビー全規則の完成モデルではありません。</p></aside></main>`;
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
let trace:Trace, playing=false, selected='', renderedRevision=-1, displayedCandidate='';
let history=newHistory(memory);
const view=new View($('viewport'));
let comparisonPlayback:{experiment:Experiment;arm:'before'|'after';index:number;playing:boolean;previousSpectator:boolean;disabled:Map<HTMLInputElement|HTMLButtonElement|HTMLSelectElement|HTMLTextAreaElement,boolean>}|null=null;
function comparisonRun(){return comparisonPlayback!.experiment.results.recorded[comparisonPlayback!.arm];}
function renderComparison(){
  const c=comparisonPlayback!,run=comparisonRun(),frame=run.frames[c.index];
  const source=c.experiment.results.recordedInput?.snapshot??c.experiment.candidate.context;
  const display=recordedWorld(source,frame,run.emittedCalls),t=frame.trace;
  view.draw(display);$('view-tag').textContent=`比較 ${c.experiment.mode} / ${c.arm} · 選手一人称`;
  $('clock').textContent=`${frame.time.toFixed(1)}s · ${display.dynamic?`tick ${display.dynamic.tick} · r${display.dynamic.scene.revision}`:`seed ${display.seed}`}`;
  $('intention').textContent=t.intention.action;$('counts').textContent=`${t.sensation.percepts.length} / ${t.beliefs.length}`;
  $('versions').textContent=`比較 ${t.rulesVersion} / 実行中 ${rules.version}・${bVersion}`;
  $('history-status').textContent='保存された身体・観測・判断を表示中。研究の時計・記憶・A/B版は停止して保持しています。';
  $('beliefs').textContent=t.beliefs.map(b=>`${b.entityId} ${b.modality} · 観測 ${b.observedAt.toFixed(1)}s / 現在確信 ${b.currentConfidence.toFixed(2)}`).join('\n')||'未観測';
  $('trace').textContent=JSON.stringify({recordedExperiment:c.experiment.id,arm:c.arm,time:frame.time,body:display.body,intention:t.intention,bodyOutput:t.output,assessment:t.assessment},null,2);
  input('head').value=String(display.body.headYaw*180/Math.PI);input('body').value=String(display.body.yaw*180/Math.PI);$('head-value').textContent=`${Math.round(display.body.headYaw*180/Math.PI)}°`;
  input('comparison-frame').max=String(run.frames.length-1);input('comparison-frame').value=String(c.index);
  $('comparison-play').textContent=c.playing?'比較を停止':'比較を再生';
  $('comparison-status').textContent=`${c.arm} · ${c.index+1}/${run.frames.length} frame · ${frame.time.toFixed(1)}秒 · ${display.playerId}${display.dynamic?` · scene ${display.dynamic.scene.sceneId.slice(0,8)} / r${display.dynamic.scene.revision}`:""} · ${c.experiment.results.recordedInput?.window?`指導tick ${c.experiment.results.recordedInput.window.fromTick}–${c.experiment.results.recordedInput.window.toTick}`:'保存snapshotから'}。再計算・採用はしません。`;
}
async function startComparison(arm:'before'|'after'){
  pause();await refresh(true);
  const e:Experiment=await api('experiment',{id:select('experiments').value});
  recordedWorld(e.results.recordedInput?.snapshot??e.candidate.context,e.results.recorded[arm].frames[0]);
  const disabled=new Map<HTMLInputElement|HTMLButtonElement|HTMLSelectElement|HTMLTextAreaElement,boolean>();
  for(const control of Array.from(app.querySelectorAll<HTMLInputElement|HTMLButtonElement|HTMLSelectElement|HTMLTextAreaElement>('button,input,select,textarea')))if(!control.closest('#comparison-controls')){disabled.set(control,control.disabled);control.disabled=true;}
  comparisonPlayback={experiment:e,arm,index:0,playing:false,previousSpectator:view.spectator,disabled};view.spectator=false;
  $('comparison-controls').hidden=false;renderComparison();$('comparison-controls').scrollIntoView({block:'start'});say('保存実験の比較表示です。before/afterを同じ時刻で切り替え、研究へ戻ると元の停止状態を復元します。');
}
function comparisonStep(){const c=comparisonPlayback!;if(c.index<comparisonRun().frames.length-1)c.index++;else c.playing=false;renderComparison();}

function pause(){playing=false;$('play').textContent='再生';}
function render(){
  if(comparisonPlayback){renderComparison();return;}
  if(!history.events.length)appendObservation(history,sense(world),profile,rules,'initial',executionMode);
  $('history-status').textContent=`観測履歴 ${history.events.length}/256件 · ${history.mode} · 頭向き（眼球の独立計測なし）`;
  trace=thinkWithMode(sense(world),memory,profile,rules,executionMode); view.draw(world);
  $('clock').textContent=`${world.time.toFixed(1)}s · ${world.dynamic?`tick ${world.dynamic.tick}/${world.dynamic.scene.definition.durationTicks} · r${world.dynamic.scene.revision}`:`seed ${world.seed}`}`;$('intention').textContent=trace.intention.action;
  input('from-tick').disabled=!world.dynamic;input('from-tick').max=String(world.dynamic?.tick??0);
  $('coaching-window').textContent=world.dynamic?`対象 observer-0 · 終了tick ${world.dynamic.tick} · 場面 ${world.dynamic.scene.sceneId} / r${world.dynamic.scene.revision}`:'静的snapshot: 観測時刻を固定';
  $('counts').textContent=`${trace.sensation.percepts.length} / ${trace.beliefs.length}`;$('versions').textContent=`${rules.version} / ${bVersion}`;
  input('head').value=String(world.body.headYaw*180/Math.PI);$('head-value').textContent=`${Math.round(world.body.headYaw*180/Math.PI)}°`;
  input('body').value=String(world.body.yaw*180/Math.PI);
  $('beliefs').textContent=trace.beliefs.map(b=>`${b.entityId} ${b.modality} · 観測 ${b.observedAt.toFixed(1)}s / 現在確信 ${b.currentConfidence.toFixed(2)}`).join('\n')||'未観測。世界の真値から補完しません。';
  $('trace').textContent=JSON.stringify({modelRevision:trace.modelRevision,executionMode,deliberation:trace.deliberation,attention:trace.attention,assessment:trace.assessment,appliedRules:trace.appliedRules,emittedCalls:world.emittedCalls??[],diagnostics:sceneDiagnostics(world),evaluation:trace.evaluation,intention:trace.intention,bodyOutput:trace.output},null,2);
}
function snapshot():Snapshot{return {contractVersion:world.dynamic?2:1,scene:world.scene,seed:world.seed,world:structuredClone(world),bundle:sense(world),memoryBefore:structuredClone(memory),profile:structuredClone(profile),rulesA:structuredClone(rules),rulesBVersion:bVersion,executionMode:structuredClone(executionMode),observationHistory:structuredClone(history)};}
function observe(trigger:ObservationEvent['trigger'],update:()=>void=()=>{}){
  if(history.events.length>=HISTORY_LIMIT)throw new Error('観測履歴が256件です。snapshotを保存してresetしてください。');
  memory=history.events.length?structuredClone(trace.longTermMemory):structuredClone(history.initialMemory);
  update();appendObservation(history,sense(world),profile,rules,history.events.length?trigger:'initial',executionMode);render();
}
function step(){if(world.dynamic&&world.dynamic.tick>=world.dynamic.scene.definition.durationTicks){pause();say('場面の終端です。snapshotを保存して比較、またはresetしてください。');return;}observe('step',()=>{world=advance(world,trace);});}
function restoreSnapshot(saved:Snapshot){
  const nextHistory=saved.observationHistory?structuredClone(saved.observationHistory):newHistory(saved.memoryBefore,saved.world);
  const changed=!!saved.observationHistory&&(JSON.stringify(saved.rulesA)!==JSON.stringify(rules)||JSON.stringify(saved.executionMode??legacyMode())!==JSON.stringify(executionMode));
  if(changed&&nextHistory.events.length>=HISTORY_LIMIT)throw new Error('履歴上限のため承認版を変えた復元は不可。保存結果を参照し、新しい場面でresetしてください。');
  pause();world=structuredClone(saved.world);memory=structuredClone(saved.memoryBefore);profile=structuredClone(saved.profile);history=nextHistory;
  trace=thinkWithMode(saved.bundle,saved.memoryBefore,saved.profile,saved.rulesA,saved.executionMode??legacyMode());
  select('scene').value=world.dynamic?`${world.dynamic.scene.sceneId}:${world.dynamic.scene.revision}`:world.scene;input('seed').value=String(world.seed??0);input('from-tick').value=String(Math.round((history.events[0]?.bundle.time??world.time)/.2));syncProfile();
  if(changed)observe('restore');else render();
}
function loadCandidate(){
  const c=state?.state.candidates[selected];if(!c)return;displayedCandidate=JSON.stringify(c);
  select('b-change-kind').value=c.replacementB?'replace':'amend';area('b-replacement-text').value=c.replacementB?.baseline.text??'';area('b-replacement-principles').value=JSON.stringify(c.replacementB?.principles??[],null,2);
  area('study-notes').value=c.notes?JSON.stringify(c.notes,null,2):'';
  area('patch').value=JSON.stringify(c.patchA,null,2);area('principle').value=JSON.stringify(c.principle,null,2);
  $('candidate-context').textContent=`${c.id} · revision ${c.revision}\n${c.context.scene} · seed ${c.context.seed} · ${c.context.bundle.time}s · ${c.context.bundle.playerId}${c.coaching?` · r${c.coaching.revision} · tick ${c.coaching.fromTick}–${c.coaching.toTick}`:""}\nA: ${c.decisions.A} / B: ${c.decisions.B}${c.parentCandidateId?` · 親候補 ${c.parentCandidateId}`:""}`;
  const savedStudy=Object.values(state.state.modeStudies).filter(study=>study.candidateId===c.id).at(-1);$('mode-study-result').textContent=savedStudy?JSON.stringify(savedStudy,null,2):'';
  const mode=c.executionMode??c.context.executionMode??legacyMode();select('execution-mode').value=mode.mode==='legacy'?'legacy':mode.capacity.kind;if(mode.mode==='h-wm-1'&&mode.capacity.kind==='finite')input('execution-k').value=String(mode.capacity.k);
  input('owner').checked=false;
}
let refreshQueue:Promise<void>=Promise.resolve(),pendingApplication:ApplicationPoint|undefined;
function refresh(force=false):Promise<void>{const run=refreshQueue.then(()=>refreshState(force));refreshQueue=run.catch(()=>{});return run;}
async function refreshState(force=false){
  if(comparisonPlayback)return;
  if(pendingApplication){await api('application',{point:pendingApplication});pendingApplication=undefined;}
  const data:ServerState=await api('state');
  if(comparisonPlayback)return;
  bridgeReady=data.apiVersion===7;
  if(!bridgeReady){pause();input('owner').checked=false;throw new Error('古いbridgeです。dev serverを停止して再起動してください。');}
  if(!force&&data.state.revision===renderedRevision)return;
  const changed=rules.version!==data.active.A.version||bVersion!==data.active.B.version;
  const oldA=rules.version,oldB=bVersion;
  if(changed){pause();if(history.events.length>=HISTORY_LIMIT)throw new Error('履歴上限のため承認版の適用を停止しました。snapshotを保存しresetしてください。');}
  state=data;renderedRevision=data.state.revision;rules=data.active.A;bVersion=data.active.B.version;executionMode=data.active.executionMode;
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
  const previousProposal=select('imported-proposals').value;select('imported-proposals').replaceChildren();for(const p of Object.values(data.state.importedProposals))select('imported-proposals').append(new Option(`${p.title} · ${p.status}`,p.localCandidateId));if(data.state.importedProposals[previousProposal])select('imported-proposals').value=previousProposal;
  $('b-review-status').textContent=`保存済みB回答: ${data.state.bReviews.length}件（未検証の外部回答）`;
  if(JSON.stringify(state.state.candidates[selected])!==displayedCandidate)loadCandidate();if(changed){
    input('owner').checked=false;observe('configuration');
    if(world.dynamic){pendingApplication={...sceneRef(world.dynamic.scene),playerId:'observer-0',tick:world.dynamic.tick,fromA:oldA,toA:rules.version,fromB:oldB,toB:bVersion,receiptId:crypto.randomUUID()};await api('application',{point:pendingApplication});pendingApplication=undefined;}
  }else render();
}
function on(id:string,fn:()=>unknown){$(id).addEventListener('click',()=>{Promise.resolve().then(()=>{if(comparisonPlayback&&!id.startsWith('comparison-'))throw new Error('比較表示中です。研究へ戻ってから操作してください。');return fn();}).catch(e=>say(`エラー: ${e.message}`));});}
on('replay-history',()=>{pause();const replay=replayObservationHistory(history);$('history-report').textContent=JSON.stringify({mode:replay.mode,timing:replay.timing,frames:replay.frames.map(f=>({sequence:f.sequence,time:f.time,trigger:f.trigger,bodyYaw:f.trace.sensation.self.yaw,headYaw:f.trace.sensation.self.headYaw,action:f.trace.intention.action,beliefs:f.trace.beliefs.map(b=>({id:b.entityId,observedAt:b.observedAt,age:b.age}))}))},null,2);say('記録した観測順序で判断を再生。世界や時計を進めず、当時のprofile・A設定を使います。');});
on('play',()=>{playing=!playing;$('play').textContent=playing?'停止':'再生';});
on('step',()=>{pause();step();});
on('reset',async()=>{
  pause();const choice=select('scene').value;
  // Save acquired evidence before explicitly changing/resetting a scene.
  if(history.events.length)await api('snapshot',{snapshot:snapshot()});
  if(choice.includes(':')){const [id,revision]=choice.split(':');world=sceneWorld(await api('scene',{id,revision:Number(revision)}));}
  else world=makeWorld(choice as SceneId,Number(input('seed').value));
  memory=emptyMemory();history=newHistory(memory,world);input('from-tick').value='0';render();say('直前の観測を保存し、選んだ固定版の場面を開始しました。');
});
on('snapshot',async()=>{pause();const result=await api('snapshot',{snapshot:snapshot()});await refresh();say(`snapshot保存: ${result.id}`);});
on('restore',()=>{
  const saved=Object.values(state.state.snapshots).at(-1);if(!saved)throw new Error('保存済みsnapshotがありません');
  restoreSnapshot(saved);say('最新snapshotの場面・観測履歴を復元。ルールは現在の承認版です。');
});
on('view',()=>{view.spectator=!view.spectator;$('view').textContent=view.spectator?'一人称へ':'spectatorへ';$('view-tag').textContent=view.spectator?'SPECTATOR · 世界真値 / 認知入力とは別':'選手一人称 · 観測可能な範囲';render();});
input('head').oninput=()=>{pause();const next=Number(input('head').value)*Math.PI/180;if(next===world.body.headYaw)return;try{observe('head-turn',()=>{world.body.headYaw=next;});}catch(e){render();say(String(e));}};
input('body').oninput=()=>{pause();const next=Number(input('body').value)*Math.PI/180;if(next===world.body.yaw)return;try{observe('body-turn',()=>{world.body.yaw=next;});}catch(e){render();say(String(e));}};
function syncProfile(){input('speed').value=String(profile.ability.maxSpeed);input('pass-range').value=String(profile.ability.passRange);input('reliability').value=String(profile.selfEstimate.passReliability);input('preference').value=String(profile.preference.carry);input('adherence').value=String(profile.tactics.adherence);select('tactic').value=profile.tactics.preferredAction;}
for(const id of ['speed','pass-range','reliability','preference','adherence','tactic'])input(id).onchange=()=>{pause();const next=structuredClone(profile);next.ability.maxSpeed=Number(input('speed').value);next.ability.passRange=Number(input('pass-range').value);next.selfEstimate.passReliability=Number(input('reliability').value);next.preference.carry=Number(input('preference').value);next.tactics.adherence=Number(input('adherence').value);next.tactics.preferredAction=select('tactic').value as Profile['tactics']['preferredAction'];try{thinkWithMode(sense(world),memory,next,rules,executionMode);observe('configuration',()=>{profile=next;});}catch(e){syncProfile();say(String(e));}};
on('propose',async()=>{pause();const saved=await api('snapshot',{snapshot:snapshot()});const c=await api('propose',{snapshotId:saved.id,feedback:area('feedback').value,window:world.dynamic?{fromTick:Number(input('from-tick').value),toTick:world.dynamic.tick,playerId:'observer-0'}:undefined,evaluationSetId:select('evaluation-sets').value||undefined});selected=c.id;await refresh(true);say(`候補保存: ${c.id}。実行ルールは未変更です。`);});
select('candidates').onchange=()=>{selected=select('candidates').value;loadCandidate();};
on('mode-study',async()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');const study=await api('mode-study',{id:selected,expectedRevision:c.revision,k:Number(input('execution-k').value)});await refresh();$('mode-study-result').textContent=JSON.stringify(study,null,2);say('3 armを保存。有限対無制限が容量対照、従来対無制限はpolicy差です。採用状態は変更しません。');});
on('save-edit',async()=>{await api('edit',{id:selected,patchA:JSON.parse(area('patch').value),principle:JSON.parse(area('principle').value),expectedRevision:state.state.candidates[selected]?.revision,notes:readNotes(),executionMode:readMode(),replaceB:readReplacement()});await refresh(true);say('候補の編集を保存。A/Bそれぞれの本人承認を待っています。');});
for(const target of ['A','B']){
  for(const decision of ['approve','reject','return'])on(`${decision}-${target.toLowerCase()}`,async()=>{
    if(!input('owner').checked)throw new Error('本人確認欄をチェックしてください');
    const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');
    if(candidateDirty(c))throw new Error('変更した編集内容を先に保存してください');
    pause();await api('review',{id:selected,target,decision,actor:'owner',expectedRevision:c.revision,reason:area('review-reason').value});await refresh(true);say(`${target} ${decision} を記録しました。${world.dynamic?`適用tick ${world.dynamic.tick}（停止して適用）`:''}`);
  });
  on(`undo-${target.toLowerCase()}`,async()=>{if(!input('owner').checked)throw new Error('本人確認欄をチェックしてください');pause();await api('undo',{target,actor:'owner',expectedVersion:target==='A'?rules.version:bVersion});await refresh(true);say(`${target} を直前の承認版へ戻しました。${world.dynamic?`適用tick ${world.dynamic.tick}`:''}`);});
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
  say(mode==='preview'?`保存済み候補 revision ${report.candidateRevision} の一時previewです。実行中のA/B版・承認状態は変えていません。層別ケースで効果と反例を確認してください。`:'保存時と現在の承認版Aを同じ入力で比較。層別ケースは合成回帰評価で、人間妥当性の証明ではありません。');
});
function readNotes(){return area('study-notes').value.trim()?JSON.parse(area('study-notes').value):undefined;}
function readReplacement(){return select('b-change-kind').value==='replace'?{text:area('b-replacement-text').value,principles:JSON.parse(area('b-replacement-principles').value)}:null;}
function readMode():ExecutionMode {const mode=select('execution-mode').value;return mode==='legacy'?legacyMode():mode==='unlimited'?unlimitedMode():finiteMode(Number(input('execution-k').value));}
function candidateDirty(c:Candidate){return JSON.stringify(readReplacement())!==JSON.stringify(c.replacementB?{text:c.replacementB.baseline.text,principles:c.replacementB.principles}:null)||JSON.stringify(readMode())!==JSON.stringify(c.executionMode??c.context.executionMode??legacyMode())||JSON.stringify(JSON.parse(area('patch').value))!==JSON.stringify(c.patchA)||JSON.stringify(JSON.parse(area('principle').value))!==JSON.stringify(c.principle)||JSON.stringify(readNotes())!==JSON.stringify(c.notes);}
function download(name:string,value:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
on('codex-context',()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');download(`context-${c.id}.json`,observationContext(c));say('保存済み候補の観測contextです。Codexへ渡し、意味・例外・反例を共同編集してください。');});
on('restore-candidate',()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');restoreSnapshot(c.context);say('候補の観測条件を復元。実行ルールは現在の承認版です。');});
on('revise',async()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');if(candidateDirty(c))throw new Error('編集を先に保存してください');const child=await api('revise',{id:selected,reason:area('review-reason').value,expectedRevision:c.revision});selected=child.id;await refresh(true);say('観測を保ち、現承認版を基準に新候補を作成。元の履歴・承認は維持し、新候補は未採用です。');});
function showExperiment(e:Experiment){
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
on('comparison-exit',async()=>{
  const c=comparisonPlayback!;comparisonPlayback=null;for(const [control,disabled] of c.disabled)control.disabled=disabled;
  view.spectator=c.previousSpectator;$('comparison-controls').hidden=true;$('view').textContent=view.spectator?'一人称へ':'spectatorへ';$('view-tag').textContent=view.spectator?'SPECTATOR · 世界真値 / 認知入力とは別':'選手一人称 · 観測可能な範囲';
  render();await refresh();say('比較表示を終了。元の場面・時計・記憶へ戻りました。研究は停止したままです。');
});
on('download-experiment',async()=>download('experiment.json',await api('experiment',{id:select('experiments').value})));
on('b-packet',async()=>{download('B-anonymous-input.json',await api('b-packet',{id:select('experiments').value,arm:select('b-arm').value,group:select('b-cases').value}));say('この群だけの匿名入力です。原則なし／before／afterを別々の新しい会話に渡してください。対応表は渡しません。');});
on('b-evaluator-map',async()=>download('B-evaluator-only.json',await api('b-evaluator-map',{id:select('experiments').value})));
on('save-b-review',async()=>{await api('b-review',{id:select('experiments').value,model:input('b-model').value,output:area('b-output').value,assessment:area('b-assessment').value,arm:select('b-arm').value,group:select('b-cases').value});await refresh(true);say('B回答と採点メモを保存しました。未検証の外部回答として記録し、原則採用には使いません。');});
on('export-b',async()=>{const {markdown}=await api('export-b');const url=URL.createObjectURL(new Blob([markdown],{type:'text/markdown'}));const a=document.createElement('a');a.href=url;a.download=`RUGBY_JUDGMENT-${bVersion}.md`;a.click();URL.revokeObjectURL(url);say('現在の承認済みB文書を出力しました。');});
// Draw on interaction/steps/resize/orbit changes; a paused tab need not use a GPU frame loop.
const stepTimer=setInterval(()=>{try{if(comparisonPlayback?.playing)comparisonStep();else if(playing)step();}catch(e){pause();if(comparisonPlayback)comparisonPlayback.playing=false;say(String(e));}},200);
const refreshTimer=setInterval(()=>refresh().catch(e=>say(`bridge: ${e.message}`)),2500);
function dispose(){clearInterval(stepTimer);clearInterval(refreshTimer);view.dispose();}
window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
if(import.meta.hot)import.meta.hot.dispose(dispose);
try{await refresh();say('ローカルbridgeに接続。まず首を振って、観測と記憶の違いを確認してください。');}catch(e){say(`起動エラー: ${e instanceof Error?e.message:String(e)}`);}

async function selectedPackage(){const file=input('proposal-file').files?.[0];if(!file)throw new Error('提案ファイルを選択してください');if(file.size>100*1024*1024)throw new Error('提案が大きすぎます');return new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());}
on('proposal-export',async()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');if(candidateDirty(c))throw new Error('先に候補の編集を保存してください');if(!input('proposal-public').checked)throw new Error('選択した合成入力への公開許諾を確認してください');const pkg=await api('proposal-export',{id:selected,expectedRevision:c.revision,scope:{confirmation:'explicitly-authorized-synthetic-entries-only',author:input('proposal-author').value,rightsBasis:area('proposal-rights').value,targets:select('proposal-targets').value.split(',')}});download('proposal.rpm-proposal.json',pkg);input('proposal-public').checked=false;await refresh();say('列挙した合成入力と固定観測previewを共有提案に保存しました。採用は含みません。');});
for(const action of ['validate','import'])on('proposal-'+action,async()=>{const result=await api('proposal-'+action,{packageText:await selectedPackage()});await refresh();if(action==='import')select('imported-proposals').value=result.localCandidateId;$('proposal-report').textContent=JSON.stringify(action==='import'?{...result,package:undefined}:result,null,2);say(action==='import'?'import-inert: 未承認で保存しました。A/Bは未変更です。':'validate: 内容と参照を検証しました。');});
on('proposal-reproduce',async()=>{const p=state.state.importedProposals[select('imported-proposals').value];if(!p)throw new Error('取込提案を選んでください');const result=await api('proposal-reproduce',{id:p.localCandidateId,manifestSha256:p.manifestSha256,targets:select('proposal-run-targets').value.split(',').filter(t=>p.targets.includes(t))});await refresh();$('proposal-report').textContent=JSON.stringify(result,null,2);say('新しいrunとして独立再実行しました。結果と意味digestを確認してください。');});
for(const action of ['adopt','reject'])for(const target of ['A','B'])on('proposal-'+action+'-'+target.toLowerCase(),async()=>{if(!input('owner').checked)throw new Error('本人確認を行ってください');input('owner').checked=false;const p=state.state.importedProposals[select('imported-proposals').value];if(!p)throw new Error('取込提案を選んでください');await api('proposal-review',{id:p.localCandidateId,target,decision:action==='adopt'?'approve':'reject',actor:'owner',expectedSessionRevision:state.state.revision,manifestSha256:p.manifestSha256,runId:p.runs.at(-1)?.id,reason:area('review-reason').value});await refresh();say(`取込${target}の${action}を記録しました。`);});
on('manual-fill',()=>{const c=state.state.candidates[selected];if(!c)throw new Error('先に場面から候補を保存してください');area('patch').value=JSON.stringify({...c.patchA,scanBias:Number(input('manual-scan-bias').value)},null,2);area('principle').value=JSON.stringify({id:c.principle.id,condition:area('manual-condition').value,criterion:area('manual-criterion').value,priority:50,exceptions:area('manual-exceptions').value,unknown:area('manual-unknown').value,evidence:area('manual-evidence').value},null,2);area('study-notes').value=JSON.stringify({rationale:area('manual-rationale').value,expectedEffect:area('manual-expected').value,counterexample:area('manual-counterexample').value},null,2);say('手動入力を編集欄へ反映しました。確認後に保存してください。');});

on('research-review-save',async()=>{const p=state.state.importedProposals[select('imported-proposals').value];if(!p)throw new Error('取込提案と実行を選んでください');const ref=await api('research-review',{id:p.localCandidateId,runId:p.runs.at(-1)?.id,status:select('research-review-status').value,scope:area('research-review-scope').value,limits:area('research-review-limits').value,reason:area('review-reason').value,synthetic:input('research-synthetic').checked});await refresh();$('research-graph').textContent=JSON.stringify(ref,null,2);say('reviewを記録しました。A/Bの採用操作とは別です。');});
on('research-evidence',async()=>{$('research-graph').textContent=JSON.stringify(await api('research-evidence',{}),null,2);});
on('research-withdraw',async()=>{const result=await api('research-withdraw',{id:input('research-withdraw-id').value,version:Number(input('research-withdraw-version').value),reason:area('review-reason').value});await refresh();$('research-graph').textContent=JSON.stringify(result,null,2);say('撤回理由を追記しました。反例・run・旧review・旧版を保持しています。');});

on('proposal-rebase',async()=>{const p=state.state.importedProposals[select('imported-proposals').value];if(!p||!input('proposal-public').checked)throw new Error('提案と新基準の合成素材への許諾を確認してください');const result=await api('proposal-rebase',{id:p.localCandidateId,expectedSessionRevision:state.state.revision,reason:area('review-reason').value,scope:{confirmation:'explicitly-authorized-synthetic-entries-only',author:input('proposal-author').value,rightsBasis:area('proposal-rights').value,targets:select('proposal-targets').value.split(',')}});input('proposal-public').checked=false;await refresh();select('imported-proposals').value=result.localCandidateId;$('proposal-report').textContent=JSON.stringify({localCandidateId:result.localCandidateId,proposalId:result.proposalId,revision:result.revision,manifestSha256:result.manifestSha256},null,2);say('新しい未承認版を作りました。再度previewしてからA/Bを別に判断してください。');});
