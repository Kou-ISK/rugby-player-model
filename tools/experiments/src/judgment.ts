import { randomUUID,createHash } from 'node:crypto';
import type { Principle,RulesB } from './contracts';
import { validate } from './validation';
export type Baseline={id:string;version:number;sha256:string;text:string};
export type BReplacement={baseline:Baseline;principles:Principle[]};
export const textHash=(text:string)=>createHash('sha256').update(text).digest('hex');
export function replacementB(input:unknown,previous?:BReplacement):BReplacement {
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='principles,text')throw new Error('B replacement requires only text and principles');
 const {text,principles}=input as {text:string;principles:Principle[]};
 if(typeof text!=='string'||!text.trim()||Buffer.byteLength(text)>256*1024)throw new Error('B text requires 1–262144 UTF-8 bytes');
 if(!Array.isArray(principles)||principles.length>128)throw new Error('B replacement must explicitly list 0–128 ordered amendments');
 for(const p of principles){validate('Principle',p);if(Object.values(p).some(v=>typeof v==='string'&&v.includes('TODO:')))throw new Error('Complete B replacement amendments');}
 if(new Set(principles.map(p=>p.id)).size!==principles.length)throw new Error('Duplicate B amendment id');
 const sha256=textHash(text),baseline=previous?.baseline.sha256===sha256?previous.baseline:{id:'urn:uuid:'+randomUUID(),version:1 as const,sha256,text};
 return {baseline:structuredClone(baseline),principles:structuredClone(principles)};
}
export function judgmentMarkdown(B:RulesB,frozenBaseline:string,proposed=false){
 const base=B.baseline?.text??frozenBaseline;
 if(B.baseline&&textHash(base)!==B.baseline.sha256)throw new Error('B baseline hash mismatch');
 const heading=proposed?'Proposed amendments — NOT approved':'Amendments';
 return base+`\n\n## ${heading}\n`+B.principles.map(p=>`\n### ${p.id}\n- Condition: ${p.condition}\n- Criterion: ${p.criterion}\n- Priority: ${p.priority}\n- Exceptions: ${p.exceptions}\n- Unknown: ${p.unknown}\n- Evidence: ${p.evidence}\n`).join('');
}
