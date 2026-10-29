import { useState } from 'react';
import type { TimerItem, FlashMessage } from '../types/timer';
import { isMessageRichText } from '../utils/messageFormatting';

export interface MessagePreset {
  text: string;
  richText?: FlashMessage['richText'];
  severity: FlashMessage['severity'];
  isFlashing: boolean;
  displayMode?: FlashMessage['displayMode'];
}
export interface TimerPreset {
  name: string;
  timer: Omit<TimerItem, 'id' | 'order' | 'scheduledStartTime' | 'autoStartNext'>;
}

export function useSavedPresets<T>(key: string, validate: (value: unknown) => value is T) {
  const [items, setItems] = useState<T[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(saved) ? saved.filter(validate).slice(0, 20) : [];
    } catch { return []; }
  });
  const [storageError, setStorageError] = useState('');
  function save(next: T[]) {
    const limited = next.filter(validate).slice(0, 20);
    try {
      localStorage.setItem(key, JSON.stringify(limited));
      setItems(limited);
      setStorageError('');
      return true;
    } catch { setStorageError('Presets could not be saved in this browser.'); return false; }
  }
  return { items, save, storageError };
}

export function isMessagePreset(value: unknown): value is MessagePreset {
  if (!value || typeof value !== 'object') return false;
  const item = value as MessagePreset;
  return typeof item.text === 'string' && item.text.trim().length > 0 && item.text.length <= 500 &&
    ['info', 'warning', 'danger'].includes(item.severity) && typeof item.isFlashing === 'boolean' &&
    (item.displayMode === undefined || ['with-timer', 'message-only'].includes(item.displayMode)) &&
    (item.richText === undefined || isMessageRichText(item.text, item.richText));
}

export function isTimerPreset(value: unknown): value is TimerPreset {
  if (!value || typeof value !== 'object') return false;
  const { name, timer } = value as TimerPreset;
  return typeof name === 'string' && name.trim().length > 0 && name.length <= 80 && !!timer &&
    typeof timer.title === 'string' && timer.title.length <= 200 && typeof timer.speaker === 'string' && timer.speaker.length <= 200 &&
    (timer.notes === undefined || (typeof timer.notes === 'string' && timer.notes.length <= 5000)) &&
    Number.isFinite(timer.durationSeconds) && timer.durationSeconds > 0 && timer.durationSeconds <= 86400 &&
    ['countdown', 'countup', 'clock'].includes(timer.type) && !!timer.thresholds && !!timer.sounds &&
    Number.isFinite(timer.thresholds.yellowTime) && timer.thresholds.yellowTime >= 0 && timer.thresholds.yellowTime <= 86400 &&
    Number.isFinite(timer.thresholds.redTime) && timer.thresholds.redTime >= 0 && timer.thresholds.redTime <= 86400 &&
    typeof timer.thresholds.overtimeBlink === 'boolean' && Number.isFinite(timer.sounds.volume) &&
    timer.sounds.volume >= 0 && timer.sounds.volume <= 1 &&
    ['soft_bell', 'marimba', 'gong', 'digital_beep'].includes(timer.sounds.chimeStyle) &&
    ['soundOnYellow', 'soundOnRed', 'soundOnFinish'].every(key => typeof timer.sounds[key as keyof typeof timer.sounds] === 'boolean');
}
