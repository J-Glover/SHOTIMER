import { Monitor, Wifi } from 'lucide-react';
import { useConnectionsStore } from '../../hooks/useRoomPresence';
import { useTimerStore } from '../../store/useTimerStore';

const names = { viewer: 'Stage monitor', controller: 'Controller', agenda: 'Agenda', moderator: 'Moderator', overlay: 'OBS overlay' };
export default function ConnectionsPanel({ now }: { now: number }) {
  const peers = useConnectionsStore(s => s.peers);
  const roomId = useTimerStore(s => s.roomId);
  const cloud = useTimerStore(s => s.cloudSyncStatus);
  const current = peers.filter(peer => peer.roomId === roomId);
  const screens = current.filter(peer => peer.role !== 'controller');
  return <section className="console-panel" aria-label="Connected screens">
    <div className="panel-heading"><span className="flex items-center gap-2"><Monitor size={16} />Connected screens</span><span className="text-xs text-neutral-400">{screens.length}</span></div>
    <div className="panel-body">
      {!current.length ? <p className="text-xs text-neutral-400 leading-relaxed">No other screens detected. Open an output from the Outputs menu to connect a display.</p> :
        <ul className="flex flex-col gap-3">{current.map(peer => {
          const age = Math.max(0, Math.floor((now - peer.lastSeen) / 1000));
          return <li key={peer.id} className="flex justify-between gap-3 text-xs">
            <div className="min-w-0"><span className="text-neutral-200">{names[peer.role]}</span><span className="font-mono text-neutral-500 ml-2">{peer.id.slice(0, 4)}</span><p className="text-neutral-500 mt-1">Browser screen</p></div>
            <span className={age > 15 || cloud !== 'connected' ? 'text-amber-400' : 'text-emerald-400'}>{cloud !== 'connected' ? 'Unconfirmed' : age > 15 ? `${age}s ago` : 'Presence seen'}</span>
          </li>;
        })}</ul>}
      <p className="text-[11px] text-neutral-500 mt-4 flex items-start gap-1.5 leading-relaxed"><Wifi size={13} className="shrink-0 mt-0.5" />{cloud === 'connected' ? 'Live server connected. Presence reports do not confirm that a screen has rendered the latest cue.' : 'Live connection unavailable. Screen presence may be stale.'}</p>
    </div>
  </section>;
}
