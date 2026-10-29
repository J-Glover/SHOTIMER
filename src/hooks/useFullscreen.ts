import { createContext, useContext } from 'react';

export interface FullscreenContextValue {
  immersive: boolean;
  nativeActive: boolean;
  toggle: () => Promise<void>;
  openHelp: () => void;
}
export const FullscreenContext = createContext<FullscreenContextValue | null>(null);

export function useFullscreen() {
  const value = useContext(FullscreenContext);
  if (!value) throw new Error('useFullscreen requires FullscreenProvider');
  return value;
}
