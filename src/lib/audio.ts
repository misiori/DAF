import { SpeedMultiplier } from '../types/game';

// Web Audio synthesizer with dynamic BPM, beat scheduler, and SFX
class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  private isPlayingBgm: boolean = false;
  private currentBpm: number = 130;
  private speedMultiplier: SpeedMultiplier = 1.0;
  private timerId: number | null = null;
  private step: number = 0;
  private currentLevelId: number = 1;

  // Cool Menu BGM state
  private isPlayingMenuBgm: boolean = false;
  private menuTimerId: number | null = null;
  private menuStep: number = 0;

  public init() {
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio init caught:', e);
    }
  }

  // Explicit gesture unlock for iOS Safari / iPhone 7
  public unlockAudio() {
    this.init();
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      // Play a short silent buffer to satisfy WebKit strict user gesture unlock
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
    this.speedMultiplier = mult;
    this.playPortalSound(mult);
  }

  // --- COOL MENU BGM ---
  public startMenuBgm() {
    this.init();
    if (this.isPlayingMenuBgm) return;
    this.stopBgm();
    this.isPlayingMenuBgm = true;
    this.menuStep = 0;
    this.scheduleNextMenuBeat();
  }

  public stopMenuBgm() {
    this.isPlayingMenuBgm = false;
    if (this.menuTimerId !== null) {
      window.clearTimeout(this.menuTimerId);
      this.menuTimerId = null;
    }
  }

  private scheduleNextMenuBeat() {
    if (!this.isPlayingMenuBgm || !this.ctx) return;
    const menuBpm = 118;
    const sixteenthInterval = (60 / menuBpm) / 4;

    this.playMenuStep(this.menuStep);
    this.menuStep = (this.menuStep + 1) % 64;

    this.menuTimerId = window.setTimeout(() => {
      this.scheduleNextMenuBeat();
    }, sixteenthInterval * 1000);
  }

  private playMenuStep(step: number) {
    if (!this.ctx || !this.bgmGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const beat = step % 16;

    // Atmospheric warm sub kick on beats 0, 8
    if (beat === 0 || beat === 8) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.18);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(now);
      osc.stop(now + 0.21);
    }

    // Soft cyber hi-hat on every offbeat
    if (beat % 2 === 0) {
      this.synthesizeHiHat(now, 0.03);
    }

    // Chilled blue synth bassline (D minor progression: D2 -> F2 -> C2 -> G1)
    if (beat % 4 === 0) {
      const bar = Math.floor(step / 16) % 4;
      const bassNotes = [73.42, 87.31, 65.41, 49.0];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassNotes[bar], now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + 0.25);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(now);
      osc.stop(now + 0.3);
    }

    // Melodic shimmering cyber arpeggio
    if (beat % 2 === 1) {
      const arps = [293.66, 349.23, 440.0, 523.25, 587.33, 440.0, 349.23, 392.0];
      const note = arps[step % arps.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(now);
      osc.stop(now + 0.13);
    }
  }

  // --- LEVEL IN-GAME BGM ---
  public startLevelBgm(levelId: number, bpm: number) {
    this.init();
    this.stopMenuBgm();
    this.stopBgm();
    this.currentLevelId = levelId;
    this.currentBpm = bpm;
    this.isPlayingBgm = true;
    this.step = 0;
    this.scheduleNextBeat();
  }

  public stopBgm() {
    this.isPlayingBgm = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleNextBeat() {
    if (!this.isPlayingBgm || !this.ctx) return;

    const effectiveBpm = this.currentBpm * this.speedMultiplier;
    // 16th note interval in seconds
    const sixteenthInterval = (60 / effectiveBpm) / 4;

    this.playStep(this.step, this.currentLevelId);
    this.step = (this.step + 1) % 64;

    this.timerId = window.setTimeout(() => {
      this.scheduleNextBeat();
    }, sixteenthInterval * 1000);
  }

  private playStep(step: number, levelId: number) {
    if (!this.ctx || !this.bgmGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const beat = step % 16;

    // 1. Kick Drum (on beats 0, 4, 8, 12, or dynamic rhythm patterns)
    if (beat % 4 === 0 || (levelId >= 3 && (beat === 10 || beat === 14))) {
      this.synthesizeKick(now);
    }

    // 2. Snare / Clap (on beats 4, 12)
    if (beat === 4 || beat === 12) {
      this.synthesizeSnare(now);
    }

    // 3. Hi-Hat (on every offbeat 2, 6, 10, 14, and 16ths in higher levels)
    if (beat % 2 === 0 || (levelId >= 4 && beat % 1 === 0)) {
      this.synthesizeHiHat(now, beat % 4 === 2 ? 0.08 : 0.04);
    }

    // 4. Bassline tailored to each song's key & vibe
    if (beat % 2 === 0) {
      const bassFreq = this.getBassNote(levelId, step);
      this.synthesizeBass(now, bassFreq);
    }

    // 5. Synth Arpeggio / Lead
    if (beat % 2 === 1 || beat % 4 === 3) {
      const leadFreq = this.getLeadNote(levelId, step);
      this.synthesizeLead(now, leadFreq);
    }
  }

  private getBassNote(levelId: number, step: number): number {
    const bar = Math.floor(step / 16) % 4;
    if (levelId <= 4) { // Easy
      const notes = [65.41, 98.0, 110.0, 87.31];
      return notes[bar];
    } else if (levelId <= 8) { // Normal
      const notes = [73.42, 87.31, 98.0, 58.27];
      return notes[bar];
    } else if (levelId <= 12) { // Hard
      const notes = [92.5, 110.0, 123.47, 69.3];
      return notes[bar];
    } else if (levelId <= 16) { // Harder
      const notes = [73.42, 77.78, 98.0, 87.31];
      return notes[bar];
    } else if (levelId <= 20) { // Insane
      const notes = [55.0, 65.41, 73.42, 87.31];
      return notes[bar];
    } else { // Crazy (21-23) & Free Mode (999)
      const notes = [41.2, 49.0, 58.27, 61.74];
      return notes[bar];
    }
  }

  private getLeadNote(levelId: number, step: number): number {
    const sub = step % 8;
    const baseMult = this.speedMultiplier >= 1.5 ? 1.25 : 1.0;
    if (levelId <= 4) {
      const freqs = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0];
      return freqs[sub] * baseMult;
    } else if (levelId <= 8) {
      const freqs = [293.66, 349.23, 440.0, 587.33, 523.25, 440.0, 349.23, 293.66];
      return freqs[sub] * baseMult;
    } else if (levelId <= 12) {
      const freqs = [369.99, 440.0, 493.88, 554.37, 739.99, 659.25, 554.37, 493.88];
      return freqs[sub] * baseMult;
    } else if (levelId <= 16) {
      const freqs = [293.66, 311.13, 392.0, 466.16, 587.33, 466.16, 392.0, 311.13];
      return freqs[sub] * baseMult;
    } else if (levelId <= 20) {
      const freqs = [440.0, 523.25, 659.25, 880.0, 783.99, 659.25, 587.33, 523.25];
      return freqs[sub] * baseMult;
    } else {
      // Crazy (21-23) & Free Mode: hyper cyberpunk leads
      const freqs = [493.88, 622.25, 739.99, 987.77, 880.0, 739.99, 622.25, 554.37];
      return freqs[sub] * baseMult;
    }
  }

  private synthesizeKick(time: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 * this.speedMultiplier, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);

    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  private synthesizeSnare(time: number) {
    if (!this.ctx || !this.bgmGain) return;

    // Noise buffer for snap
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.bgmGain);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.13);
  }

  private synthesizeHiHat(time: number, duration: number) {
    if (!this.ctx || !this.bgmGain) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.7;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    source.start(time);
    source.stop(time + duration + 0.01);
  }

  private synthesizeBass(time: number, freq: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * (this.speedMultiplier === 0.5 ? 0.8 : 1), time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + 0.15);

    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  private synthesizeLead(time: number, freq: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  // SFX Methods
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

    osc.type = 'sawtooth';
    const targetFreq = multiplier === 0.5 ? 200 : multiplier === 1 ? 440 : multiplier === 1.5 ? 750 : 1200;
    osc.frequency.setValueAtTime(multiplier > 1 ? 300 : 900, now);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playHitSound() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.33);
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
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.35, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.32);
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
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playExplosion() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
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

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.14);
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

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.32);
  }
}

export const sound = new SoundSystem();
