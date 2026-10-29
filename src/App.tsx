import { useState, useEffect } from 'react';
import type { ActiveView } from './types/timer';
import ControllerView from './views/ControllerView';
import ViewerView from './views/ViewerView';
import AgendaView from './views/AgendaView';
import ModeratorView from './views/ModeratorView';
import OverlayUnavailable from './views/OverlayUnavailable';
import { useTimerStore } from './store/useTimerStore';
import { ArrowLeft } from 'lucide-react';
import StealthGate from './components/common/StealthGate';
import { canUseOperatorShortcut } from './utils/operatorControls';
import { useRoomPresence } from './hooks/useRoomPresence';
import { FullscreenProvider } from './components/common/FullscreenProvider';
import { useFullscreen } from './hooks/useFullscreen';


export default function App() {
  return <FullscreenProvider><AppContent /></FullscreenProvider>;
}

function AppContent() {
  const { immersive } = useFullscreen();
  const { start, pause, reset, nextTimer, previousTimer, toggleBlackout, status, roomId } = useTimerStore();

  // Read view from URL query param if present (e.g., /?view=viewer)
  const getInitialView = (): ActiveView => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view') as ActiveView;
      if (['controller', 'viewer', 'agenda', 'moderator', 'overlay'].includes(v)) {
        return v;
      }
    }
    return 'controller';
  };

  const [currentView, setCurrentView] = useState<ActiveView>(getInitialView);
  useRoomPresence(roomId, currentView);

  useEffect(() => {
    const manifest = document.querySelector<HTMLLinkElement>('#room-manifest');
    if (!manifest) return;
    const params = new URLSearchParams({ room: roomId, view: currentView });
    const current = new URLSearchParams(window.location.search);
    const access = current.get('access') || current.get('key');
    if (access) params.set('access', access);
    manifest.href = `/shotimer.webmanifest?${params}`;
  }, [roomId, currentView]);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      document.querySelectorAll<HTMLDetailsElement>('details.console-dropdown[open]').forEach(menu => {
        if (event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
      });
    };
    const escapeMenu = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('[role="dialog"]')) return;
      const menu = document.querySelector<HTMLDetailsElement>('details.console-dropdown[open]');
      if (menu) { menu.open = false; menu.querySelector<HTMLElement>('summary')?.focus(); }
    };
    document.addEventListener('click', closeMenus);
    document.addEventListener('keydown', escapeMenu);
    return () => { document.removeEventListener('click', closeMenus); document.removeEventListener('keydown', escapeMenu); };
  }, []);

  // Update browser URL query without reloading
  const handleViewChange = (view: ActiveView) => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', view);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Keyboard Shortcuts for live operators
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const modalOpen = !!document.querySelector('[role="dialog"], details[open]');
      if (!document.querySelector('[data-controller-console]') ||
          !canUseOperatorShortcut(e, currentView, modalOpen)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'running') {
          pause();
        } else {
          start();
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        reset();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        nextTimer();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        previousTimer();
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        toggleBlackout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, status, start, pause, reset, nextTimer, previousTimer, toggleBlackout]);

  // Keep view and room in sync with browser navigation (back/forward/URL changes)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view') as ActiveView;
      if (['controller', 'viewer', 'agenda', 'moderator', 'overlay'].includes(v)) {
        setCurrentView(v);
      }
      const rawRoom = params.get('room');
      if (rawRoom) {
        // Sanitize room ID parameter (alphanumeric, dashes, underscores, max 64 chars)
        const cleanRoom = rawRoom.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
        if (cleanRoom && cleanRoom !== useTimerStore.getState().roomId) {
          useTimerStore.getState().switchRoom(cleanRoom);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <StealthGate>
      <div className="shotimer-shell min-h-screen bg-[#141414] text-neutral-200 flex flex-col font-sans" data-immersive={immersive}>
        {/* Subtle Top View Switcher Dock (only visible on Controller or when not in fullscreen Viewer/Overlay) */}
        {currentView !== 'viewer' && currentView !== 'overlay' && (
          <div className="app-navigation bg-[#181818] border-b border-neutral-800 px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <a
                href="/"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors mr-2 border-r border-neutral-800 pr-3"
                title="Return to Shotimer Homepage"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="font-medium hidden sm:inline">Shotimer Home</span>
              </a>
              <span className="text-xs text-neutral-400">{currentView === 'controller' ? 'Controller' : currentView === 'agenda' ? 'Agenda' : 'Moderator'}</span>
              {currentView !== 'controller' && <button className="px-3 py-1 text-xs text-neutral-300 hover:text-white" onClick={() => handleViewChange('controller')}>Back to controller</button>}
            </div>

            <div className="text-[11px] text-neutral-500 hidden sm:block">
              Hotkeys: <span className="text-neutral-400 font-mono">[Space]</span> Start/Pause • <span className="text-neutral-400 font-mono">[R]</span> Reset • <span className="text-neutral-400 font-mono">[B]</span> Blackout
            </div>
          </div>
        )}

        {/* Render Active View */}
        <div className="flex-1 flex flex-col">
          {currentView === 'controller' && <ControllerView />}
          {currentView === 'viewer' && <ViewerView />}
          {currentView === 'agenda' && (
            <AgendaView onBackToController={() => handleViewChange('controller')} />
          )}
          {currentView === 'moderator' && (
            <ModeratorView onBackToController={() => handleViewChange('controller')} />
          )}
          {currentView === 'overlay' && <OverlayUnavailable />}
        </div>
      </div>
    </StealthGate>
  );
}
