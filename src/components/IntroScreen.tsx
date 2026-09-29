import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { sound } from '../lib/audio';

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    sound.init();

    const start = performance.now();
    const duration = 2800; // ~3 seconds

    let frameId: number;
    const updateProgress = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(p);

      if (elapsed < duration) {
        frameId = requestAnimationFrame(updateProgress);
      } else {
        setTimeout(onComplete, 200);
      }
    };

    frameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [onComplete]);

  return (
    <div
      onClick={() => {
        sound.unlockAudio();
        onComplete();
      }}
      onTouchStart={() => {
        sound.unlockAudio();
        onComplete();
      }}
      style={{ touchAction: 'manipulation' }}
      className="relative w-screen h-screen overflow-hidden bg-neutral-950 flex flex-col items-center justify-center select-none cursor-pointer"
    >
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="font-['Caveat'] text-4xl sm:text-5xl font-medium tracking-wide text-neutral-300 lowercase"
        >
          misiori
        </motion.div>

        {/* Minimal thin loading line */}
        <div className="w-36 h-[2px] bg-neutral-900 rounded-full overflow-hidden mt-2">
          <motion.div
            className="h-full bg-neutral-400 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>
      </div>
    </div>
  );
};
