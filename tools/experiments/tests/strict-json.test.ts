import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {canonicalWire,parseStrict} from '../src/strict-json';
const vectors=JSON.parse(readFileSync(new URL('../../../evaluation/fixtures/canonical-json-v1-vectors.json',import.meta.url),'utf8'));
test('canonical JSON v1 raw-byte numeric, Unicode, duplicate-key and UTF-8 vectors',()=>{
 for(const v of vectors){const raw=Buffer.from(v.inputHex,'hex');if(v.accepted){const actual=canonicalWire(parseStrict(raw));assert.equal(actual,v.canonical,v.inputHex);assert.equal(createHash('sha256').update(actual).digest('hex'),v.sha256);}else assert.throws(()=>canonicalWire(parseStrict(raw)),Error,v.inputHex);}
 assert.notEqual(canonicalWire(parseStrict('"é"')),canonicalWire(parseStrict('"é"')));
 for(const value of [undefined,{a:undefined},NaN,Infinity,new Date(),Array(2)])assert.throws(()=>canonicalWire(value));
});
