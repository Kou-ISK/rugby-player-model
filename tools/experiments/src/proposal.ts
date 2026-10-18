import Ajv from 'ajv';
import {createHash,randomUUID} from 'node:crypto';
import schema from '../schema/proposal.schema.json';
import {canonicalWire,parseStrict,CANONICAL_FORMAT} from './strict-json';
import {execute,validate as validateA,validateEvidence,type RulesA,type Profile} from '../../../models/player/reference/src/index.js';
import {validate} from './validation';
import {judgmentMarkdown,textHash} from './judgment';
import type {Principle} from './contracts';
import type {ATarget,AArtifact,BArtifact,BOutput,Config,ContentRef,ContractDescriptor,EngineDescriptor,ProposalCase,ProposalManifest,ProposalPackage,ProposalRun,SemanticResult} from './proposal-types';
export * from './proposal-types';
export const MAX_PAYLOAD=16*1024*1024,MAX_TRANSPORT=100*1024*1024;
const ajv=new Ajv({allErrors:true,strict:false});ajv.addSchema(schema);
export function checkProposalData(kind:keyof typeof schema.$defs,data:unknown){const check=ajv.getSchema(schema.$id+'#/$defs/'+kind)!;if(!check(data))throw new Error('invalid-package: '+kind+' '+ajv.errorsText(check.errors));}
export const wireHash=(value:unknown)=>textHash(canonicalWire(value));
export const freshId=()=> 'urn:uuid:'+randomUUID();
export function safePath(path:string){if(!/^[A-Za-z0-9_./-]+$/.test(path)||path.length>240||path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..'))throw new Error('invalid-package: unsafe relative POSIX path');}
export function payloadDigest(manifest:Omit<ProposalManifest,'payloadDigest'>|ProposalManifest){const {payloadDigest:_,...body}=manifest as ProposalManifest;return {format:CANONICAL_FORMAT,sha256:wireHash(body)};}
export type ValidatedProposal={package:ProposalPackage;manifestSha256:string;readiness:'ready'|'engine-unavailable';data:Map<string,unknown>;read:<T>(ref:ContentRef,kind?:ContentRef['kind'])=>T};
export function validateProposal(raw:string|Uint8Array,currentEngine:EngineDescriptor):ValidatedProposal {
 try{
  if((typeof raw==='string'?Buffer.byteLength(raw):raw.byteLength)>MAX_TRANSPORT)throw new Error('Transport exceeds bound');
  const pkg=parseStrict(raw) as ProposalPackage;checkProposalData('Transport',pkg);const m=pkg.manifest;
  if(Buffer.byteLength(canonicalWire(m))>1024*1024)throw new Error('Manifest exceeds 1 MiB');
  if(new Set(m.targets.map(t=>t.kind)).size!==m.targets.length)throw new Error('Duplicate target');
  if(!m.claimRefs.some(r=>r.kind==='hypothesis'))throw new Error('At least one hypothesis reference is required');
  if((m.runRefs.length>0)!==(m.runAbsenceReason===null))throw new Error('Run absence must be explained, performed runs must be separate');
  if(canonicalWire(payloadDigest(m))!==canonicalWire(m.payloadDigest))throw new Error('Payload digest mismatch');
  const files=new Map<string,string>(),folded=new Set<string>();let total=0;
  for(const file of pkg.files){safePath(file.path);if(!/\.(json|txt|md)$/.test(file.path))throw new Error('Executable/unsupported entry');if(folded.has(file.path.toLowerCase()))throw new Error('Duplicate/case-colliding entry');folded.add(file.path.toLowerCase());total+=Buffer.byteLength(file.utf8);if(total>MAX_PAYLOAD)throw new Error('Payload exceeds 16 MiB');files.set(file.path,file.utf8);}
  const entries=new Map(m.entries.map(e=>[e.path,e]));if(entries.size!==m.entries.length||entries.size!==files.size)throw new Error('Duplicate or unlisted entry');
  const scope=new Map(m.publicScope.entries.map(e=>[e.path,e]));if(scope.size!==m.publicScope.entries.length||scope.size!==entries.size)throw new Error('Public scope differs from entries');
  const data=new Map<string,unknown>();
  for(const e of m.entries){safePath(e.path);const text=files.get(e.path);if(text===undefined||!scope.has(e.path)||Buffer.byteLength(text)!==e.bytes||textHash(text)!==e.sha256)throw new Error('Entry bytes/hash/scope mismatch: '+e.path);
   if(e.mediaType==='application/json'&&!e.path.endsWith('.json')||e.mediaType==='text/markdown'&&!e.path.endsWith('.md')||e.mediaType==='text/plain'&&!e.path.endsWith('.txt'))throw new Error('Media type/path mismatch');
   if((e.role==='evaluator-world')!==(e.visibility==='evaluator-only'))throw new Error('World must be evaluator-only');
   data.set(e.path,e.mediaType==='application/json'?parseStrict(text):text);
  }
  const identities=new Map<string,string>(),used=new Set<string>();let ready=true;
  const read=<T>(ref:ContentRef,kind?:ContentRef['kind']):T=>{
   checkProposalData('Ref',ref);if(kind&&ref.kind!==kind)throw new Error('Reference kind mismatch');const identity=ref.kind+':'+ref.id+':'+ref.version,prior=identities.get(identity);if(prior&&prior!==ref.sha256)throw new Error('Duplicate reference version with different content');identities.set(identity,ref.sha256);
   if(ref.path===null){if(ref.kind!=='engine'||ref.sha256!==wireHash(currentEngine)||ref.hashFormat!==CANONICAL_FORMAT)throw new Error('Missing reference closure');return currentEngine as T;}
   const e=entries.get(ref.path),v=data.get(ref.path);if(!e||v===undefined||e.role!==ref.kind||e.visibility!=='public')throw new Error('Missing/wrong-role reference: '+ref.path);
   const sha=ref.hashFormat===CANONICAL_FORMAT?wireHash(v):e.sha256;if(sha!==ref.sha256)throw new Error('Reference hash mismatch');if(['case','protocol','mechanism','principle','hypothesis','counterexample','review','run'].includes(ref.kind)){const content=v as {id:string;version:number};if(content.id!==ref.id||content.version!==ref.version)throw new Error('Content identity/revision mismatch');}used.add(ref.path);return v as T;
  };
  function refs(value:unknown){if(!value||typeof value!=='object')return;if(Array.isArray(value)){for(const v of value)refs(v);return;}const x=value as Record<string,unknown>;if('hashFormat'in x&&'sha256'in x&&'path'in x){read(x as ContentRef);return;}for(const v of Object.values(x))refs(v);}
  refs(m);
  for(const e of m.entries){const value=data.get(e.path);if(e.role==='evaluator-world'){validate('World',value);continue;}
   const kind:Partial<Record<typeof e.role,keyof typeof schema.$defs>>={engine:'Engine',artifact:(value as AArtifact).kind==='A'?'AArtifact':'BArtifact',contract:'Contract',config:'Config',profile:'Profile',rules:'RulesA',case:'Case',protocol:'Protocol',run:'Run',mechanism:'Claim',principle:'Claim',hypothesis:'Claim',counterexample:'Claim',review:'Claim',output:'BOutput'};
   if(e.role==='baseline'){if(typeof value!=='string'||!value.trim())throw new Error('Invalid B baseline');}
   else if(e.role==='amendment')validate('Principle',value);
   else if(kind[e.role])checkProposalData(kind[e.role]!,value);else throw new Error('Unsupported data role');
   if(['mechanism','principle','hypothesis','counterexample','review'].includes(e.role)&&(value as {kind:string}).kind!==e.role)throw new Error('Claim role mismatch');
   refs(value);
   if(e.role==='engine'){
    const engine=value as EngineDescriptor;const paths=engine.sourceFiles.map(f=>f.path);for(const path of paths)safePath(path);
    if(new Set(paths).size!==paths.length||JSON.stringify(paths)!==JSON.stringify([...paths].sort()))throw new Error('Engine source list is not uniquely sorted');
    const digest=createHash('sha256').update(JSON.stringify({format:engine.fingerprintFormat,files:engine.sourceFiles.map(f=>[f.path,f.sha256])})).digest('hex');if(digest!==engine.sha256)throw new Error('Engine source manifest hash mismatch');
    if(engine.sha256!==currentEngine.sha256)ready=false;
   }
  }
  const targets=m.targets;
  for(const target of targets){
   if(target.kind==='A'){
    const base=read<AArtifact>(target.base.artifact,'artifact'),proposed=read<AArtifact>(target.proposedArtifact,'artifact');
    for(const key of ['contract','engine','config','profile','rules'] as const)if(canonicalWire(base[key])!==canonicalWire(target.base[key]))throw new Error('A base closure mismatch');
    // Bind each arm's contract to its exact engine, including inert code-review proposals.
    // A locally available engine has the same validated source manifest as currentEngine.
    // An unavailable engine may import inertly, but its own schema binding must still be complete.
    for(const artifact of [base,proposed]){
     const contract=read<ContractDescriptor>(artifact.contract,'contract'),engine=read<EngineDescriptor>(artifact.engine,'engine');
     const executionSchema=engine.sourceFiles.find(file=>file.path==='models/player/spec/execution.schema.json');
     if(!executionSchema||contract.version!==engine.executionContractVersion||contract.schemaSha256!==executionSchema.sha256)throw new Error('unsupported-contract: A contract descriptor does not match the referenced engine execution schema');
    }
    const config=read<Config>(base.config,'config'),rules=read<RulesA>(base.rules,'rules'),afterConfig=read<Config>(proposed.config,'config'),afterRules=read<RulesA>(proposed.rules,'rules');
    if(wireHash({config,rules})!==target.change.beforeSha256||wireHash({config:afterConfig,rules:afterRules})!==target.change.afterSha256)throw new Error('A before/after hash mismatch');
    if(target.change.kind==='code-review-ref'){const u=new URL(target.change.reviewUrl);if(u.protocol!=='https:'||u.username||u.password)throw new Error('Invalid review URL');if(target.change.engineSha256!==read<EngineDescriptor>(proposed.engine,'engine').sha256)throw new Error('Code review engine reference mismatch');ready=false;}
    else {validateA('PatchA',target.change.patch);validateA('RulesA',afterRules);if(canonicalWire(afterRules)!==canonicalWire({...rules,...target.change.patch,version:afterRules.version})||canonicalWire(afterConfig.executionMode)!==canonicalWire(target.change.executionMode))throw new Error('A declared change differs from proposed artifact');for(const key of ['contract','engine','profile'] as const)if(canonicalWire(base[key])!==canonicalWire(proposed[key]))throw new Error('Configuration change cannot alter '+key);}
   }else{
    const proposed=read<BArtifact>(target.proposedArtifact,'artifact');if(canonicalWire(proposed.baseline)!==canonicalWire(target.change.baseline)||canonicalWire(proposed.amendments)!==canonicalWire(target.change.amendments))throw new Error('B declared change differs from artifact');
    if(target.change.kind==='b-amendments'&&canonicalWire(target.base.baseline)!==canonicalWire(proposed.baseline))throw new Error('Amendment cannot replace baseline');
    for(const [artifact,expected] of [[target.base,target.change.beforeSha256],[proposed,target.change.afterSha256]] as const){const baseline=read<string>(artifact.baseline,'baseline'),amendments=artifact.amendments.map(r=>read<Principle>(r,'amendment')),out=read<BOutput>(artifact.output,'output');
     if(new Set(amendments.map(p=>p.id)).size!==amendments.length)throw new Error('Duplicate B amendment');
     const rendered=judgmentMarkdown({version:out.localVersion,principles:amendments,outputFormat:2},baseline,out.proposed);
     if(rendered!==out.markdown||textHash(out.markdown)!==expected)throw new Error('B ordered output hash mismatch');
    }
   }
  }
  for(const ref of m.claimRefs){if(!['mechanism','principle','hypothesis'].includes(ref.kind))throw new Error('Invalid claim kind');const c=read<{id:string;version:number}>(ref);if(c.id!==ref.id||c.version!==ref.version)throw new Error('Claim identity mismatch');}
  for(const ref of m.protocolRefs){const p=read<{id:string;version:number}>(ref,'protocol');if(p.id!==ref.id||p.version!==ref.version)throw new Error('Protocol identity mismatch');}
  for(const c of m.counterexamples){if(!['case','counterexample'].includes(c.caseRef.kind))throw new Error('Invalid counterexample kind');}
  const a=targets.find(t=>t.kind==='A') as ATarget|undefined;if(a&&!m.caseRefs.length)throw new Error('A requires at least one observation case');
  for(const ref of m.caseRefs){const c=read<ProposalCase>(ref,'case');if(c.id!==ref.id||c.version!==ref.version)throw new Error('Case identity mismatch');validateEvidence(c.input.bundle,c.input.memory);if(c.evaluatorOnly){const entry=entries.get(c.evaluatorOnly);if(!entry||entry.role!=='evaluator-world')throw new Error('Missing evaluator-only world');used.add(c.evaluatorOnly);}
   if(a){if(canonicalWire(c.input.profile)!==canonicalWire(read(a.base.profile))||canonicalWire(c.input.rules)!==canonicalWire(read(a.base.rules))||canonicalWire(c.input.executionMode)!==canonicalWire(read<Config>(a.base.config).executionMode))throw new Error('Case base/profile/config mismatch');}
  }
  const validated:ValidatedProposal={package:pkg,manifestSha256:wireHash(m),readiness:ready?'ready':'engine-unavailable',data,read};
  for(const ref of m.runRefs){const run=read<ProposalRun>(ref,'run');if(run.id!==ref.id||run.version!==ref.version||run.inputDigest!==proposalInputDigest(validated,run.executedTargets)||run.resultDigest.sha256!==wireHash(run.semantic))throw new Error('Recorded run identity/input/result mismatch');
   if(run.executedTargets.includes('A')){
    if(!a||run.semantic.cases.length!==m.caseRefs.length)throw new Error('Run case coverage mismatch');const proposed=read<AArtifact>(a.proposedArtifact);
    for(const [index,c] of run.semantic.cases.entries()){const input=read<ProposalCase>(m.caseRefs[index]);if(c.caseId!==input.id)throw new Error('Run case identity mismatch');
     for(const [arm,mode,rules] of [[c.before,input.input.executionMode,input.input.rules],[c.after,read<Config>(proposed.config).executionMode,read<RulesA>(proposed.rules)]] as const){if(canonicalWire(arm.trace.sensation)!==canonicalWire(input.input.bundle)||canonicalWire(arm.nextMemory)!==canonicalWire(arm.trace.longTermMemory)||canonicalWire(arm.executionMode)!==canonicalWire(mode)||arm.trace.rulesVersion!==rules.version)throw new Error('Run permitted input/config mismatch');
      if(arm.traceVersion!==4||arm.trace.traceVersion!==4||arm.trace.modelRevision!=='cognition-0.4.0'||(mode.mode==='baseline'?arm.trace.deliberation!==undefined:canonicalWire(arm.trace.deliberation?.executionMode)!==canonicalWire(mode)))throw new Error('Run trace contract/mode mismatch');
      if(!!input.input.bundle.context!==!!arm.trace.situation||!!input.input.bundle.self.motor!==!!arm.trace.loop)throw new Error('Run trace capabilities mismatch');
      if(arm.trace.loop&&(canonicalWire(arm.trace.loop.ability)!==canonicalWire(input.input.profile.ability)||canonicalWire(arm.trace.loop.configuration)!==canonicalWire(rules)))throw new Error('Run loop contract/config mismatch');
     }
    }
   }else if(run.semantic.cases.length)throw new Error('Undeclared A results');
   const bt=targets.find(t=>t.kind==='B');if(run.executedTargets.includes('B')){if(!bt||!run.semantic.B)throw new Error('Missing B result');const next=read<BArtifact>(bt.proposedArtifact);for(const [result,artifact] of [[run.semantic.B.before,bt.base],[run.semantic.B.after,next]] as const)if(canonicalWire(result.baseline)!==canonicalWire(artifact.baseline)||canonicalWire(result.amendments)!==canonicalWire(artifact.amendments)||result.outputSha256!==textHash(read<BOutput>(artifact.output).markdown))throw new Error('B result/order mismatch');}else if(run.semantic.B!==null)throw new Error('Undeclared B result');
  }
  if(used.size!==entries.size)throw new Error('Unreferenced/unresolved entry');return validated;
 }catch(error){throw new Error('invalid-package: '+(error instanceof Error?error.message:String(error)));}
}
export function proposalInputDigest(v:ValidatedProposal,targets:('A'|'B')[]=v.package.manifest.targets.map(t=>t.kind)){const m=v.package.manifest;if(targets.some(k=>!m.targets.some(t=>t.kind===k)))throw new Error('Run target not in proposal');return wireHash({targets:m.targets.filter(t=>targets.includes(t.kind)),caseRefs:m.caseRefs,protocolRefs:m.protocolRefs});}
export function selectSemantic(semantic:SemanticResult,targets:('A'|'B')[]):SemanticResult{return {format:semantic.format,cases:targets.includes('A')?semantic.cases:[],B:targets.includes('B')?semantic.B:null};}
export function renderBArtifact(v:ValidatedProposal,artifact:Pick<BArtifact,'baseline'|'amendments'|'output'>){const baseline=v.read<string>(artifact.baseline,'baseline'),principles=artifact.amendments.map(r=>v.read<Principle>(r,'amendment')),metadata=v.read<BOutput>(artifact.output,'output');return judgmentMarkdown({version:metadata.localVersion,principles,outputFormat:2},baseline,metadata.proposed);}
export function proposalReviewMaterial(v:ValidatedProposal,targets:('A'|'B')[]){const a=v.package.manifest.targets.find(t=>t.kind==='A'),b=v.package.manifest.targets.find(t=>t.kind==='B');const afterA=a?v.read<AArtifact>(a.proposedArtifact):undefined,afterB=b?v.read<BArtifact>(b.proposedArtifact):undefined;return {status:'proposed-not-approved',A:targets.includes('A')&&a&&afterA?{before:{rules:v.read(a.base.rules),config:v.read(a.base.config)},after:{rules:v.read(afterA.rules),config:v.read(afterA.config)}}:null,B:targets.includes('B')&&b&&afterB?{before:renderBArtifact(v,b.base),after:renderBArtifact(v,afterB),beforeAmendmentOrder:b.base.amendments,afterAmendmentOrder:afterB.amendments}:null};}
export function reproduceProposal(v:ValidatedProposal,targets:('A'|'B')[]=v.package.manifest.targets.map(t=>t.kind)):ProposalRun{
 if(!targets.length||new Set(targets).size!==targets.length||targets.some(k=>!v.package.manifest.targets.some(t=>t.kind===k)))throw new Error('Select proposal A/B target');
 if(targets.includes('A')&&v.readiness!=='ready')throw new Error('engine-unavailable: exact reference is known; install the reviewed engine before preview/reproduction');
 const m=v.package.manifest,a=targets.includes('A')?m.targets.find(t=>t.kind==='A'):undefined as ATarget|undefined,b=targets.includes('B')?m.targets.find(t=>t.kind==='B'):undefined;
 if(a?.change.kind==='code-review-ref')throw new Error('engine-unavailable: code-review reference is inert');
 const semantic:SemanticResult={format:'rpm-semantic-result-v1',cases:[],B:null};
 if(a){const after=v.read<AArtifact>(a.proposedArtifact);for(const ref of m.caseRefs){const c=v.read<ProposalCase>(ref);semantic.cases.push({caseId:c.id,before:execute(c.input),after:execute({...c.input,rules:v.read<RulesA>(after.rules),executionMode:v.read<Config>(after.config).executionMode})});}}
 if(b){const after=v.read<BArtifact>(b.proposedArtifact);semantic.B={before:{baseline:b.base.baseline,amendments:b.base.amendments,outputSha256:textHash(renderBArtifact(v,b.base))},after:{baseline:after.baseline,amendments:after.amendments,outputSha256:textHash(renderBArtifact(v,after))}};}
 const run:ProposalRun={executedTargets:targets,format:'rpm.proposal-run',version:1,id:freshId(),createdAt:new Date().toISOString(),environment:{node:process.version,platform:process.platform,arch:process.arch},reproduces:[...m.runRefs].reverse().find(ref=>targets.every(target=>v.read<ProposalRun>(ref).executedTargets.includes(target)))??null,inputDigest:proposalInputDigest(v,targets),semantic,resultDigest:{format:'rpm-semantic-result-v1',sha256:wireHash(semantic)}};checkProposalData('Run',run);return run;
}
