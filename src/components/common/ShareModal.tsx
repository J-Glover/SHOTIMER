import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Tv, Calendar, Sliders, MessageSquare, Layers, Wifi, Smartphone } from 'lucide-react';
import { useTimerStore } from '../../store/useTimerStore';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
}

export default function ShareModal({ isOpen, onClose, roomName }: ShareModalProps) {
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'controller' | 'agenda' | 'moderator' | 'overlay'>('viewer');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const roomId = useTimerStore((s) => s.roomId);
  const cloudSyncStatus = useTimerStore((s) => s.cloudSyncStatus);

  // Local dev network IP management (allows phones on same Wi-Fi to scan QR codes)
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const [useLanIp, setUseLanIp] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && isLocalhost) {
      return localStorage.getItem('shotimer_use_lan_ip') === 'true';
    }
    return false;
  });

  const [lanIpAddress, setLanIpAddress] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('shotimer_lan_ip');
      if (saved) return saved;
    }
    return '192.168.0.151'; // User's local machine network IP
  });

  const [isEditingLanIp, setIsEditingLanIp] = useState(false);

  const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    if (isLocalhost && useLanIp && lanIpAddress.trim()) {
      const port = window.location.port ? `:${window.location.port}` : '';
      const cleanIp = lanIpAddress.trim().replace(/^https?:\/\//, '').replace(/:\d+$/, '');
      return `${window.location.protocol}//${cleanIp}${port}`;
    }
    return window.location.origin;
  };

  const getRoleUrl = (role: string) => {
    const base = getBaseUrl();
    if (!base) return '';
    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' || 
       window.location.hostname.startsWith('192.168.') ||
       window.location.hostname.startsWith('10.'));

    // Check if running on app.shotimer.io subdomain vs subpath
    const isSubdomain = typeof window !== 'undefined' && window.location.hostname.startsWith('app.');
    const pathPrefix = isSubdomain ? '/' : '/app/';

    // If on live cloud/subdomain, attach access key so scanned QR codes on phones unlock immediately
    const passkey = (import.meta.env.VITE_STEALTH_PASSKEY || 'SHOTIMER-ALPHA-2026');
    const accessParam = !isLocal ? `&access=${encodeURIComponent(passkey)}` : '';

    return `${base}${pathPrefix}?room=${encodeURIComponent(roomId)}&view=${role}${accessParam}`;
  };

  const currentUrl = getRoleUrl(selectedRole);

  useEffect(() => {
    if (isOpen && currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#07090E',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleLanIp = (enable: boolean) => {
    setUseLanIp(enable);
    if (typeof window !== 'undefined') {
      localStorage.setItem('shotimer_use_lan_ip', enable ? 'true' : 'false');
    }
  };

  const handleSaveLanIp = (ip: string) => {
    setLanIpAddress(ip);
    if (typeof window !== 'undefined') {
      localStorage.setItem('shotimer_lan_ip', ip);
    }
    setIsEditingLanIp(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="bg-[#1C1C1E] border border-neutral-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 text-neutral-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Share & Connect Devices</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                cloudSyncStatus === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cloudSyncStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{cloudSyncStatus === 'connected' ? 'Cloud Live' : 'Local Bus'}</span>
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Room: <span className="font-semibold text-emerald-400">{roomName}</span> (ID: <code className="text-neutral-300">{roomId}</code>)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Localhost / Phone Wi-Fi Helper (Only shown when running locally) */}
        {isLocalhost && (
          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Testing with phone camera on Wi-Fi?</span>
              </span>
              <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => toggleLanIp(false)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    !useLanIp ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Localhost
                </button>
                <button
                  type="button"
                  onClick={() => toggleLanIp(true)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    useLanIp ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <Wifi className="w-3 h-3" />
                  <span>Wi-Fi IP</span>
                </button>
              </div>
            </div>

            {useLanIp && (
              <div className="flex items-center justify-between bg-neutral-950/80 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-[11px]">
                <span className="text-neutral-400">Computer LAN IP:</span>
                {isEditingLanIp ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      defaultValue={lanIpAddress}
                      onBlur={(e) => handleSaveLanIp(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveLanIp((e.target as any).value)}
                      className="bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded text-white font-mono text-xs outline-none w-32"
                      autoFocus
                    />
                    <button
                      onClick={() => setIsEditingLanIp(false)}
                      className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <code className="text-emerald-400 font-mono font-semibold">{lanIpAddress}:5173</code>
                    <button
                      onClick={() => setIsEditingLanIp(true)}
                      className="text-neutral-500 hover:text-neutral-300 underline text-[10px]"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Role Picker Pills */}
        <div className="grid grid-cols-5 gap-1.5 bg-[#141416] p-1 rounded-xl border border-neutral-800">
          {[
            { id: 'viewer', label: 'Monitor', icon: Tv },
            { id: 'controller', label: 'Console', icon: Sliders },
            { id: 'agenda', label: 'Agenda', icon: Calendar },
            { id: 'moderator', label: 'Notes', icon: MessageSquare },
            { id: 'overlay', label: 'OBS', icon: Layers },
          ].map((item) => {
            const Icon = item.icon;
            const isSel = selectedRole === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedRole(item.id as any)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-colors ${
                  isSel
                    ? 'bg-neutral-800 text-emerald-400 font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* QR Code Display Card */}
        <div className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-xl self-center border border-neutral-200">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Room QR Code" className="w-52 h-52 block" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-neutral-400 text-xs">
              Generating QR...
            </div>
          )}
        </div>

        <p className="text-center text-xs text-neutral-400 px-2">
          Point any smartphone or iPad camera at the QR code to open the <span className="font-semibold text-neutral-200">{selectedRole}</span> display wirelessly. Zero login or account required.
        </p>

        {/* Copy Link Input Bar */}
        <div className="flex items-center gap-2 bg-[#141416] border border-neutral-700/80 rounded-xl p-1.5 pl-3 shadow-inner">
          <input
            type="text"
            readOnly
            value={currentUrl}
            className="bg-transparent text-xs text-neutral-300 font-mono flex-1 outline-none truncate select-all"
          />
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
