import { randomUUID } from 'node:crypto';
import type { Snapshot } from '../../experiments/src/contracts';

export type DisplayState = { revision:number; mode:'player'|'spectator'|'comparison'; time:number; tick:number|null; sceneId:string; sceneRevision:number|null; paused:boolean };
export type Command = { id:string; clientId:string; expectedRevision:number; kind:'capture'|'present'|'compare'|'return'; snapshotId?:string; experimentId?:string; arm?:'before'|'after'; frame?:number; createdAt:number; status:'pending'|'delivered'|'completed'|'failed'; error?:string; result?:{snapshotId?:string;comparison?:{experimentId:string;arm:'before'|'after';frame:number}; display:DisplayState; previousSnapshotId?:string} };
function object(value:unknown):asserts value is Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Object required');}
function exact(value:Record<string,unknown>,keys:string[]){if(Object.keys(value).some(k=>!keys.includes(k)))throw new Error('Unknown presentation field');}
function id(value:unknown):asserts value is string{if(typeof value!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(value))throw new Error('Invalid presentation identifier');}
export function displayState(value:unknown):DisplayState{
  object(value);exact(value,['revision','mode','time','tick','sceneId','sceneRevision','paused']);
  if(!Number.isSafeInteger(value.revision)||Number(value.revision)<0||!['player','spectator','comparison'].includes(String(value.mode))||typeof value.time!=='number'||!Number.isFinite(value.time)||value.time<0||typeof value.paused!=='boolean'||typeof value.sceneId!=='string'||value.sceneId.length>100)throw new Error('Invalid display state');
  for(const k of ['tick','sceneRevision'])if(value[k]!==null&&(!Number.isSafeInteger(value[k])||Number(value[k])<0))throw new Error('Invalid display frame');
  return structuredClone(value) as DisplayState;
}
/** Ephemeral delivery, durable snapshots. Restart never replays commands. No approval operations. */
export class PresentationHub{
  private clients=new Map<string,{display:DisplayState;seenAt:number}>();
  private commands=new Map<string,Command>();
  constructor(private now=()=>Date.now()){}
  private expire(){
    for(const c of this.commands.values())if(['pending','delivered'].includes(c.status)&&this.now()-c.createdAt>15000){c.status='failed';c.error='Display command expired; inspect the current view before making a new request';}
    for(const [key,c] of this.clients)if(this.now()-c.seenAt>60000)this.clients.delete(key);
    for(const [key,c] of this.commands)if(this.now()-c.createdAt>300000)this.commands.delete(key);
  }
  list(){this.expire();return [...this.clients].filter(([,v])=>this.now()-v.seenAt<5000).map(([clientId,v])=>({clientId,...v}));}
  poll(clientId:unknown,value:unknown){
    id(clientId);const display=displayState(value);this.expire();
    if(!this.clients.has(clientId)&&this.clients.size>=64)throw new Error('Too many displays');
    this.clients.set(clientId,{display,seenAt:this.now()});
    const command=[...this.commands.values()].find(c=>c.clientId===clientId&&['pending','delivered'].includes(c.status));
    if(command)command.status='delivered';
    return command?structuredClone(command):null;
  }
  request(value:unknown,hasSnapshot:(id:string)=>boolean,hasExperiment:(id:string,arm:string,frame:number)=>boolean=()=>false){
    object(value);exact(value,['id','clientId','expectedRevision','kind','snapshotId','experimentId','arm','frame']);id(value.id);id(value.clientId);
    this.expire();
    if(!['capture','present','compare','return'].includes(String(value.kind)))throw new Error('Only capture, present, compare and return are supported');
    if(!Number.isSafeInteger(value.expectedRevision)||Number(value.expectedRevision)<0)throw new Error('Expected display revision required');
    if(value.kind==='present'){id(value.snapshotId);if(!hasSnapshot(value.snapshotId))throw new Error('Unknown snapshot');}
    else if(value.snapshotId!==undefined)throw new Error('Capture takes no snapshot');
    if(value.kind==='compare'){id(value.experimentId);if(!['before','after'].includes(String(value.arm))||!Number.isInteger(value.frame)||Number(value.frame)<0||!hasExperiment(value.experimentId,String(value.arm),Number(value.frame)))throw new Error('Unknown experiment/arm/frame');}
    else if(value.experimentId!==undefined||value.arm!==undefined||value.frame!==undefined)throw new Error('Comparison fields require compare');
    const previous=this.commands.get(value.id);
    if(previous){if(previous.clientId!==value.clientId||previous.expectedRevision!==value.expectedRevision||previous.kind!==value.kind||previous.snapshotId!==value.snapshotId||previous.experimentId!==value.experimentId||previous.arm!==value.arm||previous.frame!==value.frame)throw new Error('Request ID already used with different input');return structuredClone(previous);}
    const client=this.clients.get(value.clientId);
    if(!client||this.now()-client.seenAt>=5000)throw new Error('Display is not connected');
    if(client.display.revision!==value.expectedRevision)throw new Error('Display changed; read views again');
    if((client.display.mode==='spectator'&&value.kind!=='present')||(client.display.mode==='comparison'&&!['compare','return'].includes(String(value.kind)))||(value.kind==='return'&&client.display.mode!=='comparison'))throw new Error('Return to player view before research capture/presentation');
    if([...this.commands.values()].some(c=>c.clientId===value.clientId&&['pending','delivered'].includes(c.status)))throw new Error('Display already has an outstanding request');
    if(this.commands.size>=256)throw new Error('Too many presentation requests');
    const command:Command={id:value.id,clientId:value.clientId,expectedRevision:Number(value.expectedRevision),kind:value.kind as Command['kind'],...(value.kind==='compare'?{experimentId:value.experimentId as string,arm:value.arm as 'before'|'after',frame:Number(value.frame)}:{}),...(value.kind==='present'?{snapshotId:value.snapshotId as string}:{}),status:'pending',createdAt:this.now()};
    this.commands.set(command.id,command);return structuredClone(command);
  }
  result(requestId:unknown){id(requestId);this.expire();const c=this.commands.get(requestId);if(!c)throw new Error('Unknown/expired request; server restart does not replay commands');return structuredClone(c);}
  complete(value:unknown,save:(snapshot:Snapshot)=>string){
    object(value);exact(value,['id','clientId','display','snapshot','error','previousSnapshotId','comparison']);id(value.id);id(value.clientId);
    this.expire();const c=this.commands.get(value.id);if(!c||c.clientId!==value.clientId)throw new Error('Unknown display request');
    if(c.status==='completed'||c.status==='failed')return structuredClone(c);
    if(c.status!=='delivered')throw new Error('Request was not delivered');
    if(value.error!==undefined){if(typeof value.error!=='string'||value.error.length>1000)throw new Error('Invalid display error');c.status='failed';c.error=value.error;return structuredClone(c);}
    const display=displayState(value.display),snapshot=value.snapshot as Snapshot;
    if(c.kind==='compare'){const frame=value.comparison as any;if(display.mode!=='comparison'||!display.paused||display.revision<=c.expectedRevision||frame?.experimentId!==c.experimentId||frame?.arm!==c.arm||frame?.frame!==c.frame)throw new Error('Comparison acknowledgement mismatch');c.result={display,comparison:{experimentId:c.experimentId!,arm:c.arm!,frame:c.frame!}};c.status='completed';this.clients.set(c.clientId,{display,seenAt:this.now()});return structuredClone(c);}
    if(!snapshot?.world||display.mode!=='player'||!display.paused||display.revision<=c.expectedRevision||display.time!==snapshot.bundle?.time||display.tick!==(snapshot.world.dynamic?.tick??null)||display.sceneId!==(snapshot.world.dynamic?.scene.sceneId??snapshot.scene)||display.sceneRevision!==(snapshot.world.dynamic?.scene.revision??null))throw new Error('Snapshot does not match the acknowledged display');
    if(value.previousSnapshotId!==undefined)id(value.previousSnapshotId);
    let snapshotId:string;
    try{snapshotId=save(snapshot);}catch(error){
      c.status='failed';c.error=`Snapshot was not acknowledged: ${error instanceof Error?error.message:String(error)}`.slice(0,1000);return structuredClone(c);
    } // Store validates the full history before writing; report rejection instead of retrying until timeout.
    c.result={snapshotId,display,...(typeof value.previousSnapshotId==='string'?{previousSnapshotId:value.previousSnapshotId}:{})};c.status='completed';
    this.clients.set(c.clientId,{display,seenAt:this.now()});return structuredClone(c);
  }
}
export const newPresentationId=()=>randomUUID();
