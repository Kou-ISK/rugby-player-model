import {test} from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import player from '../spec/contracts.schema.json';
import execution from '../spec/execution.schema.json';
import example from '../examples/observations-v2.json';
import {execute} from '../reference/src/execution.js';
test('published execution v2 schema accepts the A-only example and rejects hidden/unknown fields consistently',()=>{
 const ajv=new Ajv({allErrors:true,strict:false});ajv.addSchema(player);ajv.addSchema(execution);const validate=ajv.getSchema(execution.$id+'#/$defs/ExecutionInput')!;
 assert.equal(validate(example),true);assert.equal(execute(example).traceVersion,2);
 for(const invalid of [{...example,world:{}},{...example,executionContractVersion:3},{...example,executionMode:{...example.executionMode,extra:true}},{...example,bundle:{...example.bundle,futureBall:[]}}]){assert.equal(validate(invalid),false);assert.throws(()=>execute(invalid));}
});
