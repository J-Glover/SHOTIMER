import type { TimerItem, TimerType, ChimeStyle } from '../types/timer';

/**
 * Neutralizes CSV formula injection characters (=, +, -, @, Tab, CR)
 * Ensures spreadsheet applications (Excel, Google Sheets) do not execute formulas or DDE triggers.
 */
function sanitizeCSVCell(value: unknown): string {
  let str = String(value ?? '');
  // If string starts with a formula trigger or tab/CR, prepend a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Sanitizes and strips unprintable control characters from text inputs
 */
export function sanitizeText(text: unknown, maxLength = 200): string {
  if (typeof text !== 'string') return '';
  // Remove control characters (except standard whitespace), trim, and slice
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

/**
 * Validates and sanitizes an untrusted raw object into a safe TimerItem
 */
export function sanitizeRundownItem(raw: any, orderIndex: number): TimerItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const validTypes: TimerType[] = ['countdown', 'countup', 'clock'];
  const type: TimerType = validTypes.includes(raw.type) ? raw.type : 'countdown';

  const validChimes: ChimeStyle[] = ['soft_bell', 'marimba', 'gong', 'digital_beep'];
  const chimeStyle: ChimeStyle = validChimes.includes(raw.sounds?.chimeStyle)
    ? raw.sounds.chimeStyle
    : 'soft_bell';

  // Match the editor's one-second minimum and 24-hour maximum.
  let duration = parseInt(String(raw.durationSeconds), 10);
  if (isNaN(duration) || duration < 1) duration = 600;
  if (duration > 86400) duration = 86400;

  // Validate scheduled start time (HH:MM format)
  let scheduledStartTime: string | undefined = undefined;
  if (typeof raw.scheduledStartTime === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(raw.scheduledStartTime)) {
    scheduledStartTime = raw.scheduledStartTime;
  }

  // Sanitize thresholds
  const yellowTime = typeof raw.thresholds?.yellowTime === 'number' && raw.thresholds.yellowTime >= 0
    ? Math.min(raw.thresholds.yellowTime, duration)
    : 120;

  const redTime = typeof raw.thresholds?.redTime === 'number' && raw.thresholds.redTime >= 0
    ? Math.min(raw.thresholds.redTime, yellowTime)
    : 30;

  // Sanitize sound volume (0.0 to 1.0)
  const volume = typeof raw.sounds?.volume === 'number'
    ? Math.max(0, Math.min(1, raw.sounds.volume))
    : 0.8;

  const id = typeof raw.id === 'string' && raw.id.trim().length > 0 && raw.id.length < 100
    ? raw.id.trim()
    : `timer-${Date.now()}-${orderIndex}`;

  return {
    id,
    order: orderIndex,
    title: sanitizeText(raw.title || 'Untitled Segment', 200),
    speaker: sanitizeText(raw.speaker || '', 100),
    durationSeconds: duration,
    type,
    scheduledStartTime,
    autoStartNext: Boolean(raw.autoStartNext),
    finishBehavior: raw.finishBehavior === 'hold' ? 'hold' : 'overtime',
    thresholds: {
      yellowTime,
      redTime,
      overtimeBlink: raw.thresholds?.overtimeBlink !== false,
    },
    sounds: {
      soundOnYellow: Boolean(raw.sounds?.soundOnYellow),
      soundOnRed: Boolean(raw.sounds?.soundOnRed),
      soundOnFinish: raw.sounds?.soundOnFinish !== false,
      chimeStyle,
      volume,
    },
    notes: sanitizeText(raw.notes || '', 500),
  };
}

/**
 * Validates an entire untrusted rundown list, enforcing an item count cap (default max 200)
 */
export function validateAndSanitizeRundown(rawList: unknown, maxItems = 200): TimerItem[] {
  if (!Array.isArray(rawList)) return [];

  const sanitized: TimerItem[] = [];
  const capped = rawList.slice(0, maxItems);

  for (let i = 0; i < capped.length; i++) {
    const item = sanitizeRundownItem(capped[i], i);
    if (item) {
      sanitized.push(item);
    }
  }

  return sanitized;
}

export function exportRundownJSON(roomName: string, rundown: TimerItem[]) {
  const safeRoomName = sanitizeText(roomName, 80) || 'event';
  const cleanRundown = validateAndSanitizeRundown(rundown);

  const data = {
    app: 'shotimer',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    roomName: safeRoomName,
    rundown: cleanRundown,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeRoomName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}_rundown.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRundownCSV(roomName: string, rundown: TimerItem[]) {
  const safeRoomName = sanitizeText(roomName, 80) || 'event';
  const headers = ['Order', 'Title', 'Speaker', 'Duration (MM:SS)', 'Duration (Seconds)', 'Notes'];

  const rows = rundown.map((item, idx) => {
    const mins = Math.floor(item.durationSeconds / 60);
    const secs = item.durationSeconds % 60;
    const mmss = `${mins}:${secs.toString().padStart(2, '0')}`;

    return [
      idx + 1,
      sanitizeCSVCell(item.title || ''),
      sanitizeCSVCell(item.speaker || ''),
      mmss,
      item.durationSeconds,
      sanitizeCSVCell(item.notes || ''),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeRoomName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}_schedule.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCSVToRundown(csvText: string): Omit<TimerItem, 'id' | 'order'>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  // Check if header exists
  const hasHeader = lines[0].toLowerCase().includes('title') || lines[0].toLowerCase().includes('duration');
  const dataLines = (hasHeader ? lines.slice(1) : lines).slice(0, 200); // Cap at 200 rows

  const result: Omit<TimerItem, 'id' | 'order'>[] = [];

  for (const line of dataLines) {
    // Basic CSV parser handling quoted columns
    const columns: string[] = [];
    let insideQuote = false;
    let current = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        columns.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    columns.push(current.trim().replace(/^"|"$/g, ''));

    if (columns.length >= 2) {
      let title = columns[0];
      let speaker = '';
      let durationStr = '10:00';

      if (columns.length >= 4 && !isNaN(parseInt(columns[0], 10))) {
        title = columns[1];
        speaker = columns[2];
        durationStr = columns[3];
      } else if (columns.length >= 3) {
        title = columns[0];
        speaker = columns[1];
        durationStr = columns[2];
      } else if (columns.length === 2) {
        title = columns[0];
        durationStr = columns[1];
      }

      // Parse duration
      let durationSec = 600;
      if (durationStr.includes(':')) {
        const parts = durationStr.split(':').map((p) => parseInt(p, 10) || 0);
        if (parts.length === 3) {
          durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          durationSec = parts[0] * 60 + parts[1];
        }
      } else {
        const parsed = parseInt(durationStr, 10);
        if (!isNaN(parsed) && parsed > 0) {
          durationSec = parsed < 60 ? parsed * 60 : parsed;
        }
      }

      durationSec = Math.max(10, Math.min(86400, durationSec));

      result.push({
        title: sanitizeText(title || 'Imported Segment', 200),
        speaker: sanitizeText(speaker || '', 100),
        durationSeconds: durationSec,
        type: 'countdown',
        thresholds: { yellowTime: 120, redTime: 30, overtimeBlink: true },
        sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: 'soft_bell', volume: 0.8 },
        autoStartNext: false,
        notes: '',
      });
    }
  }

  return result;
}
