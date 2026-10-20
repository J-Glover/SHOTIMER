export type TimerType = 'countdown' | 'countup' | 'clock';

export type TimerStatus = 'stopped' | 'running' | 'paused' | 'finished';

export type AlertThresholdType = 'fixed' | 'percentage';

export interface AlertThresholds {
  yellowTime: number; // Seconds remaining to trigger Yellow/Amber warning (e.g., 120s)
  redTime: number;    // Seconds remaining to trigger Red danger alert (e.g., 30s)
  overtimeBlink: boolean; // Flash red when time goes past zero
}

export type ChimeStyle = 'soft_bell' | 'marimba' | 'gong' | 'digital_beep';

export interface SoundConfig {
  soundOnYellow: boolean;
  soundOnRed: boolean;
  soundOnFinish: boolean;
  chimeStyle: ChimeStyle;
  volume: number; // 0.0 to 1.0
}

export interface TimerItem {
  id: string;
  order: number;
  title: string;
  speaker: string;
  notes?: string;
  durationSeconds: number; // Scheduled duration in seconds
  type: TimerType;
  thresholds: AlertThresholds;
  sounds: SoundConfig;
  scheduledStartTime?: string; // Optional "HH:MM" 24h format
  autoStartNext: boolean;      // Chain to next timer automatically
}

export interface FlashMessage {
  id: string;
  text: string;
  severity: 'info' | 'warning' | 'danger';
  visible: boolean;
  isFlashing: boolean;
  createdAt: number;
}

export interface ThemeConfig {
  darkMode: boolean;
  oledBlack: boolean;
  accentColor: string;
  fontFamily: 'mono' | 'sans';
  showProgressBar: boolean;
  showTimeOfDay: boolean;
  showUpNext: boolean;
}

export interface RoomInfo {
  id: string;
  name: string;
}

export const FREE_ROOMS: RoomInfo[] = [
  { id: 'room-1', name: 'Main Auditorium' },
  { id: 'room-2', name: 'Breakout Hall' },
  { id: 'room-3', name: 'Workshop Studio' },
];

export interface RoomState {
  roomId: string;
  roomName: string;
  activeTimerId: string | null;
  status: TimerStatus;
  
  // High precision timing numbers
  targetDuration: number;     // Active timer total duration (sec)
  timeRemaining: number;       // Current remaining seconds (float for smooth rendering)
  elapsedTime: number;         // Current elapsed seconds
  startedAt: number | null;    // Monotonic timestamp when started (performance.now / Date.now)
  pausedAt: number | null;
  overtimeSeconds: number;     // Elapsed seconds beyond 0:00
  
  // Visual & Stage Control
  blackout: boolean;           // Stage monitor blackout toggle
  activeMessage: FlashMessage | null;
  
  // Timers Rundown
  rundown: TimerItem[];
  
  // Customization & Appearance
  theme: ThemeConfig;
  
  // Audio state
  isAudioMuted: boolean;

  // Plan & License Gate
  isProUser: boolean;
  licenseKey: string | null;
}

export type ActiveView = 'controller' | 'viewer' | 'agenda' | 'moderator' | 'overlay';

export type SyncActionType = 
  | 'SYNC_FULL_STATE'
  | 'START_TIMER'
  | 'PAUSE_TIMER'
  | 'RESET_TIMER'
  | 'ADJUST_TIME'
  | 'SELECT_TIMER'
  | 'NEXT_TIMER'
  | 'PREV_TIMER'
  | 'SET_MESSAGE'
  | 'CLEAR_MESSAGE'
  | 'TOGGLE_BLACKOUT'
  | 'UPDATE_RUNDOWN'
  | 'UPDATE_THEME'
  | 'TRIGGER_CHIME'
  | 'PING_SYNC';

export interface SyncMessage {
  type: SyncActionType;
  roomId: string;
  senderId: string;
  timestamp: number;
  payload?: any;
}
