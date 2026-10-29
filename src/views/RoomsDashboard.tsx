import { useState } from 'react';
import { ArrowUpRight, LayoutDashboard, UserRound, Play, Clock3 } from 'lucide-react';
import { useTimerStore, FREE_ROOM_LIMIT, isSampleRundown } from '../store/useTimerStore';
import { roomOverview } from '../utils/roomOverview';
import { canControlRoom } from '../services/liveSync';
import { PLAYBACK_LABELS } from '../utils/outputModel';
import AuthModal from '../components/auth/AuthModal';
import AccountSettingsModal from '../components/account/AccountSettingsModal';
import ProPaywallModal from '../components/common/ProPaywallModal';
import '../styles/dashboard.css';

export default function RoomsDashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const state = useTimerStore();
  const [account, setAccount] = useState(false);
  const [auth, setAuth] = useState(false);
  const [pro, setPro] = useState(false);
  const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
  return <main className="rooms-dashboard">
    <header className="rooms-header"><a className="console-brand" href="/">SHOTIMER</a><button className="console-button" onClick={() => state.currentUser ? setAccount(true) : setAuth(true)}><UserRound size={16} />{state.currentUser ? 'Account & rooms' : 'Sign in / Create account'}</button></header>
    <section className="rooms-intro"><p className="output-eyebrow">Your workspace</p><h1>Your rooms</h1><p>Choose a room to prepare your rundown and run the show.</p><div className="rooms-plan"><LayoutDashboard size={15} />{state.isProUser ? `${state.availableRooms.length} rooms · Pro preview` : `${state.availableRooms.length} of ${FREE_ROOM_LIMIT} rooms · Free plan`}<button onClick={() => { if (state.currentUser) setAccount(true); else setAuth(true); }}>Manage rooms</button></div></section>
    <div className="room-cards">{state.availableRooms.map(room => {
      const summary = roomOverview(room, state, read, isSampleRundown);
      const confirmed = summary.current && canControlRoom(room.id);
      return <article className="room-card" key={room.id}>
        <div className="room-card-top"><span className="room-symbol"><Clock3 size={24} /></span><span className={`room-playback ${confirmed ? 'confirmed' : ''}`}>{confirmed && summary.playback ? PLAYBACK_LABELS[summary.playback] : summary.current ? 'Playback unconfirmed' : 'Not open here'}</span></div>
        <div className="room-card-details"><h2>{summary.name}</h2><p>{summary.timerCount === null ? 'Open to view the rundown' : `${summary.timerCount} ${summary.timerCount === 1 ? 'timer' : 'timers'}`}</p>
          {summary.sample && <p className="room-last-opened">Sample rundown · edit it for your show</p>}
          {summary.lastOpened && <p className="room-last-opened">Opened here {new Date(summary.lastOpened).toLocaleDateString()}</p>}
        </div>
        <button className="console-button primary" onClick={() => onOpen(room.id)}><Play size={15} />Open controller<ArrowUpRight size={15} /></button>
      </article>;
    })}</div>
    <section className="rooms-guide"><div><strong>1. Open a room</strong><p>Use or rename any of your included rooms. Existing rundowns are kept.</p></div><div><strong>2. Prepare the show</strong><p>Review the segment names, durations and speaker cues.</p></div><div><strong>3. Connect your screens</strong><p>Use Outputs in the controller to share a protected stage-display link.</p></div></section>
    <p className="rooms-footnote">Opening this dashboard keeps the current timer running. Other rooms’ playback is not monitored here. Scheduled starts require the controller to be open.</p>
    <AuthModal isOpen={auth} onClose={() => setAuth(false)} />
    <AccountSettingsModal isOpen={account} onClose={() => setAccount(false)} onOpenPaywall={() => setPro(true)} />
    <ProPaywallModal isOpen={pro} onClose={() => setPro(false)} featureName="Shotimer Pro" />
  </main>;
}
