/// <reference types="vite/client" />
import './style.css';
import { sceneWorld, sceneRef, sceneDiagnostics, type SceneRef, type ApplicationPoint } from '../scene';
import { defaultProfile, defaultRulesA, emptyMemory, type Candidate, type Memory, type Profile, type RulesA, type SceneId, type Snapshot, type Trace } from '../contracts';
import { think } from '../cognition';
import { advance, makeWorld, sense } from '../simulation';
import { View } from './view';
import { observationContext } from '../research';
import { newHistory, appendObservation, replayObservationHistory, HISTORY_LIMIT } from '../observation-history';
import type { ObservationEvent } from '../contracts';
import type { Experiment } from '../../server/experiment-types';
type ServerState = { apiVersion: 5; state: { scenes:Record<string,(SceneRef&{durationTicks:number;actorCount:number})[]>; revision: number; snapshots: Record<string, Snapshot>; candidates: Record<string,Candidate>; evaluationSets:Record<string,{id:string;at:string;digest:string;caseCount:number}>; experiments: Record<string,{id:string;at:string;candidateId:string;mode:string}>; bReviews: {experimentId:string;model:string;assessment:string}[] }; active: { A: RulesA; B: { version: string } } };
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header><div><span class="eyebrow">RUGBY PLAYER MODEL · 研究基盤</span><h1>選手の視点から、判断を研究する。</h1></div><div class="badge">LOCAL / PRIVATE</div></header>
<main><section class="stage"><div class="toolbar">
<label>場面<select id="scene"><option value="support">01 支援と選択</option><option value="occluded">02 遮蔽</option><option value="audio">03 背後の声</option><option value="heldout">04 未見パラメータ</option></select></label>
<label>seed<input id="seed" type="number" value="42" min="0" max="4294967295"></label><button id="reset">再現 / reset</button>
<button id="play" class="primary">再生</button><button id="step">1 step</button><button id="snapshot">snapshot保存</button><button id="restore">最新を復元</button>
</div><div id="viewport"><div id="view-tag">選手一人称 · 観測可能な範囲</div><div id="clock">0.0s</div><div class="crosshair">＋</div></div>
<div class="view-controls"><button id="view">spectatorへ</button><label>首振り <input id="head" type="range" min="-137" max="137" value="0"><output id="head-value">0°</output></label><label>身体の向き <input id="body" type="range" min="-180" max="180" value="0"></label></div>
<p id="history-status" class="hint"></p><button id="replay-history">現在の観測履歴を再生</button><pre id="history-report"></pre><p class="hint">動的場面では他選手が定義済み経路を移動し、対象選手だけをAが操作します。他選手の学習や自律判断は未実装。停止中の首・身体の回転は同じシミュレーション時刻で取得順を記録。再生は0.2秒刻みで、実時間の反応速度測定ではありません。</p><p class="hint">一人称は身体位置＋目の高さ＋身体/頭部の向きに接続。spectatorの世界情報は認知入力に入りません。視野90°・遮蔽は簡略モデル。P2P手続き描画を再利用（表示用mock・実身体技能ではありません）。一人称では自分の模型を非表示。</p>
<div class="metrics"><div><small>現在の意図</small><strong id="intention">—</strong></div><div><small>観測 / 記憶</small><strong id="counts">—</strong></div><div><small>独立した版</small><strong id="versions">A0 / B0</strong></div></div>
<details open><summary>選手の観測・記憶と候補評価</summary><div id="beliefs"></div><pre id="trace"></pre></details>
<details><summary>個人差と戦術（試行条件）</summary><p>能力・自己推定・選好・戦術遵守を別々に変更。snapshotに保存されます。</p><label>走速度上限<input id="speed" type="number" min="0" max="12" value="5"></label><label>パス能力範囲<input id="pass-range" type="number" min="0" max="50" value="15"></label><label>パス自己推定<input id="reliability" type="range" min="0" max="1" step="0.05" value="0.7"></label><label>carry選好<input id="preference" type="range" min="0" max="1" step="0.05" value="0.5"></label><label>チームの優先行動<select id="tactic"><option>pass</option><option>carry</option><option>support</option><option>scan</option><option>hold</option></select></label><label>戦術遵守<input id="adherence" type="range" min="0" max="1" step="0.05" value="0.3"></label></details>
</section><aside><span class="eyebrow">共同研究 LOOP</span><h2>気づきを原則候補にする</h2><p>場面・時刻・選手・観測を保存。Codexと候補を編集し、本人がA/Bを別に承認します。</p>
<label>指導前に凍結した評価条件<select id="evaluation-sets"><option value="">なし（固定回帰のみ）</option></select></label><p class="hint">未使用条件と同じprofile・評価基準をCLIで先にfreeze。自然言語の意味解釈とJSON化はCodexと手動で行います。</p><label>指導する区間の開始tick<input id="from-tick" type="number" min="0" value="0"></label><p id="coaching-window" class="hint"></p><label for="feedback">フィードバック</label><textarea id="feedback" placeholder="例：見失った支援選手の位置を断定せず、首を振って確認したい。"></textarea><button id="propose" class="primary">この場面で候補を保存</button>
<label>保存済み候補<select id="candidates"><option value="">候補なし</option></select></label><p id="candidate-context" class="hint"></p>
<details open><summary>候補を編集（自動解釈なし）</summary><label>A · 実行パラメータの差分 JSON<textarea id="patch" spellcheck="false">{}</textarea></label><label>B · 原則 JSON<textarea id="principle" spellcheck="false"></textarea></label><label>変更理由・予測・反例 JSON<textarea id="study-notes" placeholder='{"rationale":"理由","expectedEffect":"対象条件で予測する変化","counterexample":"変えない条件／反例"}'></textarea></label><button id="save-edit">候補の編集を保存</button><p class="hint">A: contextRules（観測条件・例外・行動／模擬call）、scanBias等。contextRulesは配列全体を置換するため既存原則を保持して編集。B: TODO欄をCodexと記述。承認前は実行に影響しません。</p></details>
<button id="codex-context">Codex用の観測contextを保存</button><button id="restore-candidate">候補の場面を復元</button><label>差戻し・再提案の理由<textarea id="review-reason"></textarea></label><button id="revise">同場面で新候補（現承認版基準）</button><label class="confirm"><input type="checkbox" id="owner">本人としてこの内容を確認しました</label>
<div class="review"><button id="approve-a">A 採用</button><button id="reject-a">A 却下</button><button id="return-a">A 差戻し</button><button id="undo-a">A undo</button><button id="approve-b">B 採用</button><button id="reject-b">B 却下</button><button id="return-b">B 差戻し</button><button id="undo-b">B undo</button></div>
<button id="preview">保存済み候補をpreview＋固定回帰</button><button id="compare">現在の承認版と比較＋固定回帰</button><button id="export-b">B文書をダウンロード</button><pre id="comparison"></pre>
<details open><summary>実験記録とBの独立評価</summary><label>再実行step数<input id="experiment-steps" type="number" min="1" max="20" value="5"></label><button id="run-preview">未採用候補で再実行・記録</button><button id="run-active">現在の承認版で再実行・記録</button><label>保存実験<select id="experiments"></select></label><button id="load-experiment">保存結果を表示</button><button id="download-experiment">結果JSON</button><label>B比較群<select id="b-arm"><option value="none">原則なし</option><option value="before">before B</option><option value="after">after B</option></select></label><label>B評価ケース<select id="b-cases"><option value="frozen">事前凍結</option><option value="regression">固定回帰（未見ではない）</option></select></label><button id="b-packet">匿名B入力</button><button id="b-evaluator-map">評価側だけの対応表</button><pre id="experiment-report"></pre><label>Bに使った生成AI／設定<input id="b-model" placeholder="モデル名・設定・実行日"></label><label>Bの回答<textarea id="b-output"></textarea></label><label>採点・未確認事項<textarea id="b-assessment"></textarea></label><button id="save-b-review">B回答を実験に記録</button><p id="b-review-status" class="hint"></p><p class="hint">Bはpacketを既存のAIチャットに渡して独立に評価。保存は正しさの承認ではありません。外部APIは呼びません。</p></details>
<div id="status" role="status">ローカルbridge接続中…</div><p class="hint">私的session: .rpm/（gitignore）。外部送信・有料API不要。筋骨格技能・人間再現・ラグビー全規則の完成モデルではありません。</p></aside></main>`;
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
let trace:Trace, playing=false, selected='', renderedRevision=-1, displayedCandidate='';
let history=newHistory(memory);
const view=new View($('viewport'));
function pause(){playing=false;$('play').textContent='再生';}
function render(){
  if(!history.events.length)appendObservation(history,sense(world),profile,rules,'initial');
  $('history-status').textContent=`観測履歴 ${history.events.length}/256件 · ${history.mode} · 頭向き（眼球の独立計測なし）`;
  trace=think(sense(world),memory,profile,rules); view.draw(world);
  $('clock').textContent=`${world.time.toFixed(1)}s · ${world.dynamic?`tick ${world.dynamic.tick}/${world.dynamic.scene.definition.durationTicks} · r${world.dynamic.scene.revision}`:`seed ${world.seed}`}`;$('intention').textContent=trace.intention.action;
  input('from-tick').disabled=!world.dynamic;input('from-tick').max=String(world.dynamic?.tick??0);
  $('coaching-window').textContent=world.dynamic?`対象 observer-0 · 終了tick ${world.dynamic.tick} · 場面 ${world.dynamic.scene.sceneId} / r${world.dynamic.scene.revision}`:'静的snapshot: 観測時刻を固定';
  $('counts').textContent=`${trace.sensation.percepts.length} / ${trace.beliefs.length}`;$('versions').textContent=`${rules.version} / ${bVersion}`;
  input('head').value=String(world.body.headYaw*180/Math.PI);$('head-value').textContent=`${Math.round(world.body.headYaw*180/Math.PI)}°`;
  input('body').value=String(world.body.yaw*180/Math.PI);
  $('beliefs').textContent=trace.beliefs.map(b=>`${b.entityId} ${b.modality} · 観測 ${b.observedAt.toFixed(1)}s / 現在確信 ${b.currentConfidence.toFixed(2)}`).join('\n')||'未観測。世界の真値から補完しません。';
  $('trace').textContent=JSON.stringify({modelRevision:trace.modelRevision,attention:trace.attention,assessment:trace.assessment,appliedRules:trace.appliedRules,emittedCalls:world.emittedCalls??[],diagnostics:sceneDiagnostics(world),evaluation:trace.evaluation,intention:trace.intention,bodyOutput:trace.output},null,2);
}
function snapshot():Snapshot{return {contractVersion:world.dynamic?2:1,scene:world.scene,seed:world.seed,world:structuredClone(world),bundle:sense(world),memoryBefore:structuredClone(memory),profile:structuredClone(profile),rulesA:structuredClone(rules),rulesBVersion:bVersion,observationHistory:structuredClone(history)};}
function observe(trigger:ObservationEvent['trigger'],update:()=>void=()=>{}){
  if(history.events.length>=HISTORY_LIMIT)throw new Error('観測履歴が256件です。snapshotを保存してresetしてください。');
  memory=history.events.length?structuredClone(trace.longTermMemory):structuredClone(history.initialMemory);
  update();appendObservation(history,sense(world),profile,rules,history.events.length?trigger:'initial');render();
}
function step(){if(world.dynamic&&world.dynamic.tick>=world.dynamic.scene.definition.durationTicks){pause();say('場面の終端です。snapshotを保存して比較、またはresetしてください。');return;}observe('step',()=>{world=advance(world,trace);});}
function restoreSnapshot(saved:Snapshot){
  const nextHistory=saved.observationHistory?structuredClone(saved.observationHistory):newHistory(saved.memoryBefore,saved.world);
  const changed=!!saved.observationHistory&&JSON.stringify(saved.rulesA)!==JSON.stringify(rules);
  if(changed&&nextHistory.events.length>=HISTORY_LIMIT)throw new Error('履歴上限のため承認版を変えた復元は不可。保存結果を参照し、新しい場面でresetしてください。');
  pause();world=structuredClone(saved.world);memory=structuredClone(saved.memoryBefore);profile=structuredClone(saved.profile);history=nextHistory;
  trace=think(saved.bundle,saved.memoryBefore,saved.profile,saved.rulesA);
  select('scene').value=world.dynamic?`${world.dynamic.scene.sceneId}:${world.dynamic.scene.revision}`:world.scene;input('seed').value=String(world.seed??0);input('from-tick').value=String(Math.round((history.events[0]?.bundle.time??world.time)/.2));syncProfile();
  if(changed)observe('restore');else render();
}
function loadCandidate(){
  const c=state?.state.candidates[selected];if(!c)return;displayedCandidate=JSON.stringify(c);
  area('study-notes').value=c.notes?JSON.stringify(c.notes,null,2):'';
  area('patch').value=JSON.stringify(c.patchA,null,2);area('principle').value=JSON.stringify(c.principle,null,2);
  $('candidate-context').textContent=`${c.id} · revision ${c.revision}\n${c.context.scene} · seed ${c.context.seed} · ${c.context.bundle.time}s · ${c.context.bundle.playerId}${c.coaching?` · r${c.coaching.revision} · tick ${c.coaching.fromTick}–${c.coaching.toTick}`:""}\nA: ${c.decisions.A} / B: ${c.decisions.B}${c.parentCandidateId?` · 親候補 ${c.parentCandidateId}`:""}`;
  input('owner').checked=false;
}
let refreshQueue:Promise<void>=Promise.resolve(),pendingApplication:ApplicationPoint|undefined;
function refresh(force=false):Promise<void>{const run=refreshQueue.then(()=>refreshState(force));refreshQueue=run.catch(()=>{});return run;}
async function refreshState(force=false){
  if(pendingApplication){await api('application',{point:pendingApplication});pendingApplication=undefined;}
  const data:ServerState=await api('state');
  bridgeReady=data.apiVersion===5;
  if(!bridgeReady){pause();input('owner').checked=false;throw new Error('古いbridgeです。dev serverを停止して再起動してください。');}
  if(!force&&data.state.revision===renderedRevision)return;
  const changed=rules.version!==data.active.A.version||bVersion!==data.active.B.version;
  const oldA=rules.version,oldB=bVersion;
  if(changed){pause();if(history.events.length>=HISTORY_LIMIT)throw new Error('履歴上限のため承認版の適用を停止しました。snapshotを保存しresetしてください。');}
  state=data;renderedRevision=data.state.revision;rules=data.active.A;bVersion=data.active.B.version;
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
  $('b-review-status').textContent=`保存済みB回答: ${data.state.bReviews.length}件（未検証の外部回答）`;
  if(JSON.stringify(state.state.candidates[selected])!==displayedCandidate)loadCandidate();if(changed){
    input('owner').checked=false;observe('configuration');
    if(world.dynamic){pendingApplication={...sceneRef(world.dynamic.scene),playerId:'observer-0',tick:world.dynamic.tick,fromA:oldA,toA:rules.version,fromB:oldB,toB:bVersion,receiptId:crypto.randomUUID()};await api('application',{point:pendingApplication});pendingApplication=undefined;}
  }else render();
}
function on(id:string,fn:()=>unknown){$(id).addEventListener('click',()=>{Promise.resolve().then(fn).catch(e=>say(`エラー: ${e.message}`));});}
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
for(const id of ['speed','pass-range','reliability','preference','adherence','tactic'])input(id).onchange=()=>{pause();const next=structuredClone(profile);next.ability.maxSpeed=Number(input('speed').value);next.ability.passRange=Number(input('pass-range').value);next.selfEstimate.passReliability=Number(input('reliability').value);next.preference.carry=Number(input('preference').value);next.tactics.adherence=Number(input('adherence').value);next.tactics.preferredAction=select('tactic').value as Profile['tactics']['preferredAction'];try{think(sense(world),memory,next,rules);observe('configuration',()=>{profile=next;});}catch(e){syncProfile();say(String(e));}};
on('propose',async()=>{pause();const saved=await api('snapshot',{snapshot:snapshot()});const c=await api('propose',{snapshotId:saved.id,feedback:area('feedback').value,window:world.dynamic?{fromTick:Number(input('from-tick').value),toTick:world.dynamic.tick,playerId:'observer-0'}:undefined,evaluationSetId:select('evaluation-sets').value||undefined});selected=c.id;await refresh(true);say(`候補保存: ${c.id}。実行ルールは未変更です。`);});
select('candidates').onchange=()=>{selected=select('candidates').value;loadCandidate();};
on('save-edit',async()=>{await api('edit',{id:selected,patchA:JSON.parse(area('patch').value),principle:JSON.parse(area('principle').value),expectedRevision:state.state.candidates[selected]?.revision,notes:readNotes()});await refresh(true);say('候補の編集を保存。A/Bそれぞれの本人承認を待っています。');});
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
function candidateDirty(c:Candidate){return JSON.stringify(JSON.parse(area('patch').value))!==JSON.stringify(c.patchA)||JSON.stringify(JSON.parse(area('principle').value))!==JSON.stringify(c.principle)||JSON.stringify(readNotes())!==JSON.stringify(c.notes);}
function download(name:string,value:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
on('codex-context',()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');download(`context-${c.id}.json`,observationContext(c));say('保存済み候補の観測contextです。Codexへ渡し、意味・例外・反例を共同編集してください。');});
on('restore-candidate',()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');restoreSnapshot(c.context);say('候補の観測条件を復元。実行ルールは現在の承認版です。');});
on('revise',async()=>{const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');if(candidateDirty(c))throw new Error('編集を先に保存してください');const child=await api('revise',{id:selected,reason:area('review-reason').value,expectedRevision:c.revision});selected=child.id;await refresh(true);say('観測を保ち、現承認版を基準に新候補を作成。元の履歴・承認は維持し、新候補は未採用です。');});
function showExperiment(e:Experiment){
  const sequence=(run:Experiment['results']['recorded']['after'])=>run.frames.map(f=>f.trace.intention.action);
  $('experiment-report').textContent=JSON.stringify({id:e.id,at:e.at,candidateRevision:e.candidateRevision,modelRevision:e.modelRevision,engineFingerprint:e.engineFingerprint,provenance:e.provenance,notes:e.candidate.notes,A:[e.beforeA.version,e.afterA.version],B:[e.B.before.version,e.B.after.version],mode:e.mode,observedHistory:e.results.observedHistory?{mode:e.results.observedHistory.before.mode,before:e.results.observedHistory.before.frames.map(f=>({sequence:f.sequence,time:f.time,action:f.trace.intention.action})),after:e.results.observedHistory.after.frames.map(f=>({sequence:f.sequence,time:f.time,action:f.trace.intention.action}))}:null,evaluation:e.evaluation?{setId:e.evaluation.set.id,digest:e.evaluation.set.digest,useIndex:e.evaluation.useIndex,status:e.evaluation.status}:'fixed-regression-only',frozenTrials:e.results.frozenTrials?.map(t=>({caseId:t.caseId,before:sequence(t.before),after:sequence(t.after)})),diagnostic:e.results.diagnostic,recorded:{comparison:'same-scene-closed-loop; future observations may diverge',before:sequence(e.results.recorded.before),after:sequence(e.results.recorded.after),bodyPaths:{before:e.results.recorded.before.frames.map(f=>({time:f.time,body:f.body})),after:e.results.recorded.after.frames.map(f=>({time:f.time,body:f.body}))}},trials:e.results.trials.map(t=>({caseId:t.caseId,seed:t.seed,before:sequence(t.before),after:sequence(t.after)}))},null,2);
}
for(const mode of ['preview','active'] as const)on(`run-${mode}`,async()=>{pause();const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');if(candidateDirty(c))throw new Error('理由・予測・反例を含む編集を先に保存してください');const e=await api('run',{id:selected,expectedRevision:c.revision,steps:Number(input('experiment-steps').value),mode});await refresh(true);select('experiments').value=e.id;showExperiment(e);say('複数step・対照場面の実験記録を保存。採用状態は変更していません。');});
on('load-experiment',async()=>{showExperiment(await api('experiment',{id:select('experiments').value}));say('保存時の版・理由・結果を表示。再計算していません。');});
on('download-experiment',async()=>download('experiment.json',await api('experiment',{id:select('experiments').value})));
on('b-packet',async()=>{download('B-anonymous-input.json',await api('b-packet',{id:select('experiments').value,arm:select('b-arm').value,group:select('b-cases').value}));say('この群だけの匿名入力です。原則なし／before／afterを別々の新しい会話に渡してください。対応表は渡しません。');});
on('b-evaluator-map',async()=>download('B-evaluator-only.json',await api('b-evaluator-map',{id:select('experiments').value})));
on('save-b-review',async()=>{await api('b-review',{id:select('experiments').value,model:input('b-model').value,output:area('b-output').value,assessment:area('b-assessment').value,arm:select('b-arm').value,group:select('b-cases').value});await refresh(true);say('B回答と採点メモを保存しました。未検証の外部回答として記録し、原則採用には使いません。');});
on('export-b',async()=>{const {markdown}=await api('export-b');const url=URL.createObjectURL(new Blob([markdown],{type:'text/markdown'}));const a=document.createElement('a');a.href=url;a.download=`RUGBY_JUDGMENT-${bVersion}.md`;a.click();URL.revokeObjectURL(url);say('現在の承認済みB文書を出力しました。');});
// Draw on interaction/steps/resize/orbit changes; a paused tab need not use a GPU frame loop.
const stepTimer=setInterval(()=>{if(playing)try{step();}catch(e){pause();say(String(e));}},200);
const refreshTimer=setInterval(()=>refresh().catch(e=>say(`bridge: ${e.message}`)),2500);
function dispose(){clearInterval(stepTimer);clearInterval(refreshTimer);view.dispose();}
window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
if(import.meta.hot)import.meta.hot.dispose(dispose);
try{await refresh();say('ローカルbridgeに接続。まず首を振って、観測と記憶の違いを確認してください。');}catch(e){say(`起動エラー: ${e instanceof Error?e.message:String(e)}`);}
