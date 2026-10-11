import './style.css';
import { defaultProfile, defaultRulesA, emptyMemory, type Candidate, type Memory, type Profile, type RulesA, type SceneId, type Snapshot, type Trace } from '../contracts';
import { think } from '../cognition';
import { advance, makeWorld, sense } from '../simulation';
import { View } from './view';
type ServerState = { apiVersion: 2; state: { revision: number; snapshots: Record<string, Snapshot>; candidates: Record<string,Candidate> }; active: { A: RulesA; B: { version: string } } };
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header><div><span class="eyebrow">RUGBY PLAYER MODEL · 研究基盤</span><h1>選手の視点から、判断を研究する。</h1></div><div class="badge">LOCAL / PRIVATE</div></header>
<main><section class="stage"><div class="toolbar">
<label>場面<select id="scene"><option value="support">01 支援と選択</option><option value="occluded">02 遮蔽</option><option value="audio">03 背後の声</option><option value="heldout">04 未見パラメータ</option></select></label>
<label>seed<input id="seed" type="number" value="42" min="0" max="4294967295"></label><button id="reset">再現 / reset</button>
<button id="play" class="primary">再生</button><button id="step">1 step</button><button id="snapshot">snapshot保存</button><button id="restore">最新を復元</button>
</div><div id="viewport"><div id="view-tag">選手一人称 · 観測可能な範囲</div><div id="clock">0.0s</div><div class="crosshair">＋</div></div>
<div class="view-controls"><button id="view">spectatorへ</button><label>首振り <input id="head" type="range" min="-137" max="137" value="0"><output id="head-value">0°</output></label><label>身体の向き <input id="body" type="range" min="-180" max="180" value="0"></label></div>
<p class="hint">一人称は身体位置＋目の高さ＋身体/頭部の向きに接続。spectatorの世界情報は認知入力に入りません。視野90°・遮蔽は簡略モデル。</p>
<div class="metrics"><div><small>現在の意図</small><strong id="intention">—</strong></div><div><small>観測 / 記憶</small><strong id="counts">—</strong></div><div><small>独立した版</small><strong id="versions">A0 / B0</strong></div></div>
<details open><summary>選手の観測・記憶と候補評価</summary><div id="beliefs"></div><pre id="trace"></pre></details>
<details><summary>個人差と戦術（試行条件）</summary><p>能力・自己推定・選好・戦術遵守を別々に変更。snapshotに保存されます。</p><label>走速度上限<input id="speed" type="number" min="0" max="12" value="5"></label><label>パス能力範囲<input id="pass-range" type="number" min="0" max="50" value="15"></label><label>パス自己推定<input id="reliability" type="range" min="0" max="1" step="0.05" value="0.7"></label><label>carry選好<input id="preference" type="range" min="0" max="1" step="0.05" value="0.5"></label><label>戦術遵守（pass）<input id="adherence" type="range" min="0" max="1" step="0.05" value="0.3"></label></details>
</section><aside><span class="eyebrow">共同研究 LOOP</span><h2>気づきを原則候補にする</h2><p>場面・時刻・選手・観測を保存。Codexと候補を編集し、本人がA/Bを別に承認します。</p>
<label for="feedback">フィードバック</label><textarea id="feedback" placeholder="例：見失った支援選手の位置を断定せず、首を振って確認したい。"></textarea><button id="propose" class="primary">この場面で候補を保存</button>
<label>保存済み候補<select id="candidates"><option value="">候補なし</option></select></label><p id="candidate-context" class="hint"></p>
<details open><summary>候補を編集（自動解釈なし）</summary><label>A · 実行パラメータの差分 JSON<textarea id="patch" spellcheck="false">{}</textarea></label><label>B · 原則 JSON<textarea id="principle" spellcheck="false"></textarea></label><button id="save-edit">候補の編集を保存</button><p class="hint">A: scanBias / carryBias / passBias / memoryHalfLife / minimumConfidence。B: TODO欄をCodexと記述。承認前は実行に影響しません。</p></details>
<label class="confirm"><input type="checkbox" id="owner">本人としてこの内容を確認しました</label>
<div class="review"><button id="approve-a">A 採用</button><button id="reject-a">A 却下</button><button id="undo-a">A undo</button><button id="approve-b">B 採用</button><button id="reject-b">B 却下</button><button id="undo-b">B undo</button></div>
<button id="preview">保存済み候補をpreview＋層別評価</button><button id="compare">現在の承認版と比較＋層別評価</button><button id="export-b">B文書をダウンロード</button><pre id="comparison"></pre>
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
    if(res.status===409){input('owner').checked=false;await refresh(true);throw new Error(`変更競合: 最新内容を再表示しました。再確認してください。${value.error}`);}
    throw new Error(value.error||'Bridge error');
  }return value;
}
let state:ServerState, rules=defaultRulesA(), bVersion='B0', world=makeWorld('support',42), memory:Memory=emptyMemory(), profile:Profile=defaultProfile();
let trace:Trace, playing=false, selected='', renderedRevision=-1;
const view=new View($('viewport'));
function pause(){playing=false;$('play').textContent='再生';}
function render(){
  trace=think(sense(world),memory,profile,rules); view.draw(world);
  $('clock').textContent=`${world.time.toFixed(1)}s · seed ${world.seed}`;$('intention').textContent=trace.intention.action;
  $('counts').textContent=`${trace.sensation.percepts.length} / ${trace.beliefs.length}`;$('versions').textContent=`${rules.version} / ${bVersion}`;
  input('head').value=String(world.body.headYaw*180/Math.PI);$('head-value').textContent=`${Math.round(world.body.headYaw*180/Math.PI)}°`;
  input('body').value=String(world.body.yaw*180/Math.PI);
  $('beliefs').textContent=trace.beliefs.map(b=>`${b.entityId} ${b.modality} · 観測 ${b.observedAt.toFixed(1)}s / 現在確信 ${b.currentConfidence.toFixed(2)}`).join('\n')||'未観測。世界の真値から補完しません。';
  $('trace').textContent=JSON.stringify({modelRevision:trace.modelRevision,attention:trace.attention,assessment:trace.assessment,evaluation:trace.evaluation,intention:trace.intention,bodyOutput:trace.output},null,2);
}
function snapshot():Snapshot{return {contractVersion:1,scene:world.scene,seed:world.seed,world:structuredClone(world),bundle:sense(world),memoryBefore:structuredClone(memory),profile:structuredClone(profile),rulesA:structuredClone(rules),rulesBVersion:bVersion};}
function step(){memory=trace.longTermMemory;world=advance(world,trace);render();}
function loadCandidate(){
  const c=state?.state.candidates[selected];if(!c)return;
  area('patch').value=JSON.stringify(c.patchA,null,2);area('principle').value=JSON.stringify(c.principle,null,2);
  $('candidate-context').textContent=`${c.id} · revision ${c.revision}\n${c.context.scene} · seed ${c.context.seed} · ${c.context.bundle.time}s · ${c.context.bundle.playerId}\nA: ${c.decisions.A} / B: ${c.decisions.B}`;
  input('owner').checked=false;
}
async function refresh(force=false){
  const data:ServerState=await api('state');
  bridgeReady=data.apiVersion===2;
  if(!bridgeReady){pause();input('owner').checked=false;throw new Error('古いbridgeです。dev serverを停止して再起動してください。');}
  if(!force&&data.state.revision===renderedRevision)return;
  const changed=rules.version!==data.active.A.version||bVersion!==data.active.B.version;
  state=data;renderedRevision=data.state.revision;rules=data.active.A;bVersion=data.active.B.version;
  const list=select('candidates');list.replaceChildren();
  for(const c of Object.values(data.state.candidates).reverse()){const option=document.createElement('option');option.value=c.id;option.textContent=c.feedback.slice(0,38);list.append(option);}
  if(!selected||!data.state.candidates[selected])selected=list.value;else list.value=selected;
  loadCandidate();if(changed)pause();render();
}
function on(id:string,fn:()=>unknown){$(id).addEventListener('click',()=>{Promise.resolve().then(fn).catch(e=>say(`エラー: ${e.message}`));});}
on('play',()=>{playing=!playing;$('play').textContent=playing?'停止':'再生';});
on('step',()=>{pause();step();});
on('reset',()=>{pause();world=makeWorld(select('scene').value as SceneId,Number(input('seed').value));memory=emptyMemory();render();say('同じseedで場面を再現しました。');});
on('snapshot',async()=>{pause();const result=await api('snapshot',{snapshot:snapshot()});await refresh();say(`snapshot保存: ${result.id}`);});
on('restore',()=>{
  const saved=Object.values(state.state.snapshots).at(-1);if(!saved)throw new Error('保存済みsnapshotがありません');
  pause();world=structuredClone(saved.world);memory=structuredClone(saved.memoryBefore);profile=structuredClone(saved.profile);
  select('scene').value=world.scene;input('seed').value=String(world.seed);syncProfile();render();say('最新snapshotの場面・観測履歴を復元。ルールは現在の承認版です。');
});
on('view',()=>{view.spectator=!view.spectator;$('view').textContent=view.spectator?'一人称へ':'spectatorへ';$('view-tag').textContent=view.spectator?'SPECTATOR · 世界真値 / 認知入力とは別':'選手一人称 · 観測可能な範囲';render();});
input('head').oninput=()=>{pause();memory=trace.longTermMemory;world.body.headYaw=Number(input('head').value)*Math.PI/180;render();};
input('body').oninput=()=>{pause();memory=trace.longTermMemory;world.body.yaw=Number(input('body').value)*Math.PI/180;render();};
function syncProfile(){input('speed').value=String(profile.ability.maxSpeed);input('pass-range').value=String(profile.ability.passRange);input('reliability').value=String(profile.selfEstimate.passReliability);input('preference').value=String(profile.preference.carry);input('adherence').value=String(profile.tactics.adherence);}
for(const id of ['speed','pass-range','reliability','preference','adherence'])input(id).onchange=()=>{pause();const next=structuredClone(profile);next.ability.maxSpeed=Number(input('speed').value);next.ability.passRange=Number(input('pass-range').value);next.selfEstimate.passReliability=Number(input('reliability').value);next.preference.carry=Number(input('preference').value);next.tactics.adherence=Number(input('adherence').value);try{think(sense(world),memory,next,rules);profile=next;render();}catch(e){syncProfile();say(String(e));}};
on('propose',async()=>{pause();const saved=await api('snapshot',{snapshot:snapshot()});const c=await api('propose',{snapshotId:saved.id,feedback:area('feedback').value});selected=c.id;await refresh(true);say(`候補保存: ${c.id}。実行ルールは未変更です。`);});
select('candidates').onchange=()=>{selected=select('candidates').value;loadCandidate();};
on('save-edit',async()=>{await api('edit',{id:selected,patchA:JSON.parse(area('patch').value),principle:JSON.parse(area('principle').value),expectedRevision:state.state.candidates[selected]?.revision});await refresh(true);say('候補の編集を保存。A/Bそれぞれの本人承認を待っています。');});
for(const target of ['A','B']){
  for(const decision of ['approve','reject'])on(`${decision}-${target.toLowerCase()}`,async()=>{
    if(!input('owner').checked)throw new Error('本人確認欄をチェックしてください');
    const c=state.state.candidates[selected];if(!c)throw new Error('候補を選んでください');
    if(JSON.stringify(JSON.parse(area('patch').value))!==JSON.stringify(c.patchA)||JSON.stringify(JSON.parse(area('principle').value))!==JSON.stringify(c.principle))throw new Error('変更した編集内容を先に保存してください');
    await api('review',{id:selected,target,decision,actor:'owner',expectedRevision:c.revision});await refresh(true);say(`${target} ${decision} を記録しました。`);
  });
  on(`undo-${target.toLowerCase()}`,async()=>{if(!input('owner').checked)throw new Error('本人確認欄をチェックしてください');await api('undo',{target,actor:'owner',expectedVersion:target==='A'?rules.version:bVersion});await refresh(true);say(`${target} を直前の承認版へ戻しました。`);});
}
for(const mode of ['preview','active'] as const)on(mode==='preview'?'preview':'compare',async()=>{
  pause();const c=state.state.candidates[selected];
  if(mode==='preview'){
    $('comparison').textContent='';
    if(!c)throw new Error('候補を選んでください');
    if(JSON.stringify(JSON.parse(area('patch').value))!==JSON.stringify(c.patchA)||JSON.stringify(JSON.parse(area('principle').value))!==JSON.stringify(c.principle))throw new Error('未保存の編集があります。previewは保存済み候補を評価します。先に編集内容を保存してください。');
  }
  const report=await api('compare',{id:selected,mode,expectedRevision:c?.revision});
  $('comparison').textContent=JSON.stringify({mode:report.mode,candidateRevision:report.candidateRevision,activeVersion:report.activeVersion,staleBase:report.staleBase,sameConditions:report.recorded.sameConditions,scene:report.recorded.scene,seed:report.recorded.seed,time:report.recorded.time,before:report.recorded.before.intention,after:report.recorded.after.intention,evaluation:{before:report.recorded.before.evaluation,after:report.recorded.after.evaluation},versions:[report.recorded.before.rulesVersion,report.recorded.after.rulesVersion],unseen:report.unseen.map((r:any)=>({caseId:r.caseId,strata:r.strata,seed:r.seed,before:r.before.intention.action,after:r.after.intention.action})),B:report.B},null,2);
  say(mode==='preview'?`保存済み候補 revision ${report.candidateRevision} の一時previewです。実行中のA/B版・承認状態は変えていません。層別ケースで効果と反例を確認してください。`:'保存時と現在の承認版Aを同じ入力で比較。層別ケースは合成回帰評価で、人間妥当性の証明ではありません。');
});
on('export-b',async()=>{const {markdown}=await api('export-b');const url=URL.createObjectURL(new Blob([markdown],{type:'text/markdown'}));const a=document.createElement('a');a.href=url;a.download=`RUGBY_JUDGMENT-${bVersion}.md`;a.click();URL.revokeObjectURL(url);say('現在の承認済みB文書を出力しました。');});
setInterval(()=>{if(playing)step();},200);
setInterval(()=>refresh().catch(e=>say(`bridge: ${e.message}`)),2500);
function animate(){view.draw(world);requestAnimationFrame(animate);}animate();
try{await refresh();say('ローカルbridgeに接続。まず首を振って、観測と記憶の違いを確認してください。');}catch(e){say(`起動エラー: ${e instanceof Error?e.message:String(e)}`);}
