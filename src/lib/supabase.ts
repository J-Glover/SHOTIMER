import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if actual configuration credentials are provided
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey !== 'your_anon_key_here'
);

let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    console.info('[Shotimer] Supabase successfully connected with PostgreSQL & Realtime Broadcast.');
  } catch (error) {
    console.warn('[Shotimer] Error initializing Supabase:', error);
  }
} else {
  console.info('[Shotimer] Supabase credentials not detected in .env.local — running in guest/local mode.');
}

export { supabase };
