import { useEffect, useState } from 'react';
import { ArrowUpRight, LayoutDashboard, UserRound, Play, Clock3 } from 'lucide-react';
import { useTimerStore, FREE_ROOM_LIMIT, isSampleRundown } from '../store/useTimerStore';
import { roomOverview } from '../utils/roomOverview';
import { dashboardAccess } from '../utils/accountAccess';
import { canControlRoom } from '../services/liveSync';
import { PLAYBACK_LABELS } from '../utils/outputModel';
import AuthModal from '../components/auth/AuthModal';
import AccountSettingsModal from '../components/account/AccountSettingsModal';
import ProPaywallModal from '../components/common/ProPaywallModal';
import '../styles/dashboard.css';

export default function RoomsDashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const state = useTimerStore();
  const [account, setAccount] = useState(false);
  const [authIntent, setAuthIntent] = useState(() => typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('auth') : null);
  const access = dashboardAccess(state.isAuthLoading, !!state.currentUser, authIntent);
  const [pro, setPro] = useState(false);
  const accountName = state.userProfile?.displayName || state.currentUser?.displayName || state.currentUser?.email?.split('@')[0] || 'Operator';
  const clearAuthIntent = () => {
    if (!authIntent) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('auth');
    window.history.replaceState({}, '', url);
    setAuthIntent(null);
  };
  useEffect(() => {
    if (state.isAuthLoading || !state.currentUser || !authIntent || authIntent === 'reset') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('auth');
    window.history.replaceState({}, '', url);
  }, [state.isAuthLoading, state.currentUser, authIntent]);
  const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
  if (access !== 'ready') return <main className="rooms-dashboard">
    <header className="rooms-header"><a className="console-brand" href="/">SHOTIMER</a><a className="console-button" href="/">Back to website</a></header>
    <section className="rooms-intro"><h1>{access === 'loading' ? 'Checking your account…' : 'Welcome to Shotimer'}</h1><p role="status">{access === 'loading' ? 'Restoring your sign-in session.' : 'Sign in to open your rooms and prepare your show.'}</p></section>
    <AuthModal isOpen={access !== 'loading'} required initialMode={access === 'reset' ? 'reset' : authIntent === 'signup' || authIntent === 'register' ? 'register' : 'login'} onClose={() => { window.location.assign('/'); }} onSuccess={clearAuthIntent} />
  </main>;
  return <main className="rooms-dashboard">
    <header className="rooms-header"><a className="console-brand" href="/">SHOTIMER</a><button className="rooms-account signed-in" onClick={() => setAccount(true)}><span className="rooms-account-avatar"><UserRound size={16} /></span><span className="rooms-account-copy"><strong>{accountName}</strong><small>{state.currentUser?.email || 'Signed in'} · Account & rooms</small></span></button></header>
    <section className="rooms-intro"><p className="output-eyebrow">Your workspace</p><h1>Your rooms</h1><p>Choose a room to prepare your rundown and run the show.</p><div className="rooms-plan"><LayoutDashboard size={15} />{state.isProUser ? `${state.availableRooms.length} rooms · Pro preview` : `${state.availableRooms.length} of ${FREE_ROOM_LIMIT} rooms · Free plan`}<button onClick={() => setAccount(true)}>Manage rooms</button></div></section>
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
    <AccountSettingsModal isOpen={account} onClose={() => setAccount(false)} onOpenPaywall={() => setPro(true)} />
    <ProPaywallModal isOpen={pro} onClose={() => setPro(false)} featureName="Shotimer Pro" />
  </main>;
}
