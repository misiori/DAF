export interface Skin {
  id: string;
  name: string;
  color: string;
  secondaryColor: string;
  glowColor: string;
  trailColor: string;
  description: string;
  unlockedByDefault: boolean;
  cost: number;
  rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
}

export interface LevelConfig {
  id: number;
  name: string;
  difficulty: 'Easy' | 'Normal' | 'Hard' | 'Harder' | 'Insane' | 'Crazy';
  difficultyColor: string;
  songUrl: string;
  songTitle: string;
  artist: string;
  bpm: number;
  durationSeconds: number;
  themeColor: string;
  bgColor: string;
  description: string;
  spawnerCount: number;
  maxAnts: number;
  isEndless?: boolean;
  mechanicId?: string;
  mechanicName?: string;
  mechanicHint?: string;
}

export type SpeedMultiplier = 0.5 | 1.0 | 1.5 | 2.0;

export interface Ant {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  size: number;
  type: 'worker' | 'soldier' | 'fire' | 'acid' | 'titan';
  angle: number;
  legPhase: number;
  health: number;
  isBigAnt?: boolean;
  bigAntIndex?: number;
  rallyCooldown?: number;
  buffed?: boolean;
  targetAngleOffset?: number;
  honeyFreezeTimer?: number;
}

export interface Anthill {
  id: number;
  x: number;
  y: number;
  radius: number;
  pulse: number;
  spawnCooldown: number;
  maxSpawnCooldown: number;
  type: 'standard' | 'fire' | 'acid';
  hp?: number;
  maxHp?: number;
  destroyedTime?: number;
}

export interface InteractivePod {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: 'nuke_bomb' | 'freeze_emp' | 'turret';
  pulse: number;
  hp?: number;
}

export interface Obstacle {
  id: number;
  type: 'buzzsaw' | 'laser' | 'acidPuddle' | 'spikeWall';
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  radius?: number;
  width?: number;
  height?: number;
  angle?: number;
  rotationSpeed?: number;
  state?: 'charging' | 'active' | 'cooling';
  timer?: number;
}

export interface SpeedPortal {
  id: number;
  x: number;
  y: number;
  radius: number;
  targetSpeed: SpeedMultiplier;
  active: boolean;
  angle: number;
  color: string;
  label: string;
}

export interface SugarCube {
  id: number;
  x: number;
  y: number;
  value: number;
  pulse: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'spark' | 'ring' | 'ant';
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
}

export type ChallengeType =
  | 'dodge_ants'
  | 'collect_sugar'
  | 'speed_portals'
  | 'beat_hard'
  | 'survive_free_mode'
  | 'score_milestone';

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  targetCount: number;
  rewardPts: number;
  rewardSugar: number;
  iconName: string;
}

export interface DailyChallengeProgress {
  date: string; // YYYY-MM-DD
  progress: Record<string, number>;
  completed: Record<string, boolean>;
  claimed: Record<string, boolean>;
}

export interface PlayerProfile {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  active_skin: string;
  unlocked_skins: string[];
  sugar_cubes: number;
  high_scores: Record<string, number>;
  beaten_levels?: number[];
  level_progress?: Record<string | number, number>;
  bonus_pts?: number;
  daily_challenges?: DailyChallengeProgress;
  created_at?: string;
}
