import type { ActiveView, RoomState } from '../types/timer';

export type CloudSyncStatus = 'connected' | 'connecting' | 'offline' | 'local_only' | 'denied';
type AccessRole = 'manager' | 'operator' | 'moderator' | 'viewer';
interface Credentials { id: string; manager?: string; operator?: string; moderator?: string; viewer?: string }
interface Snapshot { revision: number; state: Partial<RoomState>; role?: AccessRole; mutationId?: string }
export interface LiveHealth { status: CloudSyncStatus; lastConfirmed: number | null; detail: string; role: AccessRole | null; revision: number }
interface Session {
  credentials: Credentials; token: string; health: LiveHealth; listeners: Set<(state: Partial<RoomState>) => void>;
  statusListeners: Set<(status: CloudSyncStatus) => void>; presence: Set<(value: unknown) => void>;
  healthListeners: Set<() => void>; abort: AbortController | null; retry?: ReturnType<typeof setTimeout>;
  pending: { state: Partial<RoomState>; revision: number } | null; sending: boolean; stopped: boolean; mutationId?: string;
  unsavedLinks?: boolean;
}
const sessions = new Map<string, Session>();
const browserSession = typeof window !== 'undefined';
const provisioning = new Map<string, Promise<Credentials>>();
const emptyHealth: LiveHealth = { status: 'connecting', lastConfirmed: null, detail: 'Connecting to the show…', role: null, revision: -1 };
const keys = ['roomName', 'activeTimerId', 'status', 'targetDuration', 'timeRemaining', 'elapsedTime', 'startedAt', 'pausedAt', 'overtimeSeconds', 'blackout', 'activeMessage', 'rundown', 'theme', 'outputCustomization', 'isAudioMuted', 'showStartedAt', 'scheduledStartsArmed', 'lastScheduledStartKey', 'resetRevision', 'rundownResetVersion', 'messageDraftVersion'] as const;
export function liveSnapshot(state: Partial<RoomState>): Partial<RoomState> { return Object.fromEntries(keys.filter(key => key in state).map(key => [key, state[key]])); }
function incomingAccess() {
  if (typeof window === 'undefined') return null;
  const query = new URLSearchParams(window.location.search);
  const room = query.get('room');
  const view = query.get('view') || 'controller';
  let token = new URLSearchParams(window.location.hash.slice(1)).get('token');
  // Installed shortcuts omit fragments in their manifest request. Remember only
  // this exact shared view's bearer; never substitute a management credential.
  if (room && /^[a-f0-9-]{36}$/.test(room)) {
    const key = `shotimer_shared_access_${room}_${view}`;
    try {
      if (token) localStorage.setItem(key, token.slice(0, 256));
      else token = localStorage.getItem(key);
    } catch { /* The original fragment still works without browser storage. */ }
  }
  return room && token ? { room, token: token.slice(0, 256) } : null;
}
// A shared tab never upgrades itself by looking up management credentials in this browser.
const sharedAccess = incomingAccess();
export const isSharedLink = () => !!sharedAccess;
export function storedCredentials(roomId: string): Credentials | null {
  if (typeof window === 'undefined' || sharedAccess) return null;
  const session = sessions.get(roomId);
  if (session?.unsavedLinks) return session.credentials;
  try { return JSON.parse(localStorage.getItem(`shotimer_live_access_${roomId}`) || 'null') || session?.credentials || null; } catch { return session?.credentials || null; }
}
function saveCredentials(roomId: string, credentials: Credentials) {
  localStorage.setItem(`shotimer_live_access_${roomId}`, JSON.stringify(credentials));
}
class RequestError extends Error {
  code: number; snapshot?: Snapshot;
  constructor(message: string, code: number, snapshot?: Snapshot) { super(message); this.code = code; this.snapshot = snapshot; }
}
async function request(url: string, token?: string, value?: unknown) {
  const response = await fetch(url, { method: value === undefined ? 'GET' : 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(value === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: value === undefined ? undefined : JSON.stringify(value), signal: AbortSignal.timeout(10000), cache: 'no-store' });
  let data;
  try { data = await response.json(); } catch { throw Error('Live server unavailable. Run the Shotimer server to enable protected sharing.'); }
  if (!response.ok) throw new RequestError(data.error || 'Live request failed', response.status, data);
  return data;
}
async function credentialsFor(roomId: string, initial: Partial<RoomState>): Promise<Credentials> {
  if (sharedAccess) {
    if (sharedAccess.room !== roomId) throw Error('Shared links are restricted to their room.');
    return { id: roomId };
  }
  // Legacy view URLs cannot create or obtain access to somebody else's show.
  const view = new URLSearchParams(window.location.search).get('view');
  // The signed-in dashboard is a manager-origin surface. It keeps the active
  // room connected and must be able to restore or provision that room before
  // the operator opens its controller. Output views still require a protected
  // capability link and may not mint management access from a legacy URL.
  if (view && view !== 'controller' && view !== 'dashboard') throw new RequestError('Open a new protected link from the controller’s Outputs menu.', 403);
  const saved = storedCredentials(roomId);
  if (saved) return saved;
  if (!provisioning.has(roomId)) provisioning.set(roomId, request('/api/live/rooms', undefined, { state: liveSnapshot(initial) }).then(value => { const credentials = { id: value.id, manager: value.manager, operator: value.operator, moderator: value.moderator, viewer: value.viewer }; saveCredentials(roomId, credentials); return credentials; }).finally(() => provisioning.delete(roomId)));
  return provisioning.get(roomId)!;
}
function health(session: Session, update: Partial<LiveHealth>) {
  if (session.stopped) return;
  session.health = { ...session.health, ...update };
  session.statusListeners.forEach(listener => listener(session.health.status));
  session.healthListeners.forEach(listener => listener());
}
function apply(roomId: string, session: Session, value: Snapshot) {
  if (session.stopped) return;
  if (!Number.isSafeInteger(value.revision) || value.revision < session.health.revision || !value.state) return;
  // A confirmed unchanged revision is still proof of contact, not a new show edit.
  const changed = value.revision > session.health.revision || session.health.status !== 'connected';
  health(session, { revision: value.revision, lastConfirmed: Date.now(), role: value.role || session.health.role });
  if (changed && (!value.mutationId || value.mutationId !== session.mutationId)) {
    session.pending = null;
    session.listeners.forEach(listener => listener({ ...value.state, roomId }));
  }
}
function failed(session: Session, error: unknown) {
  session.pending = null; // Never replay controls issued before an outage/reconnect.
  const denied = error instanceof RequestError && error.code === 403;
  health(session, { status: denied ? 'denied' : 'offline', detail: error instanceof Error ? error.message : 'Connection lost' });
}
async function connect(roomId: string, session: Session) {
  if (session.stopped) return;
  session.pending = null;
  session.mutationId = undefined;
  session.abort?.abort(); const abort = new AbortController(); session.abort = abort;
  health(session, { status: 'connecting', detail: 'Recovering the latest show state…' });
  try {
    const response = await fetch(`/api/live/rooms/${session.credentials.id}/events`, { headers: { Authorization: `Bearer ${session.token}` }, signal: abort.signal, cache: 'no-store' });
    if (!response.ok || !response.body) throw new RequestError(response.status === 403 ? 'This link is invalid or has been revoked. Ask the operator for a new link.' : 'Live server unavailable', response.status);
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
    while (!session.stopped && session.abort === abort) {
      const { value, done } = await reader.read(); if (done) throw Error('Connection interrupted');
      buffer += decoder.decode(value, { stream: true });
      let end;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        const event = /^event: (.+)$/m.exec(block)?.[1];
        const raw = /^data: (.+)$/m.exec(block)?.[1]; if (!raw) continue;
        const data = JSON.parse(raw);
        if (event === 'revoked') throw new RequestError('This sharing link has been replaced. Ask the operator for a new link.', 403);
        if (event === 'snapshot') {
          if (data.revision < session.health.revision) throw Error('Live server state is older than this connection. Restore its persistent storage before continuing.');
          apply(roomId, session, data); health(session, { status: 'connected', detail: 'Receiving live show updates.' });
        }
        if (event === 'heartbeat') {
          // A revision mismatch requires a fresh snapshot before claiming recovery.
          if (data.revision !== session.health.revision) throw Error('Recovering a missed show update');
          health(session, { lastConfirmed: Date.now(), status: 'connected' });
        }
        if (event === 'presence') session.presence.forEach(listener => listener({ ...data, roomId }));
      }
    }
  } catch (error) {
    if (session.abort !== abort) return;
    if (!session.stopped) {
      session.abort?.abort(); if (session.health.status !== 'denied') failed(session, error);
      if (session.health.status !== 'denied') session.retry = setTimeout(() => void connect(roomId, session), 2000);
    }
  }
}
export function getLiveHealth(roomId: string): LiveHealth { return sessions.get(roomId)?.health || emptyHealth; }
export function watchLiveHealth(roomId: string, callback: () => void) {
  const timer = setInterval(callback, 1000); // Includes the provisioning period and elapsed contact age.
  sessions.get(roomId)?.healthListeners.add(callback);
  return () => { clearInterval(timer); sessions.get(roomId)?.healthListeners.delete(callback); };
}
export function canControlRoom(roomId: string) { if (!browserSession) return true; const s = sessions.get(roomId); return !!s && s.health.status === 'connected' && ['manager', 'operator'].includes(s.health.role || ''); }
export function allowedView(roomId: string, view: ActiveView) {
  const role = getLiveHealth(roomId).role;
  return view === 'overlay' || view === 'viewer' || view === 'agenda' || (view === 'moderator' && role !== 'viewer') || (view === 'controller' && (role === 'manager' || role === 'operator'));
}
export async function rotateRoomLinks(roomId: string) {
  const session = sessions.get(roomId);
  if (!session?.credentials.manager || sharedAccess) throw Error('Only the originating room manager can replace sharing links.');
  const values = await request(`/api/live/rooms/${session.credentials.id}/rotate`, session.credentials.manager, {});
  const credentials = { ...session.credentials, ...values }; session.credentials = credentials;
  try { saveCredentials(roomId, credentials); session.unsavedLinks = false; return true; } catch { session.unsavedLinks = true; return false; }
}
export async function broadcastLiveRoomState(roomId: string, state: Partial<RoomState>) {
  const session = sessions.get(roomId);
  if (!session || session.health.status !== 'connected' || session.health.role === 'viewer') return;
  session.pending = { state: session.health.role === 'moderator' ? { activeMessage: state.activeMessage ?? null } : liveSnapshot(state), revision: session.health.revision };
  if (session.sending) return;
  session.sending = true;
  try {
    while (session.pending && !session.stopped && session.health.status === 'connected') {
      const update = session.pending; session.pending = null;
      try {
        session.mutationId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const result = await request(`/api/live/rooms/${session.credentials.id}/state`, session.token, { revision: update.revision, state: update.state, mutationId: session.mutationId });
        apply(roomId, session, result);
        const pending = session.pending as Session['pending'];
        if (pending && pending.revision === update.revision && session.health.revision === result.revision) pending.revision = result.revision;
      } catch (error) {
        if (session.stopped) break;
        session.pending = null;
        if (error instanceof RequestError && error.code === 409 && error.snapshot) {
          // Force application even when the stream already delivered this revision.
          if (error.snapshot.revision >= session.health.revision) session.listeners.forEach(listener => listener({ ...error.snapshot!.state, roomId }));
          apply(roomId, session, error.snapshot);
          health(session, { detail: error.message });
        } else { failed(session, error); session.abort?.abort(); }
        break;
      }
    }
  } finally { session.sending = false; }
}
export function requestLiveRoomSync(roomId: string) {
  const session = sessions.get(roomId);
  if (session && !session.credentials.id) { window.location.reload(); return; }
  if (session && session.health.status !== 'denied') { clearTimeout(session.retry); void connect(roomId, session); }
}
export function subscribeToLiveRoomState(roomId: string, onUpdate: (state: Partial<RoomState>) => void, _onPing?: () => void, onStatus?: (status: CloudSyncStatus) => void, initial: Partial<RoomState> = {}) {
  let cancelled = false; let active: Session | undefined;
  onStatus?.('connecting');
  void credentialsFor(roomId, initial).then(credentials => {
    if (cancelled) return;
    const session: Session = { credentials, token: sharedAccess?.token || credentials.manager!, health: { ...emptyHealth }, listeners: new Set([onUpdate]), statusListeners: new Set(onStatus ? [onStatus] : []), presence: new Set(), healthListeners: new Set(), abort: null, pending: null, sending: false, stopped: false };
    sessions.set(roomId, session); active = session; void connect(roomId, session);
  }).catch(error => { if (!cancelled) {
    const session: Session = { credentials: { id: '' }, token: '', health: { ...emptyHealth }, listeners: new Set(), statusListeners: new Set(onStatus ? [onStatus] : []), presence: new Set(), healthListeners: new Set(), abort: null, pending: null, sending: false, stopped: false };
    active = session; sessions.set(roomId, session); failed(session, error);
  } });
  const wake = () => { if (document.visibilityState === 'visible') requestLiveRoomSync(roomId); };
  window.addEventListener('online', wake); document.addEventListener('visibilitychange', wake);
  // A quiet or buffered stream must not leave a screen falsely labelled connected.
  const watchdog = setInterval(() => { if (active?.health.status === 'connected' && Date.now() - (active.health.lastConfirmed || 0) > 15000) { health(active, { status: 'offline', detail: 'No confirmed updates for 15 seconds. Reconnecting…' }); requestLiveRoomSync(roomId); } }, 1000);
  return () => { cancelled = true; clearInterval(watchdog); window.removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake); if (active) { active.stopped = true; clearTimeout(active.retry); active.abort?.abort(); sessions.delete(roomId); } };
}
export function subscribeToRoomPresence(roomId: string, listener: (value: unknown) => void) {
  let session: Session | undefined;
  const bind = () => { const next = sessions.get(roomId); if (next !== session) { session?.presence.delete(listener); session = next; session?.presence.add(listener); } };
  bind(); const timer = setInterval(bind, 500);
  return () => { clearInterval(timer); session?.presence.delete(listener); };
}
export function broadcastRoomPresence(roomId: string, value: unknown) {
  const session = sessions.get(roomId);
  if (session?.health.status === 'connected') void request(`/api/live/rooms/${session.credentials.id}/presence`, session.token, value).catch(() => {});
}
