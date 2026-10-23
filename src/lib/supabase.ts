import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Default Supabase Cloud credentials (Anon / Publishable keys are safe in frontend bundles)
const DEFAULT_SUPABASE_URL = 'https://yodcnmzgmjcjgxizcowm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable__L0Nx0Gr4xTdpxZrAq0veA_6de4-j8E';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

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
