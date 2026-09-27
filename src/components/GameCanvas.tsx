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
import { Play, RotateCcw, ArrowLeft, Trophy, Cookie, Shield, Zap, Sparkles, AlertTriangle, Crown } from 'lucide-react';

interface GameCanvasProps {
  level: LevelConfig;
  profile: PlayerProfile;
  onGameOver: (score: number, sugarEarned: number) => void;
  onVictory: (score: number, sugarEarned: number) => void;
  onExit: () => void;
  onProgressDailyChallenge?: (event: ChallengeEvent) => void;
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

  // UI state
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

  // References for the 60fps game loop
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const speedMultiplierRef = useRef<SpeedMultiplier>(1.0);
  const scoreRef = useRef(0);
  const healthRef = useRef(3);
  const sugarRef = useRef(0);
  const gameTimeRef = useRef(0);
  const isPausedRef = useRef(false);
  const isGameOverRef = useRef(false);

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

  // Skill Tier calculation for endless free mode
  const getSkillRank = (pts: number) => {
    if (pts > 25000) return 'Titan of the Colony';
    if (pts > 15000) return 'Apex Ant Master';
    if (pts > 9000) return 'Subterranean Legend';
    if (pts > 5000) return 'Hive Infiltrator';
    if (pts > 2000) return 'Seasoned Runner';
    return 'Novice Escapist';
  };

  // Initialize level objects inside containment box
  const initLevel = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const boxTop = 86;
    const boxBottom = height - 22;
    const boxLeft = 22;
    const boxRight = width - 22;
    const boxCenterX = (boxLeft + boxRight) / 2;
    const boxCenterY = (boxTop + boxBottom) / 2;

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

    // Create Anthills based on level config inside containment area
    const hills: Anthill[] = [];
    const count = level.spawnerCount;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = Math.min((boxRight - boxLeft) * 0.38, (boxBottom - boxTop) * 0.38);
      hills.push({
        id: i + 1,
        x: boxCenterX + Math.cos(angle) * dist,
        y: boxCenterY + Math.sin(angle) * dist,
        radius: 26,
        pulse: 0,
        spawnCooldown: 25 + Math.random() * 35,
        maxSpawnCooldown: Math.max(25, 75 - (level.id <= 23 ? level.id * 2 : 20)),
        type: i % 3 === 0 && (level.id >= 13 || level.isEndless) ? 'fire' : i % 2 === 1 && level.id >= 9 ? 'acid' : 'standard',
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
          speed: 2.3,
          size: 22,
          type: 'titan',
          angle: 0,
          legPhase: 0,
          health: 999,
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
          speed: 2.3,
          size: 22,
          type: 'titan',
          angle: Math.PI,
          legPhase: 3.14,
          health: 999,
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

    // Pre-spawn buzzsaws inside box
    const obs: Obstacle[] = [];
    const sawCount = Math.min(Math.floor((level.id <= 23 ? level.id : 12) / 4) + 1, 5);
    for (let s = 0; s < sawCount; s++) {
      obs.push({
        id: s + 1,
        type: 'buzzsaw',
        x: boxLeft + 60 + Math.random() * (boxRight - boxLeft - 120),
        y: boxTop + 60 + Math.random() * (boxBottom - boxTop - 120),
        vx: (Math.random() - 0.5) * (3 + (level.id <= 23 ? level.id * 0.2 : 4)),
        vy: (Math.random() - 0.5) * (3 + (level.id <= 23 ? level.id * 0.2 : 4)),
        radius: 20 + (s % 2) * 6,
        angle: 0,
        rotationSpeed: 0.15,
      });
    }

    // Laser barrier in Hard and above
    if (level.id >= 9 || level.isEndless) {
      obs.push({
        id: 99,
        type: 'laser',
        x: boxCenterX,
        y: boxCenterY,
        width: (boxRight - boxLeft) * 0.65,
        height: 8,
        angle: Math.random() * Math.PI,
        rotationSpeed: 0.006,
        state: 'charging',
        timer: 160,
      });
    }

    obstaclesRef.current = obs;
  }, [level]);

  useEffect(() => {
    initLevel();
  }, [initLevel]);

  // Handle Mouse & Touch movement (Cursor follows mouse or finger on tablet/phone)
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

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchMove, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Main 60fps HTML5 Canvas game loop
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

    let antIdCounter = 1;
    let textIdCounter = 1;

    // Helper: add floating text
    const addFloatingText = (text: string, x: number, y: number, color: string) => {
      floatingTextsRef.current.push({
        id: textIdCounter++,
        text,
        x,
        y,
        color,
        life: 0,
        maxLife: 45,
      });
    };

    // Helper: add particle explosion
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

    // Game loop tick
    const loop = () => {
      // Containment Box Boundaries (CANNOT TOUCH UPPER HEADER)
      const BOX_TOP = 86;
      const BOX_BOTTOM = height - 22;
      const BOX_LEFT = 22;
      const BOX_RIGHT = width - 22;

      if (!isPausedRef.current && !isGameOverRef.current) {
        const speedMult = speedMultiplierRef.current;
        gameTimeRef.current += (1 / 60) * speedMult;

        // Border cooldown
        if (borderHitCooldownRef.current > 0) {
          borderHitCooldownRef.current -= 1;
        }

        // Check if mouse touches upper header or box borders!
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;

        const isBreachingHeader = my <= BOX_TOP;
        const isBreachingBorder = mx <= BOX_LEFT || mx >= BOX_RIGHT || my >= BOX_BOTTOM;

        if ((isBreachingHeader || isBreachingBorder) && borderHitCooldownRef.current <= 0) {
          borderHitCooldownRef.current = 45; // 0.75s grace period
          healthRef.current -= 1;
          setHealth(healthRef.current);
          sound.playHitSound();
          shakeRef.current = 24;

          const breachMsg = isBreachingHeader
            ? 'HEADER HAZARD! -1 SHIELD'
            : 'PERIMETER SHOCK! -1 SHIELD';

          addFloatingText(breachMsg, Math.max(BOX_LEFT + 80, Math.min(BOX_RIGHT - 80, mx)), Math.max(BOX_TOP + 30, my), '#3b82f6');
          addParticles(mx, my, 20, '#60a5fa');

          if (healthRef.current <= 0) {
            isGameOverRef.current = true;
            setGameState('lost');
            onGameOver(scoreRef.current, sugarRef.current);
            return;
          }
        }

        // Clamp cursor internally for entity interactions
        const safeTargetX = Math.max(BOX_LEFT + 2, Math.min(BOX_RIGHT - 2, mx));
        const safeTargetY = Math.max(BOX_TOP + 2, Math.min(BOX_BOTTOM - 2, my));

        // Free mode dynamic difficulty shift every 15s
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
            shakeRef.current = 18;
            addFloatingText(`DIFFICULTY SHIFT: [${newDiff.toUpperCase()}]!`, width / 2, height / 2, DIFFICULTY_COLORS[newDiff] || '#3b82f6');
          }
        }

