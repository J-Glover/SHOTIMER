import type { ActiveView } from '../types/timer';

export function getOutputUrl(roomId: string, role: ActiveView, base = window.location.origin): string {
  const hostname = window.location.hostname;
  const local = hostname === 'localhost' || hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') || hostname.startsWith('10.');
  const url = new URL(hostname.startsWith('app.') ? '/' : '/app/', base);
  url.searchParams.set('room', roomId);
  url.searchParams.set('view', role);
  if (!local) url.searchParams.set('access', import.meta.env.VITE_STEALTH_PASSKEY || 'SHOTIMER-ALPHA-2026');
  return url.toString();
}
