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
  outputCustomization?: OutputCustomizationMap;
  
  // Audio state
  isAudioMuted: boolean;

  // Plan & License Gate
  isProUser: boolean;
  licenseKey: string | null;
}

export type ActiveView = 'controller' | 'viewer' | 'agenda' | 'moderator' | 'overlay';
export type OutputRole = 'viewer' | 'agenda' | 'moderator' | 'overlay';
export type AspectRatio = '16:9' | '4:3' | '9:16' | '21:9';

export type OutputElementType = 
  | 'timer' 
  | 'progressBar' 
  | 'timeOfDay' 
  | 'segmentTitle' 
  | 'speaker' 
  | 'speakerNotes' 
  | 'upNext' 
  | 'onAirIndicator' 
  | 'logo' 
  | 'customText';

export interface OutputElementConfig {
  id: string;
  type: OutputElementType;
  label: string;
  visible: boolean;
  order: number;
  customValue?: string; // Text string or image URL
  customProps?: Record<string, any>;
}

export interface OutputViewConfig {
  aspectRatio: AspectRatio;
  backgroundColor: string;
  blackoutColor: string;
  fontFamily: string;
  elements: OutputElementConfig[];
}

export type OutputCustomizationMap = Record<OutputRole, OutputViewConfig>;

export const DEFAULT_VIEWER_ELEMENTS: OutputElementConfig[] = [
  { id: 'el-title', type: 'segmentTitle', label: 'Segment Title', visible: true, order: 0 },
  { id: 'el-speaker', type: 'speaker', label: 'Speaker Name', visible: true, order: 1 },
  { id: 'el-notes', type: 'speakerNotes', label: 'Speaker Notes / Cues', visible: true, order: 2 },
  { id: 'el-tally', type: 'onAirIndicator', label: 'On Air Indicator', visible: true, order: 3 },
  { id: 'el-timer', type: 'timer', label: 'Timer Digits', visible: true, order: 4 },
  { id: 'el-progress', type: 'progressBar', label: 'Progress Bar', visible: true, order: 5 },
  { id: 'el-clock', type: 'timeOfDay', label: 'Time of Day (Clock)', visible: true, order: 6 },
  { id: 'el-next', type: 'upNext', label: 'Up Next Preview', visible: true, order: 7 },
  { id: 'el-logo', type: 'logo', label: 'Image / Logo', visible: false, order: 8, customValue: '' },
  { id: 'el-text', type: 'customText', label: 'Custom Text', visible: false, order: 9, customValue: '' },
];

export const DEFAULT_OUTPUT_CUSTOMIZATION: OutputCustomizationMap = {
  viewer: {
    aspectRatio: '16:9',
    backgroundColor: '#181818',
    blackoutColor: '#000000',
    fontFamily: 'JetBrains Mono',
    elements: DEFAULT_VIEWER_ELEMENTS,
  },
  agenda: {
    aspectRatio: '16:9',
    backgroundColor: '#181818',
    blackoutColor: '#000000',
    fontFamily: 'Plus Jakarta Sans',
    elements: [
      { id: 'el-agenda-tally', type: 'onAirIndicator', label: 'On Air Indicator', visible: true, order: 0 },
      { id: 'el-agenda-clock', type: 'timeOfDay', label: 'Time of Day (Clock)', visible: true, order: 1 },
      { id: 'el-agenda-list', type: 'timer', label: 'Agenda Rundown Table', visible: true, order: 2 },
      { id: 'el-agenda-logo', type: 'logo', label: 'Image / Logo', visible: false, order: 3, customValue: '' },
      { id: 'el-agenda-text', type: 'customText', label: 'Custom Text', visible: false, order: 4, customValue: '' },
    ],
  },
  moderator: {
    aspectRatio: '16:9',
    backgroundColor: '#181818',
    blackoutColor: '#000000',
    fontFamily: 'Plus Jakarta Sans',
    elements: [
      { id: 'el-mod-timer', type: 'timer', label: 'Compact Countdown', visible: true, order: 0 },
      { id: 'el-mod-clock', type: 'timeOfDay', label: 'Time of Day (Clock)', visible: true, order: 1 },
      { id: 'el-mod-notes', type: 'speakerNotes', label: 'Moderator Notes & Cues', visible: true, order: 2 },
    ],
  },
  overlay: {
    aspectRatio: '16:9',
    backgroundColor: 'transparent',
    blackoutColor: 'transparent',
    fontFamily: 'JetBrains Mono',
    elements: [
      { id: 'el-ovl-title', type: 'segmentTitle', label: 'Segment Title', visible: true, order: 0 },
      { id: 'el-ovl-speaker', type: 'speaker', label: 'Speaker Name', visible: true, order: 1 },
      { id: 'el-ovl-timer', type: 'timer', label: 'Broadcast Lower-Third Timer', visible: true, order: 2 },
      { id: 'el-ovl-tally', type: 'onAirIndicator', label: 'ON-AIR Badge', visible: true, order: 3 },
    ],
  },
};

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
  | 'UPDATE_OUTPUT_CUSTOMIZATION'
  | 'TRIGGER_CHIME'
  | 'PING_SYNC';

export interface SyncMessage {
  type: SyncActionType;
  roomId: string;
  senderId: string;
  timestamp: number;
  payload?: any;
}

