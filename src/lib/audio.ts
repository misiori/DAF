import { SpeedMultiplier } from '../types/game';
import { SONG_CATALOG, getSongById } from './songCatalog';

// Professional Web Audio Rhythm Synthesizer
// 23 distinct, structurally evolving compositions for all 23 official farms & custom editor levels.
// Features clock-accurate lookahead scheduling, distinct musical keys, multi-bar culmination drops,
// quiet and calm menu audio, and real-time beat pulse synchronization for GameCanvas.
class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private menuGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Master Stereo Space Echo / Delay bus
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;
  private delaySendGain: GainNode | null = null;

  // Clock-accurate Lookahead Scheduler (Sub-millisecond precision)
  private isPlayingBgm: boolean = false;
  private currentBpm: number = 128;
  private speedMultiplier: SpeedMultiplier = 1.0;
  private currentLevelId: number = 1;
  private scheduleTimerId: number | null = null;
  private nextNoteTime: number = 0;
  private bgmStartTime: number = 0;
  private currentQuarterDuration: number = 60 / 128;

  // Editor Preview State
  private previewingSongId: number | null = null;
  private isPreviewPlaying: boolean = false;

  // Menu BGM State (Ultra-Calm, Soft, Cozy)
  private isPlayingMenuBgm: boolean = false;
  private menuTimerId: number | null = null;
  private nextMenuNoteTime: number = 0;
  private menuStartTime: number = 0;

  public init() {
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        // Master Output
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // BGM Bus (Dynamic level music)
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(0.70, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        // Menu Bus (Extra quiet, gentle, relaxing atmosphere)
        this.menuGain = this.ctx.createGain();
        this.menuGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        this.menuGain.connect(this.masterGain);

        // SFX Bus
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        // Space Delay / Tape Echo
        this.delayNode = this.ctx.createDelay(1.5);
        this.delayNode.delayTime.setValueAtTime(0.24, this.ctx.currentTime);

        this.delayFeedbackGain = this.ctx.createGain();
        this.delayFeedbackGain.gain.setValueAtTime(0.28, this.ctx.currentTime);

        this.delayFilter = this.ctx.createBiquadFilter();
        this.delayFilter.type = 'lowpass';
        this.delayFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);

        this.delaySendGain = this.ctx.createGain();
        this.delaySendGain.gain.setValueAtTime(0.32, this.ctx.currentTime);

        this.delayNode.connect(this.delayFilter);
        this.delayFilter.connect(this.delayFeedbackGain);
        this.delayFeedbackGain.connect(this.delayNode);

        this.delayFilter.connect(this.delaySendGain);
        this.delaySendGain.connect(this.bgmGain);
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio init caught:', e);
    }
  }

  // Explicit user gesture unlock for iOS Safari / Mobile
  public unlockAudio() {
    this.init();
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start(0);
    } catch (e) {
      // ignore
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setSpeedMultiplier(mult: SpeedMultiplier) {
    if (this.speedMultiplier === mult) return;
    if (this.ctx && this.isPlayingBgm) {
      const now = this.ctx.currentTime;
      const oldEffectiveBpm = Math.max(60, this.currentBpm * this.speedMultiplier);
      const oldQuarterDuration = 60 / oldEffectiveBpm;
      const elapsedBeats = Math.max(0, (now - this.bgmStartTime) / oldQuarterDuration);

      this.speedMultiplier = mult;
      this.updateQuarterDuration();

      const newEffectiveBpm = Math.max(60, this.currentBpm * this.speedMultiplier);
      const newQuarterDuration = 60 / newEffectiveBpm;
      // Maintain continuous beat phase across speed portals
      this.bgmStartTime = now - elapsedBeats * newQuarterDuration;
      this.nextNoteTime = Math.max(now, this.nextNoteTime);
    } else {
      this.speedMultiplier = mult;
      this.updateQuarterDuration();
    }
    this.playPortalSound(mult);
  }

  private updateQuarterDuration() {
    const effectiveBpm = Math.max(60, this.currentBpm * this.speedMultiplier);
    this.currentQuarterDuration = 60 / effectiveBpm;
  }

  // ==============================================================
  // RHYTHM SYNCHRONIZATION API (For GameCanvas & Anthills)
  // ==============================================================
  public getBeatPulse(): number {
    if (!this.ctx || !this.isPlayingBgm) return 0;
    const now = this.ctx.currentTime;
    if (now < this.bgmStartTime) return 0;

    const quarterDuration = this.currentQuarterDuration;
    const elapsed = now - this.bgmStartTime;
    const beatFraction = (elapsed / quarterDuration) % 1.0;

    // Fast snappy attack on downbeat (fraction 0.0), exponential decay
    if (beatFraction < 0.35) {
      const p = beatFraction / 0.35;
      return Math.pow(1 - p, 2.2);
    }
    return 0;
  }

  public getBeatProgress(): number {
    if (!this.ctx || !this.isPlayingBgm) return 0;
    const now = this.ctx.currentTime;
    if (now < this.bgmStartTime) return 0;
    return ((now - this.bgmStartTime) / this.currentQuarterDuration) % 1.0;
  }

  public getBeatCounter(): number {
    if (!this.ctx || !this.isPlayingBgm) return 0;
    const now = this.ctx.currentTime;
    if (now < this.bgmStartTime) return 0;
    return Math.floor((now - this.bgmStartTime) / this.currentQuarterDuration);
  }

  public getEffectiveBpm(): number {
    return this.currentBpm * this.speedMultiplier;
  }

  // ==============================================================
  // 1. IN-GAME LEVEL BGM (23 Unique Evolving Compositions)
  // ==============================================================
  public startLevelBgm(levelId: number = 1, customBpm?: number, _songUrl?: string) {
    this.init();
    this.stopMenuBgm();
    this.stopPreview();
    this.stopBgm();

    // Map song ID strictly to valid range 1–23
    let normalizedSongId = Math.floor(levelId);
    if (normalizedSongId < 1 || normalizedSongId > 23) {
      normalizedSongId = ((Math.abs(normalizedSongId) - 1) % 23) + 1;
    }

    const song = getSongById(normalizedSongId);
    this.currentLevelId = normalizedSongId;
    this.currentBpm = customBpm || song.bpm || 128;
    this.updateQuarterDuration();
    this.isPlayingBgm = true;

    if (this.ctx) {
      this.bgmStartTime = this.ctx.currentTime + 0.02;
      this.nextNoteTime = this.bgmStartTime;
    }

    this.runScheduler();
  }

  public stopBgm() {
    this.isPlayingBgm = false;
    if (this.scheduleTimerId !== null) {
      window.clearInterval(this.scheduleTimerId);
      this.scheduleTimerId = null;
    }
  }

  // Web Audio Lookahead Engine: 25ms interval, 120ms lookahead
  private runScheduler() {
    if (this.scheduleTimerId !== null) {
      window.clearInterval(this.scheduleTimerId);
    }

    const scheduleAheadTime = 0.12;

    this.scheduleTimerId = window.setInterval(() => {
      if (!this.isPlayingBgm || !this.ctx) return;

      const effectiveBpm = Math.max(60, this.currentBpm * this.speedMultiplier);
      const sixteenthTime = (60 / effectiveBpm) / 4;

      while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
        // 16-bar cyclical structure (256 sixteenth steps total)
        // Bars 0-3: Intro/Groove
        // Bars 4-7: Tension/Build
        // Bars 8-11: Riser / Pre-Drop Roll
        // Bars 12-15: CULMINATION / DROP / CLIMAX!
        const rawStep = Math.max(0, Math.round((this.nextNoteTime - this.bgmStartTime) / sixteenthTime));
        const step = rawStep % 256;

        this.scheduleSongStep(step, this.nextNoteTime, this.currentLevelId);
        this.nextNoteTime += sixteenthTime;
      }
    }, 25);
  }

  // Master Step Sequencer: 16-bar evolving structure per song
  private scheduleSongStep(step: number, time: number, songId: number) {
    if (this.isMuted) return;

    const beatInBar = step % 16;
    const bar = Math.floor(step / 16) % 16;

    // Structural Form:
    // 0: Intro / Verse (Bars 0-3)
    // 1: Theme & Build (Bars 4-7)
    // 2: Pre-Drop Riser (Bars 8-11)
    // 3: CULMINATION / DROP (Bars 12-15)
    const sectionIndex = Math.floor(bar / 4);
    const isCulmination = sectionIndex === 3;
    const isRiser = sectionIndex === 2;

    // 1. CHORD HARMONY PADS (On bar downbeats)
    if (beatInBar === 0 && sectionIndex !== 2) {
      const chords = this.getSongChord(songId, bar);
      const barDuration = (60 / Math.max(60, this.currentBpm * this.speedMultiplier)) * 4;
      const padVol = isCulmination ? 0.12 : 0.08;
      this.playSynthPad(time, chords, barDuration * 0.95, padVol);
    }

    // 2. DRUMS & PERCUSSION
    this.scheduleDrums(time, songId, bar, beatInBar, isCulmination, isRiser);

    // 3. BASSLINE
    if (beatInBar % 2 === 0 || (isCulmination && (beatInBar === 3 || beatInBar === 11))) {
      const bassPitch = this.getSongBassPitch(songId, bar, beatInBar);
      const isKickTime = beatInBar === 0 || beatInBar === 4 || beatInBar === 8 || beatInBar === 12;
      this.playPumpingBass(time, bassPitch, isKickTime, isCulmination);
    }

    // 4. MELODIC LEAD HOOK
    const leadPitch = this.getSongLeadPitch(songId, bar, beatInBar, isCulmination);
    if (leadPitch > 0) {
      const leadVol = isCulmination ? 0.16 : 0.12;
      this.playSynthLead(time, leadPitch, leadVol, isCulmination);
    }
  }

  // --- Drum Arrangement per Song & Section ---
  private scheduleDrums(
    time: number,
    songId: number,
    bar: number,
    beat: number,
    isCulmination: boolean,
    isRiser: boolean
  ) {
    // 1. Kick Drum
    let isKick = false;

    // Specialized drum patterns
    if (songId === 9) {
      // Glitch hop / Half-time boom
      isKick = beat === 0 || beat === 10 || (isCulmination && beat === 6);
    } else if (songId === 13 || songId === 18) {
      // Drum & Bass roller
      isKick = beat === 0 || beat === 10 || (isCulmination && (beat === 2 || beat === 8));
    } else if (songId === 8 || songId === 16) {
      // Tech-trance / Psytrance driving gallop
      isKick = beat === 0 || beat === 4 || beat === 8 || beat === 12;
    } else {
      // Standard punchy 4-on-the-floor
      isKick = beat === 0 || beat === 4 || beat === 8 || beat === 12;
      if (isCulmination && (beat === 14 || (bar % 2 === 1 && beat === 10))) {
        isKick = true; // Syncopated kick accents in drop
      }
    }

    if (isKick && !isRiser) {
      this.playSynthKick(time, isCulmination ? 0.75 : 0.65);
    }

    // 2. Snare / Clap
    let isSnare = false;
    if (songId === 9) {
      // Glitch hop snare on 8
      isSnare = beat === 8;
    } else if (songId === 13 || songId === 18) {
      // DnB snare on 4 and 12
      isSnare = beat === 4 || beat === 12;
    } else if (isRiser) {
      // Snare roll build-up: 8th notes, then 16th notes in bar 11!
      if (bar === 11) isSnare = true;
      else isSnare = beat % 2 === 0;
    } else {
      isSnare = beat === 4 || beat === 12;
    }

    if (isSnare) {
      const snareVol = isRiser ? 0.2 + (beat / 16) * 0.25 : isCulmination ? 0.45 : 0.38;
      this.playSynthSnare(time, snareVol);
    }

    // 3. Hi-Hats
    if (beat % 2 === 0) {
      const isOpen = beat % 4 === 2;
      this.playSynthHat(time, isOpen, isOpen ? 0.08 : 0.05);
    } else if (isCulmination || songId >= 13) {
      // 16th driving ghost hats
      this.playSynthHat(time, false, 0.03);
    }
  }

  // --- 23 Unique Harmonic Chord Voicings ---
  private getSongChord(songId: number, bar: number): number[] {
    const barMod = bar % 4;

    switch (songId) {
      case 1: // First Steps (C Major: C - G - Am - F)
        return [
          [261.63, 329.63, 392.0, 523.25], // C
          [196.0, 246.94, 293.66, 392.0],  // G
          [220.0, 261.63, 329.63, 440.0],  // Am
          [174.61, 220.0, 261.63, 349.23], // F
        ][barMod];

      case 2: // Sunny Meadow (G Major: G - D - Em - C)
        return [
          [196.0, 246.94, 293.66, 392.0],  // G
          [146.83, 220.0, 293.66, 369.99], // D
          [164.81, 196.0, 246.94, 329.63], // Em
          [130.81, 164.81, 196.0, 261.63], // C
        ][barMod];

      case 3: // Pheromone Groove (D Minor: Dm7 - Gm7 - C7 - Fmaj7)
        return [
          [146.83, 220.0, 261.63, 349.23], // Dm7
          [196.0, 233.08, 293.66, 349.23], // Gm7
          [130.81, 196.0, 233.08, 261.63], // C7
          [174.61, 220.0, 261.63, 329.63], // Fmaj7
        ][barMod];

      case 4: // Cobblestone Run (A Minor: Am - Em - F - G)
        return [
          [220.0, 261.63, 329.63, 440.0],
          [164.81, 196.0, 246.94, 329.63],
          [174.61, 220.0, 261.63, 349.23],
          [196.0, 246.94, 293.66, 392.0],
        ][barMod];

      case 5: // High Noon Highway (F Major: F - C - Dm - Bb)
        return [
          [174.61, 220.0, 261.63, 349.23],
          [261.63, 329.63, 392.0, 523.25],
          [146.83, 220.0, 261.63, 349.23],
          [233.08, 293.66, 349.23, 466.16],
        ][barMod];

      case 6: // Neon Horizon (E Minor: Em - C - Am - D)
        return [
          [164.81, 246.94, 329.63, 392.0],
          [130.81, 261.63, 329.63, 392.0],
          [220.0, 261.63, 329.63, 440.0],
          [146.83, 220.0, 293.66, 369.99],
        ][barMod];

      case 7: // Subterranean Velocity (B Minor: Bm - G - A - F#m)
        return [
          [123.47, 184.99, 246.94, 293.66],
          [196.0, 246.94, 293.66, 392.0],
          [220.0, 277.18, 329.63, 440.0],
          [184.99, 220.0, 277.18, 369.99],
        ][barMod];

      case 8: // Desert Sandstorm (C Minor: Cm - Ab - Fm - G)
        return [
          [130.81, 196.0, 261.63, 311.13],
          [207.65, 261.63, 311.13, 415.3],
          [174.61, 207.65, 261.63, 349.23],
          [196.0, 246.94, 293.66, 392.0],
        ][barMod];

      case 9: // Electric Zenith (D Minor: Dm - Bb - C - A)
        return [
          [146.83, 220.0, 293.66, 349.23],
          [116.54, 233.08, 293.66, 349.23],
          [130.81, 196.0, 261.63, 329.63],
          [220.0, 277.18, 329.63, 440.0],
        ][barMod];

      case 10: // Crystal Reflections (F# Minor: F#m - D - A - E)
        return [
          [184.99, 277.18, 369.99, 440.0],
          [146.83, 293.66, 369.99, 440.0],
          [220.0, 277.18, 329.63, 440.0],
          [164.81, 246.94, 329.63, 392.0],
        ][barMod];

      case 11: // Deep Core (G Minor: Gm - Eb - Bb - F)
        return [
          [196.0, 233.08, 293.66, 392.0],
          [155.56, 233.08, 311.13, 392.0],
          [233.08, 293.66, 349.23, 466.16],
          [174.61, 220.0, 261.63, 349.23],
        ][barMod];

      case 12: // Chitin Steel (A Dorian: Am - D - F - G)
        return [
          [220.0, 261.63, 329.63, 440.0],
          [146.83, 220.0, 293.66, 369.99],
          [174.61, 220.0, 261.63, 349.23],
          [196.0, 246.94, 293.66, 392.0],
        ][barMod];

      case 13: // Against the Odds (E Minor DnB: Em - G - D - C)
        return [
          [164.81, 246.94, 329.63, 392.0],
          [196.0, 246.94, 293.66, 392.0],
          [146.83, 220.0, 293.66, 369.99],
          [130.81, 261.63, 329.63, 392.0],
        ][barMod];

      case 14: // Thermal Surge (C# Minor: C#m - A - E - B)
        return [
          [138.59, 207.65, 277.18, 329.63],
          [220.0, 277.18, 329.63, 440.0],
          [164.81, 246.94, 329.63, 392.0],
          [246.94, 293.66, 369.99, 493.88],
        ][barMod];

      case 15: // Emergency Protocol (F Minor: Fm - Db - Ab - Eb)
        return [
          [174.61, 207.65, 261.63, 349.23],
          [138.59, 207.65, 277.18, 349.23],
          [207.65, 261.63, 311.13, 415.3],
          [155.56, 233.08, 311.13, 392.0],
        ][barMod];

      case 16: // Acid Rain (D Phrygian: Dm - Eb - Cm - Dm)
        return [
          [146.83, 220.0, 293.66, 349.23],
          [155.56, 233.08, 311.13, 392.0],
          [130.81, 196.0, 261.63, 311.13],
          [146.83, 220.0, 293.66, 349.23],
        ][barMod];

      case 17: // Starlight Beacon (Bb Major: Bb - F - Gm - Eb)
        return [
          [233.08, 293.66, 349.23, 466.16],
          [174.61, 220.0, 261.63, 349.23],
          [196.0, 233.08, 293.66, 392.0],
          [155.56, 233.08, 311.13, 392.0],
        ][barMod];

      case 18: // Synaptic Voltage (F# Minor Neuro: F#m - E - D - C#)
        return [
          [184.99, 277.18, 369.99, 440.0],
          [164.81, 246.94, 329.63, 392.0],
          [146.83, 293.66, 369.99, 440.0],
          [138.59, 207.65, 277.18, 329.63],
        ][barMod];

      case 19: // Chrono Distortion (G# Minor: G#m - E - B - F#)
        return [
          [207.65, 246.94, 311.13, 415.3],
          [164.81, 246.94, 329.63, 392.0],
          [246.94, 293.66, 369.99, 493.88],
          [184.99, 277.18, 369.99, 440.0],
        ][barMod];

      case 20: // Genesis Protocol (C Minor Cyberpunk: Cm - Ab - Eb - Bb)
        return [
          [130.81, 196.0, 261.63, 311.13],
          [207.65, 261.63, 311.13, 415.3],
          [155.56, 233.08, 311.13, 392.0],
          [116.54, 233.08, 293.66, 349.23],
        ][barMod];

      case 21: // Colony Extinction (E Minor Speedcore: Em - C - G - D)
        return [
          [164.81, 246.94, 329.63, 392.0],
          [130.81, 261.63, 329.63, 392.0],
          [196.0, 246.94, 293.66, 392.0],
          [146.83, 220.0, 293.66, 369.99],
        ][barMod];

      case 22: // Singularity Gate (B Minor Rave: Bm - G - D - A)
        return [
          [123.47, 184.99, 246.94, 293.66],
          [196.0, 246.94, 293.66, 392.0],
          [146.83, 220.0, 293.66, 369.99],
          [220.0, 277.18, 329.63, 440.0],
        ][barMod];

      case 23: // Final Stand of the Farm (D Minor Boss: Dm - Bb - F - C)
      default:
        return [
          [146.83, 220.0, 293.66, 349.23],
          [116.54, 233.08, 293.66, 349.23],
          [174.61, 220.0, 261.63, 349.23],
          [130.81, 196.0, 261.63, 329.63],
        ][barMod];
    }
  }

  // --- 23 Unique Bass Pitches ---
  private getSongBassPitch(songId: number, bar: number, beat: number): number {
    const isUpbeat = beat === 2 || beat === 6 || beat === 10 || beat === 14;
    const barMod = bar % 4;

    // Roots for each song's 4-bar progression
    const rootsTable: Record<number, number[]> = {
      1: [65.41, 49.0, 55.0, 43.65],    // C, G, A, F
      2: [49.0, 36.71, 41.2, 32.7],     // G, D, E, C
      3: [36.71, 49.0, 32.7, 43.65],    // D, G, C, F
      4: [55.0, 41.2, 43.65, 49.0],     // A, E, F, G
      5: [43.65, 32.7, 36.71, 58.27],   // F, C, D, Bb
      6: [41.2, 32.7, 55.0, 36.71],     // E, C, A, D
      7: [61.74, 49.0, 55.0, 46.25],    // B, G, A, F#
      8: [32.7, 51.91, 43.65, 49.0],    // C, Ab, F, G
      9: [36.71, 58.27, 32.7, 55.0],    // D, Bb, C, A
      10: [46.25, 36.71, 55.0, 41.2],   // F#, D, A, E
      11: [49.0, 38.89, 58.27, 43.65],  // G, Eb, Bb, F
      12: [55.0, 36.71, 43.65, 49.0],   // A, D, F, G
      13: [41.2, 49.0, 36.71, 32.7],    // E, G, D, C
      14: [34.65, 55.0, 41.2, 61.74],   // C#, A, E, B
      15: [43.65, 34.65, 51.91, 38.89], // F, Db, Ab, Eb
      16: [36.71, 38.89, 32.7, 36.71],  // D, Eb, C, D
      17: [58.27, 43.65, 49.0, 38.89],  // Bb, F, G, Eb
      18: [46.25, 41.2, 36.71, 34.65],  // F#, E, D, C#
      19: [51.91, 41.2, 61.74, 46.25],  // G#, E, B, F#
      20: [32.7, 51.91, 38.89, 58.27],  // C, Ab, Eb, Bb
      21: [41.2, 32.7, 49.0, 36.71],    // E, C, G, D
      22: [61.74, 49.0, 36.71, 55.0],   // B, G, D, A
      23: [36.71, 58.27, 43.65, 32.7],  // D, Bb, F, C
    };

    const roots = rootsTable[songId] || [55.0, 43.65, 65.41, 49.0];
    const root = roots[barMod];
    return root * (isUpbeat ? 2.0 : 1.0);
  }

  // --- 23 Unique Melodic Lead Hooks (Harmonized per Song) ---
  private getSongLeadPitch(songId: number, bar: number, beat: number, isCulmination: boolean): number {
    const barMod = bar % 4;

    // Rhythmic pattern: syncopated groove in verse, high-density arps in culmination
    const regularSteps: Record<number, number> = {
      0: 0,
      3: 1,
      6: 2,
      8: 3,
      11: 4,
      14: 5,
    };

    const culminationSteps: Record<number, number> = {
      0: 0,
      1: 1,
      2: 2,
      4: 3,
      6: 4,
      7: 3,
      8: 5,
      10: 6,
      12: 5,
      14: 7,
    };

    const pattern = isCulmination ? culminationSteps : regularSteps;
    if (pattern[beat] === undefined) return 0;
    const noteIdx = pattern[beat];

    // Scales mapped to song keys
    const baseFreqs: Record<number, number[]> = {
      1: [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5], // C Major
      2: [392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99],   // G Major
      3: [587.33, 659.25, 698.46, 783.99, 880.0, 932.33, 1046.5, 1174.66], // D Minor
      4: [440.0, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.0],   // A Minor
      5: [349.23, 392.0, 440.0, 466.16, 523.25, 587.33, 659.25, 698.46],   // F Major
      6: [659.25, 739.99, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51], // E Minor
      7: [493.88, 554.37, 587.33, 659.25, 739.99, 783.99, 880.0, 987.77], // B Minor
      8: [523.25, 587.33, 622.25, 698.46, 783.99, 830.61, 932.33, 1046.5], // C Minor
      9: [587.33, 698.46, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1396.91], // D Minor Glitch
      10: [739.99, 830.61, 880.0, 987.77, 1108.73, 1174.66, 1318.51, 1479.98], // F# Minor Future
      11: [392.0, 440.0, 466.16, 523.25, 587.33, 622.25, 698.46, 783.99],   // G Minor Darkwave
      12: [440.0, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99, 880.0],   // A Dorian
      13: [659.25, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51, 1567.98], // E Minor DnB
      14: [554.37, 622.25, 659.25, 739.99, 830.61, 880.0, 987.77, 1108.73], // C# Minor Dark
      15: [698.46, 783.99, 830.61, 932.33, 1046.5, 1108.73, 1244.51, 1396.91], // F Minor Hard
      16: [587.33, 622.25, 698.46, 783.99, 880.0, 932.33, 1046.5, 1174.66], // D Phrygian Psy
      17: [466.16, 523.25, 587.33, 622.25, 698.46, 783.99, 880.0, 932.33], // Bb Major Rave
      18: [739.99, 830.61, 880.0, 987.77, 1108.73, 1174.66, 1318.51, 1479.98], // F# Minor Neuro
      19: [830.61, 932.33, 987.77, 1108.73, 1244.51, 1318.51, 1479.98, 1661.22], // G# Minor Glitch
      20: [523.25, 587.33, 622.25, 698.46, 783.99, 830.61, 932.33, 1046.5], // C Minor Symphonic
      21: [659.25, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51, 1567.98], // E Minor Speed
      22: [493.88, 587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51], // B Minor 8-bit
      23: [587.33, 698.46, 783.99, 880.0, 1046.5, 1174.66, 1396.91, 1567.98], // D Minor Boss Climax
    };

    const scale = baseFreqs[songId] || baseFreqs[23];
    const pitch = scale[noteIdx % scale.length];
    return pitch * (barMod === 3 ? 1.12 : 1.0);
  }

  // ==============================================================
  // 2. LEVEL EDITOR PREVIEW MODE
  // ==============================================================
  public previewTrack(songId: number) {
    this.init();
    if (this.isPreviewPlaying && this.previewingSongId === songId) {
      this.stopPreview();
      return;
    }

    this.stopPreview();
    this.stopBgm();
    this.stopMenuBgm();

    this.previewingSongId = songId;
    this.isPreviewPlaying = true;
    const song = getSongById(songId);

    // Start preview directly at the start of the culmination drop for instant gratification!
    this.currentLevelId = songId;
    this.currentBpm = song.bpm;
    this.updateQuarterDuration();
    this.isPlayingBgm = true;

    if (this.ctx) {
      this.bgmStartTime = this.ctx.currentTime + 0.02;
      this.nextNoteTime = this.bgmStartTime;
    }

    this.runScheduler();
  }

  public stopPreview() {
    this.previewingSongId = null;
    this.isPreviewPlaying = false;
    this.stopBgm();
  }

  public isTrackPreviewing(songId?: number): boolean {
    if (songId === undefined) return this.isPreviewPlaying;
    return this.isPreviewPlaying && this.previewingSongId === songId;
  }

  public getPreviewingSongId(): number | null {
    return this.previewingSongId;
  }

  // ==============================================================
  // 3. ULTRA-CALM, QUIET MENU BGM (Peaceful Ambient Lounge)
  // ==============================================================
  public startMenuBgm() {
    this.init();
    if (this.isPlayingMenuBgm) return;
    this.stopBgm();
    this.stopPreview();

    this.isPlayingMenuBgm = true;

    if (this.ctx) {
      this.menuStartTime = this.ctx.currentTime + 0.02;
      this.nextMenuNoteTime = this.menuStartTime;
    }

    if (this.menuTimerId !== null) {
      window.clearInterval(this.menuTimerId);
    }

    const menuBpm = 96; // Calm, unhurried tempo
    const sixteenthTime = (60 / menuBpm) / 4;

    this.menuTimerId = window.setInterval(() => {
      if (!this.isPlayingMenuBgm || !this.ctx) return;

      while (this.nextMenuNoteTime < this.ctx.currentTime + 0.12) {
        const rawStep = Math.max(0, Math.round((this.nextMenuNoteTime - this.menuStartTime) / sixteenthTime));
        const step = rawStep % 64;

        this.scheduleCalmMenuStep(step, this.nextMenuNoteTime);
        this.nextMenuNoteTime += sixteenthTime;
      }
    }, 30);
  }

  public stopMenuBgm() {
    this.isPlayingMenuBgm = false;
    if (this.menuTimerId !== null) {
      window.clearInterval(this.menuTimerId);
      this.menuTimerId = null;
    }
  }

  // Ultra-quiet, calm, gentle ambient chords & chimes (Zero aggressive kicks/drums)
  private scheduleCalmMenuStep(step: number, time: number) {
    if (this.isMuted) return;

    const beat = step % 16;
    const bar = Math.floor(step / 16) % 4;

    // Soft warm electric piano pad chords on measure downbeats (Fmaj9 -> Em7 -> Dm9 -> Cmaj7)
    if (beat === 0) {
      const calmChords = [
        [174.61, 261.63, 329.63, 392.0], // Fmaj9
        [164.81, 246.94, 293.66, 392.0], // Em7
        [146.83, 220.0, 261.63, 329.63], // Dm9
        [130.81, 196.0, 246.94, 329.63], // Cmaj7
      ];
      this.playCalmMenuPad(time, calmChords[bar], 2.4);
    }

    // Ethereal music box chime plucks on gentle syncopated beats
    if (beat === 3 || beat === 7 || beat === 11 || beat === 14) {
      const chimeChords = [
        [440.0, 659.25], // A4, E5
        [392.0, 587.33], // G4, D5
        [349.23, 523.25], // F4, C5
        [329.63, 493.88], // E4, B4
      ];
      chimeChords[bar].forEach((freq) => {
        this.playCalmChime(time, freq);
      });
    }

    // Subtle gentle warm sub-pulse (soothing and low, no sharp click)
    if (beat === 0 || beat === 8) {
      const subNotes = [87.31, 82.41, 73.42, 65.41];
      this.playCalmSubBass(time, subNotes[bar]);
    }
  }

  // ==============================================================
  // SYNTHESIZER VOICES (Punchy Level Instruments & Calm Menu Tones)
  // ==============================================================

  // 1. WARM ANALOG PAD SYNTH
  private playSynthPad(time: number, chordFreqs: number[], duration: number, volume: number = 0.08) {
    if (!this.ctx || !this.bgmGain) return;

    chordFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.003, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, time);
      filter.frequency.exponentialRampToValueAtTime(1400, time + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(800, time + duration);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.15);
      gain.gain.setValueAtTime(volume, time + duration * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(time);
      osc2.start(time);
      osc.stop(time + duration + 0.05);
      osc2.stop(time + duration + 0.05);
    });
  }

  // 2. PUNCHY 909 KICK
  private playSynthKick(time: number, volume: number = 0.68) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(185, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.07);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.22);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  // 3. CRISP ELECTRONIC SNARE
  private playSynthSnare(time: number, volume: number = 0.40) {
    if (!this.ctx || !this.bgmGain) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.1);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.32));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1900, time);
    filter.Q.setValueAtTime(1.6, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.bgmGain);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(88, time + 0.08);

    oscGain.gain.setValueAtTime(volume * 0.75, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.bgmGain);

    noise.start(time);
    osc.start(time);
    noise.stop(time + 0.14);
    osc.stop(time + 0.1);
  }

  // 4. HI-HATS
  private playSynthHat(time: number, isOpen: boolean = false, volume: number = 0.06) {
    if (!this.ctx || !this.bgmGain) return;

    const dur = isOpen ? 0.13 : 0.045;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7600, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * (isOpen ? 1.3 : 1.0), time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  // 5. SIDECHAIN PUMPING SYNTH BASS
  private playPumpingBass(time: number, freq: number, sidechainDuck: boolean = false, isCulmination: boolean = false) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    subOsc.type = 'square';
    subOsc.frequency.setValueAtTime(freq * 0.5, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(isCulmination ? 4.2 : 3.0, time);
    filter.frequency.setValueAtTime(sidechainDuck ? 350 : (isCulmination ? 1100 : 900), time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.18);

    const baseVol = isCulmination ? 0.32 : 0.26;
    if (sidechainDuck) {
      gain.gain.setValueAtTime(baseVol * 0.32, time);
      gain.gain.linearRampToValueAtTime(baseVol, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    } else {
      gain.gain.setValueAtTime(baseVol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    }

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    subOsc.start(time);
    osc.stop(time + 0.24);
    subOsc.stop(time + 0.24);
  }

  // 6. CATCHY ELECTRONIC LEAD HOOK
  private playSynthLead(time: number, freq: number, volume: number = 0.13, isCulmination: boolean = false) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(freq * 1.004, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isCulmination ? 3400 : 2600, time);
    filter.frequency.exponentialRampToValueAtTime(800, time + 0.18);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (isCulmination ? 0.22 : 0.18));

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);

    gain.connect(this.bgmGain);
    if (this.delayNode) {
      gain.connect(this.delayNode);
    }

    osc.start(time);
    osc2.start(time);
    osc.stop(time + 0.24);
    osc2.stop(time + 0.24);
  }

  // 7. CALM MENU VOICES (Super gentle, relaxing)
  private playCalmMenuPad(time: number, chordFreqs: number[], duration: number) {
    if (!this.ctx || !this.menuGain) return;

    chordFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sine'; // pure, mellow sine tones
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.04, time + 0.35); // very soft attack
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.menuGain!);

      osc.start(time);
      osc.stop(time + duration + 0.1);
    });
  }

  private playCalmChime(time: number, freq: number) {
    if (!this.ctx || !this.menuGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.025, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);

    osc.connect(gain);
    gain.connect(this.menuGain);
    if (this.delayNode) {
      gain.connect(this.delayNode);
    }

    osc.start(time);
    osc.stop(time + 0.5);
  }

  private playCalmSubBass(time: number, freq: number) {
    if (!this.ctx || !this.menuGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.06, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

    osc.connect(gain);
    gain.connect(this.menuGain);

    osc.start(time);
    osc.stop(time + 0.65);
  }

  // ==============================================================
  // SFX METHODS
  // ==============================================================
  public playNearMiss() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playSugarCollect() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1320, now + 0.06);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playPortalSound(multiplier: SpeedMultiplier) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const targetFreq = multiplier === 0.5 ? 260 : multiplier === 1 ? 523 : multiplier === 1.5 ? 784 : 1046;
    osc.frequency.setValueAtTime(multiplier > 1 ? 350 : 800, now);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.22);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playHitSound() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playVictory() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.3, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.38);
    });
  }

  public playClick() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.035);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playExplosion() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.32);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playZap() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playPowerUpSound() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.25, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.16);
    });
  }

  public playEmp() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.32);
  }
}

export const sound = new SoundSystem();
