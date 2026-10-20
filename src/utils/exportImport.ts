import type { TimerItem } from '../types/timer';

export function exportRundownJSON(roomName: string, rundown: TimerItem[]) {
  const data = {
    app: 'shotimer',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    roomName,
    rundown,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${roomName.replace(/\s+/g, '_').toLowerCase()}_rundown.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRundownCSV(roomName: string, rundown: TimerItem[]) {
  const headers = ['Order', 'Title', 'Speaker', 'Duration (MM:SS)', 'Duration (Seconds)', 'Notes'];
  
  const rows = rundown.map((item, idx) => {
    const mins = Math.floor(item.durationSeconds / 60);
    const secs = item.durationSeconds % 60;
    const mmss = `${mins}:${secs.toString().padStart(2, '0')}`;
    
    return [
      idx + 1,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${(item.speaker || '').replace(/"/g, '""')}"`,
      mmss,
      item.durationSeconds,
      `"${(item.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${roomName.replace(/\s+/g, '_').toLowerCase()}_schedule.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCSVToRundown(csvText: string): Omit<TimerItem, 'id' | 'order'>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  // Check if header exists
  const hasHeader = lines[0].toLowerCase().includes('title') || lines[0].toLowerCase().includes('duration');
  const dataLines = hasHeader ? lines.slice(1) : lines;

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
      // Find title, speaker, duration
      // Common formats: [Order, Title, Speaker, Duration] or [Title, Duration]
      let title = columns[0];
      let speaker = '';
      let durationStr = '10:00';

      if (columns.length >= 4 && !isNaN(parseInt(columns[0], 10))) {
        // [Order, Title, Speaker, Duration]
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
          // If < 60, might be minutes, otherwise seconds
          durationSec = parsed < 60 ? parsed * 60 : parsed;
        }
      }

      result.push({
        title: title || 'Imported Segment',
        speaker: speaker || '',
        durationSeconds: Math.max(10, durationSec),
        type: 'countdown',
        thresholds: { yellowTime: 120, redTime: 30, overtimeBlink: true },
        sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: 'soft_bell', volume: 0.8 },
        autoStartNext: false,
      });
    }
  }

  return result;
}
