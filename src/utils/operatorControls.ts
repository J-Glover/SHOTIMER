import type { ActiveView } from '../types/timer';

export function canUseOperatorShortcut(event: KeyboardEvent, view: ActiveView, modalOpen: boolean): boolean {
  if (view !== 'controller' || modalOpen || event.defaultPrevented || event.repeat || event.isComposing ||
      event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
  const target = event.target;
  return !(target instanceof Element && target.closest(
    'input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="button"], [role="dialog"], [role="menu"], summary',
  ));
}

export function formatTimerDuration(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor(value % 3600 / 60);
  const secs = String(value % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
}

export function parseTimerDuration(value: string): number | null {
  if (!/^\d{1,3}(:\d{1,2}){0,2}$/.test(value.trim())) return null;
  const parts = value.trim().split(':').map(Number);
  if (parts.length > 1 && parts.slice(1).some(part => part > 59)) return null;
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return seconds > 0 && seconds <= 86400 ? seconds : null;
}