        // Update progress % (Only in normal campaign, not in endless)
        if (!level.isEndless) {
          const currentProgress = Math.min(100, (gameTimeRef.current / level.durationSeconds) * 100);
          setProgress(currentProgress);

          // Victory condition
          if (gameTimeRef.current >= level.durationSeconds && !isGameOverRef.current) {
            isGameOverRef.current = true;
            setGameState('won');
            sound.playVictory();
            confetti({
              particleCount: 140,
              spread: 90,
              origin: { y: 0.6 },
            });
            onVictory(scoreRef.current, sugarRef.current);
            onProgressDailyChallenge?.({ type: 'beat_hard', difficulty: level.difficulty });
            onProgressDailyChallenge?.({ type: 'score_milestone', value: scoreRef.current });
            return;
          }
        }

        // Survival score tick
        scoreRef.current += Math.round(1 * speedMult);
        setScore(scoreRef.current);

        // Spawn Speed Portals dynamically within box
        if (Math.random() < 0.007 * speedMult && portalsRef.current.length < 2) {
          const speeds: SpeedMultiplier[] = [0.5, 1.0, 1.5, 2.0];
          const filtered = speeds.filter((s) => s !== speedMult);
          const target = filtered[Math.floor(Math.random() * filtered.length)];

          const portalColor =
            target === 0.5 ? '#38bdf8' : target === 1.0 ? '#3b82f6' : target === 1.5 ? '#f97316' : '#a855f7';
          const portalLabel =
            target === 0.5 ? '0.5x SLOW' : target === 1.0 ? '1.0x NORMAL' : target === 1.5 ? '1.5x FAST' : '2.0x HYPER';

          portalsRef.current.push({
            id: Date.now(),
            x: BOX_LEFT + 80 + Math.random() * (BOX_RIGHT - BOX_LEFT - 160),
            y: BOX_TOP + 80 + Math.random() * (BOX_BOTTOM - BOX_TOP - 160),
            radius: 34,
            targetSpeed: target,
            active: true,
            angle: 0,
            color: portalColor,
            label: portalLabel,
          });
        }

        // Spawn Sugar Cubes within box
        if (Math.random() < 0.015 && sugarCubesRef.current.length < 5) {
          sugarCubesRef.current.push({
            id: Date.now() + Math.random(),
            x: BOX_LEFT + 50 + Math.random() * (BOX_RIGHT - BOX_LEFT - 100),
            y: BOX_TOP + 50 + Math.random() * (BOX_BOTTOM - BOX_TOP - 100),
            value: 5,
            pulse: 0,
          });
        }

        const activeDiff = level.isEndless ? currentDiffRef.current : level.difficulty;
        const isCrazyActive = activeDiff === 'Crazy';

        // Update Anthills and spawn Ants
        anthillsRef.current.forEach((hill) => {
          hill.pulse += 0.06 * speedMult;
          hill.spawnCooldown -= 1 * speedMult;

          if (hill.spawnCooldown <= 0 && antsRef.current.length < level.maxAnts) {
            hill.spawnCooldown = hill.maxSpawnCooldown;
            const antType = hill.type === 'fire' ? 'fire' : hill.type === 'acid' ? 'acid' : 'worker';
            const baseSpd =
              antType === 'fire' ? 3.3 : antType === 'acid' ? 2.7 : 2.2 + (level.id <= 23 ? level.id * 0.15 : 2.5);

            // Ant size scales progressively across Easy -> Normal -> Hard -> Harder -> Insane
            // In Crazy levels, anthills spawn the nimble little swarmers that the 2 Big Ants protect!
            const antSize = getAntSizeForDifficulty(activeDiff, antType);

            antsRef.current.push({
              id: antIdCounter++,
              x: hill.x + (Math.random() - 0.5) * 15,
              y: hill.y + (Math.random() - 0.5) * 15,
              vx: 0,
              vy: 0,
              speed: baseSpd,
              size: antSize,
              type: antType,
              angle: 0,
              legPhase: Math.random() * 10,
              health: 1,
            });

            addParticles(hill.x, hill.y, 4, '#1e3a8a');
          }
        });

