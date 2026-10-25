import { useState } from 'react';
import { 
  X, 
  Paintbrush, 
  Tv, 
  Calendar, 
  MessageSquare, 
  Layers, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  RotateCcw, 
  ExternalLink,
  Type,
  Image as ImageIcon,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Check
} from 'lucide-react';
import type { 
  OutputRole, 
  AspectRatio 
} from '../../types/timer';
import { useTimerStore } from '../../store/useTimerStore';

interface CustomizeOutputModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: OutputRole;
  onOpenPaywall?: (feature: string) => void;
}

const ROLE_LABELS: Record<OutputRole, string> = {
  viewer: 'Stage Monitor',
  agenda: 'Agenda',
  moderator: 'Moderator',
  overlay: 'OBS Overlay',
};

const FONT_OPTIONS = [
  { id: 'JetBrains Mono', label: 'JetBrains Mono (Broadcast Digits)' },
  { id: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (Modern Clean)' },
  { id: 'Inter', label: 'Inter (High Legibility)' },
  { id: 'Roboto', label: 'Roboto (Standard Studio)' },
  { id: 'Bebas Neue', label: 'Bebas Neue (Tall Bold Impact)' },
];

const ASPECT_OPTIONS: { id: AspectRatio; label: string; desc: string }[] = [
  { id: '16:9', label: '16:9', desc: 'Standard Widescreen TV / Monitor' },
  { id: '4:3', label: '4:3', desc: 'Legacy Stage Projector' },
  { id: '9:16', label: '9:16', desc: 'Vertical Stage Wedge / Mobile' },
  { id: '21:9', label: '21:9', desc: 'Ultrawide LED Wall' },
];

const QUICK_COLORS = ['#181818', '#000000', '#141416', '#0F172A', '#1E1B4B', '#022C22'];

export default function CustomizeOutputModal({
  isOpen,
  onClose,
  initialRole = 'viewer',
  onOpenPaywall,
}: CustomizeOutputModalProps) {
  const { 
    outputCustomization, 
    updateOutputConfig, 
    updateOutputElement, 
    reorderOutputElements,
    addOutputElement, 
    removeOutputElement, 
    resetOutputConfig,
    activeTimerId,
    rundown,
    timeRemaining,
    isProUser,
    roomId
  } = useTimerStore();

  const [activeRole, setActiveRole] = useState<OutputRole>(initialRole);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'elements' | 'settings'>('elements');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('Saved just now');

  if (!isOpen) return null;

  const activeTimer = rundown.find((t) => t.id === activeTimerId) || rundown[0];
  const currentConfig = outputCustomization?.[activeRole] || {
    aspectRatio: '16:9',
    backgroundColor: '#181818',
    blackoutColor: '#000000',
    fontFamily: 'JetBrains Mono',
    elements: [],
  };

  const handleUpdate = (updates: Partial<typeof currentConfig>) => {
    updateOutputConfig(activeRole, updates);
    setSaveStatus('Saving changes...');
    setTimeout(() => setSaveStatus('Saved just now'), 600);
  };

  const handleToggleVisibility = (elementId: string, currentVisible: boolean) => {
    updateOutputElement(activeRole, elementId, { visible: !currentVisible });
    setSaveStatus('Saved just now');
  };

  const handleResetCurrentRole = () => {
    resetOutputConfig(activeRole);
    setSaveStatus(`Reset ${ROLE_LABELS[activeRole]} to default`);
    setTimeout(() => setSaveStatus('Saved just now'), 2000);
  };

  const handleResetAllDisplays = () => {
    resetOutputConfig();
    setSaveStatus('Reset all displays to default');
    setTimeout(() => setSaveStatus('Saved just now'), 2000);
  };

  const handleMoveElement = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < currentConfig.elements.length) {
      reorderOutputElements(activeRole, index, targetIndex);
    }
  };

  const handleAddCustomText = () => {
    const newId = `el-text-${Date.now()}`;
    addOutputElement(activeRole, {
      id: newId,
      type: 'customText',
      label: 'Custom Text Note',
      visible: true,
      order: currentConfig.elements.length,
      customValue: 'Main Stage • Conf 2026',
    });
    setShowAddMenu(false);
  };

  const handleAddLogo = () => {
    const newId = `el-logo-${Date.now()}`;
    addOutputElement(activeRole, {
      id: newId,
      type: 'logo',
      label: 'Brand / Sponsor Logo',
      visible: true,
      order: currentConfig.elements.length,
      customValue: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=60',
    });
    setShowAddMenu(false);
  };

  // Helper formatting for live preview digits
  const formatSeconds = (sec: number) => {
    const abs = Math.abs(Math.floor(sec));
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Check visible elements
  const isElementVisible = (type: string) => {
    const el = currentConfig.elements.find((e) => e.type === type);
    return el ? el.visible : true;
  };

  const customLogoElement = currentConfig.elements.find((e) => e.type === 'logo' && e.visible);
  const customTextElement = currentConfig.elements.find((e) => e.type === 'customText' && e.visible);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-6xl h-[92vh] max-h-[850px] bg-[#1C1C1E] border border-neutral-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ====================================================================
            HEADER
            ==================================================================== */}
        <header className="px-5 py-3.5 border-b border-neutral-800 bg-[#161618] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Customize Output &ldquo;{ROLE_LABELS[activeRole]}&rdquo;</span>
              </h2>
            </div>

            {/* Pro Badge Notice */}
            <div className="hidden md:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isProUser ? 'Pro Studio Unlocked' : 'Premium Feature: Customizing an output requires a license.'}</span>
              {!isProUser && onOpenPaywall && (
                <button
                  onClick={() => onOpenPaywall('Custom Output Layouts & Aspect Ratios')}
                  className="underline hover:text-white ml-1 font-semibold"
                >
                  Pricing ↗
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/app/?room=${encodeURIComponent(roomId)}&view=${activeRole}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 border border-neutral-700 flex items-center gap-1.5 transition-colors"
              title="Open full output in new window"
            >
              <span>Live Output</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ====================================================================
            MAIN BODY (SPLIT CANVAS & SIDEBAR)
            ==================================================================== */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          
          {/* ------------------------------------------------------------------
              LEFT / CENTER CANVAS WORKSPACE
              ------------------------------------------------------------------ */}
          <div className="flex-1 flex flex-col bg-[#121214] p-4 sm:p-6 overflow-y-auto items-center justify-center relative">
            
            {/* Output Switcher Tabs & Dedicated Default Reset Button */}
            <div className="w-full max-w-3xl mb-4 flex items-center justify-between gap-2 shrink-0 flex-wrap">
              <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 gap-1">
                {(['viewer', 'agenda', 'moderator', 'overlay'] as OutputRole[]).map((role) => {
                  const isActive = activeRole === role;
                  const Icon = role === 'viewer' ? Tv : role === 'agenda' ? Calendar : role === 'moderator' ? MessageSquare : Layers;
                  return (
                    <button
                      key={role}
                      onClick={() => setActiveRole(role)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-neutral-800 text-amber-400 border border-amber-500/40 shadow-sm'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{ROLE_LABELS[role]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dedicated Default Button for Current Active Role */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetCurrentRole}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242428] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 hover:border-amber-500/60 text-xs font-semibold transition-all group shadow-sm active:scale-95 cursor-pointer"
                  title={`Reset ${ROLE_LABELS[activeRole]} to default layout and positions`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-400 group-hover:-rotate-45 transition-transform" />
                  <span>Default</span>
                </button>

                <div className="text-xs text-neutral-400 font-mono hidden sm:block">
                  Ratio: <strong className="text-white">{currentConfig.aspectRatio}</strong>
                </div>
              </div>
            </div>

            {/* WYSIWYG Output Screen Canvas */}
            <div className="w-full max-w-3xl flex items-center justify-center my-auto">
              <div 
                className={`w-full relative rounded-2xl border border-neutral-700/80 shadow-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between p-6 ${
                  currentConfig.aspectRatio === '16:9'
                    ? 'aspect-video max-w-[700px]'
                    : currentConfig.aspectRatio === '4:3'
                    ? 'aspect-[4/3] max-w-[560px]'
                    : currentConfig.aspectRatio === '9:16'
                    ? 'aspect-[9/16] max-w-[340px] max-h-[500px]'
                    : 'aspect-[21/9] max-w-[760px]'
                }`}
                style={{
                  backgroundColor: currentConfig.backgroundColor,
                  fontFamily: currentConfig.fontFamily,
                  backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.12) 1.5px, transparent 1.5px)`,
                  backgroundSize: '24px 24px',
                }}
              >
                {/* Canvas Overlay Tint for Contrast */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-90"
                  style={{ backgroundColor: currentConfig.backgroundColor }}
                />

                {/* ROLE: OBS BROADCAST LOWER-THIRD OVERLAY */}
                {activeRole === 'overlay' ? (
                  <div className="relative z-10 w-full h-full flex flex-col justify-end select-none">
                    <div className="self-start bg-neutral-900/90 backdrop-blur-md border border-neutral-700/80 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-6">
                      <div className="flex flex-col">
                        {isElementVisible('segmentTitle') && (
                          <span className="text-white font-bold text-sm sm:text-base leading-tight truncate max-w-[240px]">
                            {activeTimer?.title || 'Keynote Presentation'}
                          </span>
                        )}
                        {isElementVisible('speaker') && activeTimer?.speaker && (
                          <span className="text-neutral-400 text-xs font-medium">{activeTimer.speaker}</span>
                        )}
                      </div>
                      <div className="h-7 w-px bg-neutral-700" />
                      {isElementVisible('timer') && (
                        <div className="tabular-numbers font-mono font-bold text-2xl sm:text-3xl tracking-tight text-white">
                          {formatSeconds(timeRemaining || activeTimer?.durationSeconds || 600)}
                        </div>
                      )}
                      {isElementVisible('onAirIndicator') && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase tracking-wider">
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>
                ) : activeRole === 'agenda' ? (
                  /* ROLE: AGENDA RUNDOWN */
                  <div className="relative z-10 w-full h-full flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
                      <div>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400">Live Schedule &amp; Rundown</span>
                        <h3 className="text-sm font-bold text-white">Main Auditorium</h3>
                      </div>
                      {isElementVisible('onAirIndicator') && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          🟢 ON TIME
                        </span>
                      )}
                    </div>

                    <div className="flex-1 bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3 space-y-2 overflow-hidden my-1">
                      <div className="flex items-center justify-between text-xs font-bold text-white border-b border-neutral-800 pb-1.5">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          <span className="truncate">1. {activeTimer?.title || 'Keynote Presentation'}</span>
                        </div>
                        <span className="font-mono text-emerald-400 shrink-0">10:00 (LIVE)</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-neutral-400">
                        <span className="truncate">2. Panel Discussion (James)</span>
                        <span className="font-mono shrink-0">25:00</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span className="truncate">3. Breakout Workshop</span>
                        <span className="font-mono shrink-0">15:00</span>
                      </div>
                    </div>

                    {isElementVisible('timeOfDay') && (
                      <div className="text-[11px] font-mono text-neutral-400 text-right pt-1">
                        Wall Clock: 20:51:11
                      </div>
                    )}
                  </div>
                ) : activeRole === 'moderator' ? (
                  /* ROLE: MODERATOR VIEW */
                  <div className="relative z-10 w-full h-full flex flex-col justify-between select-none">
                    <div className="border-b border-neutral-800 pb-1.5 mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-400">Moderator Stage Cue Portal</span>
                      <span className="text-[10px] text-neutral-400">Live Stage Feed</span>
                    </div>

                    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 flex items-center justify-between shadow-md mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] uppercase font-medium text-neutral-400">On Stage Now</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">⚡ Linked</span>
                        </div>
                        <div className="text-sm font-bold text-white truncate max-w-[200px]">{activeTimer?.title || 'Keynote Presentation'}</div>
                        {activeTimer?.speaker && <div className="text-[11px] text-neutral-400">{activeTimer.speaker}</div>}
                      </div>
                      {isElementVisible('timer') && (
                        <div className="text-2xl font-black font-mono text-white">
                          {formatSeconds(timeRemaining || activeTimer?.durationSeconds || 600)}
                        </div>
                      )}
                    </div>

                    {isElementVisible('speakerNotes') && (
                      <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-lg p-2 text-[11px] text-neutral-300">
                        <div className="text-[9px] uppercase font-bold text-amber-400 mb-0.5">Speaker Cues</div>
                        <div>{activeTimer?.notes || 'Wrap up speech in 2 minutes. Prepare Q&amp;A.'}</div>
                      </div>
                    )}

                    {isElementVisible('timeOfDay') && (
                      <div className="text-[10px] font-mono text-neutral-500 text-right mt-1">
                        Clock: 20:51:11
                      </div>
                    )}
                  </div>
                ) : (
                  /* ROLE: STAGE MONITOR (DEFAULT) */
                  <>
                    {/* --- CANVAS TOP BAR (AUTHENTIC DEFAULT POSITIONS) --- */}
                    <div className="relative z-10 flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        {/* Live Segment Title */}
                        {isElementVisible('segmentTitle') && (
                          <div className="text-base sm:text-xl font-bold text-white tracking-tight drop-shadow truncate max-w-[280px] sm:max-w-md">
                            {activeTimer?.title || 'Segment Title'}
                          </div>
                        )}
                        {/* Speaker */}
                        {isElementVisible('speaker') && activeTimer?.speaker && (
                          <div className="text-xs sm:text-sm text-neutral-400 font-medium">
                            {activeTimer.speaker}
                          </div>
                        )}
                        {/* Speaker Notes */}
                        {isElementVisible('speakerNotes') && activeTimer?.notes && (
                          <div className="mt-1 text-xs text-amber-300 bg-neutral-900/90 border border-amber-500/30 px-2 py-0.5 rounded-lg inline-block self-start">
                            💡 {activeTimer.notes}
                          </div>
                        )}
                        {/* Custom Text */}
                        {customTextElement && (
                          <div className="text-[11px] text-amber-300 font-medium mt-1">
                            📌 {customTextElement.customValue || 'Custom Label'}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Custom Logo */}
                        {customLogoElement && customLogoElement.customValue && (
                          <img 
                            src={customLogoElement.customValue} 
                            alt="Stage Logo" 
                            className="h-6 sm:h-8 max-w-[120px] object-contain rounded drop-shadow"
                          />
                        )}

                        {/* On Air Indicator */}
                        {isElementVisible('onAirIndicator') && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            <span>LIVE</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* --- CANVAS CENTER (MASSIVE TIMER DIGITS) --- */}
                    <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2 text-center">
                      {isElementVisible('timer') && (
                        <div className="text-5xl sm:text-7xl md:text-8xl font-black text-white tracking-tighter tabular-numbers drop-shadow-2xl">
                          {formatSeconds(timeRemaining || activeTimer?.durationSeconds || 600)}
                        </div>
                      )}
                    </div>

                    {/* --- CANVAS BOTTOM AREA (AUTHENTIC DEFAULT POSITIONS) --- */}
                    <div className="relative z-10 w-full flex flex-col gap-2">
                      {/* Full-width Progress Bar */}
                      {isElementVisible('progressBar') && (
                        <div className="w-full h-3 sm:h-3.5 bg-neutral-800/80 rounded-full overflow-hidden p-0.5 border border-white/10">
                          <div className="h-full rounded-full bg-emerald-500 shadow-[0_0_12px_#10B981] w-3/4" />
                        </div>
                      )}

                      {/* Footer Row: Time of Day on Left, Up Next on Right */}
                      <div className="flex items-center justify-between text-[11px] sm:text-xs text-neutral-400 font-medium">
                        {isElementVisible('timeOfDay') ? (
                          <div className="font-mono text-neutral-300">
                            20:51:11
                          </div>
                        ) : <div />}

                        {isElementVisible('upNext') && (
                          <div className="truncate text-neutral-300 font-light">
                            <span className="text-neutral-500">Up Next: </span>
                            <span className="font-semibold text-neutral-200">Panel Discussion</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* Canvas Hint */}
            <div className="mt-3 text-xs text-neutral-500 text-center">
              💡 <em>Changes update the live <b>{ROLE_LABELS[activeRole]}</b> view across all connected devices in real time.</em>
            </div>

          </div>

          {/* ------------------------------------------------------------------
              RIGHT CONFIGURATION SIDEBAR
              ------------------------------------------------------------------ */}
          <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-neutral-800 bg-[#161618] flex flex-col shrink-0">
            
            {/* Sidebar Navigation Tabs */}
            <div className="flex border-b border-neutral-800 bg-[#141416]">
              <button
                onClick={() => setActiveSidebarTab('elements')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                  activeSidebarTab === 'elements'
                    ? 'border-amber-500 text-white bg-neutral-800/30'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                Elements ({currentConfig.elements.length})
              </button>
              <button
                onClick={() => setActiveSidebarTab('settings')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                  activeSidebarTab === 'settings'
                    ? 'border-amber-500 text-white bg-neutral-800/30'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                Display Settings
              </button>
            </div>

            {/* Sidebar Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* ==============================================================
                  TAB 1: ELEMENTS MANAGER
                  ============================================================== */}
              {activeSidebarTab === 'elements' && (
                <div className="space-y-4">
                  
                  {/* Top Add Button Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Stage Elements
                    </span>

                    <div className="relative">
                      <button
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-1 hover:bg-amber-400 transition-colors shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>

                      {showAddMenu && (
                        <div className="absolute right-0 top-8 z-30 w-44 bg-[#242428] border border-neutral-700 rounded-xl shadow-2xl p-1.5 space-y-1">
                          <button
                            onClick={handleAddLogo}
                            className="w-full px-3 py-1.5 text-xs text-left rounded-lg hover:bg-neutral-700/60 flex items-center gap-2 text-neutral-200"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                            <span>Logo / Sponsor</span>
                          </button>
                          <button
                            onClick={handleAddCustomText}
                            className="w-full px-3 py-1.5 text-xs text-left rounded-lg hover:bg-neutral-700/60 flex items-center gap-2 text-neutral-200"
                          >
                            <Type className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Custom Text Label</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Elements List */}
                  <div className="space-y-2">
                    {currentConfig.elements.map((el, index) => (
                      <div 
                        key={el.id}
                        className={`p-3 rounded-xl border transition-all ${
                          el.visible 
                            ? 'bg-[#1F1F23] border-neutral-700/80 text-white' 
                            : 'bg-neutral-900/60 border-neutral-800 text-neutral-500 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <GripVertical className="w-4 h-4 text-neutral-600 shrink-0 cursor-grab" />
                            
                            <button
                              type="button"
                              onClick={() => handleToggleVisibility(el.id, el.visible)}
                              className={`p-1 rounded transition-colors ${
                                el.visible ? 'text-amber-400 hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-300'
                              }`}
                              title={el.visible ? 'Hide from stage display' : 'Show on stage display'}
                            >
                              {el.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>

                            <span className="text-xs font-semibold truncate">
                              {el.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Reorder Arrows */}
                            <button
                              disabled={index === 0}
                              onClick={() => handleMoveElement(index, 'up')}
                              className="p-1 text-neutral-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={index === currentConfig.elements.length - 1}
                              onClick={() => handleMoveElement(index, 'down')}
                              className="p-1 text-neutral-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete custom elements */}
                            {(el.type === 'logo' || el.type === 'customText') && (
                              <button
                                onClick={() => removeOutputElement(activeRole, el.id)}
                                className="p-1 text-neutral-400 hover:text-red-400 transition-colors ml-1"
                                title="Remove element"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Editable Custom Value (for Logo or Custom Text) */}
                        {el.visible && (el.type === 'customText' || el.type === 'logo') && (
                          <div className="mt-2.5 pt-2 border-t border-neutral-800/80">
                            <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">
                              {el.type === 'logo' ? 'Logo Image URL' : 'Custom Text Message'}
                            </label>
                            <input 
                              type="text"
                              value={el.customValue || ''}
                              onChange={(e) => updateOutputElement(activeRole, el.id, { customValue: e.target.value })}
                              placeholder={el.type === 'logo' ? 'https://.../logo.png' : 'Enter stage text...'}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-amber-500 font-mono"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* ==============================================================
                  TAB 2: DISPLAY SETTINGS
                  ============================================================== */}
              {activeSidebarTab === 'settings' && (
                <div className="space-y-5">
                  
                  {/* Aspect Ratio */}
                  <div>
                    <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2">
                      Aspect Ratio
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {ASPECT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleUpdate({ aspectRatio: opt.id })}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            currentConfig.aspectRatio === opt.id
                              ? 'bg-amber-500/10 border-amber-500 text-white shadow-sm'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <div className="font-bold text-xs">{opt.label}</div>
                          <div className="text-[10px] text-neutral-500 truncate">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Color */}
                  <div>
                    <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2">
                      Background Color
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="color" 
                        value={currentConfig.backgroundColor}
                        onChange={(e) => handleUpdate({ backgroundColor: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-neutral-700 bg-transparent cursor-pointer p-0.5"
                      />
                      <input 
                        type="text"
                        value={currentConfig.backgroundColor}
                        onChange={(e) => handleUpdate({ backgroundColor: e.target.value })}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-amber-500"
                        placeholder="#181818"
                      />
                    </div>
                    {/* Quick swatches */}
                    <div className="flex items-center gap-1.5">
                      {QUICK_COLORS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => handleUpdate({ backgroundColor: col })}
                          className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
                            currentConfig.backgroundColor === col ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-neutral-700'
                          }`}
                          style={{ backgroundColor: col }}
                          title={col}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Blackout Color */}
                  <div>
                    <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2">
                      Blackout Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={currentConfig.blackoutColor}
                        onChange={(e) => handleUpdate({ blackoutColor: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-neutral-700 bg-transparent cursor-pointer p-0.5"
                      />
                      <input 
                        type="text"
                        value={currentConfig.blackoutColor}
                        onChange={(e) => handleUpdate({ blackoutColor: e.target.value })}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-amber-500"
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2">
                      Typography Font Family
                    </label>
                    <select
                      value={currentConfig.fontFamily}
                      onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reset Output */}
                  <div className="pt-4 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => resetOutputConfig(activeRole)}
                      className="w-full py-2 px-3 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-neutral-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Reset &ldquo;{ROLE_LABELS[activeRole]}&rdquo; to Default</span>
                    </button>
                  </div>

                </div>
              )}

            </div>

            {/* Sidebar Footer Info */}
            <div className="p-4 border-t border-neutral-800 bg-[#121214] flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>{saveStatus}</span>
              </span>
              <span className="font-mono text-[11px] text-neutral-500">{activeRole}</span>
            </div>

          </aside>

        </div>

        {/* ====================================================================
            MODAL FOOTER
            ==================================================================== */}
        <footer className="px-6 py-3.5 border-t border-neutral-800 bg-[#161618] flex items-center justify-between shrink-0 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400">
              Auto-syncs with all connected stage monitors and secondary views.
            </span>
            <span className="text-neutral-600 hidden sm:inline">•</span>
            <button
              onClick={handleResetAllDisplays}
              className="text-xs text-neutral-400 hover:text-amber-400 underline underline-offset-2 transition-colors flex items-center gap-1 cursor-pointer"
              title="Reset all 4 displays (Stage Monitor, Agenda, Moderator, OBS Overlay) to default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset all displays to default</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save &amp; Apply</span>
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
