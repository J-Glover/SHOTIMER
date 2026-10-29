import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface CloudUser {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
}

export interface AuthResponse {
  user: CloudUser | null;
  error?: string;
  requiresEmailConfirmation?: boolean;
}

/**
 * Format raw Supabase User object into normalized CloudUser
 */
export function formatSupabaseUser(user: any): CloudUser | null {
  if (!user) return null;
  return {
    uid: user.id,
    id: user.id,
    email: user.email || null,
    displayName:
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Operator',
  };
}

/**
 * Register a new user with Email and Password
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<AuthResponse> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      user: null,
      error: 'Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local',
    };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });

    if (error) {
      return { user: null, error: formatAuthError(error.message) };
    }

    const formatted = formatSupabaseUser(data.user);
    return { user: formatted, requiresEmailConfirmation: !data.session };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    return { user: null, error: formatAuthError(message) };
  }
}

/**
 * Sign in an existing user with Email and Password
 */
export async function loginWithEmail(email: string, pass: string): Promise<AuthResponse> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      user: null,
      error: 'Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local',
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      return { user: null, error: formatAuthError(error.message) };
    }

    const formatted = formatSupabaseUser(data.user);
    return { user: formatted };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign in failed';
    return { user: null, error: formatAuthError(message) };
  }
}

/**
 * Sign in with Google OAuth via Supabase
 */
export async function loginWithGoogle(): Promise<AuthResponse> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      user: null,
      error: 'Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local',
    };
  }

  try {
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/app/`
      : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      return { user: null, error: formatAuthError(error.message) };
    }

    return { user: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google sign-in failed';
    return { user: null, error: formatAuthError(message) };
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<{ error?: string }> {
  if (!isSupabaseConfigured || !supabase) return {};

  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign out failed';
    return { error: message };
  }
}

/**
 * Send password reset link to user email
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase is not configured yet.' };
  }

  try {
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/app/?auth=reset`
      : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      return { success: false, error: formatAuthError(error.message) };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send reset email';
    return { success: false, error: formatAuthError(message) };
  }
}

export async function updatePassword(password: string): Promise<{ error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { error: 'Account services are unavailable. Please try again later.' };
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) return { error: 'This reset link has expired. Request a new password reset email.' };
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { error: formatAuthError(error.message) } : {};
  } catch { return { error: 'Your password could not be updated. Check your connection and try again.' }; }
}

/**
 * Listen to real-time auth state changes
 */
export function subscribeToAuthState(callback: (user: CloudUser | null) => void): () => void {
  if (!isSupabaseConfigured || !supabase) {
    callback(null);
    return () => {};
  }

  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(formatSupabaseUser(session?.user ?? null));
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(formatSupabaseUser(session?.user ?? null));
  });

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Helper to make Supabase error messages user-friendly
 */
function formatAuthError(msg: string): string {
  if (msg.includes('Unsupported provider') || msg.includes('provider is not enabled')) {
    return 'Google sign-in is not available yet. Please use email and password.';
  }
  if (msg.includes('User already registered') || msg.includes('already in use')) {
    return 'This email is already registered. Please sign in instead.';
  }
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
    return 'Invalid email or password.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Confirm your email address using the link in your inbox, then sign in.';
  }
  if (msg.includes('Password should be at least')) {
    return 'Password must be at least 6 characters.';
  }
  return msg;
}