        // Maintain the 2 Big Titan Ants in Crazy difficulty
        if (isCrazyActive) {
          const bigAnts = antsRef.current.filter((a) => a.isBigAnt);
          if (bigAnts.length < 2) {
            const hasIndex0 = bigAnts.some((a) => a.bigAntIndex === 0);
            const missingIdx = hasIndex0 ? 1 : 0;
            const spawnX = missingIdx === 0 ? BOX_LEFT + 80 : BOX_RIGHT - 80;
            const spawnY = missingIdx === 0 ? BOX_TOP + 80 : BOX_BOTTOM - 80;
            antsRef.current.unshift({
              id: antIdCounter++,
              x: spawnX,
              y: spawnY,
              vx: 0,
              vy: 0,
              speed: 2.3,
              size: 22,
              type: 'titan',
              angle: 0,
              legPhase: Math.random() * 10,
              health: 999,
              isBigAnt: true,
              bigAntIndex: missingIdx,
              rallyCooldown: 120 + missingIdx * 100,
            });
            addFloatingText(
              missingIdx === 0 ? '👑 TITAN ALPHA ADVANCES!' : '👑 TITAN BETA ADVANCES!',
              spawnX,
              spawnY,
              '#f43f5e'
            );
            addParticles(spawnX, spawnY, 20, '#f43f5e');
          }
        } else if (level.isEndless) {
          // If endless mode transitioned away from Crazy, despawn the Big Ants
          const hadBig = antsRef.current.some((a) => a.isBigAnt);
          if (hadBig) {
            antsRef.current.forEach((a) => {
              if (a.isBigAnt) addParticles(a.x, a.y, 20, '#fbbf24');
            });
            antsRef.current = antsRef.current.filter((a) => !a.isBigAnt);
            addFloatingText('TITAN BEHEMOTHS RETREATED!', width / 2, height / 2 - 20, '#60a5fa');
          }
        }

        // List of big titan ants to calculate helper aura on little ones
        const bigAnts = antsRef.current.filter((a) => a.isBigAnt);

        // Update Ants chasing cursor
        antsRef.current.forEach((ant) => {
          // In endless mode, smoothly adjust size of regular ants to match shifting difficulty
          if (level.isEndless && !ant.isBigAnt) {
            const targetSize = getAntSizeForDifficulty(activeDiff, ant.type);
            ant.size += (targetSize - ant.size) * 0.05;
          }

          const dx = safeTargetX - ant.x;
          const dy = safeTargetY - ant.y;
          const dist = Math.hypot(dx, dy);

          if (ant.isBigAnt) {
            // --- 2 BIG TITAN ANTS HELPING THE LITTLE ONES ---
            // 1. Pincer flanking pursuit (one flanks clockwise, one counter-clockwise to trap player)
            const baseAngle = Math.atan2(dy, dx);
            const pincerOffset = ant.bigAntIndex === 0 ? 0.55 : -0.55;
            const flankAngle = dist < 150 ? baseAngle : baseAngle + pincerOffset;
            const desiredVx = Math.cos(flankAngle) * ant.speed * speedMult;
            const desiredVy = Math.sin(flankAngle) * ant.speed * speedMult;
            ant.vx += (desiredVx - ant.vx) * 0.08;
            ant.vy += (desiredVy - ant.vy) * 0.08;

            // 2. Rally Surge & Brood Call cooldown
            ant.rallyCooldown = (ant.rallyCooldown || 180) - 1 * speedMult;
            if (ant.rallyCooldown <= 0) {
              ant.rallyCooldown = 280; // every ~4.6 seconds
              sound.playPortalSound(1.5);
              shakeRef.current = Math.max(shakeRef.current, 7);
              addFloatingText(
                ant.bigAntIndex === 0 ? '👑 ALPHA PHEROMONE RALLY!' : '👑 BETA BROOD SUMMON!',
                ant.x,
                ant.y - 32,
                '#fbbf24'
              );
              addParticles(ant.x, ant.y, 16, '#f59e0b');

              // Summon 1-2 rapid little reinforcements near the big ant
              if (antsRef.current.length < level.maxAnts) {
                const toSpawn = Math.min(2, level.maxAnts - antsRef.current.length);
                for (let s = 0; s < toSpawn; s++) {
                  const rType = Math.random() < 0.5 ? 'fire' : 'worker';
                  antsRef.current.push({
                    id: antIdCounter++,
                    x: ant.x + (Math.random() - 0.5) * 24,
                    y: ant.y + (Math.random() - 0.5) * 24,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    speed: 3.5,
                    size: rType === 'fire' ? 7.2 : 6.5,
                    type: rType,
                    angle: ant.angle,
                    legPhase: Math.random() * 10,
                    health: 1,
                    buffed: true,
                  });
                }
              }
            }
          } else {
            // --- LITTLE / REGULAR ANTS ---
            // Check if rallied / helped by any Big Ant in Crazy levels
            let isBuffed = false;
            for (const bAnt of bigAnts) {
              if (Math.hypot(ant.x - bAnt.x, ant.y - bAnt.y) < 140) {
                isBuffed = true;
                break;
              }
            }
            ant.buffed = isBuffed;

            // Buffed little ants gain +40% speed and sharper agility steering
            const effectiveSpd = ant.speed * (ant.buffed ? 1.4 : 1.0) * speedMult;
            const agility = ant.buffed ? 0.18 : 0.12;

            if (dist > 1) {
              const desiredVx = (dx / dist) * effectiveSpd;
              const desiredVy = (dy / dist) * effectiveSpd;
              ant.vx += (desiredVx - ant.vx) * agility;
              ant.vy += (desiredVy - ant.vy) * agility;
            }
          }

          ant.x += ant.vx;
          ant.y += ant.vy;

          // Keep ants inside containment box
          const boundMargin = ant.isBigAnt ? 24 : 10;
          if (ant.x < BOX_LEFT + boundMargin) ant.x = BOX_LEFT + boundMargin;
          if (ant.x > BOX_RIGHT - boundMargin) ant.x = BOX_RIGHT - boundMargin;
          if (ant.y < BOX_TOP + boundMargin) ant.y = BOX_TOP + boundMargin;
          if (ant.y > BOX_BOTTOM - boundMargin) ant.y = BOX_BOTTOM - boundMargin;

          ant.angle = Math.atan2(ant.vy, ant.vx);
          ant.legPhase += (ant.isBigAnt ? 0.28 : 0.45) * speedMult;

          // Hitbox and near-miss distances scale with ant size
          const hitRadius = ant.isBigAnt ? 22 : Math.max(12, ant.size * 1.35);
          const nearMissMin = hitRadius + 4;
          const nearMissMax = hitRadius + (ant.isBigAnt ? 28 : 22);

          // Near miss bonus
          if (dist > nearMissMin && dist < nearMissMax && Math.random() < 0.035) {
            if (ant.isBigAnt) {
              scoreRef.current += 50;
              sound.playNearMiss();
              addFloatingText('+50 TITAN DODGE!', ant.x, ant.y - 12, '#fbbf24');
              onProgressDailyChallenge?.({ type: 'dodge_ants', count: 2 });
            } else {
              const pts = ant.buffed ? 25 : 15;
              scoreRef.current += pts;
              sound.playNearMiss();
              addFloatingText(ant.buffed ? '+25 ENRAGED DODGE!' : '+15 DODGE!', ant.x, ant.y, ant.buffed ? '#f59e0b' : '#60a5fa');
              onProgressDailyChallenge?.({ type: 'dodge_ants', count: 1 });
            }
          }

          // Collision with cursor
          if (dist < hitRadius && !isGameOverRef.current) {
            healthRef.current -= 1;
            setHealth(healthRef.current);
            sound.playHitSound();
            shakeRef.current = ant.isBigAnt ? 26 : 20;
            addParticles(ant.x, ant.y, ant.isBigAnt ? 24 : 16, ant.isBigAnt ? '#f43f5e' : '#ef4444');
            addFloatingText(
              ant.isBigAnt ? 'CRUSHED BY TITAN! -1 SHIELD' : 'BITTEN! -1 SHIELD',
              ant.x,
              ant.y - 18,
              '#ef4444'
            );

            // Knock back ant
            ant.x -= ant.vx * (ant.isBigAnt ? 18 : 30);
            ant.y -= ant.vy * (ant.isBigAnt ? 18 : 30);

            if (healthRef.current <= 0) {
              isGameOverRef.current = true;
              setGameState('lost');
              if (level.isEndless) {
                onProgressDailyChallenge?.({
                  type: 'survive_free_mode',
                  value: Math.floor(gameTimeRef.current),
                });
              }
              onProgressDailyChallenge?.({
                type: 'score_milestone',
                value: scoreRef.current,
              });
              onGameOver(scoreRef.current, sugarRef.current);
            }
          }
        });

