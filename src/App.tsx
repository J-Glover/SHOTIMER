import { useState, useEffect } from 'react';
import type { ActiveView } from './types/timer';
import ControllerView from './views/ControllerView';
import ViewerView from './views/ViewerView';
import AgendaView from './views/AgendaView';
import ModeratorView from './views/ModeratorView';
import OverlayView from './views/OverlayView';
import { useTimerStore } from './store/useTimerStore';
import { Sliders, Tv, Calendar, MessageSquare, Layers, ArrowLeft } from 'lucide-react';

export default function App() {
  const { start, pause, reset, nextTimer, previousTimer, toggleBlackout, status } = useTimerStore();

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
      // Don't trigger hotkeys if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        status === 'running' ? pause() : start();
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
  }, [status, start, pause, reset, nextTimer, previousTimer, toggleBlackout]);

  return (
    <div className="min-h-screen bg-[#141414] text-neutral-200 flex flex-col font-sans">
      {/* Subtle Top View Switcher Dock (only visible on Controller or when not in fullscreen Viewer/Overlay) */}
      {currentView !== 'viewer' && currentView !== 'overlay' && (
        <div className="bg-[#181818] border-b border-neutral-800 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <a
              href="/"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors mr-2 border-r border-neutral-800 pr-3"
              title="Return to Shotimer Homepage"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="font-medium hidden sm:inline">Shotimer Home</span>
            </a>
            {[
              { id: 'controller', label: 'Controller', icon: Sliders },
              { id: 'viewer', label: 'Stage Monitor', icon: Tv },
              { id: 'agenda', label: 'Agenda', icon: Calendar },
              { id: 'moderator', label: 'Moderator', icon: MessageSquare },
              { id: 'overlay', label: 'OBS Overlay', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = currentView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleViewChange(tab.id as ActiveView)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                    isActive
                      ? 'bg-neutral-700 text-white font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-neutral-500 hidden sm:block">
            Hotkeys: <span className="text-neutral-400 font-mono">[Space]</span> Start/Pause • <span className="text-neutral-400 font-mono">[R]</span> Reset • <span className="text-neutral-400 font-mono">[B]</span> Blackout
          </div>
        </div>
      )}

      {/* Render Active View */}
      <div className="flex-1 flex flex-col">
        {currentView === 'controller' && (
          <ControllerView onNavigateView={(v) => handleViewChange(v)} />
        )}
        {currentView === 'viewer' && <ViewerView />}
        {currentView === 'agenda' && (
          <AgendaView onBackToController={() => handleViewChange('controller')} />
        )}
        {currentView === 'moderator' && (
          <ModeratorView onBackToController={() => handleViewChange('controller')} />
        )}
        {currentView === 'overlay' && <OverlayView />}
      </div>
    </div>
  );
}
