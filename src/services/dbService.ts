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

// Active realtime channel registry
const activeChannels = new Map<string, any>();
const broadcastDebounceMap = new Map<string, any>();

/**
 * Broadcast active room state to remote stage monitors & OBS overlays across the internet
 * Uses Supabase Realtime Broadcast (sub-10ms global WebSockets) + debounced persistence.
 */
export async function broadcastLiveRoomState(
  roomId: string,
  state: Partial<RoomState>
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  // 1. Instant WebSocket Realtime Broadcast (zero DB quota consumed, < 20ms latency)
  try {
    let channel = activeChannels.get(roomId);
    if (!channel) {
      channel = supabase.channel(`room:${roomId}`, {
        config: { broadcast: { self: false } },
      });
      channel.subscribe();
      activeChannels.set(roomId, channel);
    }

    channel.send({
      type: 'broadcast',
      event: 'state_update',
      payload: state,
    });
  } catch (err) {
    console.warn('[Shotimer Realtime] WebSocket broadcast error:', err);
  }

  // 2. Debounced persistence in live_sessions table so late-joining screens get immediate state
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
      // live_sessions table optional if Realtime Broadcast is active
    } finally {
      broadcastDebounceMap.delete(roomId);
    }
  }, 150);

  broadcastDebounceMap.set(roomId, timer);
}

/**
 * Subscribe to live room state changes via Supabase Realtime WebSocket channel
 */
export function subscribeToLiveRoomState(
  roomId: string,
  onUpdate: (state: Partial<RoomState>) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const client = supabase;

  // First, fetch the latest stored state from live_sessions table if it exists
  (async () => {
    try {
      const { data } = await client
        .from('live_sessions')
        .select('payload')
        .eq('room_id', roomId)
        .maybeSingle();

      if (data && data.payload) {
        onUpdate(data.payload as Partial<RoomState>);
      }
    } catch {
      // table might not be initialized yet
    }
  })();

  // Subscribe to real-time broadcast channel
  const channel = client.channel(`room:${roomId}`, {
    config: { broadcast: { self: false } },
  });

  channel
    .on('broadcast', { event: 'state_update' }, (payload: any) => {
      if (payload && payload.payload) {
        onUpdate(payload.payload as Partial<RoomState>);
      }
    })
    .subscribe();

  activeChannels.set(roomId, channel);

  return () => {
    if (client) {
      client.removeChannel(channel);
    }
    if (activeChannels.get(roomId) === channel) {
      activeChannels.delete(roomId);
    }
  };
}
