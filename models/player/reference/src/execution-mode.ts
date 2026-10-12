import Ajv from 'ajv';
import schema from '../../spec/execution.schema.json' with { type: 'json' };
import type { Belief, Percept } from './contracts.js';
export type ExecutionMode = {mode:'legacy';policyVersion:'legacy-ecc5c298-v1'} | {mode:'h-wm-1';policyVersion:'receiver-deliberation-v1';capacity:{kind:'finite';k:number}|{kind:'unlimited'}};
export const legacyMode = ():ExecutionMode=>({mode:'legacy',policyVersion:'legacy-ecc5c298-v1'});
const check=new Ajv({allErrors:true,strict:false}).compile(schema.$defs.ExecutionMode);
export function validateMode(value:unknown):asserts value is ExecutionMode {if(!check(value))throw new Error('Invalid executionMode: '+JSON.stringify(check.errors));}
export const finiteMode=(k:number):ExecutionMode=>{const m={mode:'h-wm-1',policyVersion:'receiver-deliberation-v1',capacity:{kind:'finite',k}};validateMode(m);return m;};
export const unlimitedMode=():ExecutionMode=>({mode:'h-wm-1',policyVersion:'receiver-deliberation-v1',capacity:{kind:'unlimited'}});
// Unicode scalar ordering, independent of host locale and array insertion order.
function compareId(a:string,b:string){const x=Array.from(a),y=Array.from(b);for(let i=0;i<Math.min(x.length,y.length);i++){const d=x[i].codePointAt(0)!-y[i].codePointAt(0)!;if(d)return d;}return x.length-y.length;}
const salience=(b:Belief)=>b.kind==='call'?3:b.kind==='ball'?2:1;
export function rankRetrieved(beliefs:Belief[]):Belief[]{return [...beliefs].sort((a,b)=>salience(b)-salience(a)||b.currentConfidence-a.currentConfidence||b.observedAt-a.observedAt||compareId(a.id,b.id));}
export type Deliberation = {
 executionMode:Extract<ExecutionMode,{mode:'h-wm-1'}>;
 encodingPolicy:'salience-top-4-legacy-v1';retentionPolicy:'30s-last128-legacy-v1';retrievalPolicy:'latest-entity-modality-decay-legacy-v1';
 encoded:Percept[];retrieved:Belief[];ranked:Belief[];selected:Belief[];
 selection:{sourceId:string;observedAt:number;rank:number;included:boolean;reason:'within-capacity'|'capacity-exceeded'}[];
 consumers:readonly ['receiver-comparison','receiver-selection','pass-eligibility','pass-explanation'];
 unconstrained:readonly ['retained-evidence-risk-orienting','fresh-no-fresh-predicates'];
};
export function selectDeliberation(beliefs:Belief[],encoded:Percept[],mode:Extract<ExecutionMode,{mode:'h-wm-1'}>):Deliberation{
 const ranked=rankRetrieved(beliefs),limit=mode.capacity.kind==='finite'?mode.capacity.k:ranked.length;
 return {executionMode:structuredClone(mode),encodingPolicy:'salience-top-4-legacy-v1',retentionPolicy:'30s-last128-legacy-v1',retrievalPolicy:'latest-entity-modality-decay-legacy-v1',encoded:structuredClone(encoded),retrieved:structuredClone(beliefs),ranked:structuredClone(ranked),selected:structuredClone(ranked.slice(0,limit)),selection:ranked.map((b,i)=>({sourceId:b.id,observedAt:b.observedAt,rank:i+1,included:i<limit,reason:i<limit?'within-capacity':'capacity-exceeded'})),consumers:['receiver-comparison','receiver-selection','pass-eligibility','pass-explanation'],unconstrained:['retained-evidence-risk-orienting','fresh-no-fresh-predicates']};
}
