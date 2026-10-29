import type { RoomInfo, RoomState, TimerItem } from '../types/timer';

// Dashboard summaries never switch rooms, subscribe to other shows or infer playback from saved files.
export function roomOverview(room: RoomInfo, active: Pick<RoomState, 'roomId' | 'roomName' | 'rundown' | 'status'>, read: (key: string) => string | null, sample?: (id: string, items: TimerItem[]) => boolean) {
  const current = room.id === active.roomId;
  let name = room.name;
  let items: TimerItem[] | null = null;
  let lastOpened: number | null = null;
  try {
    name = read(`shotimer_room_name_${room.id}`) || name;
    const saved = read(`shotimer_rundown_${room.id}`);
    if (saved !== null) { const value = JSON.parse(saved); if (Array.isArray(value)) items = value; }
    const opened = Number(read(`shotimer_room_opened_${room.id}`));
    if (Number.isFinite(opened) && opened > 0) lastOpened = opened;
  } catch { /* Unavailable browser storage never prevents opening the room. */ }
  if (current) { name = active.roomName; items = active.rundown; }
  return { id: room.id, name, timerCount: items?.length ?? null, current, playback: current ? active.status : null, lastOpened, sample: items !== null && !!sample?.(room.id, items) };
}

export function initialWorkspace(search: string, shared: boolean): 'dashboard' | 'controller' | 'viewer' | 'agenda' | 'moderator' | 'overlay' {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  if (['controller', 'viewer', 'agenda', 'moderator', 'overlay'].includes(view || '')) return view as 'controller' | 'viewer' | 'agenda' | 'moderator' | 'overlay';
  if (view === 'dashboard' && !shared) return 'dashboard';
  if (shared || params.get('auth') === 'reset' || (params.has('room') && view !== 'dashboard')) return 'controller';
  return 'dashboard';
}
