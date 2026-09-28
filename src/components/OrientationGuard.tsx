import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Smartphone, RotateCw, X } from 'lucide-react';

export const OrientationGuard: React.FC = () => {
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isPortrait = h > w;

      // Check if it's a tablet: iPads, tablets have larger min dimension (>= 600px)
      const isTablet =
        /iPad|Tablet/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && Math.min(w, h) >= 600);

      // Only narrow mobile phones (like iPhone 7, where w is ~375 in portrait)
      const isMobilePhone =
        !isTablet &&
        /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent) &&
        Math.min(w, h) < 550;

      setIsPortraitPhone(isPortrait && isMobilePhone);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortraitPhone || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-neutral-950/95 text-white flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-xl">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-5 right-5 p-2 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
        title="continue anyway"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative mb-6">
        <motion.div
          animate={{ rotate: [0, 90, 90, 0] }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: 'easeInOut',
            times: [0, 0.35, 0.8, 1],
          }}
          className="w-20 h-20 rounded-3xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-200 shadow-xl"
        >
          <Smartphone className="w-10 h-10" />
        </motion.div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
          className="absolute -top-1 -right-1 p-1.5 rounded-full bg-neutral-700 text-white shadow-lg"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </motion.div>
      </div>

      <h2 className="text-3xl font-bold font-['Caveat'] tracking-wide text-neutral-100 mb-2 lowercase">
        rotate your phone
      </h2>

      <p className="text-xs font-['Patrick_Hand'] text-neutral-400 max-w-xs leading-relaxed mb-5 lowercase">
        dangerous ant farm works best horizontally to give you room to dodge ants.
      </p>

      <button
        onClick={() => setDismissed(true)}
        className="px-4 py-2 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-['Patrick_Hand'] text-sm lowercase transition-all cursor-pointer"
      >
        play anyway in portrait
      </button>
    </div>
  );
};
