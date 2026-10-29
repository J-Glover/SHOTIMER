import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const token = () => randomBytes(32).toString('hex');
const hash = value => createHash('sha256').update(value).digest('hex');
const roles = ['manager', 'operator', 'moderator', 'viewer'];
const snapshotKeys = ['roomName', 'activeTimerId', 'status', 'targetDuration', 'timeRemaining', 'elapsedTime', 'startedAt', 'pausedAt', 'overtimeSeconds', 'blackout', 'activeMessage', 'rundown', 'theme', 'outputCustomization', 'isAudioMuted', 'showStartedAt', 'scheduledStartsArmed', 'lastScheduledStartKey', 'resetRevision', 'rundownResetVersion', 'messageDraftVersion'];
function cleanState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid snapshot');
  return Object.fromEntries(snapshotKeys.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
}

// No Supabase service key or browser-supplied role is trusted by this service.
export function createLiveRelay({ directory = process.env.SHOTIMER_LIVE_DATA_DIR || path.resolve('data/live-rooms'), heartbeatMs = 5000 } = {}) {
  directory = path.resolve(directory);
  const rooms = new Map();
  const streams = new Map();
  const limits = new Map();
  const send = (res, event, value) => {
    // A stalled screen must reconnect instead of accumulating unlimited queued output.
    if (res.destroyed || res.writableEnded) return;
    if (res.destroyed || res.writableLength > 2 * 1024 * 1024) { res.destroy(); return; }
    res.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`);
  };
  const envelope = room => ({ revision: room.revision, state: room.state, confirmedAt: Date.now() });
  const file = id => path.join(directory, `${id}.json`);
  function save(room) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const destination = file(room.id);
    const temp = `${destination}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(room), { mode: 0o600 });
    fs.renameSync(temp, destination);
    rooms.set(room.id, room);
  }
  function load(id) {
    if (rooms.has(id)) return rooms.get(id);
    try { const room = JSON.parse(fs.readFileSync(file(id), 'utf8')); rooms.set(id, room); return room; } catch { return null; }
  }
  const publish = (id, event, value) => { for (const client of streams.get(id) || []) send(client.res, event, value); };
  function permitted(req, room) {
    const bearer = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1];
    if (!room || !bearer) return null;
    const digest = Buffer.from(hash(bearer), 'hex');
    return roles.find(role => timingSafeEqual(Buffer.from(room.hashes[role], 'hex'), digest)) || null;
  }
  function response(res, code, data) { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
  async function body(req) {
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 1024 * 1024) throw Error('Payload too large'); chunks.push(chunk); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  }
  const heartbeat = setInterval(() => {
    for (const [id, clients] of streams) {
      const room = load(id);
      for (const client of clients) send(client.res, 'heartbeat', { confirmedAt: Date.now(), revision: room.revision });
    }
  }, heartbeatMs);
  heartbeat.unref();

  async function handle(req, res) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Requests have JSON/Authorization headers and no CORS permission. Reject cross-origin browsers too.
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return response(res, 403, { error: 'Cross-origin access denied' });
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/live/rooms' && req.method === 'POST') {
        const ip = req.socket.remoteAddress;
        const now = Date.now(); const record = limits.get(ip);
        if (!record || record.until < now) limits.set(ip, { count: 0, until: now + 3600000 });
        if (++limits.get(ip).count > 30) return response(res, 429, { error: 'Room creation limit reached; try again later' });
        for (const [key, value] of limits) if (value.until < now) limits.delete(key);
        const credentials = Object.fromEntries(roles.map(role => [role, token()]));
        const room = { id: randomUUID(), hashes: Object.fromEntries(roles.map(role => [role, hash(credentials[role])])), revision: 0, state: cleanState((await body(req)).state) };
        save(room);
        return response(res, 201, { id: room.id, ...credentials, ...envelope(room) });
      }
      const match = /^\/api\/live\/rooms\/([a-f0-9-]{36})(?:\/(events|state|rotate|presence))?$/.exec(url.pathname);
      if (!match) return response(res, 404, { error: 'Unknown live endpoint' });
      const [, id, action] = match;
      const room = load(id); const role = permitted(req, room);
      if (!role) return response(res, 403, { error: 'This room link is invalid or has been revoked' });
      if (req.method === 'GET' && !action) return response(res, 200, { ...envelope(room), role });
      if (action === 'events' && req.method === 'GET') {
        const clients = streams.get(id) || new Set();
        if (clients.size >= 100) return response(res, 429, { error: 'Too many connected screens' });
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
        res.flushHeaders();
        const client = { res, role }; clients.add(client); streams.set(id, clients);
        res.on('error', () => { clients.delete(client); res.destroy(); });
        send(res, 'snapshot', { ...envelope(room), role });
        req.on('close', () => { clients.delete(client); if (!clients.size) streams.delete(id); });
        return;
      }
      if (action === 'state' && req.method === 'POST') {
        if (role === 'viewer') return response(res, 403, { error: 'Viewer links cannot control the show' });
        const data = await body(req);
        // Re-read after awaiting input; concurrent writes may have advanced the room.
        const latest = load(id);
        if (!permitted(req, latest)) return response(res, 403, { error: 'Link revoked' });
        if (data.revision !== latest.revision) return response(res, 409, { ...envelope(latest), error: 'The show changed. Latest state restored; retry your action.' });
        const update = cleanState(data.state);
        if (role === 'moderator' && Object.keys(update).some(key => key !== 'activeMessage')) return response(res, 403, { error: 'Moderator links can only send or clear stage messages' });
        const updated = { ...latest, state: { ...latest.state, ...update }, revision: latest.revision + 1 };
        const mutationId = typeof data.mutationId === 'string' ? data.mutationId.slice(0, 80) : '';
        save(updated); publish(id, 'snapshot', { ...envelope(updated), mutationId });
        return response(res, 200, { ...envelope(updated), mutationId });
      }
      if (action === 'rotate' && req.method === 'POST') {
        if (role !== 'manager') return response(res, 403, { error: 'Only the room manager can replace sharing links' });
        const credentials = Object.fromEntries(roles.filter(value => value !== 'manager').map(value => [value, token()]));
        const updated = { ...room, hashes: { ...room.hashes, ...Object.fromEntries(Object.entries(credentials).map(([key, value]) => [key, hash(value)])) } };
        save(updated);
        for (const client of streams.get(id) || []) if (client.role !== 'manager') { send(client.res, 'revoked', {}); client.res.end(); }
        return response(res, 200, credentials);
      }
      if (action === 'presence' && req.method === 'POST') {
        const value = await body(req);
        if (!permitted(req, load(id))) return response(res, 403, { error: 'Link revoked' });
        const allowedViews = role === 'viewer' ? ['viewer', 'agenda'] : role === 'moderator' ? ['moderator', 'viewer', 'agenda'] : ['controller', 'viewer', 'agenda', 'moderator'];
        if (typeof value.id !== 'string' || value.id.length > 64 || !allowedViews.includes(value.role) || !['hello', 'heartbeat', 'leave'].includes(value.event)) return response(res, 400, { error: 'Invalid presence' });
        publish(id, 'presence', { id: value.id, role: value.role, event: value.event });
        return response(res, 200, { success: true });
      }
      return response(res, 405, { error: 'Method not allowed' });
    } catch (error) { if (!res.headersSent) response(res, error.message === 'Payload too large' ? 413 : 400, { error: 'Unable to process live request' }); else res.end(); }
  }
  return {
    middleware(req, res, next) {
      // Vite serves workspace files in development. Never expose private relay files there.
      try {
        const raw = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname).replaceAll('\\', '/');
        const candidate = raw.startsWith('/@fs/') ? path.resolve(raw.slice(5)) : path.resolve(`.${raw}`);
        const relative = path.relative(directory, candidate);
        if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) { response(res, 403, { error: 'Private live storage' }); return true; }
      } catch { response(res, 400, { error: 'Invalid path' }); return true; }
      if (!req.url?.startsWith('/api/live/')) { next?.(); return false; }
      void handle(req, res); return true;
    },
    close() { clearInterval(heartbeat); for (const clients of streams.values()) for (const client of clients) client.res.end(); streams.clear(); },
  };
}
