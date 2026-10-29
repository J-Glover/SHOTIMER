import { useEffect, useState } from 'react';
import { useTimerStore } from '../store/useTimerStore';

export function useOutputSnapshot() {
  const state = useTimerStore();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return { state, now };
}
