import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLiveRelay } from '../liveRelay.mjs';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'shotimer-relay-test-'));
let relay = createLiveRelay({ directory, heartbeatMs: 100 });
const server = http.createServer((req, res) => { if (!relay.middleware(req, res)) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{}'); } });
let base;
before(async () => { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${server.address().port}/api/live/rooms`; });
after(async () => { relay.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); if (path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(directory).startsWith('shotimer-relay-test-')) fs.rmSync(directory, { recursive: true }); });
async function call(endpoint = '', token, data, headers = {}) {
  const res = await fetch(base + endpoint, { method: data === undefined ? 'GET' : 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...headers }, body: data === undefined ? undefined : JSON.stringify(data) });
  return { status: res.status, data: await res.json() };
}
const initial = { roomName: 'Isolated show', rundown: [], status: 'stopped', resetRevision: 0, activeMessage: null };
const create = async () => (await call('', undefined, { state: initial })).data;
async function stream(room, token) {
  const abort = new AbortController();
  const res = await fetch(`${base}/${room.id}/events`, { headers: { Authorization: `Bearer ${token}` }, signal: abort.signal });
  const reader = res.body.getReader(); let buffer = ''; const decoder = new TextDecoder();
  return { close: () => abort.abort(), async next(type) {
    const timeout = setTimeout(() => abort.abort(), 3000);
    try { while (true) { const end = buffer.indexOf('\n\n'); if (end >= 0) { const block = buffer.slice(0,end); buffer=buffer.slice(end+2); if (block.startsWith(`event: ${type}\n`)) return JSON.parse(block.split('\ndata: ')[1]); continue; } const value = await reader.read(); if(value.done) return null; buffer += decoder.decode(value.value); } } finally { clearTimeout(timeout); }
  } };
}

test('rooms have random identities; tokens are hashed and never returned by read endpoints', async () => {
  const a = await create(); const b = await create(); assert.notEqual(a.id,b.id);
  const saved = fs.readFileSync(path.join(directory, `${a.id}.json`),'utf8');
  for (const role of ['manager','operator','moderator','viewer']) { assert.equal(a[role].length,64); assert.ok(!saved.includes(a[role])); }
  const read = await call(`/${a.id}`,a.viewer); assert.equal(read.status,200); assert.equal(read.data.role,'viewer'); assert.ok(!JSON.stringify(read.data).includes(a.manager));
});
test('missing, forged and other-room credentials cannot read, subscribe, write or rotate', async () => {
  const a=await create(); const b=await create();
  for(const key of [undefined,'0'.repeat(64),b.manager]) for(const action of ['', '/events','/state','/rotate']) {
    const res=await call(`/${a.id}${action}`,key,action==='/state'||action==='/rotate'?{}:undefined); assert.equal(res.status,403);
  }
});
test('viewer cannot publish; moderator can change only stage messages; operator cannot rotate', async () => {
  const room=await create(); const url=`/${room.id}`;
  assert.equal((await call(`${url}/state`,room.viewer,{revision:0,state:{status:'running'}})).status,403);
  assert.equal((await call(`${url}/state`,room.moderator,{revision:0,state:{status:'running',activeMessage:null}})).status,403);
  assert.equal((await call(`${url}/rotate`,room.operator,{})).status,403);
  const message={id:'cue',text:'WRAP UP',severity:'warning',visible:true};
  assert.equal((await call(`${url}/state`,room.moderator,{revision:0,state:{activeMessage:message}})).status,200);
  const read=(await call(url,room.viewer)).data; assert.equal(read.state.status,'stopped'); assert.equal(read.state.activeMessage.text,'WRAP UP');
});
test('operator writes stream immediately and stale edits cannot overwrite newer state', async () => {
  const room=await create(); const output=await stream(room,room.viewer);
  try {
    assert.equal((await output.next('snapshot')).revision,0);
    assert.equal((await call(`/${room.id}/state`,room.operator,{revision:0,state:{status:'running'},mutationId:'action-1'})).status,200);
    const update=await output.next('snapshot'); assert.equal(update.state.status,'running'); assert.equal(update.mutationId,'action-1');
    const stale=await call(`/${room.id}/state`,room.manager,{revision:0,state:{status:'stopped'}}); assert.equal(stale.status,409); assert.equal(stale.data.state.status,'running');
    assert.equal((await output.next('heartbeat')).revision,1);
  } finally { output.close(); }
});
test('replacing links revokes existing streams and tokens while manager stays valid', async () => {
  const room=await create(); const output=await stream(room,room.viewer); await output.next('snapshot');
  try {
    const replacement=await call(`/${room.id}/rotate`,room.manager,{}); assert.equal(replacement.status,200); assert.deepEqual(await output.next('revoked'),{});
    for(const role of ['viewer','operator','moderator']) assert.equal((await call(`/${room.id}`,room[role])).status,403);
    assert.equal((await call(`/${room.id}`,replacement.data.viewer)).status,200); assert.equal((await call(`/${room.id}`,room.manager)).status,200);
  } finally { output.close(); }
});
test('server restart and reconnect recover the most recent authoritative snapshot', async () => {
  const room=await create(); await call(`/${room.id}/state`,room.operator,{revision:0,state:{roomName:'Recovered',status:'running',startedAt:12345}});
  relay.close(); relay=createLiveRelay({directory,heartbeatMs:100});
  const output=await stream(room,room.viewer);
  try { const recovered=await output.next('snapshot'); assert.equal(recovered.revision,1); assert.equal(recovered.state.roomName,'Recovered'); assert.equal(recovered.state.startedAt,12345); } finally { output.close(); }
});
test('presence cannot claim operator rights with a viewer credential and cross-origin writes are denied', async () => {
  const room=await create();
  assert.equal((await call(`/${room.id}/presence`,room.viewer,{id:'screen',role:'controller',event:'hello'})).status,400);
  assert.equal((await call(`/${room.id}/presence`,room.viewer,{id:'screen',role:'viewer',event:'hello'})).status,200);
  assert.equal((await call(`/${room.id}/state`,room.operator,{revision:0,state:{}},{Origin:'https://untrusted.invalid'})).status,403);
  assert.equal((await call('/../../secrets',room.manager)).status,404);
});
test('public state excludes account credentials, unknown properties and room identity overrides', async () => {
  const room=(await call('',undefined,{state:{...initial,isProUser:true,licenseKey:'secret',currentUser:{email:'private'},roomId:'room-1',__proto__:{polluted:true}}})).data;
  const state=(await call(`/${room.id}`,room.viewer)).data.state;
  for(const key of ['isProUser','licenseKey','currentUser','roomId','polluted']) assert.ok(!(key in state));
});

test('private relay storage is never served through the development middleware', async () => {
  const res = { status: null, setHeader(){}, writeHead(status){this.status=status;}, end(){} };
  assert.equal(relay.middleware({url:`/@fs/${directory.replaceAll('\\','/')}/private.json`},res),true);
  assert.equal(res.status,403);
});
