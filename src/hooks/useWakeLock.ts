import { useEffect, useRef, useState } from 'react';

/**
 * Screen Wake Lock hook to prevent the display from sleeping
 * or dimming during live stage events and presentations.
 */
export function useWakeLock(enabled: boolean = true) {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    let cancelled = false;
    let pending = false;
    const requestWakeLock = async () => {
      if (cancelled || pending || wakeLockRef.current || document.visibilityState !== 'visible') return;
      pending = true;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled || document.visibilityState !== 'visible') { await lock.release(); return; }
        wakeLockRef.current = lock;
        setIsLocked(true);

        lock.addEventListener('release', () => {
          if (wakeLockRef.current === lock) wakeLockRef.current = null;
          if (!cancelled) setIsLocked(false);
        });
      } catch (err) {
        // Can fail if battery is ultra low or tab is not active
        console.warn('Wake Lock request denied or unavailable:', err instanceof Error ? err.message : err);
      } finally { pending = false; }
    };

    requestWakeLock();

    // Re-acquire lock if tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);

  return enabled && isLocked;
}
