import { validate } from './validation.js';
import type { Bundle, Memory, Profile, RulesA } from './contracts.js';
import { thinkWithMode } from './cognition.js';
import { validateMode, type ExecutionMode } from './execution-mode.js';
export type ExecutionInput={executionContractVersion:2;executionMode:ExecutionMode;bundle:Bundle;memory:Memory;profile:Profile;rules:RulesA};
export function execute(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='bundle,executionContractVersion,executionMode,memory,profile,rules')throw new Error('Execution v2 requires only executionContractVersion, executionMode, bundle, memory, profile, rules');
 const input=value as ExecutionInput;if(input.executionContractVersion!==2)throw new Error('Unsupported executionContractVersion');validateMode(input.executionMode);
 const trace=thinkWithMode(input.bundle,input.memory,input.profile,input.rules,input.executionMode);
 validate('Trace',trace);
 return {executionContractVersion:2 as const,executionMode:structuredClone(input.executionMode),traceVersion:trace.traceVersion??1 as const,trace,nextMemory:trace.longTermMemory};
}
