import { useState } from 'react';
import { useTimerStore } from '../store/useTimerStore';
import { MessageSquare, Bell, ArrowLeft } from 'lucide-react';


interface ModeratorViewProps {
  onBackToController?: () => void;
}

export default function ModeratorView({ onBackToController }: ModeratorViewProps) {
  const { rundown, activeTimerId, timeRemaining, activeMessage, setMessage, clearMessage } = useTimerStore();
  const [msgText, setMsgText] = useState('');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'danger'>('info');

  const activeTimer = rundown.find((t) => t.id === activeTimerId) || rundown[0];

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(Math.abs(totalSec) / 60);
    const secs = Math.abs(totalSec) % 60;
    const sign = totalSec < 0 ? '+' : '';
    return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (!msgText.trim()) return;
    setMessage(msgText.trim(), severity, severity === 'danger');
  };

  return (
    <div className="min-h-screen bg-[#141414] text-neutral-200 p-6 sm:p-10 max-w-2xl mx-auto flex flex-col gap-6 font-sans">
      <header className="flex items-center justify-between border-b border-neutral-800 pb-5">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-amber-400">Moderator Stage Cue Portal</span>
          <h1 className="text-2xl font-bold text-white mt-1">Speaker Cueing & Q&A</h1>
        </div>

        {onBackToController && (
          <button
            onClick={onBackToController}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Console</span>
          </button>
        )}
      </header>

      {/* Active Speaker Status Card */}
      <div className="bg-[#1C1C1C] rounded-xl border border-neutral-800 p-5 flex items-center justify-between shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-medium text-neutral-400">On Stage Now</span>
            {activeTimer?.autoStartNext && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                ⚡ Linked
              </span>
            )}
            {activeTimer?.scheduledStartTime && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-400 bg-neutral-800 border border-neutral-700">
                ⏰ {activeTimer.scheduledStartTime}
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-white mt-0.5">{activeTimer?.title}</h2>
          {activeTimer?.speaker && <p className="text-xs text-neutral-400">{activeTimer.speaker}</p>}
          {activeTimer?.notes && (
            <div className="mt-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded p-2 leading-relaxed">
              <strong className="text-amber-400">Speaker Cues:</strong> {activeTimer.notes}
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-xs text-neutral-500 uppercase">
            {activeTimer?.type === 'countup' ? 'Elapsed' : 'Remaining'}
          </div>
          <div className="tabular-numbers font-mono text-3xl font-bold text-white">
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      {/* Message Composer */}
      <div className="bg-[#1C1C1C] rounded-xl border border-neutral-800 p-6 flex flex-col gap-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Send Flash Note to Confidence Monitor</h3>
          </div>
          {activeMessage && activeMessage.visible && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Live on Stage
            </span>
          )}
        </div>

        <textarea
          rows={3}
          value={msgText}
          onChange={(e) => setMsgText(e.target.value)}
          placeholder="Type message or audience question for speaker..."
          className="w-full bg-[#141414] border border-neutral-700 rounded-lg p-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-emerald-500 resize-none"
        />

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2">
          {[
            '5 MIN LEFT',
            'WRAP UP PLEASE',
            'AUDIENCE Q&A START',
            'MICROPHONE CLOSER',
            'NEXT SLIDE PLEASE',
          ].map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setMsgText(preset);
                setMessage(preset, 'info', false);
              }}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 border border-neutral-700"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Urgency Selection */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs text-neutral-400 mr-1">Alert Level:</span>
          {(['info', 'warning', 'danger'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverity(sev)}
              className={`px-3 py-1 rounded text-xs capitalize font-medium ${
                severity === sev
                  ? sev === 'danger'
                    ? 'bg-red-600 text-white'
                    : sev === 'warning'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-cyan-600 text-white'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Submit / Clear */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSend}
            disabled={!msgText.trim()}
            className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4" />
            <span>Display on Confidence Monitor</span>
          </button>

          {activeMessage && activeMessage.visible && (
            <button
              onClick={clearMessage}
              className="px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-red-400 text-xs font-semibold border border-neutral-700 transition-colors"
            >
              Clear Screen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