        // Update Obstacles (Buzzsaws & Lasers) within box
        obstaclesRef.current.forEach((obs) => {
          if (obs.type === 'buzzsaw') {
            obs.x += (obs.vx || 0) * speedMult;
            obs.y += (obs.vy || 0) * speedMult;
            obs.angle = (obs.angle || 0) + (obs.rotationSpeed || 0.1) * speedMult;

            const r = obs.radius || 20;
            // Bounce against containment box
            if (obs.x < BOX_LEFT + r || obs.x > BOX_RIGHT - r) obs.vx = -(obs.vx || 0);
            if (obs.y < BOX_TOP + r || obs.y > BOX_BOTTOM - r) obs.vy = -(obs.vy || 0);

            // Big Titan Ants deflect buzzsaws to protect little ants behind them
            bigAnts.forEach((bAnt) => {
              const dSaw = Math.hypot((obs.x || 0) - bAnt.x, (obs.y || 0) - bAnt.y);
              if (dSaw < r + bAnt.size) {
                obs.vx = -(obs.vx || 2);
                obs.vy = -(obs.vy || 2);
                addParticles(obs.x, obs.y, 8, '#fbbf24');
              }
            });

            const dist = Math.hypot(safeTargetX - obs.x, safeTargetY - obs.y);
            if (dist < r + 10 && !isGameOverRef.current) {
              healthRef.current -= 1;
              setHealth(healthRef.current);
              sound.playHitSound();
              shakeRef.current = 25;
              addParticles(obs.x, obs.y, 20, '#3b82f6');
              addFloatingText('SAW CUT! -1 SHIELD', obs.x, obs.y - 20, '#3b82f6');

              if (healthRef.current <= 0) {
                isGameOverRef.current = true;
                setGameState('lost');
                if (level.isEndless) {
                  onProgressDailyChallenge?.({
                    type: 'survive_free_mode',
                    value: Math.floor(gameTimeRef.current),
                  });
                }
                onProgressDailyChallenge?.({
                  type: 'score_milestone',
                  value: scoreRef.current,
                });
                onGameOver(scoreRef.current, sugarRef.current);
              }
            }
          } else if (obs.type === 'laser') {
            obs.angle = (obs.angle || 0) + (obs.rotationSpeed || 0.005) * speedMult;
            obs.timer = (obs.timer || 0) - 1 * speedMult;
            if ((obs.timer || 0) <= 0) {
              obs.state = obs.state === 'charging' ? 'active' : 'charging';
              obs.timer = obs.state === 'active' ? 120 : 180;
            }

            if (obs.state === 'active' && !isGameOverRef.current) {
              const nx = -Math.sin(obs.angle || 0);
              const ny = Math.cos(obs.angle || 0);
              const distToLine = Math.abs((safeTargetX - obs.x) * nx + (safeTargetY - obs.y) * ny);
              const alongLine = Math.abs((safeTargetX - obs.x) * Math.cos(obs.angle || 0) + (safeTargetY - obs.y) * Math.sin(obs.angle || 0));

              if (distToLine < 12 && alongLine < (obs.width || 400) / 2) {
                healthRef.current -= 1;
                setHealth(healthRef.current);
                sound.playHitSound();
                shakeRef.current = 20;
                addParticles(safeTargetX, safeTargetY, 15, '#ef4444');
                addFloatingText('LASER BURN!', safeTargetX, safeTargetY, '#ef4444');

                if (healthRef.current <= 0) {
                  isGameOverRef.current = true;
                  setGameState('lost');
                  if (level.isEndless) {
                    onProgressDailyChallenge?.({
                      type: 'survive_free_mode',
                      value: Math.floor(gameTimeRef.current),
                    });
                  }
                  onProgressDailyChallenge?.({
                    type: 'score_milestone',
                    value: scoreRef.current,
                  });
                  onGameOver(scoreRef.current, sugarRef.current);
                }
              }
            }
          }
        });

