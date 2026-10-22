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
  RoomInfo 
} from '../types/timer';
import { FREE_ROOMS } from '../types/timer';
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
} from '../services/dbService';

export const FREE_TIMER_LIMIT = 3;
export const FREE_ROOM_LIMIT = 3;

// Unique client identifier for loop prevention
const CLIENT_ID = Math.random().toString(36).substring(2, 9);
const SYNC_CHANNEL_NAME = 'shotimer-sync-bus';

// Safe BroadcastChannel initialization
let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
}

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

const loadRoomData = (roomId: string) => {
  let name = DEFAULT_RUNDOWNS[roomId]?.name || 'Stage Room';
  let rundown = DEFAULT_RUNDOWNS[roomId]?.rundown || DEFAULT_RUNDOWNS['room-1'].rundown;
  if (typeof window !== 'undefined') {
    try {
      const savedName = localStorage.getItem(`shotimer_room_name_${roomId}`);
      if (savedName) name = savedName;
      const savedRundown = localStorage.getItem(`shotimer_rundown_${roomId}`);
      if (savedRundown) rundown = JSON.parse(savedRundown);
    } catch {
      // fallback to default
    }
  }
  return { name, rundown };
};

export interface TimerStore extends RoomState {
  // Rooms
  availableRooms: RoomInfo[];
  switchRoom: (roomId: string) => void;

  // User Accounts & Cloud
  currentUser: CloudUser | null;
  userProfile: UserCloudProfile | null;
  isAuthLoading: boolean;
  createCustomRoom: (name: string) => Promise<string>;
  deleteCustomRoom: (roomId: string) => Promise<void>;

  // Actions
  start: () => void;
  pause: () => void;
  reset: () => void;
  adjustTime: (secondsDelta: number) => void;
  selectTimer: (id: string) => void;
  nextTimer: () => void;
  previousTimer: () => void;
  toggleBlackout: () => void;
  setMessage: (text: string, severity?: 'info' | 'warning' | 'danger', isFlashing?: boolean) => void;
  clearMessage: () => void;
  toggleMute: () => void;
  setChimeStyle: (style: ChimeStyle) => void;
  addTimer: (item: Omit<TimerItem, 'id' | 'order'>) => boolean;
  duplicateTimer: (id: string) => boolean;
  updateTimer: (id: string, updates: Partial<TimerItem>) => void;
  deleteTimer: (id: string) => void;
  reorderRundown: (startIndex: number, endIndex: number) => void;
  toggleAutoStartNext: (id: string) => void;
  setTimerType: (id: string, type: TimerType) => void;
  setScheduledStartTime: (id: string, timeStr?: string) => void;
  setRoomName: (name: string) => void;
  setRundown: (items: TimerItem[]) => void;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
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

  const initialTimer = initialRundown[0] || DEFAULT_RUNDOWNS['room-1'].rundown[0];

