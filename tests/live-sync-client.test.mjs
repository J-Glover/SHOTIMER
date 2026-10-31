import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createServer } from 'vite';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createLiveRelay } from '../liveRelay.mjs';

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'shotimer-client-test-'));
let relay=createLiveRelay({directory,heartbeatMs:100});
const server=http.createServer((req,res)=>relay.middleware(req,res));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const originalFetch=globalThis.fetch;
globalThis.fetch=(url,options)=>originalFetch(new URL(url,origin),options);
const browser=new EventTarget(); browser.location={search:'',hash:'',reload(){}};
globalThis.window=browser;
const document=new EventTarget(); document.visibilityState='visible'; globalThis.document=document;
const saved=new Map(); globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
const viteServers=[]; const unsubscribe=[];
after(async()=>{
  unsubscribe.forEach(fn=>fn()); relay.close(); server.closeAllConnections(); await new Promise(resolve=>server.close(resolve));
  await Promise.all(viteServers.map(vite=>vite.close())); globalThis.fetch=originalFetch; delete globalThis.window; delete globalThis.document; delete globalThis.localStorage;
  if(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(directory).startsWith('shotimer-client-test-')) fs.rmSync(directory,{recursive:true});
});
async function client(search='',hash='') {
  browser.location.search=search; browser.location.hash=hash;
  const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,ws:false}}); viteServers.push(vite);
  return vite.ssrLoadModule('/src/services/liveSync.ts');
}
async function until(check,label){const deadline=Date.now()+4000;while(!check()){if(Date.now()>deadline)throw Error(`Timed out: ${label}`);await new Promise(resolve=>setTimeout(resolve,10));}}
const initial={roomName:'Client isolated show',rundown:[],status:'stopped',resetRevision:0,activeMessage:null};

test('real sync clients enforce link roles, confirm updates, recover and never replay disconnected actions',async()=>{
  // The signed-in room dashboard keeps the active manager session connected.
  const manager=await client('?view=dashboard'); let managerState=initial;
  unsubscribe.push(manager.subscribeToLiveRoomState('local-room',value=>{managerState=value;},undefined,undefined,initial));
  await until(()=>manager.getLiveHealth('local-room').status==='connected','manager connected');
  assert.equal(manager.canControlRoom('local-room'),true); assert.equal(managerState.roomName,initial.roomName);
  const credentials=manager.storedCredentials('local-room'); assert.ok(credentials.manager);
  const viewer=await client(`?room=${credentials.id}&view=controller`,`#token=${credentials.viewer}`); let viewerState;
  unsubscribe.push(viewer.subscribeToLiveRoomState(credentials.id,value=>{viewerState=value;}));
  await until(()=>viewer.getLiveHealth(credentials.id).status==='connected','viewer connected');
  assert.equal(viewer.canControlRoom(credentials.id),false); assert.equal(viewer.allowedView(credentials.id,'controller'),false); assert.equal(viewer.storedCredentials('local-room'),null);
  await viewer.broadcastLiveRoomState(credentials.id,{status:'running'}); assert.equal(managerState.status,'stopped');
  await manager.broadcastLiveRoomState('local-room',{...initial,status:'running',startedAt:12345});
  await until(()=>viewerState?.status==='running','viewer got running show');
  assert.ok(viewer.getLiveHealth(credentials.id).lastConfirmed);

  relay.close();
  await until(()=>manager.getLiveHealth('local-room').status==='offline','offline detected');
  await manager.broadcastLiveRoomState('local-room',{...initial,roomName:'SHOULD NEVER REPLAY'});
  relay=createLiveRelay({directory,heartbeatMs:100});
  manager.requestLiveRoomSync('local-room'); viewer.requestLiveRoomSync(credentials.id);
  await until(()=>manager.getLiveHealth('local-room').status==='connected'&&viewer.getLiveHealth(credentials.id).status==='connected','clients recovered');
  assert.equal(managerState.status,'running'); assert.equal(managerState.roomName,initial.roomName); assert.equal(viewerState.roomName,initial.roomName);
  await manager.rotateRoomLinks('local-room');
  await until(()=>viewer.getLiveHealth(credentials.id).status==='denied','viewer revocation');
  assert.equal(manager.getLiveHealth('local-room').status,'connected');
});

test('rapid local actions coalesce without applying old self-echoes; conflicting operators restore server state',async()=>{
  const manager=await client(); let managerState=initial;
  unsubscribe.push(manager.subscribeToLiveRoomState('second-local',value=>{managerState=value;},undefined,undefined,initial));
  await until(()=>manager.getLiveHealth('second-local').status==='connected','second manager');
  const credentials=manager.storedCredentials('second-local');
  const operator=await client(`?room=${credentials.id}&view=controller`,`#token=${credentials.operator}`);let operatorState;
  unsubscribe.push(operator.subscribeToLiveRoomState(credentials.id,value=>{operatorState=value;}));
  await until(()=>operator.getLiveHealth(credentials.id).status==='connected','operator');
  const first=manager.broadcastLiveRoomState('second-local',{...initial,status:'paused'});
  const second=manager.broadcastLiveRoomState('second-local',{...initial,status:'running'});
  await Promise.all([first,second]); await until(()=>operatorState?.status==='running','rapid final update');
  const revision=operator.getLiveHealth(credentials.id).revision;
  const other=await originalFetch(`${origin}/api/live/rooms/${credentials.id}/state`,{method:'POST',headers:{Authorization:`Bearer ${credentials.manager}`,'Content-Type':'application/json'},body:JSON.stringify({revision,state:{roomName:'Another controller'}})}); assert.equal(other.status,200);
  // Force a concurrent publication before its stream event can necessarily be processed.
  await operator.broadcastLiveRoomState(credentials.id,{...initial,roomName:'Operator action'});
  await until(()=>manager.getLiveHealth('second-local').revision===operator.getLiveHealth(credentials.id).revision,'consistent revisions');
  const authoritative=await originalFetch(`${origin}/api/live/rooms/${credentials.id}`,{headers:{Authorization:`Bearer ${credentials.viewer}`}}).then(res=>res.json());
  assert.equal(managerState.roomName,authoritative.state.roomName);
});
