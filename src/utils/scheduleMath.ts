import type { TimerItem, TimerStatus } from '../types/timer';

export interface ItemScheduleInfo {
  id: string;
  plannedStartTime?: string;     // e.g. "10:00"
  projectedStartTime: string;    // e.g. "10:03"
  plannedEndTime?: string;       // e.g. "10:15"
  projectedEndTime: string;      // e.g. "10:18"
  isDelayed: boolean;
  delaySeconds: number;          // Positive = late, negative = early
  status: 'past' | 'current' | 'future';
}

export interface ScheduleMetrics {
  totalPlannedSeconds: number;
  totalRemainingSeconds: number;
  totalElapsedSeconds: number;
  driftSeconds: number;          // Positive = OVER (late), Negative = UNDER (early)
  driftStatus: 'over' | 'under' | 'on_time' | 'not_started';
  hasStarted: boolean;
  formattedDrift: string;        // e.g. "+03:15", "-01:30", "00:00"
  projectedEndTime: Date;
  plannedEndTime: Date | null;
  formattedProjectedEnd: string; // e.g. "11:05"
  formattedPlannedEnd: string;   // e.g. "11:00"
  formattedTotalPlanned: string; // e.g. "1h 15m"
  formattedRemaining: string;    // e.g. "42m 10s"
  hasScheduleAnchors: boolean;
  itemSchedules: Map<string, ItemScheduleInfo>;
}

export interface ScheduleCalculationParams {
  rundown: TimerItem[];
  activeTimerId: string | null;
  timeRemaining: number;
  elapsedTime: number;
  targetDuration: number;
  status: TimerStatus;
  startedAt: number | null;
  showStartedAt?: number | null;
  referenceTime?: Date;
}

/**
 * Format seconds into a friendly human string (e.g. "1h 15m", "45m", "08m 30s")
 */
export function formatDurationHuman(seconds: number): string {
  const abs = Math.abs(Math.round(seconds));
  const hrs = Math.floor(abs / 3600);
  const mins = Math.floor((abs % 3600) / 60);
  const secs = abs % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  if (mins >= 10) {
    return `${mins}m`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

/**
 * Format a Date object into a clean local time string "HH:MM" or "HH:MM:SS"
 */
export function formatClockTime(date: Date, includeSeconds = false): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  });
}

/**
 * Parse an "HH:MM" string into a Date object for today
 */