  return {
    roomId: initialRoomId,
    roomName: initialRoomName,
    availableRooms: getInitialRooms(),
    currentUser: null,
    userProfile: null,
    isAuthLoading: true,
    activeTimerId: initialTimer.id,
    status: 'stopped',
    targetDuration: initialTimer.durationSeconds,
    timeRemaining: initialTimer.durationSeconds,
    elapsedTime: 0,
    startedAt: null,
    pausedAt: null,
    overtimeSeconds: 0,
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

    createCustomRoom: async (name: string) => {
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

    switchRoom: (newRoomId: string) => {
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
        const url = new URL(window.location.href);
        url.searchParams.set('room', newRoomId);
        window.history.pushState({}, '', url.toString());
      }

      // Load new room data
      const { name, rundown } = loadRoomData(newRoomId);
      const firstTimer = rundown[0] || DEFAULT_RUNDOWNS['room-1'].rundown[0];

      set({
        roomId: newRoomId,
        roomName: name,
        rundown,
        activeTimerId: firstTimer.id,
        status: 'stopped',
        startedAt: null,
        pausedAt: null,
        targetDuration: firstTimer.durationSeconds,
        timeRemaining: firstTimer.durationSeconds,
        elapsedTime: 0,
        overtimeSeconds: 0,
      });

      get()._broadcastState();
    },

    start: () => {
      const state = get();
      if (state.status === 'running') return;

      const now = Date.now();
      let startedAt = now - state.elapsedTime * 1000;
      if (state.status === 'paused' && state.pausedAt) {
        const pauseDuration = now - state.pausedAt;
        startedAt = (state.startedAt || now) + pauseDuration;
      }

      set({
        status: 'running',
        startedAt,
        pausedAt: null,
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
      const duration = activeTimer ? activeTimer.durationSeconds : 600;

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
      });

      get()._broadcastState();
    },

    adjustTime: (deltaSeconds: number) => {
      const state = get();
      const newRemaining = Math.max(-3600, state.timeRemaining + deltaSeconds);
      const newTarget = Math.max(1, state.targetDuration + deltaSeconds);

      let newStartedAt = state.startedAt;
      if (state.status === 'running' && state.startedAt) {
        newStartedAt = state.startedAt - deltaSeconds * 1000;
      }

      set({
        timeRemaining: newRemaining,
        targetDuration: newTarget,
        startedAt: newStartedAt,
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

    setMessage: (text: string, severity: 'info' | 'warning' | 'danger' = 'info', isFlashing: boolean = false) => {
      if (!text.trim()) {
        get().clearMessage();
        return;
      }

      const msg: FlashMessage = {
        id: Math.random().toString(36).substring(2, 9),
        text: text.trim(),
        severity,
        visible: true,
        isFlashing,
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
      set({ rundown: updated });
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
      if (state.activeTimerId === id && updates.durationSeconds !== undefined && state.status === 'stopped') {
        set({
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
      const roomId = get().roomId;
      set({
        rundown: items,
        activeTimerId: items[0]?.id || null,
        targetDuration: items[0]?.durationSeconds || 600,
        timeRemaining: items[0]?.durationSeconds || 600,
        status: 'stopped',
        elapsedTime: 0,
        overtimeSeconds: 0,
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(`shotimer_rundown_${roomId}`, JSON.stringify(items));
      }
      get()._broadcastState();
    },

    updateTheme: (updates: Partial<ThemeConfig>) => {
      set((current) => ({
        theme: { ...current.theme, ...updates },
      }));
      get()._broadcastState();
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

      // Count-up Mode: starts from 00:00 up to targetDuration
      if (timerType === 'countup') {
        const prevElapsed = state.elapsedTime;
        const target = state.targetDuration;
        const remaining = Math.max(0, target - elapsed);
        const isOvertime = elapsed > target;
        const overtime = isOvertime ? elapsed - target : 0;

        // Sound triggers for countup
        if (activeTimer && !state.isAudioMuted) {
          const yellowT = activeTimer.thresholds.yellowTime;
          const redT = activeTimer.thresholds.redTime;
          const prevRemaining = Math.max(0, target - prevElapsed);

          if (prevRemaining > yellowT && remaining <= yellowT && activeTimer.sounds.soundOnYellow) {
            soundSynth.play(activeTimer.sounds.chimeStyle);
          } else if (prevRemaining > redT && remaining <= redT && activeTimer.sounds.soundOnRed) {
            soundSynth.play('digital_beep');
          } else if (prevElapsed < target && elapsed >= target && activeTimer.sounds.soundOnFinish) {
            soundSynth.play('gong');
          }
        }

        set({
          elapsedTime: Math.max(0, elapsed),
          timeRemaining: remaining,
          overtimeSeconds: overtime,
        });

        // Auto-advance chaining when countup hits target duration
        if (activeTimer?.autoStartNext && prevElapsed < target && elapsed >= target) {
          const currentIndex = state.rundown.findIndex((t) => t.id === state.activeTimerId);
          if (currentIndex < state.rundown.length - 1) {
            const nextTimer = state.rundown[currentIndex + 1];
            get().selectTimer(nextTimer.id);
            get().start();
          }
        }
        return;
      }

      // Default Countdown Mode: counts down to 0:00 then into overtime
      const remaining = state.targetDuration - elapsed;
      const prevRemaining = state.timeRemaining;

      // Audio triggers on thresholds
      if (activeTimer && !state.isAudioMuted) {
        const yellowT = activeTimer.thresholds.yellowTime;
        const redT = activeTimer.thresholds.redTime;

        if (prevRemaining > yellowT && remaining <= yellowT && activeTimer.sounds.soundOnYellow) {
          soundSynth.play(activeTimer.sounds.chimeStyle);
        } else if (prevRemaining > redT && remaining <= redT && activeTimer.sounds.soundOnRed) {
          soundSynth.play('digital_beep');
        } else if (prevRemaining > 0 && remaining <= 0 && activeTimer.sounds.soundOnFinish) {
          soundSynth.play('gong');
        }
      }

      set({
        timeRemaining: remaining,
        elapsedTime: Math.max(0, elapsed),
        overtimeSeconds: remaining < 0 ? Math.abs(remaining) : 0,
      });

      // Auto-advance chaining when countdown crosses 00:00
      if (activeTimer?.autoStartNext && prevRemaining > 0 && remaining <= 0) {
        const currentIndex = state.rundown.findIndex((t) => t.id === state.activeTimerId);
        if (currentIndex < state.rundown.length - 1) {
          const nextTimer = state.rundown[currentIndex + 1];
          get().selectTimer(nextTimer.id);
          get().start();
        }
      }
    },

    _broadcastState: () => {
      if (!syncChannel) return;
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
          isAudioMuted: state.isAudioMuted,
        },
      };
      try {
        syncChannel.postMessage(syncMsg);
      } catch (err) {
        console.warn('Sync broadcast error:', err);
      }

      // Broadcast live telemetry to Cloud Firestore for remote stage monitors across the internet
      broadcastLiveRoomState(state.roomId, syncMsg.payload);
    },

    _applyExternalState: (extState) => {
      set((current) => ({
        ...current,
        ...extState,
      }));

      // Keep local Web Worker in sync with external state
      if (extState.status === 'running') {
        if (worker) worker.postMessage({ command: 'start', interval: 50 });
      } else if (extState.status === 'paused' || extState.status === 'stopped') {
        if (worker) worker.postMessage({ command: 'stop' });
      }
    },
  };
});

// Setup tick listener from worker
initWorker(() => {
  useTimerStore.getState()._tick();
});

// Setup Scheduled Start wall-clock interval (checks every 1000ms)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useTimerStore.getState();
    // Only trigger if timer is stopped
    if (state.status !== 'stopped') return;

    const d = new Date();
    const currentHHMM = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    // Find if active timer has scheduled start matching current time
    const activeTimer = state.rundown.find((t) => t.id === state.activeTimerId);
    if (activeTimer && activeTimer.scheduledStartTime === currentHHMM) {
      const triggerKey = `${activeTimer.id}-${currentHHMM}`;
      if ((window as any)._lastScheduledKey !== triggerKey) {
        (window as any)._lastScheduledKey = triggerKey;
        state.start();
        soundSynth.play(activeTimer.sounds.chimeStyle || 'soft_bell');
      }
    }
  }, 1000);
}

// Setup BroadcastChannel receiver for multi-window / multi-tab synchronization with room isolation
if (syncChannel) {
  syncChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
    const msg = event.data;
    if (!msg || msg.senderId === CLIENT_ID) return; // Ignore own messages

    // Room isolation: ignore messages intended for another room
    const currentRoomId = useTimerStore.getState().roomId;
    if (msg.roomId && msg.roomId !== currentRoomId) return;

    if (msg.type === 'SYNC_FULL_STATE' && msg.payload) {
      useTimerStore.getState()._applyExternalState(msg.payload);
    } else if (msg.type === 'PING_SYNC') {
      // Another tab just opened for this room, broadcast current state so it syncs immediately!
      useTimerStore.getState()._broadcastState();
    }
  };

  // Announce to other open tabs that this tab is ready to receive state for its active room
  const activeRoomId = useTimerStore.getState().roomId;
  syncChannel.postMessage({
    type: 'PING_SYNC',
    roomId: activeRoomId,
    senderId: CLIENT_ID,
    timestamp: Date.now(),
  });
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

  // Setup Supabase Realtime Live Session Listener (subscribes to the active room)
  let unsubLive: (() => void) | null = null;
  const attachLiveListener = (roomId: string) => {
    if (unsubLive) {
      unsubLive();
      unsubLive = null;
    }
    unsubLive = subscribeToLiveRoomState(roomId, (remoteState) => {
      const local = useTimerStore.getState();
      if (remoteState && remoteState.roomId === local.roomId) {
        local._applyExternalState(remoteState);
      }
    });
  };

  attachLiveListener(useTimerStore.getState().roomId);

  // When room changes, re-attach cloud live listener
  useTimerStore.subscribe((state, prev) => {
    if (state.roomId !== prev.roomId) {
      attachLiveListener(state.roomId);
    }
  });
}

