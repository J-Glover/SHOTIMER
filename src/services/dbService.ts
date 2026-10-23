import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { TimerItem, ThemeConfig, RoomState } from '../types/timer';

export interface UserCloudProfile {
  uid: string;
  email: string;
  displayName: string;
  isProUser: boolean;
  licenseKey: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CloudRoomData {
  id: string;
  name: string;
  rundown: TimerItem[];
  theme?: ThemeConfig;
  updatedAt?: string;
}

/**
 * Fetch or initialize a user profile in Supabase
 */
export async function fetchUserProfile(
  uid: string,
  email: string,
  displayName?: string
): Promise<UserCloudProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('[Shotimer DB] Error fetching profile from user_profiles:', error.message);
    }

    if (data) {
      return {
        uid: data.id,
        email: data.email || email,
        displayName: data.display_name || displayName || email.split('@')[0],
        isProUser: Boolean(data.is_pro),
        licenseKey: data.license_key || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    // Default initial profile
    const initialProfile = {
      id: uid,
      email,
      display_name: displayName || email.split('@')[0],
      is_pro: false,
      license_key: null,
      updated_at: new Date().toISOString(),
    };

    // Attempt to insert if table exists
    const { data: inserted } = await supabase
      .from('user_profiles')
      .upsert(initialProfile)
      .select()
      .maybeSingle();

    return {
      uid,
      email,
      displayName: inserted?.display_name || initialProfile.display_name,
      isProUser: Boolean(inserted?.is_pro),
      licenseKey: inserted?.license_key || null,
    };
  } catch (err) {
    console.warn('[Shotimer DB] Profile fetch exception (using local fallback):', err);
    return {
      uid,
      email,
      displayName: displayName || email.split('@')[0],
      isProUser: false,
      licenseKey: null,
    };
  }
}

/**
 * Update user settings or Pro license in Supabase
 */
export async function saveUserSettings(
  uid: string,
  updates: Partial<UserCloudProfile>
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.displayName !== undefined) payload.display_name = updates.displayName;
    if (updates.isProUser !== undefined) payload.is_pro = updates.isProUser;
    if (updates.licenseKey !== undefined) payload.license_key = updates.licenseKey;

    const { error } = await supabase
      .from('user_profiles')
      .update(payload)
      .eq('id', uid);

    if (error) {
      console.warn('[Shotimer DB] Error updating user settings:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Shotimer DB] Exception updating user settings:', err);
    return false;
  }
}

/**
 * Save a room and its rundown schedule for a specific user
 */
export async function saveUserRoom(
  uid: string,
  roomId: string,
  name: string,
  rundown: TimerItem[],
  theme?: ThemeConfig
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error } = await supabase
      .from('rooms')
      .upsert({
        id: roomId,
        user_id: uid,
        name,
        rundown,
        theme: theme || null,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.warn('[Shotimer DB] Error saving user room:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Shotimer DB] Exception saving user room:', err);
    return false;
  }
}

/**
 * Fetch all saved rooms for a specific user
 */
export async function fetchUserRooms(uid: string): Promise<CloudRoomData[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[Shotimer DB] Error fetching rooms:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      rundown: row.rundown || [],
      theme: row.theme || undefined,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.warn('[Shotimer DB] Exception fetching rooms:', err);
    return [];
  }
}

/**
 * Delete a saved room for a user
 */
export async function deleteUserRoom(uid: string, roomId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .eq('user_id', uid);

    if (error) {
      console.warn('[Shotimer DB] Error deleting user room:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Shotimer DB] Exception deleting user room:', err);
    return false;
  }
}

// ==============================================================================
// Managed Supabase Realtime Channels (Two-Way Handshake + Queueing Engine)
// ==============================================================================

export type CloudSyncStatus = 'connected' | 'connecting' | 'offline' | 'local_only';

interface ManagedRoomChannel {
  channel: any;
  status: CloudSyncStatus;
  pendingQueue: Array<{ event: string; payload: any }>;
  stateListeners: Set<(state: Partial<RoomState>) => void>;
  pingListeners: Set<() => void>;
  statusListeners: Set<(status: CloudSyncStatus) => void>;
}

const managedChannels = new Map<string, ManagedRoomChannel>();
const broadcastDebounceMap = new Map<string, any>();

