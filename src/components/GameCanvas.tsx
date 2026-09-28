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
} from '../types/game';
import { ChallengeEvent } from '../lib/dailyChallenges';
import { getSkinById } from './SkinRenderer';
import { sound } from '../lib/audio';
import { DIFFICULTY_COLORS, DIFFICULTY_ANT_SCALING } from '../lib/constants';
import { RotateCcw, Cookie, Shield, Zap, Sparkles } from 'lucide-react';

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
  const [score, setScore] = useState(0);
  const [sugarCollected, setSugarCollected] = useState(0);
  const [health, setHealth] = useState(3);
  const [currentSpeed, setCurrentSpeed] = useState<SpeedMultiplier>(1.0);
  const [progress, setProgress] = useState(0);

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

  // Speed name helper (delete scales of speed, leave just names!)
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
    freeModeTimerRef.current = 15;
    currentDiffRef.current = level.difficulty;
    setFreeModeDifficulty(level.difficulty);
    setFreeModeSecondsLeft(15);
    borderHitCooldownRef.current = 0;
    freezeTimerRef.current = 0;

    // Reset countdown to 3
    setCountdown(3);
    countdownRef.current = 3;

    // Anthills: each has 4 HP so clicking/spamming nukes it!
    const hills: Anthill[] = [];
    const count = level.spawnerCount;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = Math.min((boxRight - boxLeft) * 0.36, (boxBottom - boxTop) * 0.36);
      hills.push({
        id: i + 1,
        x: boxCenterX + Math.cos(angle) * dist,
        y: boxCenterY + Math.sin(angle) * dist,
        radius: 26,
        pulse: 0,
        spawnCooldown: 25 + Math.random() * 35,
        maxSpawnCooldown: Math.max(25, 75 - (level.id <= 23 ? level.id * 2 : 20)),
        type: i % 3 === 0 && (level.id >= 13 || level.isEndless) ? 'fire' : i % 2 === 1 && level.id >= 9 ? 'acid' : 'standard',
        hp: 3,
        maxHp: 3,
        destroyedTime: 0,
      });
    }
    anthillsRef.current = hills;

    // Reset entities (pre-spawn the 2 Big Titan Ants in Crazy difficulty)
    const initialAnts: Ant[] = [];
    if (level.difficulty === 'Crazy' || (level.isEndless && currentDiffRef.current === 'Crazy')) {
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

    // Spawn 1-2 interactive mechanic pods right away based on level mechanic
    const initialPods: MechanicPod[] = [];
    const mech = level.mechanicId || 'nuke_houses';
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
    } else if (mech === 'plasma_artillery' || mech === 'core_meltdown') {
      initialPods.push({
        id: 1,
        x: boxCenterX,
        y: boxCenterY,
        radius: 26,
        type: 'nuke_bomb',
        pulse: 0,
        label: 'nuke pod',
      });
    }
    mechanicPodsRef.current = initialPods;

    // Obstacles
    const obs: Obstacle[] = [];
    const sawCount = Math.min(Math.floor((level.id <= 23 ? level.id : 12) / 5) + 1, 4);
    for (let s = 0; s < sawCount; s++) {
      obs.push({
        id: s + 1,
        type: 'buzzsaw',
        x: boxLeft + 60 + Math.random() * (boxRight - boxLeft - 120),
        y: boxTop + 60 + Math.random() * (boxBottom - boxTop - 120),
        vx: (Math.random() - 0.5) * (2.6 + (level.id <= 23 ? level.id * 0.15 : 3)),
        vy: (Math.random() - 0.5) * (2.6 + (level.id <= 23 ? level.id * 0.15 : 3)),
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

    obstaclesRef.current = obs;
  }, [level]);

  useEffect(() => {
    initLevel();
  }, [initLevel]);

  // Click & Tap Interaction Handling (Nuking anthills, clicking pods, shockwave spamming)
  const handleUserClick = (clickX: number, clickY: number) => {
    if (countdownRef.current !== null || isPausedRef.current || isGameOverRef.current) return;

    let targetHit = false;

    // 1. Check Anthill Click -> Nuke Mechanics
    anthillsRef.current.forEach((hill) => {
      if (hill.destroyedTime && hill.destroyedTime > 0) return;
      const dist = Math.hypot(clickX - hill.x, clickY - hill.y);
      if (dist <= hill.radius + 22) {
        targetHit = true;
        hill.hp = (hill.hp ?? 3) - 1;
        sound.playZap();
        addParticles(hill.x, hill.y, 8, '#f59e0b');
        shakeRef.current = 6;

        if (hill.hp <= 0) {
          // NUKE THE ANTHILL!
          sound.playExplosion();
          shakeRef.current = 26;
          hill.destroyedTime = 16; // 16s cooldown
          hill.hp = 3;

          shockwavesRef.current.push({
            x: hill.x,
            y: hill.y,
            radius: 10,
            maxRadius: 240,
            color: '#f59e0b',
          });

          // Vaporize surrounding ants
          antsRef.current = antsRef.current.filter((ant) => {
            const adist = Math.hypot(ant.x - hill.x, ant.y - hill.y);
            if (adist <= 240) {
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
          addFloatingText('nuke! +500 pts', hill.x, hill.y - 25, '#f59e0b');
        } else {
          addFloatingText(`hit! ${hill.hp} left`, hill.x, hill.y - 20, '#fbbf24');
        }
      }
    });

    // 2. Check Mechanic Pods Click
    mechanicPodsRef.current.forEach((pod, idx) => {
      const dist = Math.hypot(clickX - pod.x, clickY - pod.y);
      if (dist <= pod.radius + 20) {
        targetHit = true;
        if (pod.type === 'emp_bomb') {
          sound.playEmp();
          freezeTimerRef.current = 3.5;
          shakeRef.current = 14;
          shockwavesRef.current.push({ x: pod.x, y: pod.y, radius: 10, maxRadius: 360, color: '#38bdf8' });
          addFloatingText('freeze! colony stunned', pod.x, pod.y - 25, '#38bdf8');
          mechanicPodsRef.current.splice(idx, 1);
        } else if (pod.type === 'nuke_bomb') {
          sound.playExplosion();
          shakeRef.current = 30;
          shockwavesRef.current.push({ x: pod.x, y: pod.y, radius: 10, maxRadius: 300, color: '#ef4444' });
          antsRef.current = antsRef.current.filter((ant) => {
            const adist = Math.hypot(ant.x - pod.x, ant.y - pod.y);
            if (adist <= 300) {
              addParticles(ant.x, ant.y, 6, '#ef4444');
              scoreRef.current += 20;
              return false;
            }
            return true;
          });
          scoreRef.current += 400;
          addFloatingText('nuke! +400 pts', pod.x, pod.y - 25, '#f87171');
          mechanicPodsRef.current.splice(idx, 1);
        } else if (pod.type === 'sugar_geyser') {
          sound.playSugarCollect();
          for (let s = 0; s < 5; s++) {
            const ang = Math.random() * Math.PI * 2;
            const sDist = Math.random() * 55 + 20;
            sugarCubesRef.current.push({
              id: Math.random() * 100000,
              x: pod.x + Math.cos(ang) * sDist,
              y: pod.y + Math.sin(ang) * sDist,
              value: 1,
              pulse: 0,
            });
          }
          shockwavesRef.current.push({ x: pod.x, y: pod.y, radius: 10, maxRadius: 180, color: '#f59e0b' });
          addFloatingText('+sugar geyser!', pod.x, pod.y - 25, '#f59e0b');
          mechanicPodsRef.current.splice(idx, 1);
        } else if (pod.type === 'honey_trap') {
          sound.playZap();
          obstaclesRef.current.push({
            id: Math.random() * 10000,
            type: 'acidPuddle',
            x: pod.x,
            y: pod.y,
            radius: 80,
            timer: 450,
          });
          shockwavesRef.current.push({ x: pod.x, y: pod.y, radius: 10, maxRadius: 100, color: '#fbbf24' });
          addFloatingText('honey trap active!', pod.x, pod.y - 25, '#fbbf24');
          mechanicPodsRef.current.splice(idx, 1);
        } else if (pod.type === 'queen_cocoon') {
          pod.hp = (pod.hp ?? 6) - 1;
          sound.playZap();
          addParticles(pod.x, pod.y, 8, '#f43f5e');
          if (pod.hp <= 0) {
            sound.playExplosion();
            shockwavesRef.current.push({ x: pod.x, y: pod.y, radius: 10, maxRadius: 280, color: '#f43f5e' });
            scoreRef.current += 1000;
            sugarRef.current += 5;
            setScore(scoreRef.current);
            setSugarCollected(sugarRef.current);
            addFloatingText('cocoon destroyed! +1000 pts', pod.x, pod.y - 30, '#f43f5e');
            mechanicPodsRef.current.splice(idx, 1);
          } else {
            addFloatingText(`crack! ${pod.hp} left`, pod.x, pod.y - 20, '#f43f5e');
          }
        }
      }
    });

    // 3. Check Titan Ant Click (Crazy Levels)
    antsRef.current.forEach((ant) => {
      if (ant.isBigAnt) {
        const dist = Math.hypot(clickX - ant.x, clickY - ant.y);
        if (dist <= ant.size + 24) {
          targetHit = true;
          sound.playZap();
          ant.health = Math.max(0, ant.health - 1);
          addParticles(ant.x, ant.y, 8, '#f43f5e');
          // Knock titan back
          const knockAngle = Math.atan2(ant.y - clickY, ant.x - clickX);
          ant.x += Math.cos(knockAngle) * 45;
          ant.y += Math.sin(knockAngle) * 45;
          shakeRef.current = 10;
          addFloatingText(`staggered! ${ant.health} hp`, ant.x, ant.y - 25, '#fb7185');
        }
      }
    });

    // 4. Open Space Click -> Repulsor shockwave
    if (!targetHit && clickRepulseCooldownRef.current <= 0) {
      clickRepulseCooldownRef.current = 14; // ~0.23s cooldown
      sound.playClick();
      shockwavesRef.current.push({
        x: clickX,
        y: clickY,
        radius: 6,
        maxRadius: 85,
        color: activeSkin.color,
      });

      // Push nearest ants back
      antsRef.current.forEach((ant) => {
        const adist = Math.hypot(ant.x - clickX, ant.y - clickY);
        if (adist < 85 && adist > 2) {
          ant.x += ((ant.x - clickX) / adist) * 32;
          ant.y += ((ant.y - clickY) / adist) * 32;
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

        // Border collision check
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;

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
            setGameState('lost');
            onGameOver(scoreRef.current, sugarRef.current, progress);
            return;
          }
        }

        const safeTargetX = Math.max(BOX_LEFT + 2, Math.min(BOX_RIGHT - 2, mx));
        const safeTargetY = Math.max(BOX_TOP + 2, Math.min(BOX_BOTTOM - 2, my));

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

        // Update progress %
        if (!level.isEndless) {
          const currentProgress = Math.min(100, (gameTimeRef.current / level.durationSeconds) * 100);
          setProgress(currentProgress);

          if (gameTimeRef.current >= level.durationSeconds && !isGameOverRef.current) {
            isGameOverRef.current = true;
            setGameState('won');
            sound.playVictory();
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
            });
            onVictory(scoreRef.current, sugarRef.current);
            onProgressDailyChallenge?.({ type: 'beat_hard', difficulty: level.difficulty });
            onProgressDailyChallenge?.({ type: 'score_milestone', value: scoreRef.current });
            return;
          }
        }

        // Score tick
        scoreRef.current += Math.round(1 * speedMult);
        setScore(scoreRef.current);

        // Spawn speed portals dynamically
        if (Math.random() < 0.006 * speedMult && portalsRef.current.length < 2) {
          const speeds: SpeedMultiplier[] = [0.5, 1.0, 1.5, 2.0];
          const filtered = speeds.filter((s) => s !== speedMult);
          const target = filtered[Math.floor(Math.random() * filtered.length)];

          const portalColor =
            target === 0.5 ? '#10b981' : target === 1.0 ? '#38bdf8' : target === 1.5 ? '#f59e0b' : '#ef4444';

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

        // Periodically spawn interactive mechanic pods if none exist
        if (Math.random() < 0.003 && mechanicPodsRef.current.length < 2) {
          const pTypes: ('nuke_bomb' | 'emp_bomb' | 'sugar_geyser' | 'honey_trap')[] = [
            'nuke_bomb',
            'emp_bomb',
            'sugar_geyser',
            'honey_trap',
          ];
          const chosen = pTypes[Math.floor(Math.random() * pTypes.length)];
          mechanicPodsRef.current.push({
            id: Math.random() * 100000,
            x: BOX_LEFT + 80 + Math.random() * (BOX_RIGHT - BOX_LEFT - 160),
            y: BOX_TOP + 80 + Math.random() * (BOX_BOTTOM - BOX_TOP - 160),
            radius: 22,
            type: chosen,
            pulse: 0,
            label: chosen.replace('_', ' '),
          });
        }

        // Spawn sugar cubes
        if (Math.random() < 0.015 && sugarCubesRef.current.length < 5) {
          sugarCubesRef.current.push({
            id: Math.random() * 100000,
            x: BOX_LEFT + 50 + Math.random() * (BOX_RIGHT - BOX_LEFT - 100),
            y: BOX_TOP + 50 + Math.random() * (BOX_BOTTOM - BOX_TOP - 100),
            value: 1,
            pulse: 0,
          });
        }

        // Update Anthills
        anthillsRef.current.forEach((hill) => {
          hill.pulse += 0.05 * speedMult;

          if (hill.destroyedTime && hill.destroyedTime > 0) {
            hill.destroyedTime -= 1 / 60;
            return;
          }

          hill.spawnCooldown -= 1 * speedMult;

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
              speed: (Math.random() * 0.9 + 2.0) * (level.bpm / 125) * (level.id <= 23 ? 1 + level.id * 0.025 : 1.3),
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
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

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
          return true;
        });

        // Speed Portals
        portalsRef.current.forEach((portal) => {
          portal.angle += 0.03 * speedMult;
          const dist = Math.hypot(safeTargetX - portal.x, safeTargetY - portal.y);
          if (dist < portal.radius + 12 && portal.active) {
            speedMultiplierRef.current = portal.targetSpeed;
            setCurrentSpeed(portal.targetSpeed);
            sound.setSpeedMultiplier(portal.targetSpeed);
            shakeRef.current = 10;
            portal.active = false;
            addFloatingText(`tempo: ${portal.label}`, portal.x, portal.y - 20, portal.color);

            // Pass warp gate blasts nearby ants!
            antsRef.current = antsRef.current.filter((ant) => {
              const adist = Math.hypot(ant.x - portal.x, ant.y - portal.y);
              if (adist <= 150) {
                addParticles(ant.x, ant.y, 6, portal.color);
                return false;
              }
              return true;
            });
          }
        });
        portalsRef.current = portalsRef.current.filter((p) => p.active);

        // Cursor Trail
        trailPointsRef.current.push({ x: mx, y: my, alpha: 1.0 });
        if (trailPointsRef.current.length > 14) trailPointsRef.current.shift();
        trailPointsRef.current.forEach((tp) => (tp.alpha *= 0.88));
      }

      // Update shockwaves
      shockwavesRef.current.forEach((sw) => {
        sw.radius += 9;
      });
      shockwavesRef.current = shockwavesRef.current.filter((sw) => sw.radius < sw.maxRadius);

      // Update particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      // Update floating texts
      floatingTextsRef.current.forEach((t) => {
        t.y -= 0.8;
        t.life += 1;
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((t) => t.life < t.maxLife);

      // -------------------------------------------------------------
      // RENDERING CANVAS
      // -------------------------------------------------------------
      ctx.save();

      // Screen Shake
      if (shakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * shakeRef.current;
        const shakeY = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(shakeX, shakeY);
        shakeRef.current *= 0.9;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
      }

      // 1. Dynamic Background with Level Theme & Pulsing to Beat
      const beatCycle = Math.sin(gameTimeRef.current * (level.bpm / 60) * Math.PI * 2);
      const beatPulse = 0.5 + 0.5 * Math.max(0, beatCycle);

      ctx.fillStyle = level.bgColor || '#050c18';
      ctx.fillRect(0, 0, width, height);

      // Subtle ambient rhythmic background grid pulsing to BPM
      ctx.strokeStyle = `${level.themeColor}12`;
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let x = BOX_LEFT; x < BOX_RIGHT; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, BOX_TOP);
        ctx.lineTo(x, BOX_BOTTOM);
        ctx.stroke();
      }
      for (let y = BOX_TOP; y < BOX_BOTTOM; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(BOX_LEFT, y);
        ctx.lineTo(BOX_RIGHT, y);
        ctx.stroke();
      }

      // Decorative floating dust motes
      dustMotes.forEach((mote) => {
        mote.x += mote.vx;
        mote.y += mote.vy;
        if (mote.x < 0) mote.x = width;
        if (mote.x > width) mote.x = 0;
        if (mote.y < 0) mote.y = height;
        if (mote.y > height) mote.y = 0;

        ctx.fillStyle = `${level.themeColor}40`;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Minimalist Perimeter Border (No high voltage writing, clean rounded box)
      ctx.save();
      ctx.strokeStyle = `${level.themeColor}50`;
      ctx.lineWidth = 2;
      ctx.strokeRect(BOX_LEFT, BOX_TOP, BOX_RIGHT - BOX_LEFT, BOX_BOTTOM - BOX_TOP);

      // Soft corner brackets
      const bSize = 14;
      ctx.strokeStyle = level.themeColor;
      ctx.lineWidth = 2.5;
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(BOX_LEFT, BOX_TOP + bSize);
      ctx.lineTo(BOX_LEFT, BOX_TOP);
      ctx.lineTo(BOX_LEFT + bSize, BOX_TOP);
      ctx.stroke();
      // Top-Right
      ctx.beginPath();
      ctx.moveTo(BOX_RIGHT - bSize, BOX_TOP);
      ctx.lineTo(BOX_RIGHT, BOX_TOP);
      ctx.lineTo(BOX_RIGHT, BOX_TOP + bSize);
      ctx.stroke();
      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(BOX_LEFT, BOX_BOTTOM - bSize);
      ctx.lineTo(BOX_LEFT, BOX_BOTTOM);
      ctx.lineTo(BOX_LEFT + bSize, BOX_BOTTOM);
      ctx.stroke();
      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(BOX_RIGHT - bSize, BOX_BOTTOM);
      ctx.lineTo(BOX_RIGHT, BOX_BOTTOM);
      ctx.lineTo(BOX_RIGHT, BOX_BOTTOM - bSize);
      ctx.stroke();
      ctx.restore();

      // 3. Draw Anthills (Interactive: with click HP indicator and beat pulse)
      anthillsRef.current.forEach((hill) => {
        const isDestroyed = hill.destroyedTime && hill.destroyedTime > 0;
        const baseR = hill.radius;
        const pulseR = baseR + beatPulse * 3;

        ctx.save();
        if (isDestroyed) {
          // Flattened smoked out anthill
          ctx.fillStyle = 'rgba(40, 40, 40, 0.4)';
          ctx.beginPath();
          ctx.arc(hill.x, hill.y, baseR * 0.7, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#737373';
          ctx.font = '10px Patrick_Hand, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`rebuilding ${Math.ceil(hill.destroyedTime!)}s`, hill.x, hill.y - baseR - 5);
        } else {
          // Pulsing ambient glow
          ctx.fillStyle = `${level.themeColor}18`;
          ctx.beginPath();
          ctx.arc(hill.x, hill.y, pulseR + 12, 0, Math.PI * 2);
          ctx.fill();

          // Body
          ctx.fillStyle = hill.type === 'fire' ? '#7f1d1d' : hill.type === 'acid' ? '#064e3b' : '#1e293b';
          ctx.beginPath();
          ctx.arc(hill.x, hill.y, pulseR, 0, Math.PI * 2);
          ctx.fill();

          // Core entrance
          ctx.fillStyle = '#050c18';
          ctx.beginPath();
          ctx.arc(hill.x, hill.y, 8, 0, Math.PI * 2);
          ctx.fill();

          // Ring
          ctx.strokeStyle = hill.type === 'fire' ? '#ef4444' : hill.type === 'acid' ? '#10b981' : level.themeColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(hill.x, hill.y, pulseR, 0, Math.PI * 2);
          ctx.stroke();

          // Interactive click to nuke status indicator!
          ctx.fillStyle = '#f59e0b';
          ctx.font = '10px Patrick_Hand, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`click [${hill.hp ?? 3}]`, hill.x, hill.y - pulseR - 6);
        }
        ctx.restore();
      });

      // 4. Draw Mechanic Pods (Clickable)
      mechanicPodsRef.current.forEach((pod) => {
        pod.pulse += 0.05;
        const pr = pod.radius + Math.sin(pod.pulse) * 2;

        ctx.save();
        // Pulsing glow
        ctx.fillStyle = pod.type === 'emp_bomb' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(239, 68, 68, 0.25)';
        ctx.beginPath();
        ctx.arc(pod.x, pod.y, pr + 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = pod.type === 'emp_bomb' ? '#0284c7' : pod.type === 'sugar_geyser' ? '#d97706' : '#dc2626';
        ctx.beginPath();
        ctx.arc(pod.x, pod.y, pr, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pod.x, pod.y, pr, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Patrick_Hand, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pod.label, pod.x, pod.y - pr - 5);
        ctx.restore();
      });

      // 5. Draw Expanding Shockwaves
      shockwavesRef.current.forEach((sw) => {
        const alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // 6. Draw Sugar Cubes
      sugarCubesRef.current.forEach((cube) => {
        cube.pulse += 0.08;
        const sz = 11 + Math.sin(cube.pulse) * 1.5;
        ctx.save();
        ctx.translate(cube.x, cube.y);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      });

      // 7. Draw Speed Portals
      portalsRef.current.forEach((portal) => {
        ctx.save();
        ctx.translate(portal.x, portal.y);
        ctx.rotate(portal.angle);
        ctx.strokeStyle = portal.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `${portal.color}25`;
        ctx.beginPath();
        ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = portal.color;
        ctx.font = '10px Patrick_Hand, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(portal.label, portal.x, portal.y - portal.radius - 6);
      });

      // 8. Draw Obstacles (Buzzsaws)
      obstaclesRef.current.forEach((obs) => {
        if (obs.type === 'buzzsaw') {
          const r = obs.radius || 20;
          ctx.save();
          ctx.translate(obs.x, obs.y);
          ctx.rotate(obs.angle || 0);

          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Teeth
          const teeth = 8;
          ctx.fillStyle = '#e2e8f0';
          for (let t = 0; t < teeth; t++) {
            const thAngle = (t / teeth) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(thAngle) * r, Math.sin(thAngle) * r, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });

      // 9. Draw Ants
      antsRef.current.forEach((ant) => {
        ctx.save();
        ctx.translate(ant.x, ant.y);
        ctx.rotate(ant.angle);

        // Body
        ctx.fillStyle = ant.isBigAnt ? '#e11d48' : ant.type === 'fire' ? '#ef4444' : ant.type === 'acid' ? '#10b981' : '#cbd5e1';

        // Abdomen
        ctx.beginPath();
        ctx.ellipse(-ant.size * 0.7, 0, ant.size * 0.75, ant.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Thorax
        ctx.beginPath();
        ctx.ellipse(0, 0, ant.size * 0.4, ant.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.ellipse(ant.size * 0.65, 0, ant.size * 0.4, ant.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.strokeStyle = ant.isBigAnt ? '#f43f5e' : '#64748b';
        ctx.lineWidth = Math.max(1.2, ant.size * 0.16);
        for (let l = -1; l <= 1; l++) {
          const legWiggle = Math.sin(ant.legPhase + l) * 2.5;
          ctx.beginPath();
          ctx.moveTo(l * (ant.size * 0.4), 0);
          ctx.lineTo(l * (ant.size * 0.55), -ant.size - 2 + legWiggle);
          ctx.moveTo(l * (ant.size * 0.4), 0);
          ctx.lineTo(l * (ant.size * 0.55), ant.size + 2 - legWiggle);
          ctx.stroke();
        }

        ctx.restore();
      });

      // 10. Draw Cursor Trail & Custom Cursor
      trailPointsRef.current.forEach((tp) => {
        ctx.fillStyle = activeSkin.trailColor;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 3.5 * tp.alpha, 0, Math.PI * 2);
        ctx.fill();
      });

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.save();
      ctx.translate(mx, my);
      ctx.strokeStyle = activeSkin.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, -14);
      ctx.moveTo(0, 6);
      ctx.lineTo(0, 14);
      ctx.moveTo(-6, 0);
      ctx.lineTo(-14, 0);
      ctx.moveTo(6, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 11. Draw Particles
      particlesRef.current.forEach((p) => {
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // 12. Draw Floating Texts
      floatingTextsRef.current.forEach((t) => {
        const alpha = 1 - t.life / t.maxLife;
        ctx.fillStyle = t.color;
        ctx.globalAlpha = alpha;
        ctx.font = '12px Patrick_Hand, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        ctx.globalAlpha = 1;
      });

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [level, activeSkin, onGameOver, onVictory]);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black select-none cursor-none touch-none"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 block touch-none"
        style={{ touchAction: 'none' }}
      />

      {/* Top Header HUD: Minimalist, all lowercase, no caps, speed names only */}
      <div className="absolute top-0 inset-x-0 z-20 px-3 sm:px-6 py-2.5 flex flex-col gap-1.5 pointer-events-none bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center justify-between">
          {/* Level name & difficulty - lowercase */}
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-['Patrick_Hand'] lowercase border"
              style={{
                color: level.isEndless ? DIFFICULTY_COLORS[freeModeDifficulty] : level.difficultyColor,
                borderColor: `${level.isEndless ? DIFFICULTY_COLORS[freeModeDifficulty] : level.difficultyColor}40`,
                background: `${level.isEndless ? DIFFICULTY_COLORS[freeModeDifficulty] : level.difficultyColor}15`,
              }}
            >
              {level.isEndless ? `free: ${freeModeDifficulty.toLowerCase()}` : level.difficulty.toLowerCase()}
            </span>
            <span className="font-['Caveat'] text-2xl text-neutral-100 lowercase">
              {level.name.toLowerCase()}
            </span>
          </div>

          {/* Center: speed name only (no scales of speed, leave just names!) */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] border border-neutral-700/60 bg-neutral-900/50 font-['Patrick_Hand'] text-xs text-neutral-300 lowercase">
            <Zap className="w-3.5 h-3.5 text-neutral-400" />
            <span>{getSpeedName(currentSpeed)}</span>
          </div>

          {/* Right: Sugar, PTS, Shields, Tab pause */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="flex items-center gap-1 text-xs font-['Patrick_Hand'] text-amber-400">
              <Cookie className="w-3.5 h-3.5" />
              <span>+{sugarCollected}</span>
            </div>

            <div className="text-xs font-['Patrick_Hand'] text-neutral-300">
              <span>{score.toLocaleString()} pts</span>
            </div>

            {/* Health shields */}
            <div className="flex items-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shield
                  key={i}
                  className={`w-4 h-4 transition-all ${
                    i < health
                      ? 'text-neutral-200 fill-neutral-200 drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]'
                      : 'text-neutral-700'
                  }`}
                />
              ))}
            </div>

            {/* Tab pause button */}
            <button
              onClick={() => {
                sound.playClick();
                setIsPaused(!isPaused);
              }}
              className="pointer-events-auto px-2.5 py-1 rounded-[220px_15px_200px_18px/15px_220px_18px_200px] bg-neutral-900/70 hover:bg-neutral-800 border border-neutral-700/70 text-neutral-300 font-['Patrick_Hand'] text-xs lowercase transition-all cursor-pointer"
            >
              [tab] pause
            </button>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        {!level.isEndless && (
          <div className="w-full bg-neutral-900/60 h-1 rounded-full border border-neutral-800/60 overflow-hidden">
            <div
              className="h-full bg-neutral-300 transition-all duration-150 rounded-full"
              style={{ width: `${progress}%` }}
            />
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
            <div className="text-sm font-['Patrick_Hand'] text-neutral-400 lowercase mt-1">
              {level.mechanicHint || 'dodge ants & click anthills to nuke them'}
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
            <h2 className="text-5xl font-bold font-['Caveat'] text-neutral-100 lowercase mb-2">
              u lost!
            </h2>

            <div className="text-sm font-['Patrick_Hand'] text-neutral-400 lowercase mb-5">
              progress: {Math.round(progress)}%
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
