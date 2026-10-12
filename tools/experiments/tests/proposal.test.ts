import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {capture,candidateDraft} from '../../workbench/research';
import {defaultRulesA,finiteMode} from '../../../models/player/reference/src/index.js';
import {currentEngineDescriptor,readJudgmentBaseline} from '../../workbench/server/artifact-resolver';
import {buildProposal} from '../src/proposal-export';
import {validateProposal,reproduceProposal,wireHash,payloadDigest,type ProposalPackage} from '../src/proposal';
import {canonicalWire} from '../src/strict-json';
import {textHash} from '../src/judgment';
const engine=currentEngineDescriptor();
const executionSchemaHash=textHash(readFileSync(new URL('../../../models/player/spec/execution.schema.json',import.meta.url),'utf8'));
const sample=(contractSha256=executionSchemaHash)=>{const c=candidateDraft('local-private-candidate','Synthetic proposal',capture('support',42,defaultRulesA(),'B0'));c.executionMode=finiteMode(1);c.patchA={passBias:1};c.notes={rationale:'Synthetic software exercise',expectedEffect:'Receiver selection may differ',counterexample:'Excluded threat must retain risk'};c.principle={id:'uncertainty',condition:'Stale observation',criterion:'Check freshness',priority:10,exceptions:'Urgent pressure',unknown:'Retain uncertainty',evidence:'Synthetic engineering hypothesis'};return buildProposal(c,{version:'B0',principles:[]},readJudgmentBaseline(),engine,contractSha256,{confirmation:'explicitly-authorized-synthetic-entries-only',author:'Synthetic test',rightsBasis:'Owner-authorized authored synthetic software fixture under MIT',targets:['A','B']});};
const seal=(p:ProposalPackage)=>{p.manifest.payloadDigest=payloadDigest(p.manifest);return canonicalWire(p);};
test('strict proposal closure reproduces fresh run identity with equal semantic digest and no world in A input',()=>{
 const pkg=sample(),v=validateProposal(canonicalWire(pkg),engine),run=reproduceProposal(v),old=v.read<any>(pkg.manifest.runRefs[0]);
 assert.equal(v.readiness,'ready');assert.notEqual(run.id,old.id);assert.equal(run.resultDigest.sha256,old.resultDigest.sha256);assert.equal(canonicalWire(run.reproduces),canonicalWire(pkg.manifest.runRefs[0]));
 assert.equal(engine.sourceFiles.find(f=>f.path==='models/player/spec/execution.schema.json')!.sha256,executionSchemaHash);
 assert(!JSON.stringify(run.semantic).includes('entities'));assert(!canonicalWire(pkg.manifest).includes('local-private-candidate'));
 const metadata={...run,id:'different-management-id',createdAt:'later',environment:{node:'another',platform:'test',arch:'test'}};assert.equal(wireHash(metadata.semantic),run.resultDigest.sha256);
 const changed=structuredClone(run.semantic);changed.cases[0].after.trace.intention.score+=.01;assert.notEqual(wireHash(changed),run.resultDigest.sha256);
 const evidence=structuredClone(run.semantic);evidence.cases[0].after.trace.sensation.time+=.2;assert.notEqual(wireHash(evidence),run.resultDigest.sha256);
 const b=structuredClone(run.semantic);b.B!.after.outputSha256='0'.repeat(64);assert.notEqual(wireHash(b),run.resultDigest.sha256);
});
test('proposal rejects unknown/version/path/link/executable/hash/closure/scope and raw duplicate-key inputs',()=>{
 const base=sample();const mutate=(fn:(p:any)=>void)=>{const p=structuredClone(base);fn(p);assert.throws(()=>validateProposal(seal(p),engine),/invalid-package/);};
 mutate(p=>p.manifest.activeA=['A2']);mutate(p=>p.manifest.formatVersion=2);mutate(p=>p.files[0].symlink='other');mutate(p=>p.manifest.targets[0].base.command='sh');
 for(const path of ['/tmp/x.json','../x.json','C:\\x.json','a//x.json','a/./x.json','script.js'])mutate(p=>{p.files[0].path=path;p.manifest.entries[0].path=path;});
 mutate(p=>p.files[0].utf8+='x');mutate(p=>p.files.pop());mutate(p=>p.manifest.entries.pop());mutate(p=>p.manifest.publicScope.entries.pop());mutate(p=>p.manifest.targets[0].base.profile.path='missing.json');
 const raw=canonicalWire(base).replace('"format":"rpm.proposal.transport"','"format":"rpm.proposal.transport","\\u0066ormat":"rpm.proposal.transport"');assert.throws(()=>validateProposal(raw,engine),/Duplicate JSON key/);
});
test('B-only proposal needs no A experiment or executable engine, and stays independently reproducible',()=>{
 const pkg=sample(); // Remove A-specific target/entries; retain observation case, claims and B only.
 pkg.manifest.targets=pkg.manifest.targets.filter(t=>t.kind==='B');pkg.manifest.runRefs=[];pkg.manifest.runAbsenceReason='No A required';
 pkg.files=pkg.files.filter(f=>!f.path.startsWith('a/')&&!f.path.startsWith('runs/'));pkg.manifest.entries=pkg.manifest.entries.filter(e=>!e.path.startsWith('a/')&&!e.path.startsWith('runs/'));pkg.manifest.publicScope.entries=pkg.manifest.publicScope.entries.filter(e=>!e.path.startsWith('a/')&&!e.path.startsWith('runs/'));
 const v=validateProposal(seal(pkg),engine),r=reproduceProposal(v);assert.equal(r.semantic.cases.length,0);assert(r.semantic.B);
});
function withoutRuns(p:ProposalPackage){p.manifest.runRefs=[];p.manifest.runAbsenceReason='Synthetic validation fixture has no claimed execution';p.files=p.files.filter(f=>!f.path.startsWith('runs/'));p.manifest.entries=p.manifest.entries.filter(e=>!e.path.startsWith('runs/'));p.manifest.publicScope.entries=p.manifest.publicScope.entries.filter(e=>!e.path.startsWith('runs/'));return p;}
function resealClosure(p:ProposalPackage){
 const update=(value:any):void=>{if(!value||typeof value!=='object')return;if(value.hashFormat&&value.path){const file=p.files.find(f=>f.path===value.path);if(file)value.sha256=textHash(file.utf8);return;}for(const v of Object.values(value))update(v);};
 for(let pass=0;pass<5;pass++){for(const f of p.files)if(f.path.endsWith('.json')){const value=JSON.parse(f.utf8);update(value);f.utf8=canonicalWire(value);}for(const e of p.manifest.entries){const f=p.files.find(f=>f.path===e.path)!;e.sha256=textHash(f.utf8);e.bytes=Buffer.byteLength(f.utf8);}update(p.manifest);}
 return seal(p);
}
function rewriteEngine(p:ProposalPackage,mutate:(value:typeof engine)=>void){const file=p.files.find(f=>f.path==='a/engine.json')!,descriptor=JSON.parse(file.utf8);mutate(descriptor);descriptor.sha256=textHash(JSON.stringify({format:descriptor.fingerprintFormat,files:descriptor.sourceFiles.map((f:any)=>[f.path,f.sha256])}));file.utf8=canonicalWire(descriptor);}
function unavailablePackage(){const p=withoutRuns(sample());rewriteEngine(p,descriptor=>{descriptor.sourceFiles[0].sha256='f'.repeat(64);});return resealClosure(p);}
test('A contract descriptor must bind to the exact engine schema before readiness or reproduction',()=>{
 const mismatch=/invalid-package: unsupported-contract/;
 assert.throws(()=>sample('a'.repeat(64)),mismatch,'export cannot preview an arbitrary 64-character schema hash');
 // All transport, reference and engine digests remain valid; reject the semantic binding itself.
 const wrong=withoutRuns(sample()),file=wrong.files.find(f=>f.path==='a/contract.json')!,contract=JSON.parse(file.utf8);contract.schemaSha256='a'.repeat(64);file.utf8=canonicalWire(contract);
 assert.throws(()=>validateProposal(resealClosure(wrong),engine),mismatch);
 const missing=withoutRuns(sample());rewriteEngine(missing,descriptor=>{descriptor.sourceFiles=descriptor.sourceFiles.filter(f=>f.path!=='models/player/spec/execution.schema.json');});
 assert.throws(()=>validateProposal(resealClosure(missing),engine),mismatch,'inert engine references also require the declared contract source');
 const changed=withoutRuns(sample());rewriteEngine(changed,descriptor=>{descriptor.sourceFiles.find(f=>f.path==='models/player/spec/execution.schema.json')!.sha256='b'.repeat(64);});
 assert.throws(()=>validateProposal(resealClosure(changed),engine),mismatch,'unavailable engine cannot retain a mismatched contract');
});
test('known complete engine reference without its binary is valid/inert and blocks A execution; B remains independent',()=>{
 const raw=unavailablePackage(),v=validateProposal(raw,engine);assert.equal(v.readiness,'engine-unavailable');assert.throws(()=>reproduceProposal(v),/engine-unavailable/);assert.throws(()=>reproduceProposal(v,['A']),/engine-unavailable/);
 const b=reproduceProposal(v,['B']);assert.deepEqual(b.executedTargets,['B']);assert.equal(b.semantic.cases.length,0);assert(b.semantic.B);
});