function getOrCreateManagedChannel(roomId: string): ManagedRoomChannel | null {
  if (!isSupabaseConfigured || !supabase) return null;

  let entry = managedChannels.get(roomId);
  if (entry) return entry;

  entry = {
    channel: null,
    status: 'connecting',
    pendingQueue: [],
    stateListeners: new Set(),
    pingListeners: new Set(),
    statusListeners: new Set(),
  };

  const notifyStatus = (st: CloudSyncStatus) => {
    if (!entry) return;
    entry.status = st;
    entry.statusListeners.forEach((fn) => {
      try { fn(st); } catch (e) { console.warn(e); }
    });
  };

  try {
    const ch = supabase.channel(`room:${roomId}`, {
      config: { broadcast: { self: false } },
    });

    ch.on('broadcast', { event: 'state_update' }, (msg: any) => {
      if (msg?.payload && entry) {
        entry.stateListeners.forEach((fn) => {
          try { fn(msg.payload); } catch (e) { console.warn(e); }
        });
      }
    });

    ch.on('broadcast', { event: 'ping_sync' }, () => {
      if (entry) {
        entry.pingListeners.forEach((fn) => {
          try { fn(); } catch (e) { console.warn(e); }
        });
      }
    });

    ch.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        notifyStatus('connected');
        // Flush pending queued messages
        if (entry) {
          while (entry.pendingQueue.length > 0) {
            const item = entry.pendingQueue.shift();
            if (item) {
              ch.send({
                type: 'broadcast',
                event: item.event,
                payload: item.payload,
              }).catch((err: any) => console.warn('[Shotimer Realtime] Flush send error:', err));
            }
          }
        }
      } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        notifyStatus('offline');
      } else if (status === 'CLOSED') {
        notifyStatus('offline');
      }
    });

    entry.channel = ch;
    managedChannels.set(roomId, entry);
    return entry;
  } catch (err) {
    console.warn('[Shotimer Realtime] Error creating Supabase channel:', err);
    return null;
  }
}

/**
 * Broadcast active room state to remote stage monitors & OBS overlays across the internet
 * Uses Supabase Realtime Broadcast (sub-10ms global WebSockets) with send queueing.
 */
export async function broadcastLiveRoomState(
  roomId: string,
  state: Partial<RoomState>
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const entry = getOrCreateManagedChannel(roomId);
  if (entry) {
    if (entry.status === 'connected' && entry.channel) {
      entry.channel.send({
        type: 'broadcast',
        event: 'state_update',
        payload: state,
      }).catch((err: any) => {
        console.warn('[Shotimer Realtime] WebSocket broadcast send failed, queuing:', err);
        entry.pendingQueue.push({ event: 'state_update', payload: state });
      });
    } else {
      // Channel still subscribing; keep only freshest state snapshot in queue
      entry.pendingQueue = [{ event: 'state_update', payload: state }];
    }
  }

  // Debounced persistence in live_sessions table if it exists
  if (broadcastDebounceMap.has(roomId)) {
    clearTimeout(broadcastDebounceMap.get(roomId));
  }

  const timer = setTimeout(async () => {
    if (!supabase) return;
    try {
      await supabase
        .from('live_sessions')
        .upsert({
          room_id: roomId,
          payload: state,
          updated_at: new Date().toISOString(),
        });
    } catch {
      // Optional fallback
    } finally {
      broadcastDebounceMap.delete(roomId);
    }
  }, 200);

  broadcastDebounceMap.set(roomId, timer);
}

/**
 * Request active room state synchronization from any open controller over Supabase Realtime
 */
export function requestLiveRoomSync(roomId: string): void {
  if (!isSupabaseConfigured || !supabase) return;
  const entry = getOrCreateManagedChannel(roomId);
  if (entry) {
    if (entry.status === 'connected' && entry.channel) {
      entry.channel.send({
        type: 'broadcast',
        event: 'ping_sync',
        payload: { timestamp: Date.now() },
      }).catch(() => {});
    } else {
      entry.pendingQueue.push({ event: 'ping_sync', payload: { timestamp: Date.now() } });
    }
  }
}

/**
 * Subscribe to live room state changes via Supabase Realtime WebSocket channel
 */
export function subscribeToLiveRoomState(
  roomId: string,
  onUpdate: (state: Partial<RoomState>) => void,
  onPingSync?: () => void,
  onStatusChange?: (status: CloudSyncStatus) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    onStatusChange?.('local_only');
    return () => {};
  }

  const entry = getOrCreateManagedChannel(roomId);
  if (!entry) return () => {};

  entry.stateListeners.add(onUpdate);
  if (onPingSync) entry.pingListeners.add(onPingSync);
  if (onStatusChange) {
    entry.statusListeners.add(onStatusChange);
    onStatusChange(entry.status);
  }

  // 1. Immediately attempt to fetch stored snapshot from live_sessions table if it exists
  (async () => {
    try {
      const { data, error } = await supabase!
        .from('live_sessions')
        .select('payload')
        .eq('room_id', roomId)
        .maybeSingle();

      if (!error && data && data.payload) {
        onUpdate(data.payload as Partial<RoomState>);
      }
    } catch {
      // Table may not be created yet, WebSocket channel handles live sync
    }
  })();

  // 2. Broadcast a ping_sync so any active controller announces its current running state
  requestLiveRoomSync(roomId);

  return () => {
    entry.stateListeners.delete(onUpdate);
    if (onPingSync) entry.pingListeners.delete(onPingSync);
    if (onStatusChange) entry.statusListeners.delete(onStatusChange);

    // If no more listeners for this room, clean up channel
    if (entry.stateListeners.size === 0 && entry.pingListeners.size === 0) {
      if (supabase && entry.channel) {
        supabase.removeChannel(entry.channel);
      }
      managedChannels.delete(roomId);
    }
  };
}
