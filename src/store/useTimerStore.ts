import { create } from 'zustand';
import type { CloudUser } from '../services/authService';
import type { 
  TimerItem, 
  RoomState, 
  FlashMessage, 
  ChimeStyle, 
  SyncMessage, 
  ThemeConfig, 
  TimerType, 
  RoomInfo,
  OutputRole,
  OutputViewConfig,
  OutputElementConfig,
  OutputCustomizationMap,
} from '../types/timer';
import { FREE_ROOMS, DEFAULT_OUTPUT_CUSTOMIZATION } from '../types/timer';
import { soundSynth } from '../audio/soundSynthesizer';
import { subscribeToAuthState } from '../services/authService';
import {
  fetchUserProfile,
  saveUserRoom,
  fetchUserRooms,
  deleteUserRoom,
  broadcastLiveRoomState,
  subscribeToLiveRoomState,
  type UserCloudProfile,
  type CloudSyncStatus,
} from '../services/dbService';
import { sanitizeText, validateAndSanitizeRundown } from '../utils/exportImport';
import { normalizeOutputCustomization, guardLogoChanges } from '../utils/stagePresentation';
import { roomResetPatch } from '../utils/roomReset';
import type { ResetScope, ResetOptions } from '../utils/roomReset';
import { canControlRoom, isSharedLink } from '../services/liveSync';
import { normalizeMessageContent } from '../utils/messageFormatting';

export const FREE_TIMER_LIMIT = 3;
export const FREE_ROOM_LIMIT = 3;

// Unique client identifier for loop prevention
const CLIENT_ID = Math.random().toString(36).substring(2, 9);
// Inline Web Worker instantiation
let worker: Worker | null = null;
const initWorker = (onTick: () => void) => {
  if (typeof window === 'undefined') return;
  if (!worker) {
    try {
      worker = new Worker(new URL('../workers/timerWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        if (e.data.type === 'tick') {
          onTick();
        }
      };
    } catch {
      // Fallback to setInterval if Web Worker unavailable in environment
      setInterval(onTick, 50);
    }
  }
};

const DEFAULT_RUNDOWNS: Record<string, { name: string; rundown: TimerItem[] }> = {
  'room-1': {
    name: 'Main Auditorium',
    rundown: [
      {
        id: 'timer-1',
        order: 0,
        title: 'Opening & Welcome',
        speaker: 'Pam Beesly',
        notes: 'Welcome sponsors & housekeeping rules',
        durationSeconds: 600, // 10:00
        type: 'countdown',
        thresholds: { yellowTime: 120, redTime: 30, overtimeBlink: true },
        sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: 'soft_bell', volume: 0.8 },
        autoStartNext: true,
      },
      {
        id: 'timer-2',
        order: 1,
        title: 'Keynote: Next-Gen Stage Tech',
        speaker: 'Kevin Malone',
        notes: 'Keynote presentation and live demonstration',
        durationSeconds: 2100, // 35:00
        type: 'countdown',
        thresholds: { yellowTime: 300, redTime: 60, overtimeBlink: true },
        sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: 'soft_bell', volume: 0.8 },
        autoStartNext: false,
      },
      {
        id: 'timer-3',
        order: 2,
        title: 'Breakout & Audience Q&A',
        speaker: 'Panelists',
        notes: 'Open mic and stage questions',
        durationSeconds: 900, // 15:00
        type: 'countdown',
        thresholds: { yellowTime: 180, redTime: 60, overtimeBlink: true },
        sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: 'soft_bell', volume: 0.8 },
        autoStartNext: false,
      },
    ],
  },
  'room-2': {
    name: 'Breakout Hall',
    rundown: [
      {
        id: 'timer-r2-1',
        order: 0,
        title: 'Workshop Intro & Setup',
        speaker: 'Lead Instructor',
        notes: 'Distribute materials and configure environments',
        durationSeconds: 900, // 15:00
        type: 'countdown',
        thresholds: { yellowTime: 120, redTime: 30, overtimeBlink: true },
        sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: 'marimba', volume: 0.8 },
        autoStartNext: true,
      },
      {
        id: 'timer-r2-2',
        order: 1,
        title: 'Hands-on Lab Session',
        speaker: 'Attendees & Mentors',
        notes: 'Interactive lab and exercises',
        durationSeconds: 2700, // 45:00
        type: 'countup',
        thresholds: { yellowTime: 300, redTime: 60, overtimeBlink: true },
        sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: 'soft_bell', volume: 0.8 },
        autoStartNext: false,
      },
      {
        id: 'timer-r2-3',
        order: 2,
        title: 'Debrief & Wrap-up',
        speaker: 'Moderator',
        notes: 'Review findings and submit feedback',
        durationSeconds: 600, // 10:00
        type: 'countdown',
        thresholds: { yellowTime: 120, redTime: 30, overtimeBlink: true },
        sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: 'gong', volume: 0.8 },
        autoStartNext: false,
      },
    ],
  },
  'room-3': {
    name: 'Workshop Studio',
    rundown: [
      {
        id: 'timer-r3-1',
        order: 0,
        title: 'Tech & Camera Rehearsal',
        speaker: 'Video Director',
        notes: 'Framing, audio balance, slide advance check',
        durationSeconds: 600, // 10:00
        type: 'countdown',
        thresholds: { yellowTime: 120, redTime: 30, overtimeBlink: true },
        sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: 'soft_bell', volume: 0.8 },
        autoStartNext: true,
      },
      {
        id: 'timer-r3-2',
        order: 1,
        title: 'Live Broadcast Segment',
        speaker: 'Anchor',
        notes: 'Main studio live stream',
        durationSeconds: 1800, // 30:00
        type: 'countdown',
        thresholds: { yellowTime: 300, redTime: 60, overtimeBlink: true },
        sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: 'soft_bell', volume: 0.8 },
        autoStartNext: false,
      },
      {
        id: 'timer-r3-3',
        order: 2,
        title: 'Post-Show Wrap & Credits',
        speaker: 'Producer',
        notes: 'Roll credits and standby for off-air cue',
        durationSeconds: 300, // 05:00
        type: 'countdown',
        thresholds: { yellowTime: 60, redTime: 15, overtimeBlink: true },
        sounds: { soundOnYellow: true, soundOnRed: true, soundOnFinish: true, chimeStyle: 'gong', volume: 0.8 },
        autoStartNext: false,
      },
    ],
  },
};