        // Update Portals
        portalsRef.current.forEach((portal) => {
          portal.angle += 0.04 * speedMult;
          const dist = Math.hypot(safeTargetX - portal.x, safeTargetY - portal.y);

          if (dist < portal.radius + 10 && portal.active) {
            portal.active = false;
            speedMultiplierRef.current = portal.targetSpeed;
            setCurrentSpeed(portal.targetSpeed);
            sound.setSpeedMultiplier(portal.targetSpeed);
            addParticles(portal.x, portal.y, 25, portal.color);
            addFloatingText(`WARP! ${portal.label}`, portal.x, portal.y - 25, portal.color);
            shakeRef.current = 15;
            onProgressDailyChallenge?.({ type: 'speed_portals', count: 1 });
          }
        });
        portalsRef.current = portalsRef.current.filter((p) => p.active);

        // Update Sugar Cubes
        sugarCubesRef.current.forEach((sugar) => {
          sugar.pulse += 0.08 * speedMult;
          const dist = Math.hypot(safeTargetX - sugar.x, safeTargetY - sugar.y);

          if (dist < 22) {
            sugarRef.current += sugar.value;
            setSugarCollected(sugarRef.current);
            scoreRef.current += 100;
            sound.playSugarCollect();
            addParticles(sugar.x, sugar.y, 14, '#60a5fa');
            addFloatingText(`+${sugar.value} SUGAR!`, sugar.x, sugar.y - 15, '#60a5fa');
            onProgressDailyChallenge?.({ type: 'collect_sugar', count: 1 });
          }
        });
        sugarCubesRef.current = sugarCubesRef.current.filter((s) => Math.hypot(safeTargetX - s.x, safeTargetY - s.y) >= 22);

