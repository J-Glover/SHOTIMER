import { storedCredentials } from '../services/liveSync';
import type { ActiveView } from '../types/timer';

export function getOutputUrl(roomId: string, role: ActiveView, base = window.location.origin): string {
  const hostname = window.location.hostname;
  const local = hostname === 'localhost' || hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') || hostname.startsWith('10.');
  const url = new URL('/', base);
  const credentials = storedCredentials(roomId);
  const token = role === 'controller' ? credentials?.operator : role === 'moderator' ? credentials?.moderator : credentials?.viewer;
  if (!credentials || !token) return '';
  url.searchParams.set('room', credentials.id);
  url.hash = new URLSearchParams({ token }).toString();
  url.searchParams.set('view', role);
  if (!local) url.searchParams.set('access', import.meta.env.VITE_STEALTH_PASSKEY || 'JAMES2026');
  return url.toString();
}
