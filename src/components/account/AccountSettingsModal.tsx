import { useState } from 'react';
import { 
  X, 
  User, 
  Bell, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  LogOut, 
  Sparkles,
  Sliders
} from 'lucide-react';
import { useTimerStore } from '../../store/useTimerStore';
import { logoutUser } from '../../services/authService';
import { soundSynth } from '../../audio/soundSynthesizer';
import type { ChimeStyle } from '../../types/timer';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPaywall?: () => void;
}

export default function AccountSettingsModal({ isOpen, onClose, onOpenPaywall }: AccountSettingsModalProps) {
  const {
    currentUser,
    isProUser,
    licenseKey,
    availableRooms,
    roomId,
    switchRoom,
    createCustomRoom,
    deleteCustomRoom,
    theme,
    updateTheme,
  } = useTimerStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'rooms' | 'audio'>('profile');
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [selectedChime, setSelectedChime] = useState<ChimeStyle>('soft_bell');
  const [volume, setVolume] = useState<number>(0.8);

  if (!isOpen) return null;

  const handleAudition = (style: ChimeStyle) => {
    setSelectedChime(style);
    soundSynth.play(style);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setIsCreatingRoom(true);
    try {
      await createCustomRoom(newRoomName.trim());
      setNewRoomName('');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="bg-[#18181B] border border-neutral-700/80 rounded-2xl max-w-xl w-full shadow-2xl flex flex-col text-neutral-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-800 flex items-center justify-between bg-[#141416]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {currentUser?.displayName || currentUser?.email || 'Guest Operator'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                  isProUser 
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' 
                    : 'bg-neutral-800 border border-neutral-700 text-neutral-400'
                }`}>
                  {isProUser ? 'Pro Production' : 'Free Starter'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">{currentUser?.email || 'Local session (not synced to cloud)'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-[#161618] px-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Account & Plan</span>
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'rooms'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Rooms & Stages ({availableRooms.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'audio'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Chimes & Display</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto flex flex-col gap-5">
          
          {/* TAB 1: Profile & Plan */}
          {activeTab === 'profile' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-neutral-400 mb-0.5">Current Subscription</div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    {isProUser ? 'Shotimer Pro (Active)' : 'Free Starter Tier'}
                    {isProUser && <Sparkles className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {isProUser 
                      ? 'Unlimited rooms, CSV import/export, and OLED pitch-black mode enabled.' 
                      : 'Free tier capped at 3 rooms and 3 timers per room.'}
                  </div>
                </div>
                {!isProUser && (
                  <button
                    onClick={() => { onClose(); onOpenPaywall?.(); }}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs rounded-lg transition-all shadow-md active:scale-95"
                  >
                    Upgrade to Pro
                  </button>
                )}
              </div>

              {/* License Status */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-xs font-semibold text-neutral-300 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>License Key</span>
                </div>
                {licenseKey ? (
                  <div className="font-mono text-xs text-emerald-400 bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800">
                    {licenseKey} (Unlocked)
                  </div>
                ) : (
                  <div className="text-xs text-neutral-500">
                    No license key attached. Click Upgrade to activate with evaluation key <code>PRO-STAGE-2026</code>.
                  </div>
                )}
              </div>

              {/* Sign Out */}
              {currentUser && (
                <div className="pt-2">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of Account</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Rooms & Stages */}
          {activeTab === 'rooms' && (
            <div className="flex flex-col gap-4">
              <div className="text-xs text-neutral-400">
                Each room possesses an independent countdown timer, speaker cues, and presentation rundown.
              </div>

              {/* Create Room Form */}
              <form onSubmit={handleCreateRoom} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Room Name (e.g., Executive Boardroom)"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={isCreatingRoom || !newRoomName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Room</span>
                </button>
              </form>

              {/* Room List */}
              <div className="flex flex-col gap-2">
                {availableRooms.map((r) => {
                  const isActive = r.id === roomId;
                  const isDefaultRoom = ['room-1', 'room-2', 'room-3'].includes(r.id);
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 border-amber-500/40 text-white'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-amber-400' : 'bg-neutral-600'}`} />
                        <span className="font-semibold text-sm">{r.name}</span>
                        {isActive && (
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded">
                            Active Stage
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!isActive && (
                          <button
                            onClick={() => switchRoom(r.id)}
                            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold rounded-lg text-neutral-200 transition-colors"
                          >
                            Switch To
                          </button>
                        )}
                        {!isDefaultRoom && (
                          <button
                            onClick={() => deleteCustomRoom(r.id)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-neutral-800 transition-colors"
                            title="Delete Room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Chimes & Display */}
          {activeTab === 'audio' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Procedural Chime Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'soft_bell', label: 'Soft Bell (880Hz)' },
                    { id: 'marimba', label: 'Warm Marimba' },
                    { id: 'gong', label: 'Deep Gong' },
                  ].map((chime) => (
                    <button
                      key={chime.id}
                      type="button"
                      onClick={() => handleAudition(chime.id as ChimeStyle)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        selectedChime === chime.id
                          ? 'bg-amber-500/10 border-amber-500 text-white font-semibold'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs">{chime.label}</div>
                      <div className="text-[10px] text-amber-400 mt-2 flex items-center gap-1 font-mono">
                        ▶ Test Sound
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* OLED Theme Toggle */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">True OLED Black (#000000)</div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    Matches LED video wall bezels without gray backlight bleed.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateTheme({ oledBlack: !theme.oledBlack })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    theme.oledBlack ? 'bg-emerald-500' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      theme.oledBlack ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Master Volume */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-2">
                  <span>Chime Volume</span>
                  <span className="font-mono text-amber-400">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-[#141416] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl transition-colors"
          >
            Close Settings
          </button>
        </div>

      </div>
    </div>
  );
}
