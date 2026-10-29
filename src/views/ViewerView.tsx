import { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone } from 'lucide-react';
import { useWakeLock } from '../hooks/useWakeLock';
import { FullscreenButton } from '../components/common/FullscreenProvider';
import { useFullscreen } from '../hooks/useFullscreen';
import { useOutputSnapshot } from '../hooks/useOutputSnapshot';
import SyncStatus from '../components/common/SyncStatus';
import StageDisplay from '../components/outputs/StageDisplay';
import { useTimerStore } from '../store/useTimerStore';

export default function ViewerView() {
  const roomId = useTimerStore(state => state.roomId);
  return <ViewerSession key={roomId} roomId={roomId} />;
}

function ViewerSession({ roomId }: { roomId: string }) {
  const { openHelp } = useFullscreen();
  const awake = useWakeLock(true);
  const { state, now } = useOutputSnapshot();
  const [showControls, setShowControls] = useState(true);
  const [timerOnly, setTimerOnly] = useState(() => { try { return localStorage.getItem(`shotimer_timer_only_${roomId}`) === 'true'; } catch { return false; } });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!toolbarRef.current?.contains(document.activeElement)) setShowControls(false);
    }, 3500);
  }, []);
  const reveal = useCallback(() => { setShowControls(true); scheduleHide(); }, [scheduleHide]);
  useEffect(() => { scheduleHide(); return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, [scheduleHide]);
  return <div className={`fixed inset-0 h-dvh overflow-hidden ${showControls ? '' : 'cursor-none'}`} onPointerDown={reveal} onPointerMove={reveal} onKeyDown={reveal}>
    <StageDisplay state={state} now={now} clean={timerOnly} />
    <SyncStatus stage />
    <div ref={toolbarRef} className={`viewer-toolbar ${showControls ? 'is-visible' : 'is-hidden'}`} aria-label="Display controls" aria-hidden={!showControls} inert={!showControls} onFocusCapture={reveal} onBlurCapture={scheduleHide}>
      <span className="viewer-toolbar-hint">Tap the screen for controls</span>
      <span className="viewer-toolbar-hint">{state.cloudSyncStatus === 'connected' ? 'Live updates confirmed' : state.cloudSyncStatus === 'connecting' ? 'Recovering…' : 'Connection lost'}{awake ? ' · Awake' : ''}</span>
      <button className="screen-control" aria-pressed={timerOnly} onClick={event => { setTimerOnly(value => !value); try { localStorage.setItem(`shotimer_timer_only_${roomId}`, String(!timerOnly)); } catch { /* This screen still updates. */ } if (event.detail > 0) event.currentTarget.blur(); }}>Timer only{timerOnly ? ' · On' : ''}</button>
      <button className="screen-control" onClick={openHelp} aria-label="Phone fullscreen help"><Smartphone size={16} /></button>
      <FullscreenButton viewer />
      <button className="screen-control" onClick={event => { event.currentTarget.blur(); setShowControls(false); }}>Hide controls</button>
    </div>
  </div>;
}
