import {createHash} from 'node:crypto';
import type {Bundle,Memory,Profile} from '../../../models/player/reference/src/contracts.js';
import {validate,validateEvidence} from '../../../models/player/reference/src/validation.js';
import {canonicalWire} from './strict-json';

export type StandaloneBArm='none'|'old'|'new';
export type BTextReference={id:string;version:number;sha256:string;hashFormat:'sha256-bytes'};
export type BDocument={ref:BTextReference;text:string};
export type BSelection={arm:StandaloneBArm;bVersion?:string;document?:BDocument};
export type BObservationCase={id:string;bundle:Bundle;memory:Memory;profile:Profile};
export type StandaloneBPacket={format:'rpm.b-standalone-packet';version:2;arm:StandaloneBArm;bVersion:string|null;documentRef:BTextReference|null;modelInput:{instructions:string;cases:BObservationCase[];principles?:string};inputHashFormat:'rpm-canonical-json-v1';inputSha256:string};
export type BAssessment={principleConformance:{result:'pass'|'fail'|'insufficient-evidence';reason:string};rugbyValidity:{result:'pass'|'fail'|'insufficient-evidence';reason:string}};
const instructions='Judge only the supplied observations and memory. Retain uncertainty. Use principles only if included. No world, scoring criteria or A output is supplied.';
const bytesHash=(text:string)=>createHash('sha256').update(text).digest('hex');
export const standaloneInputHash=(value:unknown)=>bytesHash(canonicalWire(value));
function shape(value:unknown,required:string[],optional:string[]=[]):asserts value is Record<string,any>{
 if(!value||typeof value!=='object'||Array.isArray(value)||required.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>!required.includes(k)&&!optional.includes(k)))throw new Error('Invalid standalone B fields');
}
function text(value:unknown,max=4000){if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('Nonempty bounded standalone B text required');}
function validateDocument(document:unknown):asserts document is BDocument{
 shape(document,['ref','text']);shape(document.ref,['id','version','sha256','hashFormat']);text(document.ref.id,200);
 if(!Number.isSafeInteger(document.ref.version)||document.ref.version<1||document.ref.hashFormat!=='sha256-bytes'||typeof document.ref.sha256!=='string'||!/^[0-9a-f]{64}$/.test(document.ref.sha256))throw new Error('Invalid fixed B document reference');
 text(document.text,256*1024);if(Buffer.byteLength(document.text)>256*1024||bytesHash(document.text)!==document.ref.sha256)throw new Error('Fixed B document content hash mismatch');
}
export function fixedBDocument(text:string):BDocument{const sha256=bytesHash(text),document={ref:{id:'urn:sha256:'+sha256,version:1,sha256,hashFormat:'sha256-bytes' as const},text};validateDocument(document);return document;}
export function validateBSelection(selection:unknown):asserts selection is BSelection{
 shape(selection,['arm'],['bVersion','document']);if(!['none','old','new'].includes(selection.arm))throw new Error('Choose standalone B arm none, old or new');
 if(selection.arm==='none'){if('bVersion'in selection||'document'in selection)throw new Error('The none arm must omit B text and reference');}
 else {if(('bVersion'in selection)===('document'in selection))throw new Error('Choose exactly one fixed B version or document');if('bVersion'in selection)text(selection.bVersion,200);else validateDocument(selection.document);}
}
function validateCases(cases:unknown):asserts cases is BObservationCase[]{
 if(!Array.isArray(cases)||!cases.length||cases.length>32)throw new Error('Provide 1–32 observation-only B cases');
 for(const c of cases){shape(c,['id','bundle','memory','profile']);text(c.id,200);validateEvidence(c.bundle,c.memory);validate('Profile',c.profile);}
 if(new Set(cases.map(c=>c.id)).size!==cases.length)throw new Error('Duplicate B case ID');
}
export function makeStandaloneBPacket(cases:unknown,arm:StandaloneBArm,document:BDocument|null,bVersion:string|null):StandaloneBPacket{
 validateCases(cases);const modelInput={instructions,cases:structuredClone(cases).map((c,i)=>({...c,id:`case-${i+1}`})),...(document?{principles:document.text}:{})};
 const packet:StandaloneBPacket={format:'rpm.b-standalone-packet',version:2,arm,bVersion,documentRef:document?structuredClone(document.ref):null,modelInput,inputHashFormat:'rpm-canonical-json-v1',inputSha256:standaloneInputHash(modelInput)};
 validateStandaloneBPacket(packet);return packet;
}
export function validateStandaloneBPacket(packet:unknown):asserts packet is StandaloneBPacket{
 shape(packet,['format','version','arm','bVersion','documentRef','modelInput','inputHashFormat','inputSha256']);
 if(packet.format!=='rpm.b-standalone-packet'||packet.version!==2||!['none','old','new'].includes(packet.arm)||packet.inputHashFormat!=='rpm-canonical-json-v1')throw new Error('Unsupported standalone B packet');
 shape(packet.modelInput,['instructions','cases'],['principles']);if(packet.modelInput.instructions!==instructions)throw new Error('Unsupported B subject instructions');validateCases(packet.modelInput.cases);
 if(packet.modelInput.cases.some((c:BObservationCase,i:number)=>c.id!==`case-${i+1}`))throw new Error('B subject case IDs must be anonymous');
 if(packet.arm==='none'){if(packet.documentRef!==null||packet.bVersion!==null||'principles'in packet.modelInput)throw new Error('The none arm must omit B text and reference');}
 else {validateDocument({ref:packet.documentRef,text:packet.modelInput.principles});if(packet.bVersion!==null)text(packet.bVersion,200);}
 if(packet.inputSha256!==standaloneInputHash(packet.modelInput))throw new Error('Actual B model input hash mismatch');
}
export function validateBAssessment(assessment:unknown):asserts assessment is BAssessment{
 shape(assessment,['principleConformance','rugbyValidity']);for(const item of [assessment.principleConformance,assessment.rugbyValidity]){shape(item,['result','reason']);if(!['pass','fail','insufficient-evidence'].includes(item.result))throw new Error('Choose pass, fail or insufficient-evidence for each B assessment');text(item.reason);}
}
