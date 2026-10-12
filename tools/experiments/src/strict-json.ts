// rpm-canonical-json-v1. Raw duplicate keys must be detected before object construction loses them.
export const CANONICAL_FORMAT='rpm-canonical-json-v1' as const;
function scalars(s:string){for(let i=0;i<s.length;i++){const n=s.charCodeAt(i);if(n>=0xd800&&n<=0xdbff){const next=s.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))throw new Error('Lone Unicode surrogate');}else if(n>=0xdc00&&n<=0xdfff)throw new Error('Lone Unicode surrogate');}}
const compareKey=(a:string,b:string)=>{const x=Array.from(a),y=Array.from(b);for(let i=0;i<Math.min(x.length,y.length);i++){const n=x[i].codePointAt(0)!-y[i].codePointAt(0)!;if(n)return n;}return x.length-y.length;};
export function parseStrict(raw:string|Uint8Array):unknown {
 const text=typeof raw==='string'?raw:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);scalars(text);
 let at=0,nodes=0;const ws=()=>{while(/[\x20\x09\x0a\x0d]/.test(text[at]??'x'))at++;};
 function string():string{
  if(text[at]!== '"')throw new Error('Expected JSON string');const start=at++;
  while(at<text.length){const c=text[at++];if(c==='\\'){at++;continue;}if(c==='"'){const s=JSON.parse(text.slice(start,at)) as string;scalars(s);return s;}}
  throw new Error('Unterminated JSON string');
 }
 function value(depth:number):unknown{
  if(depth>64||++nodes>500000)throw new Error('JSON complexity limit');ws();const c=text[at];
  if(c==='"')return string();
  if(c==='{'){
   at++;ws();const out=Object.create(null) as Record<string,unknown>,keys=new Set<string>();if(text[at]==='}'){at++;return out;}
   for(;;){ws();const key=string();if(keys.has(key))throw new Error('Duplicate JSON key: '+key);keys.add(key);ws();if(text[at++]!==':')throw new Error('Expected colon');out[key]=value(depth+1);ws();const end=text[at++];if(end==='}')return out;if(end!==',')throw new Error('Expected comma or object end');}
  }
  if(c==='['){at++;ws();const out:unknown[]=[];if(text[at]===']'){at++;return out;}for(;;){out.push(value(depth+1));ws();const end=text[at++];if(end===']')return out;if(end!==',')throw new Error('Expected comma or array end');}}
  for(const [token,result] of [['true',true],['false',false],['null',null]] as const)if(text.startsWith(token,at)){at+=token.length;return result;}
  const number=text.slice(at).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);if(!number)throw new Error('Invalid JSON value');at+=number[0].length;const result=Number(number[0]);if(!Number.isFinite(result))throw new Error('Non-finite JSON number');return result;
 }
 const result=value(0);ws();if(at!==text.length)throw new Error('Trailing/invalid JSON bytes');return result;
}
export function canonicalWire(value:unknown):string{
 const seen=new Set<object>();
 function encode(v:unknown,depth:number):string{
  if(depth>64)throw new Error('JSON depth limit');if(v===null)return 'null';
  if(typeof v==='string'){scalars(v);return JSON.stringify(v);}if(typeof v==='number'){if(!Number.isFinite(v))throw new Error('Non-finite JSON number');return JSON.stringify(v);}if(typeof v==='boolean')return v?'true':'false';
  if(typeof v!=='object')throw new Error('Non-JSON value');if(seen.has(v))throw new Error('Cyclic JSON');seen.add(v);
  let result:string;
  if(Array.isArray(v)){if(Object.keys(v).length!==v.length)throw new Error('Sparse/non-JSON array');result='['+v.map(x=>encode(x,depth+1)).join(',')+']';}
  else {if(![Object.prototype,null].includes(Object.getPrototypeOf(v)))throw new Error('Non-JSON object');result='{'+Object.keys(v).sort(compareKey).map(k=>{scalars(k);return JSON.stringify(k)+':'+encode((v as Record<string,unknown>)[k],depth+1);}).join(',')+'}';}
  seen.delete(v);return result;
 }
 return encode(value,0);
}
