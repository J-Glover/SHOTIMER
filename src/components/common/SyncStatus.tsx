import { useEffect, useState } from 'react';
import { useTimerStore } from '../../store/useTimerStore';
import { getLiveHealth, watchLiveHealth, requestLiveRoomSync } from '../../services/liveSync';

export default function SyncStatus({ stage = false, compact = false }: { stage?: boolean; compact?: boolean }) {
  const roomId = useTimerStore(s => s.roomId);
  const cloudStatus = useTimerStore(s => s.cloudSyncStatus);
  const blackout = useTimerStore(s => s.blackout);
  const message = useTimerStore(s => s.activeMessage);
  const [now, setNow] = useState(Date.now);
  useEffect(() => watchLiveHealth(roomId, () => setNow(Date.now())), [roomId]);
  const health = getLiveHealth(roomId);
  const status = health.lastConfirmed ? health.status : cloudStatus;
  const age = health.lastConfirmed ? Math.max(0, Math.floor((now - health.lastConfirmed) / 1000)) : null;
  const good = status === 'connected' && age !== null && age < 15;
  if (stage && (good || blackout || (message?.visible && message.displayMode === 'message-only'))) return null;
  const label = good ? 'Live updates confirmed' : status === 'denied' ? 'Room access denied' : status === 'connecting' ? 'Connecting / recovering…' : 'Connection lost · display may be stale';
  if (compact) return <details className="console-dropdown sync-details"><summary className={`connection-status ${good ? 'connected' : 'connection-warning'}`}><span />{good ? 'Live connected' : status === 'connecting' ? 'Recovering…' : status === 'denied' ? 'Access denied' : 'Connection lost'}</summary><div className="console-menu"><p className="output-note">{health.detail} {age === null ? 'Waiting for a confirmed show state.' : `Last server contact ${age}s ago.`} {good ? 'Screen presence is reported separately.' : 'Playback controls need a live connection. Running readouts continue; offline commands are not replayed.'}</p>{!good && status !== 'denied' && <button onClick={() => requestLiveRoomSync(roomId)}>Reconnect now</button>}</div></details>;
  return <div role="status" className={stage ? 'live-sync-warning' : compact ? 'live-sync-status compact-warning' : 'live-sync-status'} data-connected={good}>
    <strong>{label}</strong>{!stage && <><span>{age === null ? 'Waiting for the first confirmed show state.' : `Last server contact ${age}s ago.`}</span><span>{good || status === 'denied' ? health.detail : 'Running readouts continue locally. New cues and controls need a live connection; offline actions are not replayed.'}</span>{status !== 'denied' && !good && <button className="console-button" onClick={() => requestLiveRoomSync(roomId)}>Reconnect now</button>}</>}
  </div>;
}
