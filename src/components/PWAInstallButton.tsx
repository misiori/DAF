import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-2xl bg-blue-600/90 hover:bg-blue-500 px-3.5 py-2 text-xs font-mono font-bold text-white shadow-lg shadow-blue-500/25 border border-blue-400/40 transition-all active:scale-95 cursor-pointer backdrop-blur-md"
      >
        <Download className="w-3.5 h-3.5" />
        INSTALL APP
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 border border-blue-500/40 px-3.5 py-2 text-xs font-mono font-bold text-blue-300 transition-all cursor-pointer backdrop-blur-md"
        >
          <Share2 className="w-3.5 h-3.5 text-blue-400" />
          INSTALL APP
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-sm rounded-2xl bg-neutral-900 border border-blue-600/40 p-6 shadow-2xl text-left">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-base font-bold font-['Russo_One'] text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-400" />
                Install on iPhone / iPad
              </h3>
              <p className="mt-3 text-xs text-neutral-300 leading-relaxed font-mono">
                1. Tap the <strong className="text-blue-400">Share</strong> button in Safari toolbar.<br />
                2. Scroll down and tap <strong className="text-blue-400">Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-mono font-bold text-white transition-colors"
              >
                GOT IT
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
