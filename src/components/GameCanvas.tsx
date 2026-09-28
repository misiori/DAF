import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Ant,
  Anthill,
  Obstacle,
  SpeedPortal,
  SugarCube,
  Particle,
  FloatingText,
  LevelConfig,
  SpeedMultiplier,
  PlayerProfile,
  CorridorSegment,
} from '../types/game';
import { ChallengeEvent } from '../lib/dailyChallenges';
import { getSkinById } from './SkinRenderer';
import { sound } from '../lib/audio';
import { DIFFICULTY_COLORS, DIFFICULTY_ANT_SCALING } from '../lib/constants';
import { RotateCcw, Cookie, Shield, Zap } from 'lucide-react';

interface GameCanvasProps {
  level: LevelConfig;
  profile: PlayerProfile;
  onGameOver: (score: number, sugarEarned: number, progressPercent?: number) => void;
  onVictory: (score: number, sugarEarned: number) => void;
  onExit: () => void;
  onProgressDailyChallenge?: (event: ChallengeEvent) => void;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
}

interface MechanicPod {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: string;
  pulse: number;
  hp?: number;
  maxHp?: number;
  label: string;
}

const getAntSizeForDifficulty = (diff: string, antType: string) => {
  const cfg = DIFFICULTY_ANT_SCALING[diff] || DIFFICULTY_ANT_SCALING.Easy;
  if (antType === 'fire') return cfg.fire;
  if (antType === 'acid') return cfg.acid;
  return cfg.worker;
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  profile,
  onGameOver,
  onVictory,
  onExit,
  onProgressDailyChallenge,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Countdown & Game state
  const [countdown, setCountdown] = useState<number | null>(3);
  const [isPaused, setIsPaused] = useState(false);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [lossReason, setLossReason] = useState<string>('');
  const [score, setScore] = useState(0);
  const [sugarCollected, setSugarCollected] = useState(0);
  const [health, setHealth] = useState(3);
  const [currentSpeed, setCurrentSpeed] = useState<SpeedMultiplier>(1.0);
  const [progress, setProgress] = useState(0);

  // Corridor Gamemode State
  const [corridorActive, setCorridorActive] = useState(false);
  const [corridorProgress, setCorridorProgress] = useState(0);
  const [corridorWarning, setCorridorWarning] = useState<string | null>(null);

  // Free mode dynamic state
  const [freeModeDifficulty, setFreeModeDifficulty] = useState<string>(level.difficulty);
  const [freeModeSecondsLeft, setFreeModeSecondsLeft] = useState<number>(15);

  const activeSkin = getSkinById(profile.active_skin);

  // References for 60fps game loop
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const countdownRef = useRef<number | null>(3);
  const speedMultiplierRef = useRef<SpeedMultiplier>(1.0);
  const scoreRef = useRef(0);
  const healthRef = useRef(3);
  const sugarRef = useRef(0);
  const gameTimeRef = useRef(0);
  const isPausedRef = useRef(false);
  const isGameOverRef = useRef(false);
  const freezeTimerRef = useRef(0);
  const clickRepulseCooldownRef = useRef(0);

  // Free mode ref
  const freeModeTimerRef = useRef(15);
  const currentDiffRef = useRef<string>(level.difficulty);
  const freeModeCorridorIntervalRef = useRef(40);

  // Entities
  const antsRef = useRef<Ant[]>([]);
  const anthillsRef = useRef<Anthill[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const portalsRef = useRef<SpeedPortal[]>([]);
  const sugarCubesRef = useRef<SugarCube[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const trailPointsRef = useRef<{ x: number; y: number; alpha: number }[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const mechanicPodsRef = useRef<MechanicPod[]>([]);

  // Corridor Mechanics Ref
  const corridorRef = useRef<{
    isActive: boolean;
    isTransforming: boolean;
    transformProgress: number; // 0 -> 1 sweep across
    portalX: number;
    segments: CorridorSegment[];
    distanceTraveled: number;
    targetDistance: number;
    scrollSpeed: number;
    phase: number;
    exitSpawned: boolean;
    exitX: number;
    exitY: number;
    exitRadius: number;
    triggerTime: number;
    completed: boolean;
  }>({
    isActive: false,
    isTransforming: false,
    transformProgress: 0,
    portalX: 0,
    segments: [],
    distanceTraveled: 0,
    targetDistance: 5000,
    scrollSpeed: 340,
    phase: 0,
    exitSpawned: false,
    exitX: 0,
    exitY: 0,
    exitRadius: 32,
    triggerTime: 20,
    completed: false,
  });

  // Border damage cooldown
  const borderHitCooldownRef = useRef(0);

  // Screen shake
  const shakeRef = useRef(0);

  // Sync pause ref
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Tab key to pause listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.code === 'Tab') {
        e.preventDefault();
        sound.playClick();
        setIsPaused((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Audio start / stop
  useEffect(() => {
    sound.startLevelBgm(level.id, level.bpm);
    return () => {
      sound.stopBgm();
    };
  }, [level]);

  // 3, 2, 1 Countdown Timer
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 1) {
      sound.playClick();
      const t = setTimeout(() => {
        setCountdown((c) => (c !== null ? c - 1 : null));
        countdownRef.current = (countdownRef.current || 3) - 1;
      }, 1000);
      return () => clearTimeout(t);
    } else if (countdown === 1) {
      sound.playClick();
      const t = setTimeout(() => {
        setCountdown(null);
        countdownRef.current = null;
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // Speed name helper
  const getSpeedName = (speed: SpeedMultiplier) => {
    if (speed === 0.5) return 'slow';
    if (speed === 1.5) return 'fast';
    if (speed === 2.0) return 'hyper';
    return 'normal';
  };

  // Helper: Add floating text
  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random() * 100000,
      text,
      x,
      y,
      color,
      life: 0,
      maxLife: 45,
    });
  };

  // Helper: Add particle explosion
  const addParticles = (x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      const speed = Math.random() * 5 + 2;
      const angle = Math.random() * Math.PI * 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 2,
        life: 0,
        maxLife: 20 + Math.random() * 20,
      });
    }
  };

  // Initialize level objects inside containment box
  const initLevel = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const boxTop = 72;
    const boxBottom = height - 20;
    const boxLeft = 20;
    const boxRight = width - 20;
    const boxCenterX = (boxLeft + boxRight) / 2;
    const boxCenterY = (boxTop + boxBottom) / 2;

    // Center cursor on start
    mouseRef.current = { x: boxCenterX, y: boxCenterY };
    speedMultiplierRef.current = 1.0;
    setCurrentSpeed(1.0);
    sound.setSpeedMultiplier(1.0);

    scoreRef.current = 0;
    setScore(0);
    healthRef.current = 3;
    setHealth(3);
    sugarRef.current = 0;
    setSugarCollected(0);
    gameTimeRef.current = 0;
    setProgress(0);
    isGameOverRef.current = false;
    setGameState('playing');
    setLossReason('');
    freeModeTimerRef.current = 15;
    freeModeCorridorIntervalRef.current = 38;
    currentDiffRef.current = level.difficulty;
    setFreeModeDifficulty(level.difficulty);
    setFreeModeSecondsLeft(15);
    borderHitCooldownRef.current = 0;
    freezeTimerRef.current = 0;

    // Reset countdown to 3
    setCountdown(3);
    countdownRef.current = 3;

    // Setup Corridor Gamemode parameters
    setCorridorActive(false);
    setCorridorProgress(0);
    setCorridorWarning(null);

    const hasCorridor = !!(level.hasCorridor || level.isCorridorMode);
    const isPureCorridor = !!level.isCorridorMode;

    // Initial Corridor Segments creation
    const initSegments: CorridorSegment[] = [];
    const baseTunnelH =
      level.difficulty === 'Crazy'
        ? 110
        : level.difficulty === 'Insane'
        ? 120
        : level.difficulty === 'Hard'
        ? 135
        : level.difficulty === 'Normal'
        ? 150
        : 165;

    for (let sx = boxLeft - 80; sx <= boxRight + 300; sx += 18) {
      initSegments.push({
        x: sx,
        midY: boxCenterY,
        tunnelHeight: baseTunnelH,
        topY: boxCenterY - baseTunnelH / 2,
        bottomY: boxCenterY + baseTunnelH / 2,
      });
    }

    corridorRef.current = {
      isActive: false,
      isTransforming: false,
      transformProgress: 0,
      portalX: boxLeft - 50,
      segments: initSegments,
      distanceTraveled: 0,
      targetDistance: isPureCorridor ? 6500 : 4800,
      scrollSpeed: 330 + (level.bpm - 120) * 0.5,
      phase: 0,
      exitSpawned: false,
      exitX: 0,
      exitY: 0,
      exitRadius: 34,
      triggerTime: isPureCorridor ? 0.3 : Math.min(22, Math.max(12, level.durationSeconds * 0.32)),
      completed: !hasCorridor,
    };

    // Anthills with Vital Meltdown Timers
    const hills: Anthill[] = [];
    const count = isPureCorridor ? 1 : level.spawnerCount;
    const baseMeltdown = Math.max(13, 19 - (level.id <= 24 ? level.id * 0.22 : 4));

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = Math.min((boxRight - boxLeft) * 0.36, (boxBottom - boxTop) * 0.36);
      const staggerTimer = baseMeltdown + i * 2.2;

      hills.push({
        id: i + 1,
        x: boxCenterX + Math.cos(angle) * dist,
        y: boxCenterY + Math.sin(angle) * dist,
        radius: 28,
        pulse: 0,
        spawnCooldown: 18 + Math.random() * 25,
        maxSpawnCooldown: Math.max(16, 52 - (level.id <= 24 ? level.id * 1.5 : 20)),
        type: i % 3 === 0 && (level.id >= 13 || level.isEndless) ? 'fire' : i % 2 === 1 && level.id >= 9 ? 'acid' : 'standard',
        hp: 3,
        maxHp: 3,
        destroyedTime: 0,
        meltdownTimer: staggerTimer,
        maxMeltdownTimer: baseMeltdown,
      });
    }
    anthillsRef.current = hills;

    // Reset entities
    const initialAnts: Ant[] = [];
    if (!isPureCorridor && (level.difficulty === 'Crazy' || (level.isEndless && currentDiffRef.current === 'Crazy'))) {
      initialAnts.push(
        {
          id: 9001,
          x: boxCenterX - (boxRight - boxLeft) * 0.25,
          y: boxCenterY - (boxBottom - boxTop) * 0.2,
          vx: 0,
          vy: 0,
          speed: 2.2,
          size: 22,
          type: 'titan',
          angle: 0,
          legPhase: 0,
          health: 12,
          isBigAnt: true,
          bigAntIndex: 0,
          rallyCooldown: 120,
        },
        {
          id: 9002,
          x: boxCenterX + (boxRight - boxLeft) * 0.25,
          y: boxCenterY + (boxBottom - boxTop) * 0.2,
          vx: 0,
          vy: 0,
          speed: 2.2,
          size: 22,
          type: 'titan',
          angle: Math.PI,
          legPhase: 3.14,
          health: 12,
          isBigAnt: true,
          bigAntIndex: 1,
          rallyCooldown: 260,
        }
      );
    }
    antsRef.current = initialAnts;
    portalsRef.current = [];
    sugarCubesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    trailPointsRef.current = [];
    shockwavesRef.current = [];

    // Interactive level mechanic pods
    const initialPods: MechanicPod[] = [];
    const mech = level.mechanicId || 'nuke_houses';
    if (!isPureCorridor) {
      if (mech === 'emp_pods' || mech === 'cryo_barrels') {
        initialPods.push({
          id: 1,
          x: boxCenterX + (Math.random() - 0.5) * 200,
          y: boxCenterY + (Math.random() - 0.5) * 140,
          radius: 20,
          type: 'emp_bomb',
          pulse: 0,
          label: 'emp pod',
        });
      } else if (mech === 'sugar_geysers' || mech === 'acid_geysers') {
        initialPods.push({
          id: 1,
          x: boxCenterX + (Math.random() - 0.5) * 220,
          y: boxCenterY + (Math.random() - 0.5) * 160,
          radius: 22,
          type: 'sugar_geyser',
          pulse: 0,
          label: 'geyser',
        });
      } else if (mech === 'honey_traps') {
        initialPods.push({
          id: 1,
          x: boxCenterX + (Math.random() - 0.5) * 180,
          y: boxCenterY + (Math.random() - 0.5) * 120,
          radius: 20,
          type: 'honey_trap',
          pulse: 0,
          label: 'honey',
        });
      } else if (mech === 'queen_cocoons' || mech === 'queen_fortress') {
        initialPods.push({
          id: 1,
          x: boxCenterX,
          y: boxCenterY,
          radius: 28,
          type: 'queen_cocoon',
          pulse: 0,
          hp: 7,
          maxHp: 7,
          label: 'cocoon',
        });
      }
    }
    mechanicPodsRef.current = initialPods;

    // Obstacles
    const obs: Obstacle[] = [];
    if (!isPureCorridor) {
      const sawCount = Math.min(Math.floor((level.id <= 24 ? level.id : 12) / 5) + 1, 4);
      for (let s = 0; s < sawCount; s++) {
        obs.push({
          id: s + 1,
          type: 'buzzsaw',
          x: boxLeft + 60 + Math.random() * (boxRight - boxLeft - 120),
          y: boxTop + 60 + Math.random() * (boxBottom - boxTop - 120),
          vx: (Math.random() - 0.5) * (2.6 + (level.id <= 24 ? level.id * 0.15 : 3)),
          vy: (Math.random() - 0.5) * (2.6 + (level.id <= 24 ? level.id * 0.15 : 3)),
          radius: 18 + (s % 2) * 5,
          angle: 0,
          rotationSpeed: 0.15,
        });
      }

      if (level.id >= 10 || level.isEndless) {
        obs.push({
          id: 99,
          type: 'laser',
          x: boxCenterX,
          y: boxCenterY,
          width: (boxRight - boxLeft) * 0.6,
          height: 7,
          angle: Math.random() * Math.PI,
          rotationSpeed: 0.005,
          state: 'charging',
          timer: 160,
        });
      }
    }

    obstaclesRef.current = obs;
  }, [level]);

  useEffect(() => {
    initLevel();
  }, [initLevel]);

  // Click & Tap Interaction Handling (Nuking anthills, pods, sonic pulse)
  const handleUserClick = (clickX: number, clickY: number) => {
    if (countdownRef.current !== null || isPausedRef.current || isGameOverRef.current) return;

    let targetHit = false;

    // 1. Check Anthill Click -> Vital Meltdown Defusal & Tactical Nuke!
    anthillsRef.current.forEach((hill) => {
      if (hill.destroyedTime && hill.destroyedTime > 0) return;
      const dist = Math.hypot(clickX - hill.x, clickY - hill.y);
      if (dist <= hill.radius + 24) {
        targetHit = true;
        hill.hp = (hill.hp ?? 3) - 1;
        sound.playZap();
        addParticles(hill.x, hill.y, 8, '#f59e0b');
        shakeRef.current = 7;

        if (hill.hp <= 0) {
          // PLAYER TACTICAL NUKE! (Anthill defused!)
          sound.playExplosion();
          shakeRef.current = 28;
          hill.destroyedTime = 13; // Disabled for 13s
          hill.meltdownTimer = hill.maxMeltdownTimer;
          hill.hp = 3;

          shockwavesRef.current.push({
            x: hill.x,
            y: hill.y,
            radius: 12,
            maxRadius: 260,
            color: '#f59e0b',
          });

          // Vaporize surrounding ants
          antsRef.current = antsRef.current.filter((ant) => {
            const adist = Math.hypot(ant.x - hill.x, ant.y - hill.y);
            if (adist <= 260) {
              addParticles(ant.x, ant.y, 6, '#ef4444');
              scoreRef.current += 15;
              if (ant.isBigAnt) {
                ant.health -= 3;
                return ant.health > 0;
              }
              return false;
            }
            return true;
          });

          scoreRef.current += 500;
          sugarRef.current += 3;
          setScore(scoreRef.current);
          setSugarCollected(sugarRef.current);
          addFloatingText('nuke! +500 pts', hill.x, hill.y - 28, '#f59e0b');
          onProgressDailyChallenge?.({ type: 'nuke_anthills', count: 1 });
        } else {
          addFloatingText(`hit! ${hill.hp} left`, hill.x, hill.y - 20, '#fbbf24');
        }
      }
    });

    // 2. Check Mechanic Pods Click
    mechanicPodsRef.current.forEach((pod, idx) => {
      const dist = Math.hypot(clickX - pod.x, clickY - pod.y);
      if (dist <= pod.radius + 15) {
        targetHit = true;
        if (pod.type === 'emp_bomb') {
          sound.playEmp();
          freezeTimerRef.current = 3.5; // Freeze for 3.5s
          shakeRef.current = 15;
          addFloatingText('emp freeze! 3.5s', pod.x, pod.y - 25, '#38bdf8');
          shockwavesRef.current.push({
            x: pod.x,
            y: pod.y,
            radius: 10,
            maxRadius: 300,
            color: '#38bdf8',
          });
          pod.x = window.innerWidth * 0.2 + Math.random() * window.innerWidth * 0.6;
          pod.y = window.innerHeight * 0.2 + Math.random() * window.innerHeight * 0.6;
        } else if (pod.type === 'sugar_geyser') {
          sound.playSugarCollect();
          addParticles(pod.x, pod.y, 16, '#fbbf24');
          addFloatingText('sugar blast! +4', pod.x, pod.y - 25, '#fbbf24');
          sugarRef.current += 4;
          setSugarCollected(sugarRef.current);
          scoreRef.current += 200;
          setScore(scoreRef.current);
          pod.x = window.innerWidth * 0.2 + Math.random() * window.innerWidth * 0.6;
          pod.y = window.innerHeight * 0.2 + Math.random() * window.innerHeight * 0.6;
        } else if (pod.type === 'honey_trap') {
          sound.playZap();
          addFloatingText('honey slow applied!', pod.x, pod.y - 20, '#f59e0b');
          antsRef.current.forEach((ant) => {
            const adist = Math.hypot(ant.x - pod.x, ant.y - pod.y);
            if (adist <= 200) {
              ant.speed *= 0.5;
            }
          });
          pod.x = window.innerWidth * 0.2 + Math.random() * window.innerWidth * 0.6;
          pod.y = window.innerHeight * 0.2 + Math.random() * window.innerHeight * 0.6;
        } else if (pod.type === 'queen_cocoon') {
          sound.playZap();
          pod.hp = (pod.hp ?? 7) - 1;
          addParticles(pod.x, pod.y, 6, '#ec4899');
          if (pod.hp <= 0) {
            sound.playExplosion();
            shakeRef.current = 20;
            addFloatingText('cocoon destroyed! +800 pts', pod.x, pod.y - 30, '#ec4899');
            scoreRef.current += 800;
            sugarRef.current += 5;
            setScore(scoreRef.current);
            setSugarCollected(sugarRef.current);
            mechanicPodsRef.current.splice(idx, 1);
          } else {
            addFloatingText(`cocoon: ${pod.hp} hp left`, pod.x, pod.y - 20, '#f472b6');
          }
        }
      }
    });

    // 3. Stagger / Damage Titan Big Ants (Crazy difficulty)
    antsRef.current.forEach((ant) => {
      if (ant.isBigAnt && ant.health > 0) {
        const dist = Math.hypot(clickX - ant.x, clickY - ant.y);
        if (dist <= ant.size + 15) {
          targetHit = true;
          sound.playZap();
          ant.health = Math.max(0, ant.health - 1);
          addParticles(ant.x, ant.y, 8, '#f43f5e');
          const knockAngle = Math.atan2(ant.y - clickY, ant.x - clickX);
          ant.x += Math.cos(knockAngle) * 45;
          ant.y += Math.sin(knockAngle) * 45;
          shakeRef.current = 10;
          addFloatingText(`staggered! ${ant.health} hp`, ant.x, ant.y - 25, '#fb7185');
        }
      }
    });

    // 4. Open Space Click -> Repulsor sonic shockwave
    if (!targetHit && clickRepulseCooldownRef.current <= 0) {
      clickRepulseCooldownRef.current = 12; // ~0.20s cooldown
      sound.playClick();
      shockwavesRef.current.push({
        x: clickX,
        y: clickY,
        radius: 6,
        maxRadius: 90,
        color: activeSkin.color,
      });

      // Push nearest ants back
      antsRef.current.forEach((ant) => {
        const adist = Math.hypot(ant.x - clickX, ant.y - clickY);
        if (adist < 90 && adist > 2) {
          ant.x += ((ant.x - clickX) / adist) * 35;
          ant.y += ((ant.y - clickY) / adist) * 35;
        }
      });
    }
  };

  // Handle Mouse & Touch movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        mouseRef.current = { x: touch.clientX, y: touch.clientY };
      }
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        mouseRef.current = { x: touch.clientX, y: touch.clientY };
        handleUserClick(touch.clientX, touch.clientY);
      }
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      handleUserClick(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [level]);

  // Main 60 FPS Render & Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Decorative floating dust motes
    const dustMotes = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const loop = () => {
      const BOX_TOP = 72;
      const BOX_BOTTOM = height - 20;
      const BOX_LEFT = 20;
      const BOX_RIGHT = width - 20;
      const BOX_CENTER_X = (BOX_LEFT + BOX_RIGHT) / 2;
      const BOX_CENTER_Y = (BOX_TOP + BOX_BOTTOM) / 2;

      // Update click repulse cooldown
      if (clickRepulseCooldownRef.current > 0) {
        clickRepulseCooldownRef.current -= 1;
      }

      // ONLY simulate if not paused, not gameover, and countdown finished!
      if (!isPausedRef.current && !isGameOverRef.current && countdownRef.current === null) {
        const speedMult = speedMultiplierRef.current;
        gameTimeRef.current += (1 / 60) * speedMult;

        // Border cooldown
        if (borderHitCooldownRef.current > 0) {
          borderHitCooldownRef.current -= 1;
        }

        // Freeze timer (from EMP pods)
        if (freezeTimerRef.current > 0) {
          freezeTimerRef.current -= 1 / 60;
        }

        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const safeTargetX = Math.max(BOX_LEFT + 2, Math.min(BOX_RIGHT - 2, mx));
        const safeTargetY = Math.max(BOX_TOP + 2, Math.min(BOX_BOTTOM - 2, my));

        // -------------------------------------------------------------
        // CORRIDOR TRIGGER & TRANSFORMATION PORTAL
        // "in some levels a corridor appears... and u cant just pick that portal it transforms u anyway"
        // -------------------------------------------------------------
        const hasCorridorFeature = !!(level.hasCorridor || level.isCorridorMode);
        const corridor = corridorRef.current;

        // Periodic trigger in Free Mode
        if (level.isEndless) {
          freeModeCorridorIntervalRef.current -= (1 / 60) * speedMult;
          if (freeModeCorridorIntervalRef.current <= 0 && !corridor.isActive && !corridor.isTransforming) {
            freeModeCorridorIntervalRef.current = 45;
            corridor.completed = false;
            corridor.distanceTraveled = 0;
            corridor.exitSpawned = false;
            corridor.triggerTime = gameTimeRef.current + 0.1;
          }
        }

        if (
          hasCorridorFeature &&
          !corridor.isActive &&
          !corridor.completed &&
          gameTimeRef.current >= corridor.triggerTime
        ) {
          if (!corridor.isTransforming) {
            corridor.isTransforming = true;
            corridor.transformProgress = 0;
            corridor.portalX = BOX_LEFT;
            sound.playAlarm();
            setCorridorWarning('corridor transformation portal approaching!');
          } else {
            // Portal sweeps across screen from left to right (unavoidable transformation!)
            corridor.transformProgress += (1 / 60) * 0.9;
            corridor.portalX = BOX_LEFT + corridor.transformProgress * (BOX_RIGHT - BOX_LEFT);

            // Add portal energy particles
            for (let p = 0; p < 3; p++) {
              particlesRef.current.push({
                x: corridor.portalX + (Math.random() - 0.5) * 20,
                y: BOX_TOP + Math.random() * (BOX_BOTTOM - BOX_TOP),
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: '#38bdf8',
                size: Math.random() * 3 + 2,
                life: 0,
                maxLife: 25,
              });
            }

            // Once the portal sweeps across or touches cursor: TRANSFORMATION COMPLETE!
            if (corridor.transformProgress >= 1.0 || Math.abs(safeTargetX - corridor.portalX) < 30) {
              corridor.isTransforming = false;
              corridor.isActive = true;
              setCorridorActive(true);
              setCorridorWarning(null);
              sound.playCorridorEnter();
              shakeRef.current = 26;
              addFloatingText('corridor engaged! touch borders = die', safeTargetX, safeTargetY - 30, '#38bdf8');

              // Vaporize / push all ants out of the corridor path!
              antsRef.current = [];
              shockwavesRef.current.push({
                x: safeTargetX,
                y: safeTargetY,
                radius: 12,
                maxRadius: 400,
                color: '#38bdf8',
              });
            }
          }
        }

        // -------------------------------------------------------------
        // CORRIDOR SIMULATION & BORDER DEATH
        // "and its generating and generating until it ends... if u touch the borders u die"
        // -------------------------------------------------------------
        if (corridor.isActive) {
          const scrollDelta = corridor.scrollSpeed * speedMult * (1 / 60);
          corridor.distanceTraveled += scrollDelta;
          const progRatio = Math.min(100, (corridor.distanceTraveled / corridor.targetDistance) * 100);
          setCorridorProgress(progRatio);

          // Scroll segments to the left
          corridor.segments.forEach((seg) => {
            seg.x -= scrollDelta;
          });

          // Discard segments that have moved past left edge
          corridor.segments = corridor.segments.filter((seg) => seg.x >= BOX_LEFT - 100);

          // Continuously generate new segments on the right!
          const lastSeg = corridor.segments[corridor.segments.length - 1];
          let nextX = lastSeg ? lastSeg.x + 18 : BOX_RIGHT;

          while (nextX < BOX_RIGHT + 280) {
            corridor.phase += 0.048 * speedMult;
            const centerY = BOX_CENTER_Y;
            const amp = Math.min((BOX_BOTTOM - BOX_TOP) * 0.28, 140);
            const midY = centerY + Math.sin(corridor.phase) * amp + Math.sin(corridor.phase * 2.1) * (amp * 0.35);
            const clampedMidY = Math.max(BOX_TOP + 80, Math.min(BOX_BOTTOM - 80, midY));

            const baseH =
              level.difficulty === 'Crazy'
                ? 110
                : level.difficulty === 'Insane'
                ? 120
                : level.difficulty === 'Hard'
                ? 135
                : level.difficulty === 'Normal'
                ? 148
                : 165;
            const tunnelH = baseH + Math.sin(corridor.phase * 1.7) * 16;

            let topY = clampedMidY - tunnelH / 2;
            let bottomY = clampedMidY + tunnelH / 2;

            // When approaching end, corridor widens into the exit chamber!
            if (corridor.distanceTraveled >= corridor.targetDistance - 380) {
              topY = Math.max(BOX_TOP + 15, clampedMidY - (tunnelH + 140) / 2);
              bottomY = Math.min(BOX_BOTTOM - 15, clampedMidY + (tunnelH + 140) / 2);
            }

            corridor.segments.push({
              x: nextX,
              midY: clampedMidY,
              tunnelHeight: tunnelH,
              topY,
              bottomY,
            });

            // Spawn Exit Portal at the end of the corridor!
            if (corridor.distanceTraveled >= corridor.targetDistance && !corridor.exitSpawned) {
              corridor.exitSpawned = true;
              corridor.exitX = nextX + 60;
              corridor.exitY = clampedMidY;
              corridor.exitRadius = 34;
            }

            nextX += 18;
          }

          // Move exit portal if spawned
          if (corridor.exitSpawned) {
            corridor.exitX -= scrollDelta;

            // Check collision with Exit Portal!
            const distToExit = Math.hypot(safeTargetX - corridor.exitX, safeTargetY - corridor.exitY);
            if (distToExit <= corridor.exitRadius + 18) {
              // EXIT REACHED! CORRIDOR CLEARED!
              sound.playCorridorExit();
              confetti({
                particleCount: 80,
                spread: 85,
                origin: { x: safeTargetX / width, y: safeTargetY / height },
              });
              addFloatingText('exit reached! corridor survived! +1000', safeTargetX, safeTargetY - 25, '#38bdf8');
              scoreRef.current += 1000;
              sugarRef.current += 5;
              setScore(scoreRef.current);
              setSugarCollected(sugarRef.current);
              onProgressDailyChallenge?.({ type: 'survive_corridor', count: 1 });

              corridor.completed = true;
              corridor.isActive = false;
              setCorridorActive(false);

              if (level.isCorridorMode) {
                isGameOverRef.current = true;
                setGameState('won');
                onVictory(scoreRef.current, sugarRef.current);
                return;
              } else {
                // Exit shockwave clears colony and gives immunity!
                antsRef.current = [];
                borderHitCooldownRef.current = 180; // 3s immunity
                shockwavesRef.current.push({
                  x: safeTargetX,
                  y: safeTargetY,
                  radius: 15,
                  maxRadius: 600,
                  color: '#38bdf8',
                });
                addFloatingText('colony vaporized by exit blast!', width / 2, height / 2, '#38bdf8');
              }
            }
          }

          // ---------------------------------------------------------
          // CORRIDOR BORDER COLLISION CHECK: TOUCH BORDER = INSTANT DEATH!
          // ---------------------------------------------------------
          // Find the segments enclosing the cursor x
          let seg1: CorridorSegment | null = null;
          let seg2: CorridorSegment | null = null;

          for (let i = 0; i < corridor.segments.length - 1; i++) {
            if (corridor.segments[i].x <= safeTargetX && corridor.segments[i + 1].x >= safeTargetX) {
              seg1 = corridor.segments[i];
              seg2 = corridor.segments[i + 1];
              break;
            }
          }

          if (seg1 && seg2) {
            const segDist = seg2.x - seg1.x || 1;
            const t = (safeTargetX - seg1.x) / segDist;
            const curTopY = seg1.topY + (seg2.topY - seg1.topY) * t;
            const curBottomY = seg1.bottomY + (seg2.bottomY - seg1.bottomY) * t;

            // Strict border collision: If cursor touches borders, player dies!
            if (
              safeTargetY <= curTopY + 4 ||
              safeTargetY >= curBottomY - 4 ||
              safeTargetX <= BOX_LEFT + 2 ||
              safeTargetX >= BOX_RIGHT - 2
            ) {
              sound.playExplosion();
              shakeRef.current = 42;
              addParticles(safeTargetX, safeTargetY, 40, '#f43f5e');
              isGameOverRef.current = true;
              setLossReason('vaporized by corridor borders');
              setGameState('lost');
              onGameOver(scoreRef.current, sugarRef.current, progress);
              return;
            }
          }
        } else {
          // Standard arena containment border collision check (when not in corridor)
          const isBreachingHeader = my <= BOX_TOP;
          const isBreachingBorder = mx <= BOX_LEFT || mx >= BOX_RIGHT || my >= BOX_BOTTOM;

          if ((isBreachingHeader || isBreachingBorder) && borderHitCooldownRef.current <= 0) {
            borderHitCooldownRef.current = 45;
            healthRef.current -= 1;
            setHealth(healthRef.current);
            sound.playHitSound();
            shakeRef.current = 20;

            addFloatingText('-1 shield', Math.max(BOX_LEFT + 80, Math.min(BOX_RIGHT - 80, mx)), Math.max(BOX_TOP + 30, my), '#ef4444');
            addParticles(mx, my, 20, '#60a5fa');

            if (healthRef.current <= 0) {
              isGameOverRef.current = true;
              setLossReason('perimeter breached');
              setGameState('lost');
              onGameOver(scoreRef.current, sugarRef.current, progress);
              return;
            }
          }
        }

        // Free mode difficulty shift
        if (level.isEndless) {
          freeModeTimerRef.current -= 1 / 60;
          setFreeModeSecondsLeft(Math.max(0, Math.ceil(freeModeTimerRef.current)));

          if (freeModeTimerRef.current <= 0) {
            freeModeTimerRef.current = 15;
            const allDiffs = ['Easy', 'Normal', 'Hard', 'Harder', 'Insane', 'Crazy'];
            const newDiff = allDiffs[Math.floor(Math.random() * allDiffs.length)];
            currentDiffRef.current = newDiff;
            setFreeModeDifficulty(newDiff);
            sound.playPortalSound(1.5);
            shakeRef.current = 15;
            addFloatingText(`difficulty shift: ${newDiff.toLowerCase()}`, width / 2, height / 2, DIFFICULTY_COLORS[newDiff] || '#3b82f6');
          }
        }

        // Update level progress bar
        if (!level.isEndless) {
          const currentProg = Math.min(100, (gameTimeRef.current / level.durationSeconds) * 100);
          setProgress(currentProg);

          if (currentProg >= 100 && !isGameOverRef.current) {
            isGameOverRef.current = true;
            setGameState('won');
            sound.playVictory();
            onVictory(scoreRef.current, sugarRef.current);
            return;
          }
        }

        // Spawn Speed Portals
        if (Math.random() < 0.005 && portalsRef.current.length < 2 && !corridor.isActive) {
          const speeds: SpeedMultiplier[] = [0.5, 1.0, 1.5, 2.0];
          const target = speeds[Math.floor(Math.random() * speeds.length)];
          const portalColor =
            target === 0.5 ? '#f59e0b' : target === 1.5 ? '#3b82f6' : target === 2.0 ? '#ef4444' : '#10b981';

          portalsRef.current.push({
            id: Math.random() * 100000,
            x: BOX_LEFT + 60 + Math.random() * (BOX_RIGHT - BOX_LEFT - 120),
            y: BOX_TOP + 60 + Math.random() * (BOX_BOTTOM - BOX_TOP - 120),
            radius: 22,
            targetSpeed: target,
            active: true,
            angle: 0,
            color: portalColor,
            label: getSpeedName(target),
          });
        }

        // Spawn sugar cubes
        if (Math.random() < 0.015 && sugarCubesRef.current.length < 5 && !corridor.isActive) {
          sugarCubesRef.current.push({
            id: Math.random() * 100000,
            x: BOX_LEFT + 50 + Math.random() * (BOX_RIGHT - BOX_LEFT - 100),
            y: BOX_TOP + 50 + Math.random() * (BOX_BOTTOM - BOX_TOP - 100),
            value: 1,
            pulse: 0,
          });
        }

        // -------------------------------------------------------------
        // ANTHILL MELTDOWN & ESCALATING SURVIVAL SPAWNER (When not in corridor)
        // -------------------------------------------------------------
        if (!corridor.isActive) {
          anthillsRef.current.forEach((hill) => {
            hill.pulse += 0.05 * speedMult;

            // If destroyed/nuked, count down reboot timer
            if (hill.destroyedTime && hill.destroyedTime > 0) {
              hill.destroyedTime -= 1 / 60;
              if (hill.destroyedTime <= 0) {
                hill.meltdownTimer = hill.maxMeltdownTimer;
                hill.hp = 3;
                addFloatingText('anthill rebooted!', hill.x, hill.y - 25, '#38bdf8');
              }
              return;
            }

            // Meltdown countdown!
            if (hill.meltdownTimer !== undefined) {
              hill.meltdownTimer -= (1 / 60) * speedMult;

              // Play warning blip when critical (< 3s)
              if (hill.meltdownTimer <= 3.0 && hill.meltdownTimer > 0) {
                if (Math.floor(hill.meltdownTimer * 4) !== Math.floor((hill.meltdownTimer + 1 / 60) * 4)) {
                  sound.playAlarm();
                }
              }

              // Overload meltdown triggered: Level Nuked!
              if (hill.meltdownTimer <= 0) {
                sound.playExplosion();
                shakeRef.current = 45;
                isGameOverRef.current = true;
                setLossReason('anthill overloaded & nuked the level!');
                setGameState('lost');
                onGameOver(scoreRef.current, sugarRef.current, progress);
                return;
              }
            }

            // Escalating spawn rate as meltdown nears 0
            const urgencyFactor =
              hill.meltdownTimer && hill.maxMeltdownTimer
                ? 1 + Math.max(0, 1 - hill.meltdownTimer / hill.maxMeltdownTimer) * 1.8
                : 1;

            hill.spawnCooldown -= 1 * speedMult * urgencyFactor;

            if (hill.spawnCooldown <= 0 && antsRef.current.length < level.maxAnts && freezeTimerRef.current <= 0) {
              hill.spawnCooldown = hill.maxSpawnCooldown;
              const diffKey = level.isEndless ? currentDiffRef.current : level.difficulty;
              const antSize = getAntSizeForDifficulty(diffKey, hill.type);

              antsRef.current.push({
                id: Math.random() * 1000000,
                x: hill.x,
                y: hill.y,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                speed: (Math.random() * 0.9 + 2.1) * (level.bpm / 125) * (level.id <= 24 ? 1 + level.id * 0.025 : 1.3),
                size: antSize,
                type: hill.type === 'fire' ? 'fire' : hill.type === 'acid' ? 'acid' : 'worker',
                angle: Math.random() * Math.PI * 2,
                legPhase: Math.random() * 10,
                health: hill.type === 'fire' ? 2 : 1,
              });
            }
          });

          // Update Ants (only if not frozen by EMP)
          if (freezeTimerRef.current <= 0) {
            antsRef.current.forEach((ant) => {
              const dx = safeTargetX - ant.x;
              const dy = safeTargetY - ant.y;
              const dist = Math.hypot(dx, dy);

              let targetAngle = Math.atan2(dy, dx);
              if (ant.targetAngleOffset) targetAngle += ant.targetAngleOffset;

              let angleDiff = targetAngle - ant.angle;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff -= Math.PI * 2;

              const turnRate = ant.isBigAnt ? 0.04 : 0.08 * speedMult;
              ant.angle += angleDiff * turnRate;

              const moveSpeed = ant.speed * speedMult;
              ant.vx = Math.cos(ant.angle) * moveSpeed;
              ant.vy = Math.sin(ant.angle) * moveSpeed;

              ant.x += ant.vx;
              ant.y += ant.vy;
              ant.legPhase += 0.25 * speedMult;

              // Bounce within box
              if (ant.x - ant.size < BOX_LEFT) {
                ant.x = BOX_LEFT + ant.size;
                ant.vx = Math.abs(ant.vx);
              }
              if (ant.x + ant.size > BOX_RIGHT) {
                ant.x = BOX_RIGHT - ant.size;
                ant.vx = -Math.abs(ant.vx);
              }
              if (ant.y - ant.size < BOX_TOP) {
                ant.y = BOX_TOP + ant.size;
                ant.vy = Math.abs(ant.vy);
              }
              if (ant.y + ant.size > BOX_BOTTOM) {
                ant.y = BOX_BOTTOM - ant.size;
                ant.vy = -Math.abs(ant.vy);
              }

              // Hit test with cursor
              if (dist < ant.size + 10 && borderHitCooldownRef.current <= 0) {
                healthRef.current -= 1;
                setHealth(healthRef.current);
                sound.playHitSound();
                shakeRef.current = 18;
                borderHitCooldownRef.current = 35;

                addFloatingText('-1 shield', safeTargetX, safeTargetY - 20, '#ef4444');
                addParticles(ant.x, ant.y, 14, '#ef4444');

                if (healthRef.current <= 0) {
                  isGameOverRef.current = true;
                  setLossReason('swarm overwhelmed your cursor');
                  setGameState('lost');
                  onGameOver(scoreRef.current, sugarRef.current, progress);
                }
              }
            });
          }

          // Update Obstacles (Buzzsaws & Lasers)
          obstaclesRef.current.forEach((obs) => {
            if (obs.type === 'buzzsaw') {
              obs.x += (obs.vx || 0) * speedMult;
              obs.y += (obs.vy || 0) * speedMult;
              obs.angle = (obs.angle || 0) + (obs.rotationSpeed || 0.1) * speedMult;

              const r = obs.radius || 20;
              if (obs.x - r < BOX_LEFT) {
                obs.x = BOX_LEFT + r;
                obs.vx = Math.abs(obs.vx || 1);
              }
              if (obs.x + r > BOX_RIGHT) {
                obs.x = BOX_RIGHT - r;
                obs.vx = -Math.abs(obs.vx || 1);
              }
              if (obs.y - r < BOX_TOP) {
                obs.y = BOX_TOP + r;
                obs.vy = Math.abs(obs.vy || 1);
              }
              if (obs.y + r > BOX_BOTTOM) {
                obs.y = BOX_BOTTOM - r;
                obs.vy = -Math.abs(obs.vy || 1);
              }

              const dist = Math.hypot(safeTargetX - obs.x, safeTargetY - obs.y);
              if (dist < r + 10 && borderHitCooldownRef.current <= 0) {
                healthRef.current -= 1;
                setHealth(healthRef.current);
                sound.playHitSound();
                shakeRef.current = 20;
                borderHitCooldownRef.current = 40;
                addFloatingText('-1 shield', safeTargetX, safeTargetY - 20, '#ef4444');

                if (healthRef.current <= 0) {
                  isGameOverRef.current = true;
                  setLossReason('sliced by buzzsaw hazard');
                  setGameState('lost');
                  onGameOver(scoreRef.current, sugarRef.current, progress);
                }
              }
            } else if (obs.type === 'laser') {
              obs.angle = (obs.angle || 0) + (obs.rotationSpeed || 0.005) * speedMult;
            }
          });

          // Collect Sugar Cubes
          sugarCubesRef.current = sugarCubesRef.current.filter((cube) => {
            const dist = Math.hypot(safeTargetX - cube.x, safeTargetY - cube.y);
            if (dist < 26) {
              sugarRef.current += cube.value;
              setSugarCollected(sugarRef.current);
              scoreRef.current += 100;
              setScore(scoreRef.current);
              sound.playSugarCollect();
              addFloatingText(`+${cube.value} sugar`, cube.x, cube.y - 15, '#fbbf24');
              addParticles(cube.x, cube.y, 8, '#f59e0b');
              onProgressDailyChallenge?.({ type: 'collect_sugar', count: cube.value });
              return false;
            }
            cube.pulse += 0.05;
            return true;
          });

          // Speed Portals Hit Test
          portalsRef.current.forEach((portal) => {
            portal.angle += 0.04 * speedMult;
            const dist = Math.hypot(safeTargetX - portal.x, safeTargetY - portal.y);
            if (dist < portal.radius + 12 && portal.active) {
              speedMultiplierRef.current = portal.targetSpeed;
              setCurrentSpeed(portal.targetSpeed);
              sound.setSpeedMultiplier(portal.targetSpeed);
              sound.playPortalSound(portal.targetSpeed);
              shakeRef.current = 12;
              portal.active = false;
              addFloatingText(`speed: ${portal.label}`, portal.x, portal.y - 20, portal.color);

              // Passing portals triggers shockwave that pushes ants!
              shockwavesRef.current.push({
                x: portal.x,
                y: portal.y,
                radius: 10,
                maxRadius: 180,
                color: portal.color,
              });

              onProgressDailyChallenge?.({ type: 'speed_portals', count: 1 });
            }
          });
          portalsRef.current = portalsRef.current.filter((p) => p.active);
        }

        // Update Shockwaves
        shockwavesRef.current.forEach((sw) => {
          sw.radius += 8 * speedMult;
        });
        shockwavesRef.current = shockwavesRef.current.filter((sw) => sw.radius < sw.maxRadius);

        // Update Particles
        particlesRef.current.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life += 1;
        });
        particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

        // Update Floating Texts
        floatingTextsRef.current.forEach((ft) => {
          ft.y -= 0.8;
          ft.life += 1;
        });
        floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.life < ft.maxLife);

        // Update Cursor Trail
        trailPointsRef.current.unshift({ x: safeTargetX, y: safeTargetY, alpha: 1.0 });
        if (trailPointsRef.current.length > 18) {
          trailPointsRef.current.pop();
        }
        trailPointsRef.current.forEach((pt) => {
          pt.alpha *= 0.86;
        });

        // Survive score accumulator
        scoreRef.current += Math.round(1 * speedMult);
        setScore(scoreRef.current);
      }

      // Update Screen Shake
      let offsetX = 0;
      let offsetY = 0;
      if (shakeRef.current > 0) {
        offsetX = (Math.random() - 0.5) * shakeRef.current;
        offsetY = (Math.random() - 0.5) * shakeRef.current;
        shakeRef.current *= 0.88;
        if (shakeRef.current < 0.2) shakeRef.current = 0;
      }

      // -------------------------------------------------------------
      // 2D CANVAS RENDERING
      // -------------------------------------------------------------
      ctx.save();
      ctx.translate(offsetX, offsetY);

      // 1. Dynamic Background with Level Theme
      ctx.fillStyle = level.bgColor || '#050a14';
      ctx.fillRect(0, 0, width, height);

      // Subtle ambient background grid
      ctx.strokeStyle = `${level.themeColor}12`;
      ctx.lineWidth = 1;
      const gridSize = 48;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Floating dust motes
      dustMotes.forEach((m) => {
        m.x += m.vx;
        m.y += m.vy;
        if (m.x < 0) m.x = width;
        if (m.x > width) m.x = 0;
        if (m.y < 0) m.y = height;
        if (m.y > height) m.y = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${m.alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // -------------------------------------------------------------
      // CORRIDOR RENDERING (When Corridor Mode is Active)
      // -------------------------------------------------------------
      const corridor = corridorRef.current;
      if (corridor.isActive && corridor.segments.length > 1) {
        // Draw Upper Hazard Wall (from BOX_TOP down to segment.topY)
        ctx.save();
        ctx.fillStyle = '#05070f';
        ctx.beginPath();
        ctx.moveTo(corridor.segments[0].x, BOX_TOP);
        for (let i = 0; i < corridor.segments.length; i++) {
          ctx.lineTo(corridor.segments[i].x, corridor.segments[i].topY);
        }
        ctx.lineTo(corridor.segments[corridor.segments.length - 1].x, BOX_TOP);
        ctx.closePath();
        ctx.fill();

        // Upper Wall Hazard Crosshatch
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.lineWidth = 2;
        for (let x = BOX_LEFT; x < BOX_RIGHT; x += 36) {
          ctx.beginPath();
          ctx.moveTo(x, BOX_TOP);
          ctx.lineTo(x + 24, BOX_TOP + 100);
          ctx.stroke();
        }

        // Draw Lower Hazard Wall (from segment.bottomY down to BOX_BOTTOM)
        ctx.fillStyle = '#05070f';
        ctx.beginPath();
        ctx.moveTo(corridor.segments[0].x, BOX_BOTTOM);
        for (let i = 0; i < corridor.segments.length; i++) {
          ctx.lineTo(corridor.segments[i].x, corridor.segments[i].bottomY);
        }
        ctx.lineTo(corridor.segments[corridor.segments.length - 1].x, BOX_BOTTOM);
        ctx.closePath();
        ctx.fill();

        // Lower Wall Hazard Crosshatch
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.lineWidth = 2;
        for (let x = BOX_LEFT; x < BOX_RIGHT; x += 36) {
          ctx.beginPath();
          ctx.moveTo(x, BOX_BOTTOM);
          ctx.lineTo(x + 24, BOX_BOTTOM - 100);
          ctx.stroke();
        }

        // Safe Corridor Interior Glow
        ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
        ctx.beginPath();
        ctx.moveTo(corridor.segments[0].x, corridor.segments[0].topY);
        for (let i = 0; i < corridor.segments.length; i++) {
          ctx.lineTo(corridor.segments[i].x, corridor.segments[i].topY);
        }
        for (let i = corridor.segments.length - 1; i >= 0; i--) {
          ctx.lineTo(corridor.segments[i].x, corridor.segments[i].bottomY);
        }
        ctx.closePath();
        ctx.fill();

        // Subtle Center Guide Line
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < corridor.segments.length; i++) {
          if (i === 0) ctx.moveTo(corridor.segments[i].x, corridor.segments[i].midY);
          else ctx.lineTo(corridor.segments[i].x, corridor.segments[i].midY);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // TOP BORDER LASER LINE (Deadly!)
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        for (let i = 0; i < corridor.segments.length; i++) {
          if (i === 0) ctx.moveTo(corridor.segments[i].x, corridor.segments[i].topY);
          else ctx.lineTo(corridor.segments[i].x, corridor.segments[i].topY);
        }
        ctx.stroke();

        // BOTTOM BORDER LASER LINE (Deadly!)
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        for (let i = 0; i < corridor.segments.length; i++) {
          if (i === 0) ctx.moveTo(corridor.segments[i].x, corridor.segments[i].bottomY);
          else ctx.lineTo(corridor.segments[i].x, corridor.segments[i].bottomY);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // EXIT PORTAL RENDERING
        if (corridor.exitSpawned && corridor.exitX > BOX_LEFT && corridor.exitX < BOX_RIGHT + 100) {
          const ex = corridor.exitX;
          const ey = corridor.exitY;
          const er = corridor.exitRadius;

          ctx.save();
          // Rotating Outer Ring
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(ex, ey, er + Math.sin(gameTimeRef.current * 8) * 3, 0, Math.PI * 2);
          ctx.stroke();

          // Inner Golden Vortex
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ex, ey, er * 0.65, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(ex, ey, er * 0.35, 0, Math.PI * 2);
          ctx.fill();

          // "EXIT" Label
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px Patrick_Hand, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowBlur = 4;
          ctx.fillText('EXIT', ex, ey - er - 14);

          ctx.restore();
        }

        ctx.restore();
      } else {
        // Standard Level Containment Border (Clean minimalist box)
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(BOX_LEFT, BOX_TOP, BOX_RIGHT - BOX_LEFT, BOX_BOTTOM - BOX_TOP);

        // Subtle glowing corner accents
        ctx.strokeStyle = level.themeColor;
        ctx.lineWidth = 3;
        const cornerLen = 14;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(BOX_LEFT, BOX_TOP + cornerLen);
        ctx.lineTo(BOX_LEFT, BOX_TOP);
        ctx.lineTo(BOX_LEFT + cornerLen, BOX_TOP);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(BOX_RIGHT - cornerLen, BOX_TOP);
        ctx.lineTo(BOX_RIGHT, BOX_TOP);
        ctx.lineTo(BOX_RIGHT, BOX_TOP + cornerLen);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(BOX_LEFT, BOX_BOTTOM - cornerLen);
        ctx.lineTo(BOX_LEFT, BOX_BOTTOM);
        ctx.lineTo(BOX_LEFT + cornerLen, BOX_BOTTOM);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(BOX_RIGHT - cornerLen, BOX_BOTTOM);
        ctx.lineTo(BOX_RIGHT, BOX_BOTTOM);
        ctx.lineTo(BOX_RIGHT, BOX_BOTTOM - cornerLen);
        ctx.stroke();
        ctx.restore();
      }

      // -------------------------------------------------------------
      // TRANSFORMATION PORTAL SWEEPING ACROSS
      // "and u cant just pick that portal it transforms u anyway"
      // -------------------------------------------------------------
      if (corridor.isTransforming) {
        ctx.save();
        const px = corridor.portalX;

        // Dimensional Ripple Beam
        const grad = ctx.createLinearGradient(px - 40, 0, px + 40, 0);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.45)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(px - 40, BOX_TOP, 80, BOX_BOTTOM - BOX_TOP);

        // Electric Vertical Laser Rift
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(px, BOX_TOP);
        for (let y = BOX_TOP; y <= BOX_BOTTOM; y += 20) {
          ctx.lineTo(px + (Math.random() - 0.5) * 8, y);
        }
        ctx.stroke();

        // Portal Marker Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px Patrick_Hand, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ CORRIDOR PORTAL', px, BOX_TOP + 28);
        ctx.restore();
      }

      // -------------------------------------------------------------
      // ENTITY RENDERING (When not in corridor)
      // -------------------------------------------------------------
      if (!corridor.isActive) {
        // Draw Anthills with Vital Meltdown Radial Timer Ring & Spam Counter!
        anthillsRef.current.forEach((hill) => {
          ctx.save();

          const isDestroyed = hill.destroyedTime && hill.destroyedTime > 0;
          const tLeft = hill.meltdownTimer ?? 15;
          const isCritical = tLeft <= 3.5 && !isDestroyed;

          // Anthill Base
          ctx.fillStyle = isDestroyed
            ? '#262626'
            : hill.type === 'fire'
            ? '#7f1d1d'
            : hill.type === 'acid'
            ? '#14532d'
            : '#1e293b';

          ctx.beginPath();
          ctx.arc(hill.x, hill.y, hill.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isDestroyed
            ? '#525252'
            : isCritical
            ? '#ef4444'
            : hill.type === 'fire'
            ? '#ef4444'
            : hill.type === 'acid'
            ? '#22c55e'
            : '#64748b';
          ctx.lineWidth = isCritical ? 4 : 2;
          ctx.stroke();

          // Anthill Hole
          ctx.fillStyle = '#090a0f';
          ctx.beginPath();
          ctx.arc(hill.x, hill.y, hill.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();

          // HP Remaining Dots
          if (!isDestroyed) {
            const hpCount = hill.hp ?? 3;
            for (let d = 0; d < 3; d++) {
              ctx.fillStyle = d < hpCount ? '#fbbf24' : '#475569';
              ctx.beginPath();
              ctx.arc(hill.x + (d - 1) * 8, hill.y + 4, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // RADIAL MELTDOWN COUNTDOWN RING
          if (!isDestroyed && hill.meltdownTimer !== undefined && hill.maxMeltdownTimer) {
            const ratio = Math.max(0, hill.meltdownTimer / hill.maxMeltdownTimer);
            const ringR = hill.radius + 12;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(hill.x, hill.y, ringR, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = isCritical ? '#ef4444' : ratio > 0.5 ? '#38bdf8' : '#f59e0b';
            ctx.lineWidth = isCritical ? 5 : 3.5;
            ctx.beginPath();
            ctx.arc(hill.x, hill.y, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
            ctx.stroke();

            // Meltdown Timer Text
            ctx.font = 'bold 13px Patrick_Hand, monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = isCritical ? '#ef4444' : '#f1f5f9';

            if (isCritical) {
              ctx.fillText(`⚠ NUKE! ${tLeft.toFixed(1)}s`, hill.x, hill.y - ringR - 6);
            } else {
              ctx.fillText(`nuke ${tLeft.toFixed(1)}s [${hill.hp ?? 3}]`, hill.x, hill.y - ringR - 6);
            }
          }
          ctx.restore();
        });

        // Draw Mechanic Pods (Clickable)
        mechanicPodsRef.current.forEach((pod) => {
          pod.pulse += 0.05;
          const pr = pod.radius + Math.sin(pod.pulse) * 2;

          ctx.save();
          ctx.fillStyle = pod.type === 'emp_bomb' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(239, 68, 68, 0.25)';
          ctx.beginPath();
          ctx.arc(pod.x, pod.y, pr, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = pod.type === 'emp_bomb' ? '#38bdf8' : '#f43f5e';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(pod.x, pod.y, pr, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Patrick_Hand, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(pod.label, pod.x, pod.y - pr - 5);
          ctx.restore();
        });

        // Draw Speed Portals
        portalsRef.current.forEach((portal) => {
          ctx.save();
          ctx.translate(portal.x, portal.y);
          ctx.rotate(portal.angle);

          ctx.strokeStyle = portal.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = portal.color;
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          ctx.save();
          ctx.fillStyle = portal.color;
          ctx.font = 'bold 12px Patrick_Hand, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(portal.label, portal.x, portal.y + portal.radius + 14);
          ctx.restore();
        });

        // Draw Sugar Cubes
        sugarCubesRef.current.forEach((cube) => {
          ctx.save();
          ctx.translate(cube.x, cube.y);
          ctx.rotate(cube.pulse * 0.5);

          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-7, -7, 14, 14);
          ctx.strokeRect(-7, -7, 14, 14);

          ctx.restore();
        });

        // Draw Obstacles (Buzzsaws & Lasers)
        obstaclesRef.current.forEach((obs) => {
          if (obs.type === 'buzzsaw') {
            ctx.save();
            ctx.translate(obs.x, obs.y);
            ctx.rotate(obs.angle || 0);

            const r = obs.radius || 20;
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            const teeth = 8;
            for (let i = 0; i < teeth; i++) {
              const a = (i / teeth) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(Math.cos(a) * (r * 0.7), Math.sin(a) * (r * 0.7));
              ctx.lineTo(Math.cos(a + 0.2) * r, Math.sin(a + 0.2) * r);
              ctx.stroke();
            }

            ctx.restore();
          } else if (obs.type === 'laser') {
            ctx.save();
            ctx.translate(obs.x, obs.y);
            ctx.rotate(obs.angle || 0);

            ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.lineWidth = obs.height || 6;
            ctx.beginPath();
            ctx.moveTo(-(obs.width || 200) / 2, 0);
            ctx.lineTo((obs.width || 200) / 2, 0);
            ctx.stroke();

            ctx.restore();
          }
        });

        // Draw Ants
        antsRef.current.forEach((ant) => {
          ctx.save();
          ctx.translate(ant.x, ant.y);
          ctx.rotate(ant.angle);

          const antColor =
            ant.type === 'fire'
              ? '#ef4444'
              : ant.type === 'acid'
              ? '#22c55e'
              : ant.type === 'titan'
              ? '#f43f5e'
              : '#94a3b8';

          // Body
          ctx.fillStyle = antColor;
          ctx.beginPath();
          ctx.ellipse(0, 0, ant.size, ant.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Head
          ctx.beginPath();
          ctx.arc(ant.size * 0.9, 0, ant.size * 0.45, 0, Math.PI * 2);
          ctx.fill();

          // Legs
          ctx.strokeStyle = antColor;
          ctx.lineWidth = 1.5;
          for (let l = -1; l <= 1; l++) {
            const legOffset = Math.sin(ant.legPhase + l) * 4;
            ctx.beginPath();
            ctx.moveTo(l * (ant.size * 0.4), -ant.size * 0.4);
            ctx.lineTo(l * (ant.size * 0.4), -ant.size * 1.1 + legOffset);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(l * (ant.size * 0.4), ant.size * 0.4);
            ctx.lineTo(l * (ant.size * 0.4), ant.size * 1.1 - legOffset);
            ctx.stroke();
          }

          ctx.restore();
        });
      }

      // Draw Shockwaves
      shockwavesRef.current.forEach((sw) => {
        ctx.save();
        const progress = sw.radius / sw.maxRadius;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = Math.max(1, 4 * (1 - progress));
        ctx.globalAlpha = Math.max(0, 1 - progress);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Draw Particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Floating Texts
      floatingTextsRef.current.forEach((ft) => {
        ctx.save();
        const alpha = Math.max(0, 1 - ft.life / ft.maxLife);
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 15px Patrick_Hand, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // Draw Cursor Trail & Active Skin
      const safeTargetX = Math.max(BOX_LEFT + 2, Math.min(BOX_RIGHT - 2, mouseRef.current.x));
      const safeTargetY = Math.max(BOX_TOP + 2, Math.min(BOX_BOTTOM - 2, mouseRef.current.y));

      // Trail Points
      trailPointsRef.current.forEach((pt, idx) => {
        ctx.save();
        ctx.globalAlpha = pt.alpha * 0.6;
        ctx.fillStyle = activeSkin.trailColor || activeSkin.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(2, 6 - idx * 0.25), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Player Cursor
      ctx.save();
      ctx.translate(safeTargetX, safeTargetY);

      // Glow Ring
      ctx.strokeStyle = activeSkin.glowColor || activeSkin.color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = activeSkin.glowColor || activeSkin.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();

      // Core
      ctx.fillStyle = activeSkin.color;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Shield Aura Ring
      if (borderHitCooldownRef.current > 0) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [level, activeSkin, onGameOver, onVictory, onProgressDailyChallenge]);

  return (
    <div className="relative w-screen h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-neutral-950 text-neutral-100 select-none overscroll-none">
      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 w-full h-full block cursor-none"
      />

      {/* Top Header HUD - Minimal & Descriptive (all lowercase) */}
      <div className="absolute top-0 left-0 right-0 z-30 flex flex-col px-4 pt-3 pb-2 bg-gradient-to-b from-neutral-950/90 to-transparent pointer-events-none">
        <div className="flex items-center justify-between gap-3 text-neutral-200">
          {/* Left: Level Name & Difficulty */}
          <div className="flex items-center gap-2.5">
            <span className="font-['Caveat'] text-2xl sm:text-3xl text-neutral-100 lowercase">
              {level.name.toLowerCase()}
            </span>
            <span
              className="text-xs font-['Patrick_Hand'] lowercase px-2.5 py-0.5 rounded-full border border-neutral-700/60"
              style={{
                color: level.isEndless
                  ? DIFFICULTY_COLORS[freeModeDifficulty] || '#3b82f6'
                  : DIFFICULTY_COLORS[level.difficulty] || '#3b82f6',
              }}
            >
              {level.isEndless ? `free mode • ${freeModeDifficulty.toLowerCase()}` : level.difficulty.toLowerCase()}
            </span>

            {/* Corridor Active Indicator */}
            {corridorActive && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400 text-cyan-300 font-['Patrick_Hand'] text-xs animate-pulse">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>corridor: {Math.round(corridorProgress)}%</span>
                <span className="text-[10px] text-cyan-200 font-mono">(touch border = die)</span>
              </div>
            )}
          </div>

          {/* Center: Descriptive Speed Name */}
          <div className="flex items-center gap-2">
            <span className="font-['Patrick_Hand'] text-xs text-neutral-400 lowercase">speed:</span>
            <span className="font-['Patrick_Hand'] text-base font-bold text-neutral-200 lowercase tracking-wide px-2 py-0.5 rounded-full bg-neutral-900/60 border border-neutral-800">
              {getSpeedName(currentSpeed)}
            </span>
          </div>

          {/* Right: Sugar, Points, Shields & Pause */}
          <div className="flex items-center gap-3 font-['Patrick_Hand'] text-sm">
            <div className="flex items-center gap-1 text-amber-400">
              <Cookie className="w-4 h-4 text-amber-400" />
              <span>{sugarCollected}</span>
            </div>

            <div className="text-neutral-300">
              <span>{score.toLocaleString()}</span>
              <span className="text-neutral-500 text-xs ml-0.5 lowercase">pts</span>
            </div>

            {/* Shield counter */}
            <div className="flex items-center gap-1 text-blue-400">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>{health}</span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setIsPaused((p) => !p);
              }}
              className="pointer-events-auto px-2 py-1 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/70 text-neutral-400 hover:text-white text-xs lowercase cursor-pointer"
            >
              [tab] pause
            </button>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        {!level.isEndless && (
          <div className="w-full bg-neutral-900/60 h-1 rounded-full border border-neutral-800/60 overflow-hidden mt-1">
            <div
              className="h-full bg-neutral-300 transition-all duration-150 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Corridor Warning Banner */}
        {corridorWarning && (
          <div className="text-center font-['Patrick_Hand'] text-xs sm:text-sm text-cyan-300 animate-pulse mt-1 lowercase">
            ⚠️ {corridorWarning}
          </div>
        )}
      </div>

      {/* 3, 2, 1 Countdown & "ur cursor is in the center" */}
      {countdown !== null && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none bg-black/45 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 text-center px-4">
            <div className="font-['Caveat'] text-8xl font-bold text-neutral-100 animate-pulse lowercase">
              {countdown}
            </div>
            <div className="font-['Patrick_Hand'] text-2xl text-neutral-200 lowercase tracking-wide">
              ur cursor is in the center
            </div>
            <div className="text-sm font-['Patrick_Hand'] text-amber-300 lowercase mt-1">
              nuke anthills before meltdown or they overload & destroy the level!
            </div>
          </div>
        </div>
      )}

      {/* Pause Menu Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-default">
          <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-[255px_20px_225px_25px/25px_225px_20px_255px] p-6 text-center shadow-2xl">
            <h2 className="text-4xl font-bold font-['Caveat'] text-neutral-100 lowercase mb-2">paused</h2>
            <p className="text-xs font-['Patrick_Hand'] text-neutral-400 lowercase mb-6">
              press [tab] or click below to resume
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  sound.playClick();
                  setIsPaused(false);
                }}
                className="w-full py-2.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-base font-bold cursor-pointer shadow-md"
              >
                resume [tab]
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setIsPaused(false);
                  initLevel();
                }}
                className="w-full py-2 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-['Patrick_Hand'] text-sm cursor-pointer"
              >
                restart
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  sound.stopBgm();
                  onExit();
                }}
                className="w-full py-2 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white font-['Patrick_Hand'] text-sm cursor-pointer"
              >
                exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen: "u lost!" (no voltage writing, no caps) */}
      {gameState === 'lost' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-default">
          <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-[255px_20px_225px_25px/25px_225px_20px_255px] p-6 sm:p-7 text-center shadow-2xl">
            <h2 className="text-5xl font-bold font-['Caveat'] text-neutral-100 lowercase mb-1">
              u lost!
            </h2>

            {lossReason ? (
              <div className="text-sm font-['Patrick_Hand'] text-rose-400 lowercase mb-4 animate-pulse">
                {lossReason}
              </div>
            ) : (
              <div className="text-sm font-['Patrick_Hand'] text-neutral-400 lowercase mb-4">
                progress: {Math.round(progress)}%
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 mb-6">
              <div className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800">
                <span className="text-xs font-['Patrick_Hand'] text-neutral-500 lowercase block">pts</span>
                <span className="text-xl font-bold font-['Patrick_Hand'] text-neutral-100">
                  {score.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800">
                <span className="text-xs font-['Patrick_Hand'] text-neutral-500 lowercase block">sugar</span>
                <span className="text-xl font-bold font-['Patrick_Hand'] text-amber-400 flex items-center justify-center gap-1">
                  <Cookie className="w-4 h-4 text-amber-400" />
                  +{sugarCollected}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  sound.playClick();
                  initLevel();
                }}
                className="w-full py-2.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-lg font-bold transition-all cursor-pointer shadow-md hover:scale-105 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>try again</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  sound.stopBgm();
                  onExit();
                }}
                className="w-full py-2.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white font-['Patrick_Hand'] text-base transition-all cursor-pointer border border-neutral-700"
              >
                chambers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Screen: "chamber clear!" (all lowercase, no caps) */}
      {gameState === 'won' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-default">
          <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-[255px_20px_225px_25px/25px_225px_20px_255px] p-6 sm:p-7 text-center shadow-2xl">
            <h2 className="text-5xl font-bold font-['Caveat'] text-neutral-100 lowercase mb-2">
              chamber clear!
            </h2>

            <div className="text-sm font-['Patrick_Hand'] text-neutral-400 lowercase mb-5">
              100% completed
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-6">
              <div className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800">
                <span className="text-xs font-['Patrick_Hand'] text-neutral-500 lowercase block">pts</span>
                <span className="text-xl font-bold font-['Patrick_Hand'] text-neutral-100">
                  {score.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800">
                <span className="text-xs font-['Patrick_Hand'] text-neutral-500 lowercase block">sugar</span>
                <span className="text-xl font-bold font-['Patrick_Hand'] text-amber-400 flex items-center justify-center gap-1">
                  <Cookie className="w-4 h-4 text-amber-400" />
                  +{sugarCollected + 25} bonus
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  sound.playClick();
                  initLevel();
                }}
                className="w-full py-2.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-100 hover:bg-white text-neutral-950 font-['Patrick_Hand'] text-lg font-bold transition-all cursor-pointer shadow-md hover:scale-105 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>play again</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  sound.stopBgm();
                  onExit();
                }}
                className="w-full py-2.5 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white font-['Patrick_Hand'] text-base transition-all cursor-pointer border border-neutral-700"
              >
                chambers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
