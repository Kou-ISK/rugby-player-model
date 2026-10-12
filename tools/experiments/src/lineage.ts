import {textHash} from './judgment';
import type {ContentRef,ProposalRun} from './proposal-types';
import type {ValidatedProposal} from './proposal';
import {wireHash,freshId} from './proposal';
export type PermanentRef=Omit<ContentRef,'path'>;
export type EvidenceNode={ref:PermanentRef;content:unknown};
export type EvidenceLink={from:PermanentRef;to:PermanentRef;relation:'hypothesis'|'counterexample'|'case'|'protocol'|'experiment'|'review'|'artifact';reason:string};
export type EvidenceDecision={id:string;at:string;action:'withdraw';target:PermanentRef;reason:string};
export type EvidenceGraph={nodes:EvidenceNode[];links:EvidenceLink[];decisions:EvidenceDecision[]};
export const emptyGraph=():EvidenceGraph=>({nodes:[],links:[],decisions:[]});
export const permanent=(ref:ContentRef):PermanentRef=>{const {path:_,...p}=ref;return p;};
const key=(r:PermanentRef)=>r.kind+':'+r.id+':'+r.version;
export function node(graph:EvidenceGraph,ref:PermanentRef,content:unknown){const prior=graph.nodes.find(n=>key(n.ref)===key(ref));if(prior){if(prior.ref.sha256!==ref.sha256)throw new Error('Immutable evidence identity/version conflict');return prior.ref;}graph.nodes.push({ref:structuredClone(ref),content:structuredClone(content)});return ref;}
export function link(graph:EvidenceGraph,from:PermanentRef,to:PermanentRef,relation:EvidenceLink['relation'],reason:string){if(!graph.nodes.some(n=>key(n.ref)===key(from)&&n.ref.sha256===from.sha256)||!graph.nodes.some(n=>key(n.ref)===key(to)&&n.ref.sha256===to.sha256))throw new Error('Broken permanent reference');const edge={from,to,relation,reason};if(!graph.links.some(e=>wireHash(e)===wireHash(edge)))graph.links.push(structuredClone(edge));}
export function indexProposal(graph:EvidenceGraph,v:ValidatedProposal){
 const m=v.package.manifest,refs=new Map<string,ContentRef>();
 function walk(value:unknown){if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(walk);return;}const x=value as Record<string,unknown>;if('hashFormat'in x&&'path'in x&&'sha256'in x){const r=x as ContentRef;refs.set(key(r),r);return;}Object.values(x).forEach(walk);}
 walk(m);for(const value of v.data.values())walk(value);
 for(const r of refs.values())node(graph,permanent(r),v.read(r));
 const hypotheses=m.claimRefs.filter(r=>r.kind==='hypothesis');
 for(const h of hypotheses){const claim=v.read<{refs:ContentRef[]}>(h);for(const r of claim.refs){const relation=r.kind==='mechanism'||r.kind==='principle'?'hypothesis':r.kind==='counterexample'?'counterexample':r.kind==='case'?'case':r.kind==='protocol'?'protocol':null;if(relation)link(graph,permanent(relation==='hypothesis'?r:h),permanent(relation==='hypothesis'?h:r),relation,'Explicit proposal hypothesis and evidence reference');}}
 for(const r of m.runRefs)for(const c of [...m.caseRefs,...m.protocolRefs])link(graph,permanent(c),permanent(r),'experiment','Recorded reference run under the declared fixed-input protocol');
}
export function indexRun(graph:EvidenceGraph,v:ValidatedProposal,run:ProposalRun){const ref:PermanentRef={kind:'run',id:run.id,version:run.version,sha256:wireHash(run),hashFormat:'rpm-canonical-json-v1'};node(graph,ref,run);for(const c of [...v.package.manifest.caseRefs,...v.package.manifest.protocolRefs])link(graph,permanent(c),ref,'experiment','New local execution; run identity/environment preserved separately from semantic digest');return ref;}
export function addReview(graph:EvidenceGraph,v:ValidatedProposal,runId:string,status:'support'|'restrict'|'reject',scope:string,limits:string,reason:string,synthetic:boolean){
 if(!['support','restrict','reject'].includes(status)||[scope,limits,reason].some(t=>typeof t!=='string'||!t.trim()||t.length>4000)||typeof synthetic!=='boolean')throw new Error('Explicit review status, scope, limits, reason and synthetic flag required');
 const run=graph.nodes.find(n=>n.ref.kind==='run'&&n.ref.id===runId);if(!run)throw new Error('Review requires an actually recorded local run');
 const content={id:freshId(),version:1,kind:'review',status,scope,limits,reason,synthetic,humanValidated:false,run:run.ref,hypotheses:v.package.manifest.claimRefs.filter(r=>r.kind==='hypothesis').map(permanent)};
 const ref:PermanentRef={kind:'review',id:content.id,version:1,sha256:wireHash(content),hashFormat:'rpm-canonical-json-v1'};node(graph,ref,content);link(graph,run.ref,ref,'review','Explicit local review, not automatic scientific acceptance');for(const t of v.package.manifest.targets)link(graph,ref,permanent(t.proposedArtifact),'artifact','Review of the proposed artifact; local adoption is a separate decision');return ref;
}
export function withdraw(graph:EvidenceGraph,id:string,version:number,reason:string){if(typeof reason!=='string'||!reason.trim()||reason.length>4000)throw new Error('Withdrawal reason required');const target=graph.nodes.find(n=>n.ref.id===id&&n.ref.version===version);if(!target)throw new Error('Unknown exact evidence version');const event:EvidenceDecision={id:freshId(),at:new Date().toISOString(),action:'withdraw',target:structuredClone(target.ref),reason};graph.decisions.push(event);return event;}
export function validateGraph(graph:EvidenceGraph){const keys=new Set<string>();for(const n of graph.nodes){if(keys.has(key(n.ref)))throw new Error('Duplicate evidence version');keys.add(key(n.ref));const sha=n.ref.hashFormat==='rpm-canonical-json-v1'?wireHash(n.content):typeof n.content==='string'?textHash(n.content):undefined;if(sha!==n.ref.sha256)throw new Error('Evidence content hash mismatch');}for(const e of graph.links)for(const r of [e.from,e.to])if(!graph.nodes.some(n=>key(n.ref)===key(r)&&n.ref.sha256===r.sha256))throw new Error('Broken evidence edge');for(const d of graph.decisions)if(!graph.nodes.some(n=>key(n.ref)===key(d.target)&&n.ref.sha256===d.target.sha256))throw new Error('Broken withdrawal reference');}
