import React from 'react';
import { SKINS } from '../lib/constants';
import { Skin } from '../types/game';

interface SkinRendererProps {
  skinId: string;
  size?: number; // pixel width & height
  className?: string;
  animated?: boolean;
}

export const getSkinById = (id: string): Skin => {
  return SKINS.find((s) => s.id === id) || SKINS[0];
};

export const SkinRenderer: React.FC<SkinRendererProps> = ({
  skinId,
  size = 48,
  className = '',
  animated = false,
}) => {
  const skin = getSkinById(skinId);

  return (
    <div
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 ${size / 2.5}px ${skin.glowColor}`,
      }}
      className={`relative rounded-2xl flex items-center justify-center p-1.5 transition-transform duration-300 ${
        animated ? 'hover:scale-110' : ''
      } ${className}`}
    >
      {/* Background radial gradient */}
      <div
        className="absolute inset-0 rounded-2xl opacity-35"
        style={{
          background: `radial-gradient(circle, ${skin.color} 0%, transparent 75%)`,
        }}
      />

      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_0_8px_rgba(0,0,0,0.6)]"
      >
        {/* COMMON SKINS */}
        {skin.id === 'amber' && (
          <g>
            <polygon
              points="20,4 34,12 34,28 20,36 6,28 6,12"
              stroke={skin.color}
              strokeWidth="2.5"
              fill={`${skin.color}22`}
            />
            <circle cx="20" cy="20" r="5" fill={skin.secondaryColor} stroke={skin.color} strokeWidth="1.5" />
            <circle cx="20" cy="20" r="2" fill="#fff" />
            <line x1="20" y1="8" x2="20" y2="12" stroke={skin.color} strokeWidth="2" strokeLinecap="round" />
            <line x1="20" y1="28" x2="20" y2="32" stroke={skin.color} strokeWidth="2" strokeLinecap="round" />
            <line x1="8" y1="20" x2="12" y2="20" stroke={skin.color} strokeWidth="2" strokeLinecap="round" />
            <line x1="28" y1="20" x2="32" y2="20" stroke={skin.color} strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {skin.id === 'golden_amber' && (
          <g>
            <polygon points="20,5 31,11 31,23 20,29 9,23 9,11" stroke={skin.color} strokeWidth="2" fill={`${skin.color}30`} />
            <polygon points="20,11 26,14.5 26,21.5 20,25 14,21.5 14,14.5" stroke={skin.secondaryColor} strokeWidth="1.5" fill="none" />
            <circle cx="20" cy="18" r="3" fill="#fff" />
            <circle cx="20" cy="6" r="1.5" fill={skin.color} />
            <circle cx="30" cy="12" r="1.5" fill={skin.color} />
            <circle cx="30" cy="24" r="1.5" fill={skin.color} />
            <circle cx="20" cy="30" r="1.5" fill={skin.color} />
            <circle cx="10" cy="24" r="1.5" fill={skin.color} />
            <circle cx="10" cy="12" r="1.5" fill={skin.color} />
          </g>
        )}

        {skin.id === 'crimson' && (
          <g>
            <circle cx="20" cy="20" r="14" stroke={skin.color} strokeWidth="2" strokeDasharray="4 3" fill={`${skin.color}25`} />
            <path d="M12,12 Q20,6 28,12" stroke={skin.color} strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M10,24 Q20,34 30,24" stroke={skin.color} strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="20" cy="20" r="4.5" fill={skin.color} />
            <circle cx="20" cy="20" r="2" fill="#fff" />
          </g>
        )}

        {skin.id === 'forest_moss' && (
          <g>
            <circle cx="20" cy="20" r="13" stroke={skin.color} strokeWidth="2" fill={`${skin.color}25`} />
            <path d="M20,7 C24,14 26,16 33,20 C26,24 24,26 20,33 C16,26 14,24 7,20 C14,16 16,14 20,7 Z" fill={skin.secondaryColor} stroke={skin.color} strokeWidth="1.5" />
            <circle cx="20" cy="20" r="3" fill="#fff" />
          </g>
        )}

        {/* RARE SKINS */}
        {skin.id === 'cyan' && (
          <g>
            <circle cx="20" cy="20" r="15" stroke={skin.color} strokeWidth="2" strokeDasharray="8 6" fill="none" />
            <circle cx="20" cy="20" r="9" stroke={skin.secondaryColor} strokeWidth="1.5" fill="none" />
            <path d="M7,12 L7,7 L12,7" stroke={skin.color} strokeWidth="2" strokeLinecap="round" />
            <path d="M33,12 L33,7 L28,7" stroke={skin.color} strokeWidth="2" strokeLinecap="round" />
            <path d="M7,28 L7,33 L12,33" stroke={skin.color} strokeWidth="2" strokeLinecap="round" />
            <path d="M33,28 L33,33 L28,33" stroke={skin.color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="20" cy="20" r="3" fill={skin.color} />
            <circle cx="20" cy="20" r="1" fill="#fff" />
          </g>
        )}

        {skin.id === 'toxic' && (
          <g>
            <rect x="8" y="8" width="24" height="24" transform="rotate(45 20 20)" stroke={skin.color} strokeWidth="2.5" fill={`${skin.color}30`} />
            <circle cx="20" cy="14" r="3" fill={skin.secondaryColor} stroke={skin.color} strokeWidth="1" />
            <circle cx="15" cy="24" r="3" fill={skin.secondaryColor} stroke={skin.color} strokeWidth="1" />
            <circle cx="25" cy="24" r="3" fill={skin.secondaryColor} stroke={skin.color} strokeWidth="1" />
            <circle cx="20" cy="20" r="3" fill={skin.color} />
          </g>
        )}

        {skin.id === 'amethyst' && (
          <g>
            <polygon
              points="20,5 24,15 35,16 27,24 30,35 20,29 10,35 13,24 5,16 16,15"
              stroke={skin.color}
              strokeWidth="2"
              fill={`${skin.color}35`}
            />
            <circle cx="20" cy="20" r="5" stroke={skin.secondaryColor} strokeWidth="1.5" fill={skin.color} />
            <circle cx="20" cy="20" r="2" fill="#fff" />
          </g>
        )}

        {skin.id === 'solar_flare' && (
          <g>
            <circle cx="20" cy="20" r="8" fill={skin.color} stroke={skin.secondaryColor} strokeWidth="2" />
            <circle cx="20" cy="20" r="3.5" fill="#fff" />
            {/* Solar rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <line
                key={i}
                x1={20 + 11 * Math.cos((angle * Math.PI) / 180)}
                y1={20 + 11 * Math.sin((angle * Math.PI) / 180)}
                x2={20 + 16 * Math.cos((angle * Math.PI) / 180)}
                y2={20 + 16 * Math.sin((angle * Math.PI) / 180)}
                stroke={skin.color}
                strokeWidth={i % 2 === 0 ? '2.5' : '1.5'}
                strokeLinecap="round"
              />
            ))}
          </g>
        )}

        {skin.id === 'glacial_cryo' && (
          <g>
            <line x1="20" y1="5" x2="20" y2="35" stroke={skin.color} strokeWidth="2" strokeLinecap="round" />
            <line x1="5" y1="20" x2="35" y2="20" stroke={skin.color} strokeWidth="2" strokeLinecap="round" />
            <line x1="9.4" y1="9.4" x2="30.6" y2="30.6" stroke={skin.secondaryColor} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9.4" y1="30.6" x2="30.6" y2="9.4" stroke={skin.secondaryColor} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="20" cy="20" r="5" stroke={skin.color} strokeWidth="1.5" fill={`${skin.color}40`} />
            <circle cx="20" cy="20" r="2" fill="#fff" />
          </g>
        )}

        {/* EPIC SKINS */}
        {skin.id === 'emerald_matrix' && (
          <g>
            <rect x="7" y="7" width="26" height="26" stroke={skin.color} strokeWidth="1.5" strokeDasharray="5 3" fill={`${skin.color}20`} />
            <line x1="7" y1="20" x2="33" y2="20" stroke={skin.secondaryColor} strokeWidth="1" />
            <line x1="20" y1="7" x2="20" y2="33" stroke={skin.secondaryColor} strokeWidth="1" />
            <circle cx="13" cy="13" r="2" fill={skin.color} />
            <circle cx="27" cy="13" r="2" fill={skin.color} />
            <circle cx="13" cy="27" r="2" fill={skin.color} />
            <circle cx="27" cy="27" r="2" fill={skin.color} />
            <circle cx="20" cy="20" r="3.5" fill="#fff" />
          </g>
        )}

        {skin.id === 'obsidian_shadow' && (
          <g>
            <polygon points="20,5 34,22 20,35 6,22" stroke={skin.color} strokeWidth="2.5" fill="#0f172a" />
            <polygon points="20,10 29,22 20,30 11,22" stroke={skin.secondaryColor} strokeWidth="1.5" fill={`${skin.color}30`} />
            <circle cx="20" cy="21" r="2.5" fill="#fff" />
          </g>
        )}

        {skin.id === 'synthwave_pink' && (
          <g>
            <polygon points="20,5 35,32 5,32" stroke={skin.color} strokeWidth="2.5" fill={`${skin.color}25`} />
            <line x1="9" y1="23" x2="31" y2="23" stroke={skin.secondaryColor} strokeWidth="1.5" />
            <line x1="13" y1="16" x2="27" y2="16" stroke={skin.secondaryColor} strokeWidth="1.5" />
            <circle cx="20" cy="22" r="3.5" fill="#fff" stroke={skin.color} strokeWidth="1.5" />
          </g>
        )}

        {skin.id === 'electric_volt' && (
          <g>
            <circle cx="20" cy="20" r="14" stroke={skin.color} strokeWidth="2" strokeDasharray="3 3" fill="none" />
            <path d="M22,6 L14,19 L21,19 L17,34 L27,17 L20,17 Z" fill={skin.secondaryColor} stroke={skin.color} strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="19" cy="18" r="2" fill="#fff" />
          </g>
        )}

        {skin.id === 'radioactive_waste' && (
          <g>
            <circle cx="20" cy="20" r="14" stroke={skin.color} strokeWidth="2" fill={`${skin.color}20`} />
            {/* Trefoil blades */}
            <path d="M20,20 L16,8 A12,12 0 0,1 24,8 Z" fill={skin.color} />
            <path d="M20,20 L27,24 A12,12 0 0,1 23,31 Z" fill={skin.color} />
            <path d="M20,20 L9,24 A12,12 0 0,1 13,31 Z" fill={skin.color} />
            <circle cx="20" cy="20" r="4.5" fill="#0a0a0a" stroke={skin.color} strokeWidth="1.5" />
            <circle cx="20" cy="20" r="2" fill="#fff" />
          </g>
        )}

        {skin.id === 'magma_core' && (
          <g>
            <polygon points="20,4 34,14 29,32 11,32 6,14" stroke={skin.color} strokeWidth="2.5" fill="#450a0a" />
            <circle cx="20" cy="20" r="7" fill={skin.color} />
            <circle cx="20" cy="20" r="3.5" fill={skin.secondaryColor} />
            <circle cx="20" cy="20" r="1.5" fill="#fff" />
          </g>
        )}

        {skin.id === 'bio_nanite' && (
          <g>
            <circle cx="20" cy="20" r="13" stroke={skin.color} strokeWidth="1.5" strokeDasharray="2 2" fill={`${skin.color}20`} />
            <line x1="12" y1="12" x2="28" y2="28" stroke={skin.secondaryColor} strokeWidth="1.5" />
            <line x1="12" y1="28" x2="28" y2="12" stroke={skin.secondaryColor} strokeWidth="1.5" />
            <circle cx="12" cy="12" r="2.5" fill={skin.color} />
            <circle cx="28" cy="12" r="2.5" fill={skin.color} />
            <circle cx="12" cy="28" r="2.5" fill={skin.color} />
            <circle cx="28" cy="28" r="2.5" fill={skin.color} />
            <rect x="17" y="17" width="6" height="6" fill="#fff" stroke={skin.color} strokeWidth="1" transform="rotate(45 20 20)" />
          </g>
        )}

        {/* LEGENDARY SKINS */}
        {skin.id === 'chrono_brass' && (
          <g>
            <circle cx="20" cy="20" r="13" stroke={skin.color} strokeWidth="2.5" fill={`${skin.color}20`} />
            <circle cx="20" cy="20" r="8" stroke={skin.secondaryColor} strokeWidth="1.5" fill="none" />
            {/* Clock hands */}
            <line x1="20" y1="20" x2="20" y2="10" stroke={skin.color} strokeWidth="2" strokeLinecap="round" />
            <line x1="20" y1="20" x2="25" y2="20" stroke={skin.secondaryColor} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="20" cy="20" r="2.5" fill="#fff" />
            {/* Gear teeth */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <circle
                key={i}
                cx={20 + 13.5 * Math.cos((deg * Math.PI) / 180)}
                cy={20 + 13.5 * Math.sin((deg * Math.PI) / 180)}
                r="1.8"
                fill={skin.color}
              />
            ))}
          </g>
        )}

        {skin.id === 'ghost_phantom' && (
          <g>
            <path
              d="M10,28 C10,14 14,8 20,8 C26,8 30,14 30,28 C27,25 24,28 20,25 C16,28 13,25 10,28 Z"
              stroke={skin.color}
              strokeWidth="2"
              fill={`${skin.color}40`}
            />
            <circle cx="16" cy="16" r="2" fill="#0f172a" />
            <circle cx="24" cy="16" r="2" fill="#0f172a" />
            <circle cx="16.5" cy="15.5" r="0.8" fill="#fff" />
            <circle cx="24.5" cy="15.5" r="0.8" fill="#fff" />
          </g>
        )}

        {skin.id === 'blood_moon' && (
          <g>
            <circle cx="20" cy="20" r="14" stroke={skin.color} strokeWidth="2" fill="#2d0606" />
            <path d="M20,6 A14,14 0 0,0 20,34 A10,10 0 0,1 20,6 Z" fill={skin.color} />
            <circle cx="18" cy="20" r="3.5" fill={skin.secondaryColor} />
            <circle cx="18" cy="20" r="1.5" fill="#000" />
          </g>
        )}

        {skin.id === 'deep_nebula' && (
          <g>
            <circle cx="20" cy="20" r="14" stroke={skin.color} strokeWidth="1.5" strokeDasharray="6 4" fill={`${skin.color}30`} />
            <path d="M12,20 Q20,10 28,20 T12,20" stroke={skin.secondaryColor} strokeWidth="2" fill="none" />
            <path d="M20,12 Q30,20 20,28 T20,12" stroke={skin.color} strokeWidth="1.5" fill="none" />
            <circle cx="20" cy="20" r="4" fill="#fff" />
          </g>
        )}

        {skin.id === 'quantum_pulsar' && (
          <g>
            <circle cx="20" cy="20" r="15" stroke={skin.color} strokeWidth="1.5" fill="none" />
            {/* 4 pulsar blades */}
            <path d="M20,5 L23,17 L35,20 L23,23 L20,35 L17,23 L5,20 L17,17 Z" fill={`${skin.color}50`} stroke={skin.secondaryColor} strokeWidth="1.5" />
            <circle cx="20" cy="20" r="3.5" fill="#fff" />
          </g>
        )}

        {skin.id === 'prism_rainbow' && (
          <g>
            <polygon points="20,6 34,31 6,31" stroke={skin.color} strokeWidth="2.5" fill={`${skin.color}35`} />
            <line x1="20" y1="6" x2="20" y2="31" stroke={skin.secondaryColor} strokeWidth="1.5" />
            <line x1="13" y1="18" x2="27" y2="18" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="10" y1="24" x2="30" y2="24" stroke="#f43f5e" strokeWidth="1.5" />
            <circle cx="20" cy="18" r="3" fill="#fff" />
          </g>
        )}

        {/* MYTHIC SKINS */}
        {skin.id === 'aurora_spirit' && (
          <g>
            <circle cx="20" cy="20" r="14" stroke={skin.color} strokeWidth="2" fill={`${skin.color}30`} />
            <path d="M8,15 Q14,24 20,16 T32,22" stroke={skin.secondaryColor} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M8,22 Q14,14 20,22 T32,16" stroke={skin.color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="20" cy="19" r="3" fill="#fff" />
          </g>
        )}

        {skin.id === 'carbon_titanium' && (
          <g>
            <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" stroke={skin.color} strokeWidth="3" fill="#1e293b" />
            <polygon points="20,9 29,14 29,26 20,31 11,26 11,14" stroke={skin.secondaryColor} strokeWidth="1.5" fill={`${skin.color}35`} />
            <circle cx="20" cy="20" r="4" fill="#fff" stroke={skin.color} strokeWidth="1.5" />
          </g>
        )}

        {skin.id === 'queen_regalia' && (
          <g>
            <polygon points="20,5 34,14 31,31 20,36 9,31 6,14" stroke={skin.color} strokeWidth="2.5" fill={`${skin.color}35`} />
            {/* Queen crown spikes */}
            <path d="M12,18 L16,10 L20,16 L24,10 L28,18" stroke={skin.secondaryColor} strokeWidth="2" fill="none" strokeLinecap="round" />
            <circle cx="20" cy="24" r="4.5" fill="#fff" stroke={skin.color} strokeWidth="2" />
          </g>
        )}

        {skin.id === 'celestial_sovereign' && (
          <g>
            {/* Halo */}
            <circle cx="20" cy="10" r="6" stroke={skin.secondaryColor} strokeWidth="2" fill="none" />
            {/* Wings */}
            <path d="M20,16 Q34,10 34,24 Q26,22 20,30 Q14,22 6,24 Q6,10 20,16 Z" fill={`${skin.color}50`} stroke={skin.color} strokeWidth="2" />
            <circle cx="20" cy="21" r="4" fill="#fff" stroke={skin.secondaryColor} strokeWidth="1.5" />
          </g>
        )}

        {skin.id === 'dark_singularity' && (
          <g>
            <circle cx="20" cy="20" r="14" stroke={skin.color} strokeWidth="2" strokeDasharray="6 3" fill="#030712" />
            <circle cx="20" cy="20" r="9" stroke={skin.secondaryColor} strokeWidth="2.5" fill="#000" />
            <ellipse cx="20" cy="20" rx="14" ry="4" transform="rotate(-30 20 20)" stroke={skin.color} strokeWidth="1.5" fill="none" />
            <circle cx="20" cy="20" r="2.5" fill="#fff" />
          </g>
        )}

        {skin.id === 'hyper_drive' && (
          <g>
            <path d="M7,32 L20,8 L33,32 L20,24 Z" stroke={skin.color} strokeWidth="2.5" fill={`${skin.color}40`} />
            <path d="M12,27 L20,13 L28,27 L20,22 Z" stroke={skin.secondaryColor} strokeWidth="1.5" fill="none" />
            <circle cx="20" cy="19" r="2.5" fill="#fff" />
          </g>
        )}

        {/* Programmatic Generic Fallback (ensures 100% reliable rendering for any future skin) */}
        {![
          'amber', 'golden_amber', 'crimson', 'forest_moss', 'cyan', 'toxic',
          'amethyst', 'solar_flare', 'glacial_cryo', 'emerald_matrix',
          'obsidian_shadow', 'synthwave_pink', 'electric_volt', 'radioactive_waste',
          'magma_core', 'bio_nanite', 'chrono_brass', 'ghost_phantom', 'blood_moon',
          'deep_nebula', 'quantum_pulsar', 'prism_rainbow', 'aurora_spirit',
          'carbon_titanium', 'queen_regalia', 'celestial_sovereign',
          'dark_singularity', 'hyper_drive',
        ].includes(skin.id) && (
          <g>
            <polygon
              points="20,4 34,12 34,28 20,36 6,28 6,12"
              stroke={skin.color}
              strokeWidth="2.5"
              fill={`${skin.color}30`}
            />
            <circle cx="20" cy="20" r="6" stroke={skin.secondaryColor} strokeWidth="2" fill={skin.color} />
            <circle cx="20" cy="20" r="2.5" fill="#fff" />
          </g>
        )}
      </svg>
    </div>
  );
};
