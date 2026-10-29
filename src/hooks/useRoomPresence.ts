import { useEffect } from 'react';
import { create } from 'zustand';
import type { ActiveView } from '../types/timer';
import { broadcastRoomPresence, subscribeToRoomPresence } from '../services/dbService';

interface Peer {
  id: string;
  roomId: string;
  role: ActiveView;
  lastSeen: number;
  transport: 'local' | 'cloud';
}
interface PresenceMessage {
  id: string;
  roomId: string;
  role: ActiveView;
  event: 'hello' | 'heartbeat' | 'leave';
}
export const useConnectionsStore = create<{ peers: Peer[] }>(() => ({ peers: [] }));
const roles = ['controller', 'viewer', 'agenda', 'moderator', 'overlay'];

export function useRoomPresence(roomId: string, role: ActiveView, enabled = true) {
  useEffect(() => {
    if (!enabled) { useConnectionsStore.setState({ peers: [] }); return; }
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    // All presence uses the authenticated relay.
    const send = (event: PresenceMessage['event']) => {
      const payload = { id, role, event };
      broadcastRoomPresence(roomId, payload);
    };
    const receive = (value: unknown, transport: Peer['transport']) => {
      if (!value || typeof value !== 'object') return;
      const message = value as PresenceMessage;
      if (message.id === id || message.roomId !== roomId || typeof message.id !== 'string' ||
          message.id.length > 64 || !roles.includes(message.role) ||
          !['hello', 'heartbeat', 'leave'].includes(message.event)) return;
      useConnectionsStore.setState(state => {
        const previous = state.peers.find(peer => peer.id === message.id);
        const peers = state.peers.filter(peer => peer.id !== message.id && peer.roomId === roomId);
        if (message.event !== 'leave') peers.push({
          id: message.id, roomId, role: message.role, lastSeen: Date.now(),
          transport: previous?.transport === 'local' ? 'local' : transport,
        });
        return { peers: peers.slice(-100) };
      });
      if (message.event === 'hello') send('heartbeat');
    };
    useConnectionsStore.setState({ peers: [] });
    const unsubscribe = subscribeToRoomPresence(roomId, value => receive(value, 'cloud'));
    send('hello');
    // The display may be a background tab. Use the same worker mechanism as timer ticks.
    let heartbeatWorker: Worker | null = null;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    try {
      heartbeatWorker = new Worker(new URL('../workers/timerWorker.ts', import.meta.url), { type: 'module' });
      heartbeatWorker.onmessage = event => { if (event.data.type === 'tick') send('heartbeat'); };
      heartbeatWorker.postMessage({ command: 'start', interval: 5000 });
    } catch { heartbeat = setInterval(() => send('heartbeat'), 5000); }
    const prune = setInterval(() => useConnectionsStore.setState(state => ({
      peers: state.peers.filter(peer => peer.roomId === roomId && Date.now() - peer.lastSeen < 45000),
    })), 5000);
    const onPageHide = () => send('leave');
    const onVisible = () => { if (document.visibilityState === 'visible') send('hello'); };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      send('leave');
      clearInterval(heartbeat);
      heartbeatWorker?.terminate();
      clearInterval(prune);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      unsubscribe();
      useConnectionsStore.setState({ peers: [] });
    };
  }, [roomId, role, enabled]);
}