const getInitialRoomId = (): string => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('room');
    if (r) return r;
    const saved = localStorage.getItem('shotimer_active_room_id');
    if (saved) return saved;
  }
  return 'room-1';
};

const getInitialRooms = (): RoomInfo[] => {
  const rooms = [...FREE_ROOMS];
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('shotimer_custom_rooms');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!rooms.some((r) => r.id === item.id)) {
              rooms.push(item);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }
  return rooms;
};

export function isSampleRundown(roomId: string, rundown: TimerItem[]) {
  const sample = (DEFAULT_RUNDOWNS[roomId] || DEFAULT_RUNDOWNS['room-1']).rundown;
  try { return JSON.stringify(validateAndSanitizeRundown(rundown)) === JSON.stringify(validateAndSanitizeRundown(sample)); }
  catch { return false; }
}

const loadRoomData = (roomId: string) => {
  let name = DEFAULT_RUNDOWNS[roomId]?.name || 'Stage Room';
  let rundown = DEFAULT_RUNDOWNS[roomId]?.rundown || DEFAULT_RUNDOWNS['room-1'].rundown;
  if (typeof window !== 'undefined') {
    try {
      const savedName = localStorage.getItem(`shotimer_room_name_${roomId}`);
      if (savedName) name = savedName;
      const savedRundown = localStorage.getItem(`shotimer_rundown_${roomId}`);
      if (savedRundown) { const parsed = JSON.parse(savedRundown); if (Array.isArray(parsed)) rundown = validateAndSanitizeRundown(parsed); }
    } catch {
      // fallback to default
    }
  }
  return { name, rundown };
};

