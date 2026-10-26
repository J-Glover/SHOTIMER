import { useState, useRef } from 'react';
import { X, Upload, FileText, FileSpreadsheet, Palette, Sparkles, Sliders } from 'lucide-react';
import { useTimerStore } from '../../store/useTimerStore';

import { exportRundownJSON, exportRundownCSV, parseCSVToRundown, validateAndSanitizeRundown } from '../../utils/exportImport';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPaywall: (featureName: string) => void;
}

export default function SettingsModal({ isOpen, onClose, onOpenPaywall }: SettingsModalProps) {
  const {
    roomName,
    setRoomName,
    rundown,
    setRundown,
    theme,
    updateTheme,
    isProUser,
  } = useTimerStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  if (!isOpen) return null;

  const handleExportJSON = () => {
    exportRundownJSON(roomName, rundown);
  };

  const handleExportCSV = () => {
    if (!isProUser) {
      onOpenPaywall('CSV / Excel Spreadsheet Export');
      return;
    }
    exportRundownCSV(roomName, rundown);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isProUser && file.name.endsWith('.csv')) {
      onOpenPaywall('CSV / Excel Spreadsheet Import');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          const rawItems = parsed && Array.isArray(parsed.rundown)
            ? parsed.rundown
            : (Array.isArray(parsed) ? parsed : null);

          if (rawItems) {
            const sanitized = validateAndSanitizeRundown(rawItems);
            if (sanitized.length > 0) {
              setRundown(sanitized);
              setImportStatus(`Successfully validated and imported ${sanitized.length} timers from JSON!`);
            } else {
              setImportStatus('JSON file contained no valid timer segments.');
            }
          } else {
            setImportStatus('Invalid JSON rundown format.');
          }
        } else {
          // Parse CSV
          const timers = parseCSVToRundown(content);
          if (timers.length > 0) {
            const newRundown = validateAndSanitizeRundown(
              timers.map((t, idx) => ({
                ...t,
                id: `timer-${Date.now()}-${idx}`,
                order: idx,
              }))
            );
            setRundown(newRundown);
            setImportStatus(`Successfully validated and imported ${newRundown.length} segments from CSV!`);
          } else {
            setImportStatus('Could not parse timers from this CSV file.');
          }
        }
      } catch (err) {
        console.error('Import error:', err);
        setImportStatus('Error reading file. Check file formatting.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-[#1C1C1C] border border-neutral-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-6 text-neutral-200 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Event Settings & Themes</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Title Setting */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Room Name
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="bg-[#141414] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
          />
        </div>

        {/* Rundown Export & Import Section */}
        <div className="flex flex-col gap-3 pt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Rundown Import / Export
            </span>
            {!isProUser && (
              <span className="text-[10px] font-bold text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                CSV is Pro
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportJSON}
              className="p-2.5 rounded-lg bg-[#141414] hover:bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Export JSON (Free)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="p-2.5 rounded-lg bg-[#141414] hover:bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 font-medium flex items-center justify-center gap-2 transition-colors relative"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>Export CSV {!isProUser && <span className="text-amber-400 text-[10px] font-bold ml-1">PRO</span>}</span>
            </button>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs text-neutral-200 font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-neutral-400" />
              <span>Import Schedule (JSON or CSV)</span>
            </button>
          </div>

          {importStatus && (
            <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
              {importStatus}
            </p>
          )}
        </div>

        {/* Display & Stage Theme Customization (Pro Gated) */}
        <div className="flex flex-col gap-3 pt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Stage Display Theme</span>
            </span>
            {!isProUser && (
              <span className="text-[10px] font-bold text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                PRO Gated
              </span>
            )}
          </div>

          {/* OLED Black vs Stage Slate */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-neutral-800 text-xs">
            <div>
              <div className="font-semibold text-white">True OLED Pitch Black Mode</div>
              <p className="text-neutral-500 text-[11px]">Eliminates confidence display backlight bleed (#000000)</p>
            </div>
            <button
              onClick={() => {
                if (!isProUser) {
                  onOpenPaywall('OLED Pitch Black Display Theme');
                  return;
                }
                updateTheme({ oledBlack: !theme.oledBlack });
              }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                theme.oledBlack ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  theme.oledBlack ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle Progress Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-neutral-800 text-xs">
            <div>
              <div className="font-semibold text-white">Show Linear Progress Bar</div>
              <p className="text-neutral-500 text-[11px]">Dynamic Green-to-Red bar on stage monitor</p>
            </div>
            <button
              onClick={() => updateTheme({ showProgressBar: !theme.showProgressBar })}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                theme.showProgressBar ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  theme.showProgressBar ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle Up Next Preview */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-neutral-800 text-xs">
            <div>
              <div className="font-semibold text-white">Show "Up Next" Segment Preview</div>
              <p className="text-neutral-500 text-[11px]">Displays next speaker & topic at monitor bottom</p>
            </div>
            <button
              onClick={() => updateTheme({ showUpNext: !theme.showUpNext })}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                theme.showUpNext ? 'bg-emerald-600' : 'bg-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  theme.showUpNext ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Pro Plan Banner in Settings */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/30 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">
                {isProUser ? 'Shotimer Pro License Active' : 'Upgrade to Shotimer Pro'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {isProUser ? 'All professional broadcast features unlocked.' : 'Unlock CSV import/export, custom OLED themes, and Stream Deck API.'}
            </p>
          </div>

          <button
            onClick={() => onOpenPaywall('Shotimer Pro Full Access')}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors shadow-sm"
          >
            {isProUser ? 'Manage License' : 'Upgrade (TBA)'}
          </button>
        </div>

      </div>
    </div>
  );
}
