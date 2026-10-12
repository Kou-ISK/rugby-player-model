import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import player from '../../../models/player/spec/contracts.schema.json';
import proposal from '../schema/proposal.schema.json';
import mechanisms from '../../../models/player/spec/mechanisms.json';
import principles from '../../../models/judgment/principles.json';
import {wireHash} from '../src/proposal';
import {textHash} from '../src/judgment';
test('proposal observation contracts and permanent sidecars agree with their canonical owners',()=>{
 for(const [name,definition] of Object.entries(player.$defs))assert.deepEqual((proposal.$defs as Record<string,unknown>)[name],definition,name+' must be updated from the A-owned contract');
 for(const entry of [...mechanisms,...principles]){assert.equal(wireHash(entry.content),entry.sha256);assert.equal(entry.id,entry.content.id);assert.equal(textHash(readFileSync(new URL('../../../'+entry.source.path,import.meta.url),'utf8')),entry.source.sha256);}
});
