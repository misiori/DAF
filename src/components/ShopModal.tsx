import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X, ShoppingBag, Construction, Clock, Sparkles, Shield, Zap, Magnet } from 'lucide-react';
import { sound } from '../lib/audio';

interface ShopModalProps {
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ onClose }) => {
  // Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        sound.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-center"
      >
        {/* Ambient glow */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Construction Notice */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-5 relative">
          <ShoppingBag className="w-10 h-10 text-blue-400" />
          <div className="absolute -bottom-2 -right-2 p-1.5 rounded-lg bg-blue-600 text-white shadow-md">
            <Construction className="w-4 h-4" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/70 border border-blue-500/40 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
          <Clock className="w-3.5 h-3.5" />
          Under Construction
        </div>

        <h2 className="text-3xl font-black font-['Russo_One'] tracking-wide text-white mb-2">
          ANT COLONY SHOP
        </h2>

        <p className="text-sm text-neutral-400 max-w-sm mx-auto mb-6">
          The ant engineers are busy tunneling out the underground marketplace! Powerful boosts and accessories will arrive in the next expansion.
        </p>

        {/* Sneak peek cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 text-left">
            <div className="p-2 rounded-lg bg-blue-950/40 text-blue-400 w-fit mb-2">
              <Zap className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-white">Sugar Boost</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">2x Speed Burst</div>
            <span className="inline-block mt-2 text-[9px] font-mono font-semibold text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-800/40">
              SOON
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 text-left">
            <div className="p-2 rounded-lg bg-cyan-950/40 text-cyan-400 w-fit mb-2">
              <Shield className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-white">Resin Shell</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">+1 Free Hit</div>
            <span className="inline-block mt-2 text-[9px] font-mono font-semibold text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-800/40">
              SOON
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 text-left">
            <div className="p-2 rounded-lg bg-indigo-950/40 text-indigo-400 w-fit mb-2">
              <Magnet className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-white">Ant Magnet</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Collect Cubes</div>
            <span className="inline-block mt-2 text-[9px] font-mono font-semibold text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-800/40">
              SOON
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold font-mono text-sm tracking-wider shadow-lg shadow-blue-600/25 active:scale-95 transition-all cursor-pointer"
        >
          BACK TO TERRARIUM
        </button>
      </motion.div>
    </div>
  );
};
