import React from 'react';
import { motion } from 'motion/react';
import { X, RotateCcw, User, Award } from 'lucide-react';
import { getLevelAttempts } from '../lib/attempts';
import { getCustomLevelNumberId } from '../lib/customLevels';
import { sound } from '../lib/audio';

export interface ChamberInfoData {
  id: string | number;
  name: string;
  difficulty?: string;
  difficultyColor?: string;
  creatorUsername?: string;
  description?: string;
  isOfficial?: boolean;
}

interface ChamberInfoModalProps {
  info: ChamberInfoData;
  onClose: () => void;
}

export const ChamberInfoModal: React.FC<ChamberInfoModalProps> = ({ info, onClose }) => {
  const attempts = getLevelAttempts(
    info.id,
    typeof info.id === 'string' && !info.isOfficial ? getCustomLevelNumberId(info.id) : undefined
  );

  const diffLabel = (info.difficulty || 'normal').toLowerCase();
  const diffColor = info.difficultyColor || '#38bdf8';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={() => {
        sound.playClick();
        onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-[25px_15px_30px_15px/15px_30px_15px_25px] bg-neutral-900 border border-neutral-700/80 p-5 sm:p-6 shadow-2xl space-y-4"
      >
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header: Title and Difficulty badge */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-['Patrick_Hand'] lowercase px-2.5 py-0.5 rounded-full border font-bold"
              style={{
                color: diffColor,
                borderColor: `${diffColor}60`,
                backgroundColor: `${diffColor}15`,
              }}
            >
              {diffLabel}
            </span>
            <span className="text-xs font-['Patrick_Hand'] text-neutral-500 lowercase">
              farm info
            </span>
          </div>
          <h2 className="font-['Caveat'] text-3xl sm:text-4xl text-neutral-100 font-bold lowercase leading-tight truncate">
            {info.name}
          </h2>
        </div>

        {/* 1. Attempts Section */}
        <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-['Patrick_Hand'] text-neutral-500 lowercase block">
                your attempts
              </span>
              <span className="text-lg font-['Patrick_Hand'] font-bold text-white lowercase">
                {attempts.toLocaleString()} {attempts === 1 ? 'attempt' : 'attempts'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Credits Section */}
        <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-1.5 font-['Patrick_Hand'] text-xs text-neutral-300 lowercase">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-neutral-400" />
              creator:
            </span>
            <span className="font-bold text-neutral-200">
              {info.isOfficial ? 'misiori' : info.creatorUsername || 'creator'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-neutral-400" />
              publisher:
            </span>
            <span className="text-neutral-200">
              dangerous ant farm!
            </span>
          </div>

          {info.description && (
            <div className="pt-2 mt-1 border-t border-neutral-900 text-neutral-400 text-[11px] leading-tight">
              {info.description}
            </div>
          )}
        </div>

        {/* Got it Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="w-full py-2.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-base font-bold transition-all cursor-pointer shadow-md"
        >
          close
        </button>
      </motion.div>
    </div>
  );
};
