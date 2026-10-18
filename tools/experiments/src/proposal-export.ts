import { importWorld } from './import';
import { importBundle, importMemory } from '../../../models/player/reference/src/import.js';
import { importExecutionMode } from '../../../models/player/reference/src/execution-mode.js';
import mechanisms from '../../../models/player/spec/mechanisms.json';
import principles from '../../../models/judgment/principles.json';
import type {Candidate,Principle,RulesB,Snapshot} from './contracts';
import {baselineMode,validate as validateA} from '../../../models/player/reference/src/index.js';
import {judgmentMarkdown,textHash} from './judgment';
import {canonicalWire} from './strict-json';
import {freshId,payloadDigest,validateProposal,reproduceProposal,type ContentRef,type EngineDescriptor,type Entry,type ProposalManifest,type ProposalPackage,type AArtifact,type BArtifact,type BOutput} from './proposal';
export const HWM_MECHANISM_ID='urn:uuid:c4147d02-ce6f-46ef-a6c9-3c95298c6637';
export const LEGACY_BASELINE_ID='urn:uuid:0b96bcf1-8067-40dd-af97-b3ad4c145117';
export type ExportScope={confirmation:'explicitly-authorized-synthetic-entries-only';author:string;rightsBasis:string;targets:('A'|'B')[]};
export type ProposalCandidate=Pick<Candidate,'feedback'|'patchA'|'executionMode'|'replacementB'|'notes'|'principle'>&{context:Pick<Snapshot,'seed'|'bundle'|'memoryBefore'|'profile'|'rulesA'|'rulesBVersion'|'executionMode'>&{world?:Snapshot['world']}};
export function buildProposal(candidate:ProposalCandidate,beforeB:RulesB,legacyBaseline:string,engine:EngineDescriptor,contractSha256:string,scope:ExportScope):ProposalPackage{
 if(scope.confirmation!=='explicitly-authorized-synthetic-entries-only'||!scope.author.trim()||!scope.rightsBasis.trim())throw new Error('Explicit authorization for this synthetic public proposal is required');
 if(!scope.targets.length||new Set(scope.targets).size!==scope.targets.length||scope.targets.some(t=>!['A','B'].includes(t)))throw new Error('Select independent proposal targets');
 if(!candidate.notes)throw new Error('Save rationale, expected effect and counterexample before export');
 const files:ProposalPackage['files']=[],entries:Entry[]=[];
 function add(kind:Entry['role'],path:string,value:unknown,id=freshId(),version=1):ContentRef{
  const isText=typeof value==='string',utf8=isText?value:canonicalWire(value),sha256=textHash(utf8);
  files.push({path,utf8});entries.push({path,role:kind,mediaType:isText?'text/markdown':'application/json',bytes:Buffer.byteLength(utf8),sha256,visibility:kind==='evaluator-world'?'evaluator-only':'public'});
  return {kind:kind as ContentRef['kind'],id,version,sha256,hashFormat:isText?'sha256-bytes':'rpm-canonical-json-v1',path};
 }
 if(mechanisms[0].id!==HWM_MECHANISM_ID)throw new Error('Mechanism sidecar identity mismatch');
 const context=candidate.context;candidate={...candidate,context:{...context,bundle:importBundle(context.bundle),memoryBefore:importMemory(context.memoryBefore),...(context.world?{world:importWorld(context.world)}:{})}};
 if(!candidate.notes)throw new Error('Missing notes');
 const mode=importExecutionMode(candidate.context.executionMode??baselineMode()),nextMode=importExecutionMode(candidate.executionMode??mode);
 const protocolId=freshId(),protocol=add('protocol','protocol/fixed-observation.json',{id:protocolId,version:1,kind:'fixed-observation-v1',description:'Fixed permitted observation and initial memory; receiver capacity versus policy are separate hypotheses. Body execution and human validity are not tested.',counterfactual:'same-permitted-inputs'},protocolId);
 const caseId=freshId(),input={executionContractVersion:2,executionMode:mode,bundle:candidate.context.bundle,memory:candidate.context.memoryBefore,profile:candidate.context.profile,rules:candidate.context.rulesA};
 const worldPath=candidate.context.world?'evaluation/synthetic-world.json':null;if(worldPath)add('evaluator-world',worldPath,candidate.context.world);
 const caseRef=add('case','cases/recorded-observations.json',{id:caseId,version:1,synthetic:true,input,evaluatorOnly:worldPath},caseId);
 const targets:ProposalManifest['targets']=[];
 if(scope.targets.includes('A')){
  const contract=add('contract','a/contract.json',{kind:'observation-only-execution',version:2,schemaSha256:contractSha256}),engineRef=add('engine','a/engine.json',engine),profile=add('profile','a/profile.json',input.profile),rules=add('rules','a/base-rules.json',input.rules),configValue={executionContractVersion:2,executionMode:mode},config=add('config','a/base-config.json',configValue);
  const baseArtifact:AArtifact={kind:'A',version:1,contract,engine:engineRef,config,profile,rules},artifact=add('artifact','a/base-artifact.json',baseArtifact);
  const afterRules={...input.rules,...candidate.patchA,version:'proposal-A-1'},afterConfig={executionContractVersion:2,executionMode:nextMode};validateA('RulesA',afterRules);
  const next:AArtifact={...baseArtifact,rules:add('rules','a/proposed-rules.json',afterRules),config:add('config','a/proposed-config.json',afterConfig)};
  targets.push({kind:'A',base:{artifact,contract,engine:engineRef,config,profile,rules},change:{kind:'a-configuration',beforeSha256:textHash(canonicalWire({config:configValue,rules:input.rules})),afterSha256:textHash(canonicalWire({config:afterConfig,rules:afterRules})),patch:candidate.patchA,executionMode:nextMode},proposedArtifact:add('artifact','a/proposed-artifact.json',next)});
 }
 if(scope.targets.includes('B')){
  const pending=candidate.replacementB;
  if(!pending&&Object.values(candidate.principle).some(v=>typeof v==='string'&&v.includes('TODO:')))throw new Error('Complete B before sharing that target');
  const baseline=add('baseline','b/base.md',beforeB.baseline?.text??legacyBaseline,beforeB.baseline?.id??LEGACY_BASELINE_ID,beforeB.baseline?.version??1);
  const amendments=beforeB.principles.map((p,i)=>add('amendment',`b/base-amendment-${i}.json`,p));
  const old:BOutput={format:'rpm-b-output',version:1,localVersion:beforeB.version,outputFormat:2,proposed:false,markdown:judgmentMarkdown(beforeB,legacyBaseline)};
  const base={baseline,amendments,output:add('output','b/base-output.json',old)};
  const afterPrinciples=pending?.principles??[...beforeB.principles.filter(p=>p.id!==candidate.principle.id),candidate.principle];
  const nextBase=pending?add('baseline','b/proposed.md',pending.baseline.text,pending.baseline.id,pending.baseline.version):baseline;
  const afterB:RulesB={version:'proposal-B-1',principles:afterPrinciples,outputFormat:2,...(pending?{baseline:pending.baseline}:beforeB.baseline?{baseline:beforeB.baseline}:{})};
  const nextOutput:BOutput={format:'rpm-b-output',version:1,localVersion:afterB.version,outputFormat:2,proposed:false,markdown:judgmentMarkdown(afterB,legacyBaseline)};
  const next:BArtifact={kind:'B',version:1,baseline:nextBase,amendments:afterPrinciples.map((p,i)=>add('amendment',`b/proposed-amendment-${i}.json`,p)),output:add('output','b/proposed-output.json',nextOutput)};
  targets.push({kind:'B',base,change:{kind:pending?'b-replace':'b-amendments',beforeSha256:textHash(old.markdown),afterSha256:textHash(nextOutput.markdown),baseline:next.baseline,amendments:next.amendments},proposedArtifact:add('artifact','b/proposed-artifact.json',next)});
 }
 const counterId=freshId(),counter=add('counterexample','claims/counterexample.json',{id:counterId,version:1,kind:'counterexample',statement:candidate.notes.counterexample,status:'unvalidated',scope:'Candidate-defined counterexample; this recorded scene is not claimed to instantiate it.',limits:'No empirical support is inferred from a statement.',refs:[caseRef,protocol]},counterId);
 const hypothesisId=freshId(),hypothesis=add('hypothesis','claims/hypothesis.json',{id:hypothesisId,version:1,kind:'hypothesis',statement:candidate.notes.expectedEffect,status:'unvalidated',scope:candidate.notes.rationale,limits:'Engineering hypothesis; no scientific or owner adoption.',refs:[counter,caseRef,protocol]},hypothesisId);
 const mechanismId=nextMode.mode==='h-wm-1'?HWM_MECHANISM_ID:freshId(),mechanism=add('mechanism','claims/mechanism.json',{id:mechanismId,version:1,kind:'mechanism',statement:nextMode.mode==='h-wm-1'?'H-WM-1: receiver deliberation capacity':'Baseline observation-only judgment',status:'unvalidated',scope:'Receiver comparison and selection; retained-evidence risk/orienting and existing predicates are outside the capacity constraint.',limits:'Not complete human working memory; no pass body implementation.',refs:[]},mechanismId);
 // The hypothesis references the immutable mechanism through a separate edge in its content.
 const hypFile=files.find(f=>f.path===hypothesis.path)!;const hyp=JSON.parse(hypFile.utf8);const principleRef=scope.targets.includes('B')?add('principle','claims/b-principle-system.json',principles[0].content,principles[0].id):undefined;hyp.refs.push(mechanism);if(principleRef)hyp.refs.push(principleRef);hypFile.utf8=canonicalWire(hyp);hypothesis.sha256=textHash(hypFile.utf8);const hypEntry=entries.find(e=>e.path===hypothesis.path)!;hypEntry.sha256=hypothesis.sha256;hypEntry.bytes=Buffer.byteLength(hypFile.utf8);
 const manifest:ProposalManifest={format:'rpm.proposal',formatVersion:1,proposalId:freshId(),revision:1,supersedes:null,title:Array.from(candidate.feedback).slice(0,200).join(''),claimRefs:[mechanism,hypothesis,...(principleRef?[principleRef]:[])],targets,scope:{included:['Captured synthetic observation and initial memory'],excluded:['Owner research session, real match data, external AI inference'],assumptions:['Sensor/retention/ranking are engineering assumptions'],limits:['Fixed-observation software comparison; no human validity or complete rugby simulation']},expected:{description:candidate.notes.expectedEffect,criteria:['Compare declared A/B changes under frozen permitted inputs; retain negative results.']},counterexamples:[{caseRef:counter,criterion:candidate.notes.counterexample}],protocolRefs:[protocol],caseRefs:[caseRef],runRefs:[],runAbsenceReason:'Reference preview is performed in the next explicit export step.',provenance:{author:scope.author,source:'Explicit synthetic candidate selected for sharing',method:'Local fixed-observation reference execution; no external API',seed:candidate.context.seed,synthetic:true,licenseScope:scope.rightsBasis},publicScope:{declaration:scope.confirmation,entries:[]},entries,payloadDigest:{format:'rpm-canonical-json-v1',sha256:'0'.repeat(64)}};
 const pkg:ProposalPackage={format:'rpm.proposal.transport',version:1,manifest,files};
 const seal=()=>{manifest.publicScope.entries=entries.map(e=>({path:e.path,permission:'author-authorized',rightsBasis:scope.rightsBasis}));manifest.payloadDigest=payloadDigest(manifest);};
 seal();const preview=reproduceProposal(validateProposal(canonicalWire(pkg),engine));const runRef=add('run','runs/reference-preview.json',preview,preview.id);manifest.runRefs=[runRef];manifest.runAbsenceReason=null;seal();validateProposal(canonicalWire(pkg),engine);return pkg;
}