const getInitialOutputCustomization = (roomId: string): OutputCustomizationMap => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(`shotimer_output_customization_${roomId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return normalizeOutputCustomization(parsed);
      }
    } catch {
      // fallback
    }
  }
  return normalizeOutputCustomization(DEFAULT_OUTPUT_CUSTOMIZATION);
};

function roomControls(state: Partial<RoomState>) {
  return { scheduledStartsArmed: state.scheduledStartsArmed !== false, lastScheduledStartKey: state.lastScheduledStartKey || null, resetRevision: state.resetRevision || 0, rundownResetVersion: state.rundownResetVersion || '', messageDraftVersion: state.messageDraftVersion || '' };
}
function loadRoomControls(roomId: string) {
  try {
    const saved = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(`shotimer_room_controls_${roomId}`) || '{}') : {};
    return roomControls({ scheduledStartsArmed: saved.scheduledStartsArmed !== false, lastScheduledStartKey: typeof saved.lastScheduledStartKey === 'string' ? saved.lastScheduledStartKey : null, resetRevision: Number.isSafeInteger(saved.resetRevision) && saved.resetRevision >= 0 ? saved.resetRevision : 0, rundownResetVersion: typeof saved.rundownResetVersion === 'string' ? saved.rundownResetVersion : '', messageDraftVersion: typeof saved.messageDraftVersion === 'string' ? saved.messageDraftVersion : '' });
  } catch { return roomControls({}); }
}
function saveRoomControls(state: RoomState) {
  if (typeof window !== 'undefined') localStorage.setItem(`shotimer_room_controls_${state.roomId}`, JSON.stringify(roomControls(state)));
}
function saveResetSnapshot(state: RoomState, outputChanged: boolean) {
  if (typeof window === 'undefined') return;
  const writes = [
    [`shotimer_rundown_${state.roomId}`, JSON.stringify(state.rundown)],
    ...(outputChanged ? [[`shotimer_output_customization_${state.roomId}`, JSON.stringify(state.outputCustomization)]] : []),
    [`shotimer_room_controls_${state.roomId}`, JSON.stringify(roomControls(state))],
  ];
  const previous = writes.map(([key]) => [key, localStorage.getItem(key)] as const);
  let completed = 0;
  try {
    for (const [key, value] of writes) { localStorage.setItem(key, value); completed++; }
  } catch (error) {
    for (const [key, value] of previous.slice(0, completed).reverse()) {
      try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* Report the storage failure below; live state is not replaced. */ }
    }
    throw error;
  }
}

export interface TimerStore extends RoomState {
  // Rooms
  availableRooms: RoomInfo[];
  switchRoom: (roomId: string, updateHistory?: boolean) => void;

  // User Accounts & Cloud
  currentUser: CloudUser | null;
  userProfile: UserCloudProfile | null;
  isAuthLoading: boolean;
  cloudSyncStatus: CloudSyncStatus;
  createCustomRoom: (name: string) => Promise<string>;
  deleteCustomRoom: (roomId: string) => Promise<void>;

  // Actions
  start: () => void;
  pause: () => void;
  reset: () => void;
  resetRoomSection: (scope: ResetScope, options: ResetOptions) => void;
  armScheduledStarts: () => void;
  _checkScheduledStart: (now?: number) => void;
  adjustTime: (secondsDelta: number) => void;
  selectTimer: (id: string) => void;
  nextTimer: () => void;
  previousTimer: () => void;
  toggleBlackout: () => void;
  setMessage: (text: string, severity?: 'info' | 'warning' | 'danger', isFlashing?: boolean, displayMode?: FlashMessage['displayMode'], richText?: FlashMessage['richText']) => void;
  clearMessage: () => void;
  toggleMute: () => void;
  setChimeStyle: (style: ChimeStyle) => void;
  addTimer: (item: Omit<TimerItem, 'id' | 'order'>) => boolean;
  duplicateTimer: (id: string) => boolean;
  updateTimer: (id: string, updates: Partial<TimerItem>) => void;
  deleteTimer: (id: string) => void;
  restoreTimer: (item: TimerItem, index: number, roomId: string) => boolean;
  reorderRundown: (startIndex: number, endIndex: number) => void;
  toggleAutoStartNext: (id: string) => void;
  setTimerType: (id: string, type: TimerType) => void;
  setScheduledStartTime: (id: string, timeStr?: string) => void;
  setRoomName: (name: string) => void;
  setRundown: (items: TimerItem[]) => boolean;
  updateTheme: (updates: Partial<ThemeConfig>) => void;

  // Output Studio Customization
  outputCustomization: OutputCustomizationMap;
  updateOutputConfig: (role: OutputRole, updates: Partial<OutputViewConfig>) => void;
  applyOutputConfigs: (updates: Partial<OutputCustomizationMap>) => void;
  updateOutputElement: (role: OutputRole, elementId: string, updates: Partial<OutputElementConfig>) => void;
  reorderOutputElements: (role: OutputRole, sourceIndex: number, destinationIndex: number) => void;
  addOutputElement: (role: OutputRole, element: OutputElementConfig) => void;
  removeOutputElement: (role: OutputRole, elementId: string) => void;
  resetOutputConfig: (role?: OutputRole) => void;

  activatePro: (key: string) => void;
  deactivatePro: () => void;
  
  // Internal sync & tick
  _tick: () => void;
  _broadcastState: () => void;
  _applyExternalState: (state: Partial<RoomState>) => void;
}

export const useTimerStore = create<TimerStore>((set, get) => {
  const initialRoomId = getInitialRoomId();
  const { name: initialRoomName, rundown: initialRundown } = loadRoomData(initialRoomId);

  let savedIsPro = false;
  let savedLicenseKey: string | null = null;

  if (typeof window !== 'undefined') {
    try {
      savedIsPro = localStorage.getItem('shotimer_is_pro') === 'true';
      savedLicenseKey = localStorage.getItem('shotimer_license_key');
    } catch {
      // Use defaults
    }
  }

  const initialTimer = initialRundown[0];

  return {
    roomId: initialRoomId,
    roomName: initialRoomName,
    availableRooms: getInitialRooms(),
    currentUser: null,
    userProfile: null,
    isAuthLoading: true,
    cloudSyncStatus: 'connecting',
    activeTimerId: initialTimer?.id || null,
    status: 'stopped',
    targetDuration: initialTimer?.durationSeconds || 0,
    timeRemaining: initialTimer?.durationSeconds || 0,
    elapsedTime: 0,
    startedAt: null,
    pausedAt: null,
    overtimeSeconds: 0,
    showStartedAt: null,
    ...loadRoomControls(initialRoomId),
    blackout: false,
    activeMessage: null,
    isAudioMuted: false,
    isProUser: savedIsPro,
    licenseKey: savedLicenseKey,
    rundown: initialRundown,
    theme: {
      darkMode: true,
      oledBlack: true,
      accentColor: '#10B981',
      fontFamily: 'mono',
      showProgressBar: true,
      showTimeOfDay: true,
      showUpNext: true,
    },
    outputCustomization: getInitialOutputCustomization(initialRoomId),

    createCustomRoom: async (name: string) => {
      if (!get().isProUser && get().availableRooms.length >= FREE_ROOM_LIMIT) throw new Error('The Free plan includes 3 rooms. Rename or use an existing room, or explore Pro.');
      if (!get().currentUser) throw new Error('Sign in to create a custom room.');
      const newId = `room-${Date.now().toString(36)}`;
      const newRoom: RoomInfo = { id: newId, name };
      const currentRooms = get().availableRooms;
      const updated = [...currentRooms, newRoom];

      if (typeof window !== 'undefined') {
        const customOnly = updated.filter((r) => !['room-1', 'room-2', 'room-3'].includes(r.id));
        localStorage.setItem('shotimer_custom_rooms', JSON.stringify(customOnly));
      }

      const user = get().currentUser;
      if (user) {
        await saveUserRoom(user.uid, newId, name, get().rundown, get().theme);
      }

      set({ availableRooms: updated });
      get().switchRoom(newId);
      return newId;
    },

    deleteCustomRoom: async (deleteId: string) => {
      if (['room-1', 'room-2', 'room-3'].includes(deleteId)) return;
      const currentRooms = get().availableRooms;
      const updated = currentRooms.filter((r) => r.id !== deleteId);

      if (typeof window !== 'undefined') {
        const customOnly = updated.filter((r) => !['room-1', 'room-2', 'room-3'].includes(r.id));
        localStorage.setItem('shotimer_custom_rooms', JSON.stringify(customOnly));
        localStorage.removeItem(`shotimer_rundown_${deleteId}`);
        localStorage.removeItem(`shotimer_room_name_${deleteId}`);
      }

      const user = get().currentUser;
      if (user) {
        await deleteUserRoom(user.uid, deleteId);
      }

      set({ availableRooms: updated });
      if (get().roomId === deleteId) {
        get().switchRoom('room-1');
      }
    },

    switchRoom: (newRoomId: string, updateHistory = true) => {
      if (isSharedLink()) return;
      const state = get();
      if (state.roomId === newRoomId) return;

      // Stop any current running worker
      if (worker) {
        worker.postMessage({ command: 'stop' });
      }

      // Save active room rundown before switching
      if (typeof window !== 'undefined') {
        localStorage.setItem(`shotimer_rundown_${state.roomId}`, JSON.stringify(state.rundown));
        localStorage.setItem(`shotimer_room_name_${state.roomId}`, state.roomName);
        localStorage.setItem('shotimer_active_room_id', newRoomId);

        // Update URL query param cleanly without full reload
        if (updateHistory) {
          const url = new URL(window.location.href);
          url.searchParams.set('room', newRoomId);
          window.history.pushState({}, '', url.toString());
        }
      }

      // Load new room data
      const { name, rundown } = loadRoomData(newRoomId);
      const firstTimer = rundown[0];

      set({
        roomId: newRoomId,
        roomName: name,
        rundown,
        activeTimerId: firstTimer?.id || null,
        status: 'stopped',
        startedAt: null,
        pausedAt: null,
        targetDuration: firstTimer?.durationSeconds || 0,
        timeRemaining: firstTimer?.durationSeconds || 0,
        elapsedTime: 0,
        overtimeSeconds: 0,
        showStartedAt: null,
        activeMessage: null,
        blackout: false,
        ...loadRoomControls(newRoomId),
        outputCustomization: getInitialOutputCustomization(newRoomId),
      });

      get()._broadcastState();
    },

    start: () => {
      const state = get();
      if (state.status === 'running') return;
      if (!state.rundown.some(item => item.id === state.activeTimerId)) return;

      const now = Date.now();
      const elapsedTime = state.status === 'finished' ? 0 : state.elapsedTime;
      let startedAt = now - elapsedTime * 1000;
      if (state.status === 'paused' && state.pausedAt) {
        const pauseDuration = now - state.pausedAt;
        startedAt = (state.startedAt || now) + pauseDuration;
      }

      set({
        status: 'running',
        elapsedTime,
        timeRemaining: state.targetDuration - elapsedTime,
        startedAt,
        pausedAt: null,
        showStartedAt: state.showStartedAt ?? now - state.rundown.slice(0, Math.max(0, state.rundown.findIndex(item => item.id === state.activeTimerId))).reduce((sum, item) => sum + item.durationSeconds, 0) * 1000,
      });

      if (worker) {
        worker.postMessage({ command: 'start', interval: 50 });
      }

      get()._broadcastState();
    },

    pause: () => {
      const state = get();
      if (state.status !== 'running') return;

      set({
        status: 'paused',
        pausedAt: Date.now(),
      });

      if (worker) {
        worker.postMessage({ command: 'stop' });
      }

      get()._broadcastState();
    },

    reset: () => {
      const state = get();
      const activeTimer = state.rundown.find((t) => t.id === state.activeTimerId) || state.rundown[0];
      const duration = activeTimer?.durationSeconds || 0;
      const revision = Math.max(Date.now(), (state.resetRevision || 0) + 1);
      saveRoomControls({ ...state, scheduledStartsArmed: false, resetRevision: revision });

      if (worker) {
        worker.postMessage({ command: 'stop' });
      }

      set({
        status: 'stopped',
        startedAt: null,
        pausedAt: null,
        targetDuration: duration,
        timeRemaining: duration,
        elapsedTime: 0,
        overtimeSeconds: 0,
        scheduledStartsArmed: false,
        resetRevision: revision,
      });

      get()._broadcastState();
    },

    resetRoomSection: (scope, options) => {
      const state = get();
      const patch = roomResetPatch(state, scope, options, Date.now());
      const next = { ...state, ...patch };
      try {
        saveResetSnapshot(next, !!patch.outputCustomization);
      } catch { throw Error('This browser could not save the reset. Free up browser storage or download a backup and try again.'); }
      if (['timing', 'restart', 'rundown', 'room'].includes(scope)) worker?.postMessage({ command: 'stop' });
      set(patch);
      get()._broadcastState();
      if (state.currentUser && patch.rundown) void saveUserRoom(state.currentUser.uid, state.roomId, state.roomName, next.rundown, next.theme);
    },

    armScheduledStarts: () => {
      const state = get();
      saveRoomControls({ ...state, scheduledStartsArmed: true });
      set({ scheduledStartsArmed: true });
      get()._broadcastState();
    },

    _checkScheduledStart: (now = Date.now()) => {
      if (typeof window !== 'undefined' && !canControlRoom(get().roomId)) return;
      const state = get();
      if (state.status !== 'stopped' || state.scheduledStartsArmed === false) return;
      if (typeof window !== 'undefined' && !['controller', null].includes(new URLSearchParams(window.location.search).get('view'))) return;
      const date = new Date(now);
      const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      const timer = state.rundown.find(item => item.id === state.activeTimerId);
      if (!timer || timer.scheduledStartTime !== hhmm) return;
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${timer.id}-${hhmm}`;
      if (state.lastScheduledStartKey === key) return;
      saveRoomControls({ ...state, lastScheduledStartKey: key });
      set({ lastScheduledStartKey: key });
      get().start();
      if (!state.isAudioMuted) soundSynth.play(timer.sounds.chimeStyle, timer.sounds.volume);
    },

    adjustTime: (deltaSeconds: number) => {
      const state = get();
      if (!state.activeTimerId || !state.rundown.length) return;
      const newRemaining = Math.max(-3600, state.timeRemaining + deltaSeconds);
      const newTarget = Math.max(1, state.targetDuration + deltaSeconds);

      set({
        timeRemaining: newRemaining,
        targetDuration: newTarget,
      });

      get()._broadcastState();
    },

    selectTimer: (id: string) => {
      const state = get();
      const timer = state.rundown.find((t) => t.id === id);
      if (!timer) return;

      if (worker) {
        worker.postMessage({ command: 'stop' });
      }

      set({
        activeTimerId: timer.id,
        status: 'stopped',
        startedAt: null,
        pausedAt: null,
        targetDuration: timer.durationSeconds,
        timeRemaining: timer.durationSeconds,
        elapsedTime: 0,
        overtimeSeconds: 0,
      });

      get()._broadcastState();
    },

    nextTimer: () => {
      const state = get();
      const currentIndex = state.rundown.findIndex((t) => t.id === state.activeTimerId);
      if (currentIndex < state.rundown.length - 1) {
        const nextTimerItem = state.rundown[currentIndex + 1];
        get().selectTimer(nextTimerItem.id);
      }
    },

    previousTimer: () => {
      const state = get();
      const currentIndex = state.rundown.findIndex((t) => t.id === state.activeTimerId);
      if (currentIndex > 0) {
        const prevTimerItem = state.rundown[currentIndex - 1];
        get().selectTimer(prevTimerItem.id);
      }
    },

    toggleBlackout: () => {
      set((prev) => ({ blackout: !prev.blackout }));
      get()._broadcastState();
    },

    setMessage: (text: string, severity: 'info' | 'warning' | 'danger' = 'info', isFlashing: boolean = false, displayMode: FlashMessage['displayMode'] = 'with-timer', richText?: FlashMessage['richText']) => {
      const content = normalizeMessageContent(text, richText, true);
      if (!content.text) {
        get().clearMessage();
        return;
      }

      const msg: FlashMessage = {
        id: Math.random().toString(36).substring(2, 9),
        ...content,
        severity,
        visible: true,
        isFlashing,
        displayMode,
        createdAt: Date.now(),
      };

      set({ activeMessage: msg });
      get()._broadcastState();
    },

    clearMessage: () => {
      set({ activeMessage: null });
      get()._broadcastState();
    },

    toggleMute: () => {
      const next = !get().isAudioMuted;
      soundSynth.setMuted(next);
      set({ isAudioMuted: next });
    },

    setChimeStyle: (style: ChimeStyle) => {
      const activeTimer = get().rundown.find((t) => t.id === get().activeTimerId);
      if (activeTimer) {
        get().updateTimer(activeTimer.id, {
          sounds: { ...activeTimer.sounds, chimeStyle: style },
        });
      }
    },

    addTimer: (item) => {
      const state = get();
      // Free Tier limit enforcement: 3 timers max unless Pro user
      if (!state.isProUser && state.rundown.length >= FREE_TIMER_LIMIT) {
        return false;
      }

      const newTimer: TimerItem = {
        ...item,
        id: `timer-${Date.now()}`,
        order: state.rundown.length,
      };
      const updated = [...state.rundown, newTimer];
      set({ rundown: updated, ...(!state.rundown.length ? { activeTimerId: newTimer.id, targetDuration: newTimer.durationSeconds, timeRemaining: newTimer.durationSeconds, elapsedTime: 0, overtimeSeconds: 0, showStartedAt: null, startedAt: null, pausedAt: null, status: 'stopped' as const } : {}) });
      if (typeof window !== 'undefined') {
        localStorage.setItem(`shotimer_rundown_${state.roomId}`, JSON.stringify(updated));
      }
      get()._broadcastState();
      return true;
    },

    duplicateTimer: (id: string) => {
      const state = get();
      if (!state.isProUser && state.rundown.length >= FREE_TIMER_LIMIT) {
        return false;
      }
      const timerToDup = state.rundown.find((t) => t.id === id);
      if (!timerToDup) return false;

      const newTimer: TimerItem = {
        ...timerToDup,
        id: `timer-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        title: `${timerToDup.title} (Copy)`,
        order: state.rundown.length,
      };

      const updated = [...state.rundown, newTimer];
      set({ rundown: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem(`shotimer_rundown_${state.roomId}`, JSON.stringify(updated));
      }
      get()._broadcastState();
      return true;
    },

    updateTimer: (id, updates) => {
      const state = get();
      const updated = state.rundown.map((t) => (t.id === id ? { ...t, ...updates } : t));
      set({ rundown: updated });
      if (state.activeTimerId === id && updates.durationSeconds !== undefined && ['stopped', 'finished'].includes(state.status)) {
        set({
          status: 'stopped', elapsedTime: 0, overtimeSeconds: 0, startedAt: null, pausedAt: null,
          targetDuration: updates.durationSeconds,
          timeRemaining: updates.durationSeconds,
        });
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(`shotimer_rundown_${state.roomId}`, JSON.stringify(updated));
      }
      get()._broadcastState();
    },

    deleteTimer: (id: string) => {
      const state = get();
      if (state.rundown.length <= 1) return; // Keep at least one
      const updated = state.rundown.filter((t) => t.id !== id);
      set({ rundown: updated });
      if (state.activeTimerId === id) {
        get().selectTimer(updated[0].id);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(`shotimer_rundown_${state.roomId}`, JSON.stringify(updated));
      }
      get()._broadcastState();
    },

    restoreTimer: (item, index, roomId) => {
      const state = get();
      if (state.roomId !== roomId || state.rundown.some(timer => timer.id === item.id) ||
          (!state.isProUser && state.rundown.length >= FREE_TIMER_LIMIT)) return false;
      const updated = [...state.rundown];
      updated.splice(Math.max(0, Math.min(index, updated.length)), 0, item);
      const rundown = updated.map((timer, order) => ({ ...timer, order }));
      set({ rundown, ...(!state.rundown.length ? { activeTimerId: item.id, targetDuration: item.durationSeconds, timeRemaining: item.durationSeconds, elapsedTime: 0, overtimeSeconds: 0, status: 'stopped' as const } : {}) });
      if (typeof window !== 'undefined') {
        localStorage.setItem(`shotimer_rundown_${roomId}`, JSON.stringify(rundown));
      }
      get()._broadcastState();
      return true;
    },

    reorderRundown: (startIndex, endIndex) => {
      const state = get();
      const result = Array.from(state.rundown);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      const reordered = result.map((item, idx) => ({ ...item, order: idx }));
      set({ rundown: reordered });
      if (typeof window !== 'undefined') {
        localStorage.setItem(`shotimer_rundown_${state.roomId}`, JSON.stringify(reordered));
      }
      get()._broadcastState();
    },

    toggleAutoStartNext: (id: string) => {
      const timer = get().rundown.find((t) => t.id === id);
      if (timer) {
        get().updateTimer(id, { autoStartNext: !timer.autoStartNext });
      }
    },

    setTimerType: (id: string, type: TimerType) => {
      get().updateTimer(id, { type });
    },

    setScheduledStartTime: (id: string, timeStr?: string) => {
      get().updateTimer(id, { scheduledStartTime: timeStr });
    },

    setRoomName: (name: string) => {
      const roomId = get().roomId;
      set({ roomName: name });
      if (typeof window !== 'undefined') {
        localStorage.setItem(`shotimer_room_name_${roomId}`, name);
      }
      get()._broadcastState();
    },

    setRundown: (items: TimerItem[]) => {
      if (items.length > 200 || (!get().isProUser && items.length > FREE_TIMER_LIMIT)) return false;
      const roomId = get().roomId;
      worker?.postMessage({ command: 'stop' });
      const revision = Math.max(Date.now(), (get().resetRevision || 0) + 1);
      set({
        rundown: items,
        activeTimerId: items[0]?.id || null,
        targetDuration: items[0]?.durationSeconds || 0,
        timeRemaining: items[0]?.durationSeconds || 0,
        status: 'stopped',
        elapsedTime: 0,
        overtimeSeconds: 0,
        startedAt: null,
        pausedAt: null,
        showStartedAt: null,
        scheduledStartsArmed: false,
        resetRevision: revision,
        rundownResetVersion: String(revision),
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(`shotimer_rundown_${roomId}`, JSON.stringify(items));
        saveRoomControls(get());
      }
      get()._broadcastState();
      return true;
    },

    updateTheme: (updates: Partial<ThemeConfig>) => {
      set((current) => ({
        theme: { ...current.theme, ...updates },
      }));
      get()._broadcastState();
    },

    applyOutputConfigs: (updates) => {
      const current = get().outputCustomization || DEFAULT_OUTPUT_CUSTOMIZATION;
      const updatedMap = normalizeOutputCustomization({ ...current, ...updates });
      guardLogoChanges(current, updatedMap, get().isProUser);
      if (typeof window !== 'undefined') localStorage.setItem(`shotimer_output_customization_${get().roomId}`, JSON.stringify(updatedMap));
      set({ outputCustomization: updatedMap });
      get()._broadcastState();
    },

    updateOutputConfig: (role: OutputRole, updates: Partial<OutputViewConfig>) => {
      const current = get().outputCustomization || DEFAULT_OUTPUT_CUSTOMIZATION;
      const roleConfig = current[role] || DEFAULT_OUTPUT_CUSTOMIZATION[role];
      const updatedRole = { ...roleConfig, ...updates };
      const updatedMap: OutputCustomizationMap = { ...current, [role]: updatedRole };
      get().applyOutputConfigs(updatedMap);
    },

    updateOutputElement: (role: OutputRole, elementId: string, updates: Partial<OutputElementConfig>) => {
      const current = get().outputCustomization || DEFAULT_OUTPUT_CUSTOMIZATION;
      const roleConfig = current[role] || DEFAULT_OUTPUT_CUSTOMIZATION[role];
      const updatedElements = roleConfig.elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      );
      const updatedMap: OutputCustomizationMap = {
        ...current,
        [role]: { ...roleConfig, elements: updatedElements },
      };
      get().applyOutputConfigs(updatedMap);
    },

    reorderOutputElements: (role: OutputRole, sourceIndex: number, destinationIndex: number) => {
      const current = get().outputCustomization || DEFAULT_OUTPUT_CUSTOMIZATION;
      const roleConfig = current[role] || DEFAULT_OUTPUT_CUSTOMIZATION[role];
      const items = [...roleConfig.elements];
      if (sourceIndex < 0 || sourceIndex >= items.length || destinationIndex < 0 || destinationIndex >= items.length) {
        return;
      }
      const [moved] = items.splice(sourceIndex, 1);
      items.splice(destinationIndex, 0, moved);
      const reordered = items.map((item, idx) => ({ ...item, order: idx }));
      const updatedMap: OutputCustomizationMap = {
        ...current,
        [role]: { ...roleConfig, elements: reordered },
      };
      get().applyOutputConfigs(updatedMap);
    },

    addOutputElement: (role: OutputRole, element: OutputElementConfig) => {
      const current = get().outputCustomization || DEFAULT_OUTPUT_CUSTOMIZATION;
      const roleConfig = current[role] || DEFAULT_OUTPUT_CUSTOMIZATION[role];
      const updatedMap: OutputCustomizationMap = {
        ...current,
        [role]: {
          ...roleConfig,
          elements: [...roleConfig.elements, element],
        },
      };
      get().applyOutputConfigs(updatedMap);
    },

    removeOutputElement: (role: OutputRole, elementId: string) => {
      const current = get().outputCustomization || DEFAULT_OUTPUT_CUSTOMIZATION;
      const roleConfig = current[role] || DEFAULT_OUTPUT_CUSTOMIZATION[role];
      const updatedMap: OutputCustomizationMap = {
        ...current,
        [role]: {
          ...roleConfig,
          elements: roleConfig.elements.filter((el) => el.id !== elementId),
        },
      };
      get().applyOutputConfigs(updatedMap);
    },

    resetOutputConfig: (role?: OutputRole) => {
      let updatedMap: OutputCustomizationMap;
      if (role) {
        const current = get().outputCustomization || DEFAULT_OUTPUT_CUSTOMIZATION;
        updatedMap = {
          ...current,
          [role]: JSON.parse(JSON.stringify(DEFAULT_OUTPUT_CUSTOMIZATION[role])),
        };
      } else {
        updatedMap = JSON.parse(JSON.stringify(DEFAULT_OUTPUT_CUSTOMIZATION));
      }
      get().applyOutputConfigs(updatedMap);
    },

    activatePro: (key: string) => {
      set({ isProUser: true, licenseKey: key });
      if (typeof window !== 'undefined') {
        localStorage.setItem('shotimer_is_pro', 'true');
        localStorage.setItem('shotimer_license_key', key);
      }
      get()._broadcastState();
    },

    deactivatePro: () => {
      set({ isProUser: false, licenseKey: null });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('shotimer_is_pro');
        localStorage.removeItem('shotimer_license_key');
      }
      get()._broadcastState();
    },

    _tick: () => {
      const state = get();
      if (state.status !== 'running' || !state.startedAt) return;

      const activeTimer = state.rundown.find((t) => t.id === state.activeTimerId);
      const timerType = activeTimer?.type || 'countdown';
      const now = Date.now();
      const elapsed = (now - state.startedAt) / 1000;

      // Clock Mode: acts as a live wall-clock stage timer
      if (timerType === 'clock') {
        set({
          elapsedTime: Math.max(0, elapsed),
          timeRemaining: 0,
          overtimeSeconds: 0,
        });
        return;
      }

      const previousRemaining = state.targetDuration - state.elapsedTime;
      const remaining = state.targetDuration - elapsed;
      const crossed = previousRemaining > 0 && remaining <= 0;
      const authority = typeof window === 'undefined' || canControlRoom(state.roomId);
      if (activeTimer && !state.isAudioMuted && authority) {
        const { yellowTime, redTime } = activeTimer.thresholds;
        if (crossed && activeTimer.sounds.soundOnFinish) soundSynth.play('gong', activeTimer.sounds.volume);
        else if (redTime > 0 && previousRemaining > redTime && remaining <= redTime && activeTimer.sounds.soundOnRed) soundSynth.play('digital_beep', activeTimer.sounds.volume);
        else if (yellowTime > 0 && previousRemaining > yellowTime && remaining <= yellowTime && activeTimer.sounds.soundOnYellow) soundSynth.play(activeTimer.sounds.chimeStyle, activeTimer.sounds.volume);
      }
      const index = state.rundown.findIndex(item => item.id === state.activeTimerId);
      const next = activeTimer?.autoStartNext ? state.rundown[index + 1] : undefined;
      if (crossed && next && authority) {
        get().selectTimer(next.id); get().start(); return;
      }
      if (remaining <= 0 && activeTimer?.finishBehavior === 'hold') {
        set({ status: 'finished', timeRemaining: 0, elapsedTime: state.targetDuration, overtimeSeconds: 0, pausedAt: state.startedAt + state.targetDuration * 1000 });
        worker?.postMessage({ command: 'stop' });
        if (authority) get()._broadcastState();
        return;
      }
      set({ timeRemaining: timerType === 'countup' ? Math.max(0, remaining) : remaining, elapsedTime: Math.max(0, elapsed), overtimeSeconds: Math.max(0, -remaining) });
    },

    _broadcastState: () => {
      const state = get();
      const syncMsg: SyncMessage = {
        type: 'SYNC_FULL_STATE',
        roomId: state.roomId,
        senderId: CLIENT_ID,
        timestamp: Date.now(),
        payload: {
          roomId: state.roomId,
          roomName: state.roomName,
          activeTimerId: state.activeTimerId,
          status: state.status,
          targetDuration: state.targetDuration,
          timeRemaining: state.timeRemaining,
          elapsedTime: state.elapsedTime,
          startedAt: state.startedAt,
          pausedAt: state.pausedAt,
          overtimeSeconds: state.overtimeSeconds,
          blackout: state.blackout,
          activeMessage: state.activeMessage,
          rundown: state.rundown,
          theme: state.theme,
          outputCustomization: state.outputCustomization,
          isAudioMuted: state.isAudioMuted,
          showStartedAt: state.showStartedAt,
          ...roomControls(state),
        },
      };

      // Only the protected relay can accept show updates.
      broadcastLiveRoomState(state.roomId, syncMsg.payload);
    },

    _applyExternalState: (extState) => {
      if (!extState || typeof extState !== 'object') return;
      if ((extState.resetRevision || 0) < (get().resetRevision || 0)) return;

      const sanitized: Partial<RoomState> = {};
      if (typeof extState.roomName === 'string') sanitized.roomName = sanitizeText(extState.roomName, 100) || 'Stage Room';
      if (Number.isSafeInteger(extState.resetRevision) && (extState.resetRevision || 0) >= 0) sanitized.resetRevision = extState.resetRevision;
      if (extState.showStartedAt === null || (typeof extState.showStartedAt === 'number' && Number.isFinite(extState.showStartedAt))) sanitized.showStartedAt = extState.showStartedAt;
      if (typeof extState.scheduledStartsArmed === 'boolean') sanitized.scheduledStartsArmed = extState.scheduledStartsArmed;
      if (extState.lastScheduledStartKey === null || typeof extState.lastScheduledStartKey === 'string') sanitized.lastScheduledStartKey = extState.lastScheduledStartKey?.slice(0, 180) || null;
      for (const key of ['rundownResetVersion', 'messageDraftVersion'] as const) if (typeof extState[key] === 'string') sanitized[key] = extState[key].slice(0, 80);
      if (['running', 'paused', 'stopped', 'finished'].includes(extState.status as string)) {
        sanitized.status = extState.status;
      }
      if (typeof extState.targetDuration === 'number' && Number.isFinite(extState.targetDuration)) {
        sanitized.targetDuration = Math.max(0, extState.targetDuration);
      }
      if (typeof extState.timeRemaining === 'number' && Number.isFinite(extState.timeRemaining)) {
        sanitized.timeRemaining = extState.timeRemaining;
      }
      if (typeof extState.elapsedTime === 'number' && Number.isFinite(extState.elapsedTime)) {
        sanitized.elapsedTime = Math.max(0, extState.elapsedTime);
      }
      if (extState.startedAt === null || (typeof extState.startedAt === 'number' && Number.isFinite(extState.startedAt))) {
        sanitized.startedAt = extState.startedAt;
      }
      if (extState.pausedAt === null || (typeof extState.pausedAt === 'number' && Number.isFinite(extState.pausedAt))) {
        sanitized.pausedAt = extState.pausedAt;
      }
      if (typeof extState.overtimeSeconds === 'number' && Number.isFinite(extState.overtimeSeconds)) {
        sanitized.overtimeSeconds = Math.max(0, extState.overtimeSeconds);
      }
      if (typeof extState.blackout === 'boolean') {
        sanitized.blackout = extState.blackout;
      }
      if (typeof extState.isAudioMuted === 'boolean') {
        sanitized.isAudioMuted = extState.isAudioMuted;
      }
      if (extState.activeTimerId === null || (typeof extState.activeTimerId === 'string' && extState.activeTimerId.length < 100)) {
        sanitized.activeTimerId = extState.activeTimerId;
      }
      if (extState.activeMessage === null) {
        sanitized.activeMessage = null;
      } else if (extState.activeMessage && typeof extState.activeMessage === 'object') {
        sanitized.activeMessage = {
          id: String(extState.activeMessage.id || ''),
          ...normalizeMessageContent(String(extState.activeMessage.text || ''), extState.activeMessage.richText),
          severity: ['info', 'warning', 'danger'].includes(extState.activeMessage.severity)
            ? extState.activeMessage.severity
            : 'info',
          visible: Boolean(extState.activeMessage.visible),
          isFlashing: Boolean(extState.activeMessage.isFlashing),
          displayMode: extState.activeMessage.displayMode === 'message-only' ? 'message-only' : 'with-timer',
          createdAt: typeof extState.activeMessage.createdAt === 'number'
            ? extState.activeMessage.createdAt
            : Date.now(),
        };
      }
      if (Array.isArray(extState.rundown)) {
        sanitized.rundown = validateAndSanitizeRundown(extState.rundown);
      }
      if (extState.showStartedAt === undefined && typeof sanitized.startedAt === 'number' && (sanitized.status === 'running' || sanitized.status === 'paused')) {
        const items = sanitized.rundown || get().rundown;
        const active = sanitized.activeTimerId ?? get().activeTimerId;
        sanitized.showStartedAt = sanitized.startedAt - items.slice(0, Math.max(0, items.findIndex(item => item.id === active))).reduce((sum, item) => sum + item.durationSeconds, 0) * 1000;
      }
      if (extState.theme && typeof extState.theme === 'object') {
        sanitized.theme = extState.theme;
      }
      if (extState.outputCustomization && typeof extState.outputCustomization === 'object') {
        sanitized.outputCustomization = normalizeOutputCustomization(extState.outputCustomization);
        if (typeof window !== 'undefined') {
          try { localStorage.setItem(`shotimer_output_customization_${get().roomId}`, JSON.stringify(sanitized.outputCustomization)); } catch { /* Keep the live display working even if browser storage is full. */ }
        }
      }

      set((current) => ({
        ...current,
        ...sanitized,
      }));
      if (typeof window !== 'undefined') {
        try {
          if (sanitized.rundown) localStorage.setItem(`shotimer_rundown_${get().roomId}`, JSON.stringify(sanitized.rundown));
          saveRoomControls(get());
        } catch { /* Live resets still apply when device storage is unavailable. */ }
      }

      // Keep local Web Worker in sync with external state
      if (sanitized.status === 'running') {
        if (worker) worker.postMessage({ command: 'start', interval: 50 });
      } else if (sanitized.status === 'paused' || sanitized.status === 'stopped' || sanitized.status === 'finished') {
        if (worker) worker.postMessage({ command: 'stop' });
      }
    },
  };
});

// Setup tick listener from worker
initWorker(() => {
  useTimerStore.getState()._tick();
});

// Scheduled starts are controller-only and remain disarmed after resets, including after reload.
if (typeof window !== 'undefined') {
  setInterval(() => useTimerStore.getState()._checkScheduledStart(), 1000);
}

// Setup Supabase Auth State Listener & Profile Loader
if (typeof window !== 'undefined') {
  subscribeToAuthState(async (user) => {
    useTimerStore.setState({ currentUser: user, isAuthLoading: false });
    if (user) {
      try {
        const profile = await fetchUserProfile(user.uid, user.email || '');
        if (profile) {
          useTimerStore.setState({
            userProfile: profile,
            isProUser: profile.isProUser || useTimerStore.getState().isProUser,
            licenseKey: profile.licenseKey || useTimerStore.getState().licenseKey,
          });
        }

        const cloudRooms = await fetchUserRooms(user.uid);
        if (cloudRooms.length > 0) {
          const currentRooms = useTimerStore.getState().availableRooms;
          const merged = [...currentRooms];
          for (const cr of cloudRooms) {
            if (!merged.some((r) => r.id === cr.id)) {
              merged.push({ id: cr.id, name: cr.name });
            }
          }
          useTimerStore.setState({ availableRooms: merged });
        }
      } catch (err) {
        console.warn('[Shotimer Auth] Error loading user profile:', err);
      }
    } else {
      useTimerStore.setState({ userProfile: null });
    }
  });

  // Subscribe to the authoritative live relay for the active room.
  let unsubLive: (() => void) | null = null;
  const attachLiveListener = (roomId: string) => {
    if (unsubLive) {
      unsubLive();
      unsubLive = null;
    }
    unsubLive = subscribeToLiveRoomState(
      roomId,
      (remoteState) => {
        const local = useTimerStore.getState();
        if (remoteState && remoteState.roomId === local.roomId) {
          // The relay revision already rejected stale snapshots. It may be restoring
          // a rejected optimistic reset from this console, including its reset revision.
          useTimerStore.setState({ resetRevision: remoteState.resetRevision || 0 });
          local._applyExternalState(remoteState);
        }
      },
      undefined,
      (status) => {
        useTimerStore.setState({ cloudSyncStatus: status });
      },
      useTimerStore.getState()
    );
  };

  attachLiveListener(useTimerStore.getState().roomId);

  // When room changes, re-attach the protected listener.
  useTimerStore.subscribe((state, prev) => {
    if (state.roomId !== prev.roomId) {
      attachLiveListener(state.roomId);
    }
  });

}
