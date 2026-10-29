import type { OutputRole, OutputViewConfig, OutputElementType, RoomState, TimerItem } from '../types/timer';
import { DEFAULT_OUTPUT_CUSTOMIZATION } from '../types/timer';

export const OUTPUT_ROLES = [
  { id: 'viewer', label: 'Stage monitor', description: 'Presenter confidence screen', available: true },
  { id: 'agenda', label: 'Agenda', description: 'Read-only event schedule', available: true },
  { id: 'moderator', label: 'Moderator', description: 'Presenter cues and stage messages', available: true },
  { id: 'overlay', label: 'OBS overlay', description: 'Coming soon', available: false },
] as const;
export const PLAYBACK_LABELS = { stopped: 'Ready', running: 'Running', paused: 'Paused', finished: 'Finished' } as const;
export type OutputSnapshot = Pick<RoomState, 'roomId' | 'roomName' | 'rundown' | 'activeTimerId' | 'status' | 'timeRemaining' | 'elapsedTime' | 'targetDuration' | 'overtimeSeconds' | 'activeMessage' | 'blackout' | 'theme' | 'outputCustomization' | 'startedAt' | 'showStartedAt'>;

export function formatOutputTime(value: number) {
  const absolute = Math.floor(Math.abs(Number.isFinite(value) ? value : 0));
  const hours = Math.floor(absolute / 3600);
  const minutes = Math.floor(absolute % 3600 / 60);
  const seconds = String(absolute % 60).padStart(2, '0');
  return `${value < 0 ? '+' : ''}${hours ? `${hours}:${String(minutes).padStart(2, '0')}` : String(minutes).padStart(2, '0')}:${seconds}`;
}
export function clockLabel(now: number) {
  return new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}
export function timerReadout(item: TimerItem | undefined, state: Pick<OutputSnapshot, 'elapsedTime' | 'timeRemaining' | 'targetDuration' | 'status'>, now: number) {
  if (!item) return { text: '—', label: 'No timer selected', tone: 'normal', overtime: false, blink: false, progress: 0, status: PLAYBACK_LABELS[state.status] };
  const mode = item?.type || 'countdown';
  const remaining = mode === 'countup' ? state.targetDuration - state.elapsedTime : state.timeRemaining;
  const overtime = mode !== 'clock' && remaining < 0;
  const thresholds = item?.thresholds;
  const tone = overtime || ((thresholds?.redTime ?? 30) > 0 && remaining <= (thresholds?.redTime ?? 30)) ? 'danger'
    : ((thresholds?.yellowTime ?? 120) > 0 && remaining <= (thresholds?.yellowTime ?? 120)) ? 'warning' : 'normal';
  return {
    text: mode === 'clock' ? clockLabel(now) : formatOutputTime(mode === 'countup' ? state.elapsedTime : state.timeRemaining),
    label: mode === 'clock' ? 'Time of day' : mode === 'countup' ? 'Elapsed' : overtime ? 'Overtime' : 'Remaining',
    tone: mode === 'clock' ? 'normal' : tone,
    overtime, blink: overtime && thresholds?.overtimeBlink !== false,
    progress: mode === 'clock' ? 1 : Math.min(1, Math.max(0, (mode === 'countup' ? state.elapsedTime : state.timeRemaining) / (state.targetDuration || 1))),
    status: PLAYBACK_LABELS[state.status],
  };
}
export function outputConfig(state: OutputSnapshot, role: OutputRole): OutputViewConfig {
  return state.outputCustomization?.[role] || DEFAULT_OUTPUT_CUSTOMIZATION[role];
}
export function elementVisible(config: OutputViewConfig, type: OutputElementType, fallback = true) {
  return config.elements.find(element => element.type === type)?.visible ?? fallback;
}
export const SUPPORTED_ELEMENTS: Record<OutputRole, OutputElementType[]> = {
  viewer: ['segmentTitle', 'speaker', 'speakerNotes', 'onAirIndicator', 'timer', 'progressBar', 'timeOfDay', 'upNext', 'customText'],
  agenda: ['timer', 'onAirIndicator', 'timeOfDay', 'customText'],
  moderator: ['timer', 'speakerNotes', 'timeOfDay', 'upNext', 'customText'],
  overlay: [],
};

export function timingValidation(duration: number, yellow: number, red: number): string | null {
  if (!Number.isInteger(duration) || duration < 1 || duration > 86400) return 'Enter a duration between 1 second and 24 hours.';
  if (![yellow, red].every(value => Number.isInteger(value) && value >= 0 && value <= 86400)) return 'Alert thresholds must be whole seconds between 0 and 86400. Use 0 to disable an alert.';
  if (yellow > 0 && red > yellow) return 'The red alert must occur at or after the yellow alert (use fewer remaining seconds).';
  return null;
}
