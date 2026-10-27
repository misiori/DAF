import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, Check } from 'lucide-react';
import farmerPortrait from '../assets/images/ant_farmer_portrait_1793118474981.jpg';
import { sound } from '../lib/audio';

export interface FarmerStoryModalProps {
  isOpen: boolean;
  mode: 'intro' | 'ending';
  onClose: () => void;
}

const INTRO_DIALOGUES = [
  {
    text: 'please! i need ur help!',
    button: 'continue',
  },
  {
    text: 'i have 23 ant farms and all of them just went crazy! all ants are simply crazy! and the whole country is in danger, not me.. everybody here keeps ant farms. help them also in discover tab!',
    button: 'continue',
  },
  {
    text: 'please, just make them go! or make them calm!',
    button: 'continue',
  },
];

const ENDING_DIALOGUES = [
  {
    text: 'thank you! thank you!',
    button: 'continue',
  },
  {
    text: "however, i moved to a different place, and i don't need those 23 old ant farms, so i believe many of them are still crazy there.",
    button: 'continue',
  },
  {
    text: 'anyway, i will call you if anything happens on my new farm. bye!',
    button: 'bye!',
  },
];

export const FarmerStoryModal: React.FC<FarmerStoryModalProps> = ({
  isOpen,
  mode,
  onClose,
}) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const dialogues = mode === 'intro' ? INTRO_DIALOGUES : ENDING_DIALOGUES;
  const current = dialogues[step] || dialogues[0];
  const isLast = step === dialogues.length - 1;

  const handleNext = () => {
    sound.playClick();
    if (isLast) {
      if (mode === 'ending') {
        sound.playVictory();
      }
      setStep(0);
      onClose();
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    sound.playClick();
    setStep(0);
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-[28px_16px_30px_18px/18px_30px_16px_28px] bg-black border-2 border-neutral-700 shadow-2xl overflow-hidden flex flex-col p-5 sm:p-6 space-y-4 text-white"
        >
          {/* Close / Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer z-10"
            title="close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Farmer Avatar & Character Name */}
          <div className="flex items-center gap-3.5">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-neutral-600 shadow-lg shrink-0 bg-neutral-900">
              <img
                src={farmerPortrait}
                alt="Farmer Archibald"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/30 rounded-2xl pointer-events-none" />
            </div>

            <div className="min-w-0">
              <h3 className="font-['Caveat'] text-3xl sm:text-4xl text-white font-bold lowercase leading-tight truncate">
                farmer
              </h3>
            </div>
          </div>

          {/* Dialogue Speech Bubble */}
          <div className="relative p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-left min-h-[110px] flex flex-col justify-center">
            <div className="flex items-center justify-end mb-2">
              <span className="text-xs font-['Patrick_Hand'] text-neutral-500 lowercase">
                {step + 1} / {dialogues.length}
              </span>
            </div>

            <p className="font-['Patrick_Hand'] text-xl sm:text-2xl text-neutral-100 leading-snug lowercase">
              "{current.text}"
            </p>
          </div>

          {/* Step Progress Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {dialogues.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-white'
                    : i < step
                    ? 'w-2 bg-neutral-500'
                    : 'w-2 bg-neutral-800'
                }`}
              />
            ))}
          </div>

          {/* Bottom Actions - Black and White */}
          <div className="flex items-center gap-2 pt-1">
            {!isLast && (
              <button
                onClick={handleSkip}
                className="py-2.5 px-4 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-black hover:bg-neutral-900 text-neutral-400 hover:text-white font-['Patrick_Hand'] text-base lowercase transition-all cursor-pointer border border-neutral-800"
              >
                skip
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 py-2.5 px-4 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-white hover:bg-neutral-200 text-black border border-white font-['Patrick_Hand'] text-lg font-bold shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{current.button}</span>
              {isLast ? (
                <Check className="w-4 h-4 text-black stroke-[3]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-black stroke-[3]" />
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
