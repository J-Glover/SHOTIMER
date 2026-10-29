import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { TimerItem, ThemeConfig } from '../types/timer';

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
    // If attempting to activate license, invoke secure PostgreSQL RPC first
    if (updates.licenseKey) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('claim_pro_license', {
          input_key: updates.licenseKey,
        });
        if (!rpcErr && rpcRes?.success) {
          return true;
        }
      } catch {
        // Fall through to standard update if RPC is not yet created in Supabase Dashboard
      }
    }

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

// Live permissions and sync are enforced by the authoritative Node relay.
export { broadcastLiveRoomState, subscribeToLiveRoomState, requestLiveRoomSync, subscribeToRoomPresence, broadcastRoomPresence } from './liveSync';
export type { CloudSyncStatus } from './liveSync';