export function parseTimeToToday(timeStr: string, baseDate = new Date()): Date {
  const [hours, minutes] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Main Schedule Math Calculator
 */
export function calculateScheduleMetrics(params: ScheduleCalculationParams): ScheduleMetrics {
  const {
    rundown,
    activeTimerId,
    timeRemaining,
    elapsedTime,
    targetDuration,
    status,
    startedAt,
    showStartedAt,
    referenceTime = new Date(),
  } = params;

  const nowMs = referenceTime.getTime();
  const totalPlannedSeconds = rundown.reduce((sum, item) => sum + (item.durationSeconds || 0), 0);
  const activeIndex = Math.max(0, rundown.findIndex((t) => t.id === activeTimerId));
  const activeTimer = rundown[activeIndex] || rundown[0];
  const hasStarted = rundown.length > 0 && (showStartedAt != null || (showStartedAt === undefined && startedAt != null && status !== 'stopped'));

  // 1. Calculate time left in current active timer
  let activeRemainingSec = 0;
  if (activeTimer) {
    if (activeTimer.type === 'clock' || activeTimer.type === 'countup') {
      activeRemainingSec = Math.max(0, targetDuration - elapsedTime);
    } else {
      activeRemainingSec = Math.max(0, timeRemaining);
    }
  }

  // 2. Calculate remaining seconds for all future segments
  let upcomingSeconds = 0;
  for (let i = activeIndex + 1; i < rundown.length; i++) {
    upcomingSeconds += rundown[i].durationSeconds || 0;
  }

  const totalRemainingSeconds = activeRemainingSec + upcomingSeconds;

  // 3. Calculate past completed durations
  let completedSeconds = 0;
  for (let i = 0; i < activeIndex; i++) {
    completedSeconds += rundown[i].durationSeconds || 0;
  }

  const activeElapsed = activeTimer?.type === 'countdown'
    ? Math.max(0, targetDuration - timeRemaining)
    : elapsedTime;
  const totalElapsedSeconds = completedSeconds + activeElapsed;

  // 4. Determine Schedule Anchor (Scheduled Start Time)
  let anchorStartTime: Date | null = null;
  let hasScheduleAnchors = false;

  // Check if first timer or any earlier timer has an explicit scheduled start
  const firstWithSchedule = rundown.find((t) => !!t.scheduledStartTime);
  if (firstWithSchedule) {
    hasScheduleAnchors = true;
    const firstIndex = rundown.indexOf(firstWithSchedule);
    const baseline = showStartedAt ?? startedAt;
    const scheduledDate = parseTimeToToday(firstWithSchedule.scheduledStartTime!, baseline != null ? new Date(baseline) : referenceTime);
    
    // Extrapolate the show anchor start (index 0)
    let offsetToFirst = 0;
    for (let i = 0; i < firstIndex; i++) {
      offsetToFirst += rundown[i].durationSeconds || 0;
    }
    anchorStartTime = new Date(scheduledDate.getTime() - offsetToFirst * 1000);
    // Time-only schedules can span midnight: choose the occurrence nearest this run's baseline.
    if (hasStarted && baseline != null) {
      const days = Math.round((baseline - anchorStartTime.getTime()) / 86400000);
      anchorStartTime.setDate(anchorStartTime.getDate() + days);
    }
  } else if (showStartedAt != null) {
    anchorStartTime = new Date(showStartedAt);
  } else if (hasStarted && startedAt != null) {
    anchorStartTime = new Date(startedAt - completedSeconds * 1000);
  }

  // 5. Projected End Time (ETA)
  // Projected End = Now + totalRemainingSeconds
  const projectedBaseMs = !hasStarted && anchorStartTime ? Math.max(nowMs, anchorStartTime.getTime() + completedSeconds * 1000) : nowMs;
  const projectedEndTime = new Date(projectedBaseMs + totalRemainingSeconds * 1000);

  // 6. Planned End Time
  let plannedEndTime: Date | null = null;
  if (anchorStartTime) {
    plannedEndTime = new Date(anchorStartTime.getTime() + totalPlannedSeconds * 1000);
  }

  // 7. Over / Under Drift Calculation
  let driftSeconds = 0;

  if (!hasStarted) {
    driftSeconds = 0;
  } else if (anchorStartTime && plannedEndTime) {
    // Exact delta between Projected End vs Planned End
    driftSeconds = Math.round((projectedEndTime.getTime() - plannedEndTime.getTime()) / 1000);
  } else {
    // If no anchor start exists, check if active timer is running in overtime
    if (activeTimer?.type === 'countdown' && timeRemaining < 0) {
      driftSeconds = Math.round(Math.abs(timeRemaining));
    } else if (activeTimer?.type === 'countup' && elapsedTime > targetDuration) {
      driftSeconds = Math.round(elapsedTime - targetDuration);
    } else {
      driftSeconds = 0;
    }
  }

  // Drift status classification with 20s hysteresis
  let driftStatus: ScheduleMetrics['driftStatus'] = hasStarted ? 'on_time' : 'not_started';
  if (hasStarted && driftSeconds >= 20) {
    driftStatus = 'over';
  } else if (hasStarted && driftSeconds <= -20) {
    driftStatus = 'under';
  }

  // Formatted Drift string (+03:15, -01:30, 00:00)
  const absDrift = Math.abs(driftSeconds);
  const driftMins = Math.floor(absDrift / 60);
  const driftSecs = absDrift % 60;
  const driftSign = driftSeconds > 0 ? '+' : driftSeconds < 0 ? '-' : '';
  const formattedDrift = absDrift >= 3600 ? `${driftSign}${formatDurationHuman(absDrift)}` : `${driftSign}${driftMins.toString().padStart(2, '0')}:${driftSecs.toString().padStart(2, '0')}`;

  // 8. Calculate item-by-item projected and planned start/end times
  const itemSchedules = new Map<string, ItemScheduleInfo>();

  // Running cursor for planned schedule
  let plannedCursorMs = anchorStartTime ? anchorStartTime.getTime() : nowMs;
  // Running cursor for projected schedule
  let projectedCursorMs = projectedBaseMs - activeElapsed * 1000;

  for (let i = 0; i < rundown.length; i++) {
    const item = rundown[i];
    const durationMs = (item.durationSeconds || 0) * 1000;

    // Planned start: explicit or extrapolated
    let plannedStartStr: string | undefined = item.scheduledStartTime;
    if (!plannedStartStr && anchorStartTime) {
      plannedStartStr = formatClockTime(new Date(plannedCursorMs));
    }

    const plannedEndMs = plannedCursorMs + durationMs;
    const plannedEndStr = anchorStartTime ? formatClockTime(new Date(plannedEndMs)) : undefined;

    // Projected start & end
    let itemProjectedStartMs = 0;
    let itemStatus: 'past' | 'current' | 'future' = 'future';

    if (i < activeIndex) {
      itemStatus = 'past';
      itemProjectedStartMs = plannedCursorMs; // Historical
    } else if (i === activeIndex) {
      itemStatus = 'current';
      itemProjectedStartMs = projectedBaseMs - activeElapsed * 1000;
    } else {
      itemStatus = 'future';
      // Future items start when previous one ends in the projected timeline
      if (i === activeIndex + 1) {
        itemProjectedStartMs = projectedBaseMs + activeRemainingSec * 1000;
      } else {
        itemProjectedStartMs = projectedCursorMs;
      }
    }

    const itemProjectedEndMs = itemProjectedStartMs + durationMs;
    projectedCursorMs = itemProjectedEndMs;
    plannedCursorMs = plannedEndMs;

    // Delay calculation for this row
    const plannedStartMs = item.scheduledStartTime
      ? parseTimeToToday(item.scheduledStartTime, referenceTime).getTime()
      : plannedCursorMs - durationMs;

    const rowDelaySec = Math.round((itemProjectedStartMs - plannedStartMs) / 1000);
    const isDelayed = hasStarted && rowDelaySec >= 30;

    itemSchedules.set(item.id, {
      id: item.id,
      plannedStartTime: plannedStartStr,
      projectedStartTime: formatClockTime(new Date(itemProjectedStartMs)),
      plannedEndTime: plannedEndStr,
      projectedEndTime: formatClockTime(new Date(itemProjectedEndMs)),
      isDelayed,
      delaySeconds: rowDelaySec,
      status: itemStatus,
    });
  }

  return {
    totalPlannedSeconds,
    totalRemainingSeconds,
    totalElapsedSeconds,
    driftSeconds,
    driftStatus,
    formattedDrift,
    projectedEndTime,
    plannedEndTime,
    formattedProjectedEnd: rundown.length ? formatClockTime(projectedEndTime) : '—',
    formattedPlannedEnd: plannedEndTime ? formatClockTime(plannedEndTime) : '--:--',
    formattedTotalPlanned: formatDurationHuman(totalPlannedSeconds),
    formattedRemaining: formatDurationHuman(totalRemainingSeconds),
    hasScheduleAnchors,
    hasStarted,
    itemSchedules,
  };
}
