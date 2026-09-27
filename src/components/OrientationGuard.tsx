import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Smartphone, RotateCw } from 'lucide-react';

export const OrientationGuard: React.FC = () => {
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isPortrait = h > w;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileDevice = /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent);
      const isPhone = (isMobileDevice || hasTouch) && (w < 600 || (w < 768 && h < 1000));
      setIsPortraitPhone(isPortrait && Boolean(isPhone));
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortraitPhone) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-xl">
      <div className="relative mb-6">
        <motion.div
          animate={{ rotate: [0, 90, 90, 0] }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: 'easeInOut',
            times: [0, 0.35, 0.8, 1],
          }}
          className="w-24 h-24 rounded-3xl bg-blue-950/80 border border-blue-500/60 flex items-center justify-center text-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.5)]"
        >
          <Smartphone className="w-12 h-12" />
        </motion.div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
          className="absolute -top-2 -right-2 p-2 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/50"
        >
          <RotateCw className="w-4 h-4" />
        </motion.div>
      </div>

      <span className="px-3 py-1 rounded-full bg-blue-950 border border-blue-800 text-blue-300 text-xs font-mono font-bold tracking-widest uppercase mb-3">
        Landscape Orientation Required
      </span>

      <h2 className="text-2xl sm:text-3xl font-black font-['Russo_One'] tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-200 to-blue-500 mb-2">
        ROTATE YOUR PHONE
      </h2>

      <p className="text-xs sm:text-sm font-mono text-neutral-400 max-w-xs leading-relaxed mb-6">
        Dangerous Ant Farm requires horizontal mode to display the full containment chamber and ant swarm terrarium. Please turn your phone sideways to play!
      </p>

      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-neutral-400 text-xs font-mono">
        <span>Portrait [✕]</span>
        <span className="text-blue-400">➔</span>
        <span className="text-green-400 font-bold">Landscape [✓]</span>
      </div>
    </div>
  );
};
