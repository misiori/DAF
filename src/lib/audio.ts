import { SpeedMultiplier } from '../types/game';

// Professional Web Audio Rhythm Synthesizer
// Clock-accurate lookahead scheduler, punchy 909 beats, lush analog chord pads,
// sidechained pumping bass, and real-time beat pulse synchronization for GameCanvas.
class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Master Stereo Space Echo / Delay bus
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;
  private delaySendGain: GainNode | null = null;

  // Clock-accurate Lookahead Scheduler (Zero Drift, Sub-millisecond precision)
  private isPlayingBgm: boolean = false;
  private currentBpm: number = 130;
  private speedMultiplier: SpeedMultiplier = 1.0;
  private currentLevelId: number = 1;
  private scheduleTimerId: number | null = null;
  private nextNoteTime: number = 0;
  private bgmStartTime: number = 0;
  private currentQuarterDuration: number = 60 / 130;

  // Menu BGM State
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

        // BGM Bus
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(0.72, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        // SFX Bus
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.78, this.ctx.currentTime);
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
      // Maintain continuous beat phase across speed changes
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

  // Preview stub
  public previewTrack(_url: string) {
    this.stopPreview();
  }

  public stopPreview() {}

  // ==============================================================
  // RHYTHM SYNCHRONIZATION API (Exposed for GameCanvas & Anthills)
  // ==============================================================
  // Returns smooth 1.0 -> 0.0 exponential decay pulse that hits 1.0 EXACTLY on the quarter beat / kick drum
  public getBeatPulse(): number {
    if (!this.ctx || !this.isPlayingBgm) return 0;
    const now = this.ctx.currentTime;
    if (now < this.bgmStartTime) return 0;

    const quarterDuration = this.currentQuarterDuration;
    const elapsed = now - this.bgmStartTime;
    const beatFraction = (elapsed / quarterDuration) % 1.0;

    // Fast snappy attack on downbeat (fraction 0.0), exponential decay within the first 35% of the beat
    if (beatFraction < 0.35) {
      const p = beatFraction / 0.35;
      return Math.pow(1 - p, 2.2);
    }
    return 0;
  }

  // Returns continuous 0.0 -> 1.0 progress through current quarter note beat
  public getBeatProgress(): number {
    if (!this.ctx || !this.isPlayingBgm) return 0;
    const now = this.ctx.currentTime;
    if (now < this.bgmStartTime) return 0;
    return ((now - this.bgmStartTime) / this.currentQuarterDuration) % 1.0;
  }

  // Returns total integer quarter note beat counter
  public getBeatCounter(): number {
    if (!this.ctx || !this.isPlayingBgm) return 0;
    const now = this.ctx.currentTime;
    if (now < this.bgmStartTime) return 0;
    return Math.floor((now - this.bgmStartTime) / this.currentQuarterDuration);
  }

  // Returns current effective BPM
  public getEffectiveBpm(): number {
    return this.currentBpm * this.speedMultiplier;
  }

  // ==============================================================
  // 1. IN-GAME LEVEL BGM (Punchy Electronic Rhythm Beats)
  // ==============================================================
  public startLevelBgm(levelId: number = 1, bpm: number = 130, _songUrl?: string) {
    this.init();
    this.stopMenuBgm();
    this.stopBgm();

    this.currentLevelId = levelId || 1;
    this.currentBpm = bpm || 130;
    this.updateQuarterDuration();
    this.isPlayingBgm = true;

    if (this.ctx) {
      // Clean start exactly 20ms in the future to avoid any render glitch
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

  // Web Audio Lookahead Engine: runs every 25ms, schedules ahead by 120ms
  // Zero drift, rock-solid sub-millisecond sync with the browser audio clock!
  private runScheduler() {
    if (this.scheduleTimerId !== null) {
      window.clearInterval(this.scheduleTimerId);
    }

    const scheduleAheadTime = 0.12; // 120ms lookahead window

    this.scheduleTimerId = window.setInterval(() => {
      if (!this.isPlayingBgm || !this.ctx) return;

      const effectiveBpm = Math.max(60, this.currentBpm * this.speedMultiplier);
      const sixteenthTime = (60 / effectiveBpm) / 4;

      while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
        // Absolute step index derived from musical time from bgmStartTime
        const rawStep = Math.max(0, Math.round((this.nextNoteTime - this.bgmStartTime) / sixteenthTime));
        const step = rawStep % 64; // 4-bar loop (16 steps per bar)

        this.scheduleLevelStep(step, this.nextNoteTime, this.currentLevelId);

        this.nextNoteTime += sixteenthTime;
      }
    }, 25);
  }

  // Step Sequencer: 16 steps per bar, 4 bars total loop (64 steps)
  private scheduleLevelStep(step: number, time: number, levelId: number) {
    if (this.isMuted) return;

    const beatInBar = step % 16;
    const bar = Math.floor(step / 16) % 4;

    // 1. WARM ANALOG PAD / CHORD BED (On the downbeat of each bar)
    if (beatInBar === 0) {
      const chords = this.getBarChords(levelId, bar);
      const barDuration = (60 / Math.max(60, this.currentBpm * this.speedMultiplier)) * 4;
      this.playSynthPad(time, chords, barDuration * 0.95);
    }

    // 2. PUNCHY 909 KICK (On quarter beats 0, 4, 8, 12, plus rhythmic syncopations)
    const isKick =
      beatInBar === 0 ||
      beatInBar === 4 ||
      beatInBar === 8 ||
      beatInBar === 12 ||
      (levelId >= 7 && (beatInBar === 14 || (bar === 3 && beatInBar === 10)));

    if (isKick) {
      this.playSynthKick(time);
    }

    // 3. CRISP ELECTRONIC SNARE / CLAP (Backbeats 4 and 12)
    if (beatInBar === 4 || beatInBar === 12) {
      this.playSynthSnare(time);
    }

    // 4. HI-HATS (16th-note rolling groove with offbeat open hats)
    if (beatInBar % 2 === 0) {
      const isOpen = beatInBar % 4 === 2;
      this.playSynthHat(time, isOpen, isOpen ? 0.09 : 0.06);
    } else if (levelId >= 5) {
      // Driving 16th ghost hats
      this.playSynthHat(time, false, 0.03);
    }

    // 5. PUMPING SIDECHAINED SYNTH BASS (Sawtooth + Sub-Sine ducked on the kick)
    if (beatInBar % 2 === 0 || beatInBar === 3 || beatInBar === 11) {
      const bassFreq = this.getBassPitch(levelId, bar, beatInBar);
      this.playPumpingBass(time, bassFreq, isKick);
    }

    // 6. CATCHY ELECTRONIC HOOK LEAD (Syncopated, musical, harmonized)
    const melodyNote = this.getHookMelodyPitch(levelId, bar, beatInBar);
    if (melodyNote > 0) {
      this.playSynthLead(time, melodyNote);
    }
  }

  // --- Harmonically Rich Chord Progressions per Difficulty/Theme ---
  private getBarChords(levelId: number, bar: number): number[] {
    if (levelId <= 4) {
      // Uplifting Synthwave in A Minor (Am9 -> Fmaj7 -> Cmaj7 -> Gsus4)
      const progression = [
        [220.0, 261.63, 329.63, 493.88], // A3, C4, E4, B4 (Am9)
        [174.61, 261.63, 329.63, 349.23], // F3, C4, E4, F4 (Fmaj7)
        [261.63, 329.63, 392.0, 493.88],  // C4, E4, G4, B4 (Cmaj7)
        [196.0, 261.63, 293.66, 392.0],   // G3, C4, D4, G4 (Gsus4)
      ];
      return progression[bar % 4];
    } else if (levelId <= 8) {
      // French House / Electro in D Minor (Dm9 -> Bbmaj7 -> Gm7 -> A7)
      const progression = [
        [146.83, 220.0, 261.63, 329.63], // D3, A3, C4, E4 (Dm9)
        [116.54, 233.08, 293.66, 349.23], // Bb2, Bb3, D4, F4 (Bbmaj7)
        [196.0, 233.08, 293.66, 349.23],  // G3, Bb3, D4, F4 (Gm7)
        [220.0, 277.18, 329.63, 392.0],   // A3, C#4, E4, G4 (A7)
      ];
      return progression[bar % 4];
    } else if (levelId <= 12) {
      // Cyberpunk Darkwave in E Minor (Em9 -> Cmaj7 -> G -> Bm7)
      const progression = [
        [164.81, 246.94, 329.63, 392.0],  // E3, B3, E4, G4 (Em)
        [130.81, 261.63, 329.63, 392.0],  // C3, C4, E4, G4 (Cmaj7)
        [196.0, 246.94, 293.66, 392.0],   // G3, B3, D4, G4 (G)
        [246.94, 293.66, 369.99, 440.0],  // B3, D4, F#4, A4 (Bm7)
      ];
      return progression[bar % 4];
    } else if (levelId <= 16) {
      // Fast Melodic Trance in F# Minor (F#m7 -> Dmaj7 -> A -> E)
      const progression = [
        [184.99, 277.18, 369.99, 440.0],  // F#3, C#4, F#4, A4
        [146.83, 293.66, 369.99, 440.0],  // D3, D4, F#4, A4
        [220.0, 277.18, 329.63, 440.0],   // A3, C#4, E4, A4
        [164.81, 246.94, 329.63, 392.0],  // E3, B3, E4, G#4
      ];
      return progression[bar % 4];
    } else if (levelId <= 20) {
      // High-Energy Electro in C Minor (Cm9 -> Abmaj7 -> Eb -> Bb)
      const progression = [
        [130.81, 196.0, 261.63, 311.13],  // C3, G3, C4, Eb4
        [207.65, 261.63, 311.13, 392.0],  // Ab3, C4, Eb4, G4
        [155.56, 233.08, 311.13, 392.0],  // Eb3, Bb3, Eb4, G4
        [116.54, 233.08, 293.66, 349.23], // Bb2, Bb3, D4, F4
      ];
      return progression[bar % 4];
    } else {
      // Overdrive Hyper Beat in B Minor (Bm -> G -> D -> A)
      const progression = [
        [123.47, 184.99, 246.94, 293.66], // B2, F#3, B3, D4
        [196.0, 246.94, 293.66, 369.99],  // G3, B3, D4, F#4
        [146.83, 220.0, 293.66, 369.99],  // D3, A3, D4, F#4
        [220.0, 277.18, 329.63, 440.0],   // A3, C#4, E4, A4
      ];
      return progression[bar % 4];
    }
  }

  // --- Bass Pitches ---
  private getBassPitch(levelId: number, bar: number, beat: number): number {
    const isUpbeat = beat === 2 || beat === 6 || beat === 10 || beat === 14;

    if (levelId <= 4) {
      const roots = [55.0, 43.65, 65.41, 49.0]; // A1, F1, C2, G1
      return roots[bar % 4] * (isUpbeat ? 2.0 : 1.0);
    } else if (levelId <= 8) {
      const roots = [73.42, 58.27, 49.0, 55.0]; // D2, Bb1, G1, A1
      return roots[bar % 4] * (isUpbeat ? 1.5 : 1.0);
    } else if (levelId <= 12) {
      const roots = [41.2, 32.7, 49.0, 61.74]; // E1, C1, G1, B1
      return roots[bar % 4] * (isUpbeat ? 2.0 : 1.0);
    } else if (levelId <= 16) {
      const roots = [46.25, 36.71, 55.0, 41.2]; // F#1, D1, A1, E1
      return roots[bar % 4] * (isUpbeat ? 2.0 : 1.0);
    } else if (levelId <= 20) {
      const roots = [32.7, 51.91, 38.89, 43.65]; // C1, Ab1, Eb1, Bb1
      return roots[bar % 4] * (isUpbeat ? 2.0 : 1.0);
    } else {
      const roots = [30.87, 49.0, 36.71, 55.0]; // B0, G1, D1, A1
      return roots[bar % 4] * (isUpbeat ? 2.0 : 1.0);
    }
  }

  // --- Catchy Melodic Hooks (Harmonized with Chord Progression) ---
  private getHookMelodyPitch(levelId: number, bar: number, beat: number): number {
    // Syncopated rhythm game lead pattern
    const activePattern: Record<number, number> = {
      0: 0,
      2: 1,
      4: 2,
      7: 3,
      8: 4,
      10: 3,
      12: 5,
      14: 6,
    };

    if (activePattern[beat] === undefined) return 0;
    const noteIdx = activePattern[beat];

    if (levelId <= 4) {
      // A Minor Melody Riff
      const scales: number[][] = [
        [440.0, 523.25, 659.25, 587.33, 659.25, 783.99, 880.0], // Over Am
        [349.23, 440.0, 523.25, 587.33, 659.25, 698.46, 880.0], // Over F
        [523.25, 587.33, 659.25, 783.99, 880.0, 987.77, 1046.5], // Over C
        [392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 880.0],  // Over G
      ];
      return scales[bar % 4][noteIdx % 7];
    } else if (levelId <= 8) {
      // D Minor French House Riff
      const scales: number[][] = [
        [587.33, 659.25, 698.46, 783.99, 880.0, 1046.5, 1174.66],
        [466.16, 587.33, 698.46, 783.99, 880.0, 932.33, 1046.5],
        [392.0, 466.16, 587.33, 698.46, 783.99, 880.0, 932.33],
        [440.0, 554.37, 659.25, 783.99, 880.0, 987.77, 1046.5],
      ];
      return scales[bar % 4][noteIdx % 7];
    } else if (levelId <= 12) {
      // E Minor Cyberpunk Arp
      const scales: number[][] = [
        [659.25, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51],
        [523.25, 659.25, 783.99, 880.0, 987.77, 1046.5, 1174.66],
        [392.0, 493.88, 587.33, 659.25, 783.99, 880.0, 987.77],
        [493.88, 587.33, 739.99, 880.0, 987.77, 1108.73, 1174.66],
      ];
      return scales[bar % 4][noteIdx % 7];
    } else {
      // High-octane Fast Lead
      const scale = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51];
      return scale[noteIdx % 7] * (bar % 2 === 1 ? 1.25 : 1.0);
    }
  }

  // ==============================================================
  // 2. STYLISH MENU BGM (Cozy Chill Electro-Groove)
  // ==============================================================
  public startMenuBgm() {
    this.init();
    if (this.isPlayingMenuBgm) return;
    this.stopBgm();

    this.isPlayingMenuBgm = true;

    if (this.ctx) {
      this.menuStartTime = this.ctx.currentTime + 0.02;
      this.nextMenuNoteTime = this.menuStartTime;
    }

    if (this.menuTimerId !== null) {
      window.clearInterval(this.menuTimerId);
    }

    const menuBpm = 108;
    const sixteenthTime = (60 / menuBpm) / 4;

    this.menuTimerId = window.setInterval(() => {
      if (!this.isPlayingMenuBgm || !this.ctx) return;

      while (this.nextMenuNoteTime < this.ctx.currentTime + 0.12) {
        const rawStep = Math.max(0, Math.round((this.nextMenuNoteTime - this.menuStartTime) / sixteenthTime));
        const step = rawStep % 64;

        this.scheduleMenuStep(step, this.nextMenuNoteTime);
        this.nextMenuNoteTime += sixteenthTime;
      }
    }, 25);
  }

  public stopMenuBgm() {
    this.isPlayingMenuBgm = false;
    if (this.menuTimerId !== null) {
      window.clearInterval(this.menuTimerId);
      this.menuTimerId = null;
    }
  }

  private scheduleMenuStep(step: number, time: number) {
    if (this.isMuted) return;

    const beat = step % 16;
    const bar = Math.floor(step / 16) % 4;

    // Cozy warm pad chords on each measure downbeat (Fmaj7 -> Em7 -> Dm7 -> Cmaj7)
    if (beat === 0) {
      const menuChords = [
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [164.81, 196.0, 246.94, 293.66], // Em7
        [146.83, 174.61, 220.0, 261.63], // Dm7
        [130.81, 164.81, 196.0, 246.94], // Cmaj7
      ];
      this.playSynthPad(time, menuChords[bar], 2.2, 0.08);
    }

    // Soft cozy kick on 0, 8, and syncopated 14
    if (beat === 0 || beat === 8 || (bar === 3 && beat === 14)) {
      this.playSynthKick(time, 0.45);
    }

    // Soft rim click on 4 and 12
    if (beat === 4 || beat === 12) {
      this.playSynthSnare(time, 0.22);
    }

    // Shuffling hi-hats on 8ths
    if (beat % 2 === 0) {
      this.playSynthHat(time, beat % 4 === 2, 0.04);
    }

    // Warm bassline
    if (beat === 0 || beat === 6 || beat === 8 || beat === 14) {
      const bassNotes = [87.31, 82.41, 73.42, 65.41]; // F, E, D, C
      this.playPumpingBass(time, bassNotes[bar], beat === 0 || beat === 8);
    }

    // Dreamy melodic chime stabs
    if (beat === 3 || beat === 7 || beat === 11 || beat === 14) {
      const melodyNotes = [
        [440.0, 523.25], // A4, C5
        [392.0, 493.88], // G4, B4
        [349.23, 440.0], // F4, A4
        [329.63, 392.0], // E4, G4
      ];
      melodyNotes[bar].forEach((freq) => {
        this.playSynthLead(time, freq, 0.07);
      });
    }
  }

  // ==============================================================
  // SYNTHESIZER VOICES (Punchy, Analog & Dynamic)
  // ==============================================================

  // 1. WARM ANALOG PAD SYNTH
  private playSynthPad(time: number, chordFreqs: number[], duration: number, volume: number = 0.09) {
    if (!this.ctx || !this.bgmGain) return;

    chordFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.003, time); // warm chorus detune

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, time);
      filter.frequency.exponentialRampToValueAtTime(1400, time + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(800, time + duration);

      // Gentle attack and slow fade
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

  // 2. PUNCHY 909-STYLE KICK DRUM
  private playSynthKick(time: number, volume: number = 0.68) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Pitch envelope: drops rapidly from 185Hz down to 48Hz (punchy chest thump)
    osc.frequency.setValueAtTime(185, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.07);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.22);

    // Amplitude envelope: instant punchy attack, tight decay
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  // 3. CRISP ELECTRONIC SNARE / CLAP
  private playSynthSnare(time: number, volume: number = 0.42) {
    if (!this.ctx || !this.bgmGain) return;

    // Noise layer for crisp snap
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

    // Tonal body layer for punch
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

  // 4. CLOSED & OPEN HI-HATS
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

  // 5. PUMPING SIDECHAIN SYNTH BASS (Sawtooth + Sub-Octave + Resonant Lowpass)
  private playPumpingBass(time: number, freq: number, sidechainDuck: boolean = false) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    subOsc.type = 'square';
    subOsc.frequency.setValueAtTime(freq * 0.5, time);

    // Resonant lowpass filter
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(3.2, time);
    filter.frequency.setValueAtTime(sidechainDuck ? 350 : 920, time);
    filter.frequency.exponentialRampToValueAtTime(220, time + 0.18);

    // Sidechain pumping: ducks down on kick drum, creating bouncy rhythm game feel
    const baseVol = 0.28;
    if (sidechainDuck) {
      gain.gain.setValueAtTime(baseVol * 0.35, time);
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

  // 6. CATCHY ELECTRONIC LEAD (Dual Saw/Square with Tape Delay Send)
  private playSynthLead(time: number, freq: number, volume: number = 0.13) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(freq * 1.004, time); // slight chorus detune

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, time);
    filter.frequency.exponentialRampToValueAtTime(900, time + 0.16);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);

    gain.connect(this.bgmGain);
    if (this.delayNode) {
      gain.connect(this.delayNode); // routed into echo delay
    }

    osc.start(time);
    osc2.start(time);
    osc.stop(time + 0.2);
    osc2.stop(time + 0.2);
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
