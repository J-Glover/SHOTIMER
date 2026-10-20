import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Tv, Calendar, Sliders, MessageSquare } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
}

export default function ShareModal({ isOpen, onClose, roomName }: ShareModalProps) {
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'controller' | 'agenda' | 'moderator'>('viewer');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const getRoleUrl = (role: string) => {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin;
    if (role === 'controller') return `${base}/?view=controller`;
    return `${base}/?view=${role}`;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-[#1C1C1C] border border-neutral-700 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 text-neutral-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white">Share & Connect Devices</h3>
            <p className="text-xs text-neutral-400">{roomName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Picker Pills */}
        <div className="grid grid-cols-4 gap-1.5 bg-[#141414] p-1 rounded-xl border border-neutral-800">
          {[
            { id: 'viewer', label: 'Monitor', icon: Tv },
            { id: 'controller', label: 'Console', icon: Sliders },
            { id: 'agenda', label: 'Agenda', icon: Calendar },
            { id: 'moderator', label: 'Moderator', icon: MessageSquare },
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

        {/* QR Code Card */}
        <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl shadow-inner self-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Room QR Code" className="w-52 h-52 block" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-neutral-400 text-xs">
              Generating QR...
            </div>
          )}
        </div>

        <p className="text-center text-xs text-neutral-400 px-4">
          Scan with your phone or tablet on the same Wi-Fi to open the {selectedRole} view wirelessly with zero setup.
        </p>

        {/* Copy Link Input Bar */}
        <div className="flex items-center gap-2 bg-[#141414] border border-neutral-700 rounded-xl p-1.5 pl-3">
          <input
            type="text"
            readOnly
            value={currentUrl}
            className="bg-transparent text-xs text-neutral-300 font-mono flex-1 outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
