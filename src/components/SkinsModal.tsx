import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Check, Lock, Cookie, Shield, Eye } from 'lucide-react';
import { SKINS } from '../lib/constants';
import { Skin } from '../types/game';
import { SkinRenderer } from './SkinRenderer';
import { sound } from '../lib/audio';

interface SkinsModalProps {
  activeSkinId: string;
  unlockedSkinIds: string[];
  sugarCubes: number;
  onSelectSkin: (skinId: string) => void;
  onUnlockSkin: (skinId: string, cost: number) => void;
  onClose: () => void;
}

type RarityFilter = 'All' | 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'Owned';

export const SkinsModal: React.FC<SkinsModalProps> = ({
  activeSkinId,
  unlockedSkinIds,
  sugarCubes,
  onSelectSkin,
  onUnlockSkin,
  onClose,
}) => {
  const [selectedPreview, setSelectedPreview] = useState<Skin>(
    SKINS.find((s) => s.id === activeSkinId) || SKINS[0]
  );
  const [filter, setFilter] = useState<RarityFilter>('All');
  const [testMousePos, setTestMousePos] = useState({ x: 140, y: 75 });
  const previewAreaRef = useRef<HTMLDivElement | null>(null);

  const isUnlocked = (skinId: string) =>
    unlockedSkinIds.includes(skinId) || skinId === 'amber';

  const unlockedCount = SKINS.filter((s) => isUnlocked(s.id)).length;

  const filteredSkins = useMemo(() => {
    return SKINS.filter((skin) => {
      if (filter === 'All') return true;
      if (filter === 'Owned') return isUnlocked(skin.id);
      return skin.rarity === filter;
    });
  }, [filter, unlockedSkinIds]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewAreaRef.current) return;
    const rect = previewAreaRef.current.getBoundingClientRect();
    setTestMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const getRarityBadgeColor = (rarity?: string) => {
    switch (rarity) {
      case 'Mythic':
        return 'text-rose-400 bg-rose-950/60 border-rose-700/70';
      case 'Legendary':
        return 'text-amber-400 bg-amber-950/60 border-amber-700/70';
      case 'Epic':
        return 'text-purple-400 bg-purple-950/60 border-purple-700/70';
      case 'Rare':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-700/70';
      default:
        return 'text-blue-400 bg-blue-950/60 border-blue-700/70';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-5xl bg-neutral-900 border border-blue-900/60 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Glow ambient background */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-500"
          style={{ background: selectedPreview.color }}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl border transition-all"
              style={{
                borderColor: `${selectedPreview.color}60`,
                background: `${selectedPreview.color}18`,
              }}
            >
              <Sparkles className="w-6 h-6" style={{ color: selectedPreview.color }} />
            </div>
            <div>
              <h2 className="text-2xl font-black font-['Russo_One'] tracking-wide text-white">
                CURSOR SKINS
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800/80 border border-blue-500/30 rounded-xl text-blue-300 font-mono text-xs font-bold shadow-inner">
              <Cookie className="w-4 h-4 text-blue-400" />
              <span>{sugarCubes} Sugar</span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 py-3 overflow-x-auto border-b border-neutral-800/60 no-scrollbar">
          {(['All', 'Owned', 'Common', 'Rare', 'Epic', 'Legendary', 'Mythic'] as RarityFilter[]).map((r) => {
            const isSelected = filter === r;

            return (
              <button
                key={r}
                onClick={() => {
                  sound.playClick();
                  setFilter(r);
                }}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-neutral-800/70 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <span>{r}</span>
              </button>
            );
          })}
        </div>

        {/* Main Grid: Left scrollable grid of skin cards (20+ skins), Right live interactive test pad */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 my-4 overflow-hidden flex-1 min-h-0">
          {/* Scrollable Roster of Skins */}
          <div className="lg:col-span-8 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[58vh]">
            <AnimatePresence>
              {filteredSkins.map((skin) => {
                const unlocked = isUnlocked(skin.id);
                const isActive = activeSkinId === skin.id;
                const isSelected = selectedPreview.id === skin.id;

                return (
                  <motion.div
                    key={skin.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => {
                      sound.playClick();
                      setSelectedPreview(skin);
                    }}
                    className={`group relative flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-800/90 shadow-lg'
                        : 'bg-neutral-900/60 hover:bg-neutral-800/50'
                    }`}
                    style={{
                      borderColor: isSelected
                        ? skin.color
                        : 'rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <SkinRenderer skinId={skin.id} size={42} animated />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm tracking-wide text-white truncate">
                            {skin.name}
                          </span>
                          {skin.rarity && (
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md border ${getRarityBadgeColor(
                                skin.rarity
                              )}`}
                            >
                              {skin.rarity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isActive ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-green-950 text-green-400 border border-green-700">
                          <Check className="w-3 h-3" />
                          EQUIPPED
                        </span>
                      ) : unlocked ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-neutral-800 text-neutral-400 group-hover:text-blue-300">
                          OWNED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-blue-300 bg-blue-950/60 px-2 py-1 rounded-lg border border-blue-900/60">
                          <Lock className="w-3 h-3 text-blue-400" />
                          {skin.cost}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Right Live Test Pad & Details */}
          <div className="lg:col-span-4 flex flex-col justify-between bg-neutral-950/90 rounded-2xl border border-blue-900/40 p-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  Live Reticle Test
                </span>
                <span
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
                  style={{ color: selectedPreview.color, background: `${selectedPreview.color}20` }}
                >
                  {selectedPreview.rarity || 'Common'}
                </span>
              </div>

              {/* Interactive mouse tracking box */}
              <div
                ref={previewAreaRef}
                onMouseMove={handleMouseMove}
                className="relative h-44 rounded-xl border border-dashed border-blue-800/40 bg-neutral-900/70 overflow-hidden cursor-none flex items-center justify-center select-none shadow-inner"
              >
                <div className="absolute inset-0 bg-[radial-gradient(#3b82f61a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                {/* Simulated cursor following mouse */}
                <div
                  className="absolute pointer-events-none transition-transform duration-75 ease-out"
                  style={{
                    left: testMousePos.x,
                    top: testMousePos.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <SkinRenderer skinId={selectedPreview.id} size={38} />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Russo_One'] text-base text-white">
                    {selectedPreview.name}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: selectedPreview.color }}
                    />
                    <span className="text-[10px] font-mono text-neutral-400">
                      {selectedPreview.color}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons: Equip or Unlock */}
            <div className="mt-4 pt-3 border-t border-neutral-800">
              {isUnlocked(selectedPreview.id) ? (
                <button
                  disabled={activeSkinId === selectedPreview.id}
                  onClick={() => {
                    sound.playClick();
                    onSelectSkin(selectedPreview.id);
                  }}
                  className={`w-full py-3.5 rounded-xl font-bold font-mono text-sm tracking-wider transition-all cursor-pointer ${
                    activeSkinId === selectedPreview.id
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white shadow-lg shadow-blue-600/30 active:scale-95'
                  }`}
                >
                  {activeSkinId === selectedPreview.id ? 'CURRENTLY EQUIPPED' : 'EQUIP CURSOR SKIN'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (sugarCubes >= selectedPreview.cost) {
                      sound.playSugarCollect();
                      onUnlockSkin(selectedPreview.id, selectedPreview.cost);
                    } else {
                      sound.playHitSound();
                    }
                  }}
                  className={`w-full py-3.5 rounded-xl font-bold font-mono text-sm tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    sugarCubes >= selectedPreview.cost
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/30 active:scale-95'
                      : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-800'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  {sugarCubes >= selectedPreview.cost
                    ? `UNLOCK FOR ${selectedPreview.cost} SUGAR`
                    : `NEED ${selectedPreview.cost - sugarCubes} MORE SUGAR`}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