        // Update particles
        particlesRef.current.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life++;
        });
        particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

        // Update floating texts
        floatingTextsRef.current.forEach((t) => {
          t.y -= 0.8;
          t.life++;
        });
        floatingTextsRef.current = floatingTextsRef.current.filter((t) => t.life < t.maxLife);

        // Cursor trail
        trailPointsRef.current.push({ x: mx, y: my, alpha: 1 });
        if (trailPointsRef.current.length > 20) {
          trailPointsRef.current.shift();
        }
        trailPointsRef.current.forEach((tp) => (tp.alpha *= 0.88));
      }

      // ---------------- RENDER FRAME ----------------
      ctx.save();

      // Screen shake
      if (shakeRef.current > 0) {
        const sx = (Math.random() - 0.5) * shakeRef.current;
        const sy = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(sx, sy);
        shakeRef.current *= 0.9;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
      }

      // Clear background with dark blue subterranean theme
      ctx.fillStyle = level.bgColor || '#050c18';
      ctx.fillRect(0, 0, width, height);

      // Cyber grid background pattern
      ctx.fillStyle = 'rgba(59, 130, 246, 0.03)';
      for (let i = 0; i < 35; i++) {
        ctx.beginPath();
        ctx.arc((i * 197) % width, (i * 263) % height, (i % 5) + 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---------------- CONTAINMENT BOX RENDERING ----------------
      // Outer forbidden header hazard area shading
      ctx.fillStyle = 'rgba(30, 58, 138, 0.2)';
      ctx.fillRect(0, 0, width, BOX_TOP);

      // Electric Containment Wall
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.strokeRect(BOX_LEFT, BOX_TOP, BOX_RIGHT - BOX_LEFT, BOX_BOTTOM - BOX_TOP);

      // Outer glow boundary
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
      ctx.lineWidth = 8;
      ctx.strokeRect(BOX_LEFT, BOX_TOP, BOX_RIGHT - BOX_LEFT, BOX_BOTTOM - BOX_TOP);

      // Hazard Warning stripes along the upper header divider (CANNOT TOUCH HEADER)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(BOX_LEFT, BOX_TOP);
      ctx.lineTo(BOX_RIGHT, BOX_TOP);
      ctx.stroke();

      // Warning text along the upper header barrier
      ctx.fillStyle = 'rgba(96, 165, 250, 0.8)';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ HIGH-VOLTAGE CONTAINMENT BORDER — DO NOT TOUCH UPPER HEADER ⚠', (BOX_LEFT + BOX_RIGHT) / 2, BOX_TOP - 6);

      // Corner tech brackets
      const bSize = 16;
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
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

      // Draw Anthills
      anthillsRef.current.forEach((hill) => {
        const pulseR = hill.radius + Math.sin(hill.pulse) * 4;
        ctx.fillStyle = 'rgba(30, 58, 138, 0.35)';
        ctx.beginPath();
        ctx.arc(hill.x, hill.y, pulseR + 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = hill.type === 'fire' ? '#7f1d1d' : hill.type === 'acid' ? '#064e3b' : '#1e3a8a';
        ctx.beginPath();
        ctx.arc(hill.x, hill.y, pulseR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#050c18';
        ctx.beginPath();
        ctx.arc(hill.x, hill.y, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = hill.type === 'fire' ? '#ef4444' : hill.type === 'acid' ? '#10b981' : '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hill.x, hill.y, pulseR, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw Speed Portals
      portalsRef.current.forEach((portal) => {
        ctx.save();
        ctx.translate(portal.x, portal.y);
        ctx.rotate(portal.angle);

        ctx.strokeStyle = portal.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, portal.radius - 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `${portal.color}30`;
        ctx.beginPath();
        ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        ctx.fillStyle = portal.color;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(portal.label, portal.x, portal.y - portal.radius - 8);
      });

      // Draw Sugar Cubes
      sugarCubesRef.current.forEach((s) => {
        const floatY = Math.sin(s.pulse) * 4;
        ctx.save();
        ctx.translate(s.x, s.y + floatY);
        ctx.fillStyle = '#93c5fd';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-7, -7, 14, 14);
        ctx.strokeRect(-7, -7, 14, 14);

        ctx.fillStyle = 'rgba(96, 165, 250, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Obstacles (Buzzsaws & Lasers)
      obstaclesRef.current.forEach((obs) => {
        if (obs.type === 'buzzsaw') {
          ctx.save();
          ctx.translate(obs.x, obs.y);
          ctx.rotate(obs.angle || 0);

          const r = obs.radius || 20;
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#38bdf8';
          const teeth = 8;
          for (let t = 0; t < teeth; t++) {
            const ta = (t / teeth) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ta) * r, Math.sin(ta) * r);
            ctx.lineTo(Math.cos(ta + 0.2) * (r + 8), Math.sin(ta + 0.2) * (r + 8));
            ctx.lineTo(Math.cos(ta + 0.4) * r, Math.sin(ta + 0.4) * r);
            ctx.fill();
          }

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        } else if (obs.type === 'laser') {
          ctx.save();
          ctx.translate(obs.x, obs.y);
          ctx.rotate(obs.angle || 0);

          const beamW = obs.width || 400;
          const isActive = obs.state === 'active';

          if (isActive) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
            ctx.shadowColor = '#3b82f6';
            ctx.shadowBlur = 20;
            ctx.fillRect(-beamW / 2, -5, beamW, 10);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-beamW / 2, -2, beamW, 4);
          } else {
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
            ctx.setLineDash([8, 8]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-beamW / 2, 0);
            ctx.lineTo(beamW / 2, 0);
            ctx.stroke();
          }

          ctx.fillStyle = '#1d4ed8';
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      });

      // Draw Ants
      antsRef.current.forEach((ant) => {
        if (ant.isBigAnt) {
          // --- DRAW BIG TITAN ANT ---
          // 1. Pheromone Rally Aura (drawn unrotated around titan)
          ctx.save();
          ctx.translate(ant.x, ant.y);
          const auraR = 135 + Math.sin(gameTimeRef.current * 4 + (ant.bigAntIndex || 0) * 2) * 8;

          // Radial subtle aura glow
          ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
          ctx.beginPath();
          ctx.arc(0, 0, auraR, 0, Math.PI * 2);
          ctx.fill();

          // Pulsing dashed boundary ring
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, auraR, 0, Math.PI * 2);
          ctx.stroke();

          // Orbiting pheromone nodes
          for (let r = 0; r < 4; r++) {
            const aAng = gameTimeRef.current * 1.5 + (r * Math.PI) / 2;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(Math.cos(aAng) * auraR, Math.sin(aAng) * auraR, 3, 0, Math.PI * 2);
            ctx.fill();
          }

          // Titan Nameplate / Crest
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'black 10px monospace';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
          ctx.fillText(ant.bigAntIndex === 0 ? '👑 TITAN ALPHA' : '👑 TITAN BETA', 0, -ant.size - 18);
          ctx.shadowBlur = 0;

          // Helper status subtitle
          ctx.fillStyle = 'rgba(253, 224, 71, 0.75)';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('⚡ RALLY GUARDIAN', 0, -ant.size - 9);
          ctx.restore();

          // 2. Titan Body (rotated to angle)
          ctx.save();
          ctx.translate(ant.x, ant.y);
          ctx.rotate(ant.angle);

          // Heavy armored legs with double joints & hooked claws
          ctx.strokeStyle = '#270815';
          ctx.lineWidth = 3.2;
          for (let l = -1; l <= 1; l++) {
            const legWiggle = Math.sin(ant.legPhase + l * 1.2) * 5;
            const jX = l * 9;
            const jY1 = -ant.size * 0.95 + legWiggle * 0.5;
            const jY2 = ant.size * 0.95 - legWiggle * 0.5;
            const tY1 = -ant.size * 1.65 + legWiggle;
            const tY2 = ant.size * 1.65 - legWiggle;

            ctx.beginPath();
            ctx.moveTo(jX, 0);
            ctx.lineTo(jX + 4, jY1);
            ctx.lineTo(jX + 9, tY1);
            ctx.moveTo(jX, 0);
            ctx.lineTo(jX + 4, jY2);
            ctx.lineTo(jX + 9, tY2);
            ctx.stroke();

            // Joint glowing bio-nodes
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(jX + 4, jY1, 2.2, 0, Math.PI * 2);
            ctx.arc(jX + 4, jY2, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Segmented Titan Abdomen (Rear)
          ctx.fillStyle = '#4c0519';
          ctx.beginPath();
          ctx.ellipse(-ant.size * 0.8, 0, ant.size * 0.85, ant.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#e11d48';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Chitin segment ridges
          ctx.strokeStyle = '#fb7185';
          ctx.lineWidth = 2;
          for (let seg = -1; seg <= 1; seg++) {
            ctx.beginPath();
            ctx.ellipse(-ant.size * 0.8 + seg * 6, 0, ant.size * 0.22, ant.size * 0.45, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Titan Thorax (Center)
          ctx.fillStyle = '#881337';
          ctx.beginPath();
          ctx.ellipse(0, 0, ant.size * 0.5, ant.size * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Shoulder Spikes on Thorax
          ctx.fillStyle = '#e11d48';
          ctx.beginPath();
          ctx.moveTo(-2, -ant.size * 0.42);
          ctx.lineTo(4, -ant.size * 0.7);
          ctx.lineTo(7, -ant.size * 0.35);
          ctx.moveTo(-2, ant.size * 0.42);
          ctx.lineTo(4, ant.size * 0.7);
          ctx.lineTo(7, ant.size * 0.35);
          ctx.fill();

          // Titan Head
          ctx.fillStyle = '#9f1239';
          ctx.beginPath();
          ctx.ellipse(ant.size * 0.72, 0, ant.size * 0.45, ant.size * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Massive Golden Snapping Mandibles
          const jawSnap = Math.sin(ant.legPhase * 1.5) * 4;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ant.size * 0.9, -5);
          ctx.quadraticCurveTo(ant.size * 1.45, -13 + jawSnap, ant.size * 1.7, -4 + jawSnap);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ant.size * 0.9, 5);
          ctx.quadraticCurveTo(ant.size * 1.45, 13 - jawSnap, ant.size * 1.7, 4 - jawSnap);
          ctx.stroke();

          // 4 Multifaceted Predator Eyes
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(ant.size * 0.85, -5, 2.5, 0, Math.PI * 2);
          ctx.arc(ant.size * 0.85, 5, 2.5, 0, Math.PI * 2);
          ctx.arc(ant.size * 0.7, -8, 1.8, 0, Math.PI * 2);
          ctx.arc(ant.size * 0.7, 8, 1.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        } else {
          // --- DRAW REGULAR / LITTLE ANT ---
          ctx.save();
          ctx.translate(ant.x, ant.y);
          ctx.rotate(ant.angle);

          // If buffed by the Big Ant in Crazy levels, show fiery golden rally aura
          if (ant.buffed) {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
            ctx.beginPath();
            ctx.arc(0, 0, ant.size * 1.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, ant.size * 1.6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Legs scale with ant size
          ctx.strokeStyle = ant.buffed ? '#b45309' : '#1e3a8a';
          ctx.lineWidth = Math.max(1.3, ant.size * 0.18);
          for (let l = -1; l <= 1; l++) {
            const legWiggle = Math.sin(ant.legPhase + l) * 3;
            ctx.beginPath();
            ctx.moveTo(l * (ant.size * 0.45), 0);
            ctx.lineTo(l * (ant.size * 0.6), -ant.size - 2 + legWiggle);
            ctx.moveTo(l * (ant.size * 0.45), 0);
            ctx.lineTo(l * (ant.size * 0.6), ant.size + 2 - legWiggle);
            ctx.stroke();
          }

          // Abdomen (scales with ant size)
          ctx.fillStyle = ant.type === 'fire' ? '#ef4444' : ant.type === 'acid' ? '#10b981' : ant.buffed ? '#78350f' : '#1e293b';
          ctx.beginPath();
          ctx.ellipse(-ant.size * 0.7, 0, ant.size * 0.75, ant.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Thorax
          ctx.fillStyle = ant.type === 'fire' ? '#991b1b' : ant.type === 'acid' ? '#064e3b' : ant.buffed ? '#b45309' : '#0f172a';
          ctx.beginPath();
          ctx.ellipse(0, 0, ant.size * 0.4, ant.size * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();

          // Head
          ctx.fillStyle = ant.type === 'fire' ? '#f87171' : ant.type === 'acid' ? '#34d153' : ant.buffed ? '#d97706' : '#334155';
          ctx.beginPath();
          ctx.ellipse(ant.size * 0.65, 0, ant.size * 0.4, ant.size * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();

          // Glowing eyes
          ctx.fillStyle = ant.buffed ? '#fef08a' : ant.type === 'fire' ? '#fef08a' : ant.type === 'acid' ? '#6ee7b7' : '#38bdf8';
          const eyeSpacing = Math.max(1.8, ant.size * 0.28);
          const eyeR = Math.max(1, ant.size * 0.14);
          ctx.beginPath();
          ctx.arc(ant.size * 0.75, -eyeSpacing, eyeR, 0, Math.PI * 2);
          ctx.arc(ant.size * 0.75, eyeSpacing, eyeR, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      });

      // Draw Cursor Trail
      trailPointsRef.current.forEach((tp) => {
        ctx.fillStyle = activeSkin.trailColor;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 4 * tp.alpha, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Custom Cursor Skin at Mouse Position
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.save();
      ctx.translate(mx, my);

      ctx.fillStyle = activeSkin.glowColor;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = activeSkin.color;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, -18);
      ctx.moveTo(0, 8);
      ctx.lineTo(0, 18);
      ctx.moveTo(-8, 0);
      ctx.lineTo(-18, 0);
      ctx.moveTo(8, 0);
      ctx.lineTo(18, 0);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Draw Particles
      particlesRef.current.forEach((p) => {
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw Floating Texts
      floatingTextsRef.current.forEach((t) => {
        const alpha = 1 - t.life / t.maxLife;
        ctx.fillStyle = t.color;
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 13px monospace';
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
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none cursor-none touch-none" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0 z-0 block touch-none" style={{ touchAction: 'none' }} />

      {/* Top HUD: Progress Bar, Score, Speed, Shields, Tab Pause Hint */}
      <div className="absolute top-0 inset-x-0 z-20 p-3 sm:p-5 flex flex-col gap-2 pointer-events-none bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <div className="flex items-center justify-between">
          {/* Level Info & Song */}
          <div className="flex items-center gap-3">
            <span
              className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border shadow-md"
              style={{
                color: level.isEndless ? DIFFICULTY_COLORS[freeModeDifficulty] : level.difficultyColor,
                borderColor: `${level.isEndless ? DIFFICULTY_COLORS[freeModeDifficulty] : level.difficultyColor}60`,
                background: `${level.isEndless ? DIFFICULTY_COLORS[freeModeDifficulty] : level.difficultyColor}20`,
              }}
            >
              {level.isEndless ? `FREE: ${freeModeDifficulty}` : level.difficulty}
            </span>
            <div>
              <div className="font-['Russo_One'] text-white text-sm sm:text-base tracking-wide flex items-center gap-2">
                <span>{level.name}</span>
                {level.isEndless ? (
                  <span className="text-xs font-mono text-blue-400">
                    (Shift in {freeModeSecondsLeft}s • {getSkillRank(score)})
                  </span>
                ) : (
                  <span className="text-xs font-mono text-neutral-400">({level.bpm} BPM)</span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Tempo and Ant Scale / Titan Badge */}
          <div className="hidden md:flex items-center gap-2">
            <div
              className="px-3.5 py-1.5 rounded-xl font-mono text-xs font-black tracking-widest uppercase border shadow-lg flex items-center gap-1.5 transition-all bg-blue-600 border-blue-400/40 text-white"
            >
              <Zap className="w-4 h-4 fill-current" />
              TEMPO: {currentSpeed.toFixed(1)}X SPEED
            </div>

            {level.difficulty === 'Crazy' || (level.isEndless && freeModeDifficulty === 'Crazy') ? (
              <div className="px-3 py-1.5 rounded-xl font-mono text-xs font-black tracking-wider uppercase border shadow-lg flex items-center gap-1.5 bg-rose-950/80 border-rose-500/60 text-rose-300 animate-pulse">
                <Crown className="w-3.5 h-3.5 text-rose-400" />
                2 TITAN ANTS ACTIVE
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold tracking-wider uppercase border shadow-md flex items-center gap-1.5 bg-neutral-900/80 border-blue-800/40 text-neutral-300">
                ANT SCALE: {DIFFICULTY_ANT_SCALING[level.isEndless ? freeModeDifficulty : level.difficulty]?.label.split(' ')[0] || 'Standard'}
              </div>
            )}
          </div>

          {/* Right: Score, Sugar Cubes, Shields & Tab Key Pause Indicator */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900/80 border border-blue-500/40 rounded-xl text-blue-300 font-mono text-xs font-bold">
              <Cookie className="w-3.5 h-3.5 text-blue-400" />
              <span>+{sugarCollected}</span>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-mono text-neutral-400">PTS</div>
              <div className="text-sm sm:text-base font-black font-mono text-blue-400 tracking-wider">
                {score.toLocaleString()}
              </div>
            </div>

            {/* Health Shields */}
            <div className="flex items-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shield
                  key={i}
                  className={`w-5 h-5 transition-all ${
                    i < health
                      ? 'text-blue-500 fill-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                      : 'text-neutral-700'
                  }`}
                />
              ))}
            </div>

            {/* Tab Pause Hint & Clickable Button */}
            <button
              onClick={() => {
                sound.playClick();
                setIsPaused(!isPaused);
              }}
              className="pointer-events-auto px-2.5 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-500 border border-blue-400/40 text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-md"
              title="Click or press Tab key to pause"
            >
              [TAB] PAUSE
            </button>
          </div>
        </div>

        {/* Level Progress Bar (Normal Campaign) */}
        {!level.isEndless && (
          <div className="w-full bg-neutral-900/80 h-2 rounded-full border border-blue-900/40 overflow-hidden relative shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-150 bg-gradient-to-r from-blue-600 to-cyan-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Pause Menu Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-default">
          <div className="relative w-full max-w-sm bg-neutral-900 border border-blue-600/50 rounded-3xl p-6 text-center shadow-2xl shadow-blue-950/60">
            <h2 className="text-3xl font-black font-['Russo_One'] text-white mb-2">PAUSED</h2>
            <p className="text-xs font-mono text-neutral-400 mb-6">
              Press [TAB] or click below to resume
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  sound.playClick();
                  setIsPaused(false);
                }}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold font-mono text-sm tracking-wider cursor-pointer shadow-lg shadow-blue-600/30"
              >
                RESUME [TAB]
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setIsPaused(false);
                  initLevel();
                }}
                className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold cursor-pointer"
              >
                RESTART LEVEL
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  sound.stopBgm();
                  onExit();
                }}
                className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white font-mono text-xs font-bold cursor-pointer"
              >
                EXIT TO MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'lost' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-default">
          <div className="relative w-full max-w-md bg-neutral-900 border border-blue-900/80 rounded-3xl p-6 sm:p-8 text-center shadow-2xl overflow-hidden">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-950/80 border border-blue-700/60 flex items-center justify-center text-blue-400 mb-4 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              <Shield className="w-8 h-8" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800 mb-2">
              Chamber Breached
            </div>

            <h2 className="text-3xl font-black font-['Russo_One'] text-white mb-2">
              SWARM OVERWHELMED!
            </h2>

            <p className="text-xs font-mono text-neutral-400 mb-6">
              {level.isEndless
                ? `Endless Run Over! Skill Tier: ${getSkillRank(score)}`
                : `Progress: ${Math.round(progress)}% of the chamber.`}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] font-mono text-neutral-500 block">FINAL PTS</span>
                <span className="text-lg font-black font-mono text-blue-400">
                  {score.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] font-mono text-neutral-500 block">SUGAR EARNED</span>
                <span className="text-lg font-black font-mono text-white flex items-center justify-center gap-1">
                  <Cookie className="w-4 h-4 text-blue-400" />
                  +{sugarCollected}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  sound.playClick();
                  initLevel();
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black font-['Russo_One'] text-sm tracking-wider cursor-pointer shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                TRY AGAIN
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  sound.stopBgm();
                  onExit();
                }}
                className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-bold cursor-pointer"
              >
                RETURN TO CHAMBERS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Screen */}
      {gameState === 'won' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-default">
          <div className="relative w-full max-w-md bg-neutral-900 border border-blue-500/80 rounded-3xl p-6 sm:p-8 text-center shadow-2xl overflow-hidden">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/20 border border-blue-500/60 flex items-center justify-center text-blue-400 mb-4 shadow-[0_0_25px_rgba(59,130,246,0.6)]">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-blue-950 text-blue-400 border border-blue-700 mb-2">
              Chamber Completed!
            </div>

            <h2 className="text-3xl font-black font-['Russo_One'] text-white mb-2">
              SURVIVAL VICTORY!
            </h2>

            <p className="text-xs font-mono text-neutral-400 mb-6">
              You survived the full rhythm duration of {level.name}!
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] font-mono text-neutral-500 block">VICTORY PTS</span>
                <span className="text-lg font-black font-mono text-blue-400">
                  {score.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] font-mono text-neutral-500 block">SUGAR SECURED</span>
                <span className="text-lg font-black font-mono text-white flex items-center justify-center gap-1">
                  <Cookie className="w-4 h-4 text-blue-400" />
                  +{sugarCollected + 25} bonus
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  sound.playClick();
                  initLevel();
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black font-['Russo_One'] text-sm tracking-wider cursor-pointer shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                PLAY AGAIN
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  sound.stopBgm();
                  onExit();
                }}
                className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-bold cursor-pointer"
              >
                CHAMBERS MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
