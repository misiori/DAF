import { SpeedMultiplier } from '../types/game';
import { SONG_CATALOG, getSongById } from './songCatalog';

export type SongGenreStyle =
  | 'lofi'
  | 'sad_hiphop'
  | 'chiptune'
  | 'dnb'
  | 'french_disco'
  | 'acid_trance'
  | 'future_bass'
  | 'industrial'
  | 'hard_rave'
  | 'epic_boss';

export function getSongGenreStyle(songId: number): SongGenreStyle {
  switch (songId) {
    case 1:
    case 6:
      return 'lofi'; // Lo-Fi Chill: swung boom-bap, warm Rhodes electric piano, pure sub sine
    case 9:
    case 3:
      return 'sad_hiphop'; // Sad Hip Hop / Emo Trap: half-time 808 sub bass glide, snap on 8, trap hats, sad piano
    case 2:
    case 22:
      return 'chiptune'; // 8-Bit Chiptune: retro NES square wave arps, triangle bass, noise crunch hits
    case 13:
    case 18:
      return 'dnb'; // Liquid & Neuro DnB: 165-170 BPM syncopated Amen breaks, Reese bass, lush pads
    case 4:
    case 5:
      return 'french_disco'; // French Touch Nu-Disco: sweeping lowpass filter, funky octave bass, disco open hats
    case 7:
    case 8:
    case 16:
      return 'acid_trance'; // Acid 303 & Psytrance: rolling K-B-B-B 16th bass, squelching resonant 303 filter
    case 10:
    case 19:
      return 'future_bass'; // Future Bass: sweeping wobble supersaw chords, sparkling arpeggios, massive sub
    case 11:
    case 14:
      return 'industrial'; // Cyberpunk Industrial: distorted aggressive saw bass, gated metallic snare, laser lead
    case 15:
    case 17:
    case 21:
      return 'hard_rave'; // Hardstyle & Hands Up: offbeat reverse bass, bright rave stabs, high-energy festival leads
    case 12:
    case 20:
    case 23:
    default:
      return 'epic_boss'; // Epic Boss / Speedcore: thunderous kicks, symphonic brass stabs, virtuoso climax lead
  }
}

// Professional Web Audio Rhythm & Genre Synthesizer
// 23 genuinely distinct compositions across 10 diverse musical genres:
// Lo-Fi Chill, Sad Hip Hop / Emo Trap, 8-Bit Chiptune, Liquid Drum & Bass,
// French Touch Nu-Disco, Acid Psytrance, Future Bass, Cyberpunk Industrial,
// Hardstyle Rave, and Epic Boss Speedcore.
// Features clock-accurate lookahead scheduling, distinct timbres, authentic drum machines,
// multi-bar structural culminations (drops), ultra-quiet calm menu music, and game synchronization.
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

  // Menu BGM State (Ultra-Calm, Soft, Soothing Ambient Lounge)
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
        this.bgmGain.gain.setValueAtTime(0.68, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        // Menu Bus (Ultra quiet, gentle, peaceful relaxing atmosphere)
        this.menuGain = this.ctx.createGain();
        this.menuGain.gain.setValueAtTime(0.09, this.ctx.currentTime);
        this.menuGain.connect(this.masterGain);

        // SFX Bus
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.70, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        // Space Delay / Tape Echo
        this.delayNode = this.ctx.createDelay(1.5);
        this.delayNode.delayTime.setValueAtTime(0.24, this.ctx.currentTime);

        this.delayFeedbackGain = this.ctx.createGain();
        this.delayFeedbackGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

        this.delayFilter = this.ctx.createBiquadFilter();
        this.delayFilter.type = 'lowpass';
        this.delayFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);

        this.delaySendGain = this.ctx.createGain();
        this.delaySendGain.gain.setValueAtTime(0.28, this.ctx.currentTime);

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
    } catch {
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
        // Bars 0-3: Intro / Groove establish
        // Bars 4-7: Main Theme & build
        // Bars 8-11: Riser / Pre-drop tension
        // Bars 12-15: CULMINATION / DROP / CLIMAX
        const rawStep = Math.max(0, Math.round((this.nextNoteTime - this.bgmStartTime) / sixteenthTime));
        const step = rawStep % 256;

        this.scheduleSongStep(step, this.nextNoteTime, this.currentLevelId);
        this.nextNoteTime += sixteenthTime;
      }
    }, 25);
  }

  // Master Step Sequencer: Routes to distinct genre engines
  private scheduleSongStep(step: number, time: number, songId: number) {
    if (this.isMuted) return;

    const beatInBar = step % 16;
    const bar = Math.floor(step / 16) % 16;
    const sectionIndex = Math.floor(bar / 4);
    const isCulmination = sectionIndex === 3;
    const isRiser = sectionIndex === 2;
    const style = getSongGenreStyle(songId);

    // 1. CHORD HARMONY & AMBIENCE (Bars 0-3, 4-7, 12-15; Riser modifies)
    this.scheduleGenreChords(time, songId, style, bar, beatInBar, isCulmination, isRiser);

    // 2. DRUMS & PERCUSSION GROOVE
    this.scheduleGenreDrums(time, songId, style, bar, beatInBar, isCulmination, isRiser);

    // 3. BASSLINE
    this.scheduleGenreBass(time, songId, style, bar, beatInBar, isCulmination, isRiser);

    // 4. MELODIC LEAD HOOK & RIFFS
    this.scheduleGenreLead(time, songId, style, bar, beatInBar, isCulmination, isRiser);
  }

  // ==============================================================
  // GENRE-SPECIFIC CHORD & HARMONY SCHEDULER
  // ==============================================================
  private scheduleGenreChords(
    time: number,
    songId: number,
    style: SongGenreStyle,
    bar: number,
    beat: number,
    isCulmination: boolean,
    isRiser: boolean
  ) {
    const barMod = bar % 4;
    const chords = this.getSongChord(songId, bar);
    const barDuration = (60 / Math.max(60, this.currentBpm * this.speedMultiplier)) * 4;

    switch (style) {
      case 'lofi': {
        // Swung, warm Rhodes electric piano on beats 0 and 8 with jazz humanization
        if (beat === 0 || (beat === 8 && !isRiser)) {
          const vol = isCulmination ? 0.14 : 0.11;
          this.playRhodesChord(time, chords, barDuration * 0.48, vol);
        }
        break;
      }

      case 'sad_hiphop': {
        // Melancholic minor piano & reverse bells on beat 0 and syncopated beat 10
        if (beat === 0 || (beat === 10 && barMod % 2 === 1)) {
          const vol = isCulmination ? 0.13 : 0.09;
          this.playSadTrapPiano(time, chords, barDuration * 0.5, vol);
        }
        break;
      }

      case 'chiptune': {
        // Staccato 8-bit square chord stabs on offbeat 16ths (beats 2, 6, 10, 14)
        if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
          if (!isRiser || bar % 2 === 0) {
            this.play8BitChordStabs(time, chords, isCulmination ? 0.10 : 0.07);
          }
        }
        break;
      }

      case 'dnb': {
        // Lush, floating ethereal atmospheric pad floating over fast breaks
        if (beat === 0) {
          this.playAtmosphericPad(time, chords, barDuration * 0.95, isCulmination ? 0.14 : 0.09);
        }
        break;
      }

      case 'french_disco': {
        // Sweeping lowpass filter on disco Rhodes/brass chords (Daft Punk style)
        if (beat === 0 || beat === 6 || beat === 12) {
          // Filter opens from 400Hz up to 3500Hz as bar advances!
          const sweepFreq = isCulmination ? 3800 : 500 + barMod * 650;
          this.playFrenchFilterChords(time, chords, sweepFreq, 0.32, 0.12);
        }
        break;
      }

      case 'acid_trance': {
        // Trance pad swells on bar downbeat
        if (beat === 0 && !isRiser) {
          this.playTrancePad(time, chords, barDuration * 0.9, isCulmination ? 0.12 : 0.07);
        }
        break;
      }

      case 'future_bass': {
        // Iconic pitch-bent wobble supersaw chords on beats 0, 6, 10
        if (beat === 0 || (beat === 6 && !isRiser) || (beat === 10 && isCulmination)) {
          this.playFutureBassWobbleChords(time, chords, isCulmination ? 0.16 : 0.12);
        }
        break;
      }

      case 'industrial': {
        // Dark menacing minor drones & metallic tension
        if (beat === 0) {
          this.playDarkIndustrialDrone(time, chords, barDuration * 0.95, isCulmination ? 0.14 : 0.10);
        }
        break;
      }

      case 'hard_rave': {
        // 90s rave supersaw anthem stabs on offbeat quarter notes
        if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
          this.playRaveSuperSawChords(time, chords, isCulmination ? 0.14 : 0.09);
        }
        break;
      }

      case 'epic_boss':
      default: {
        // Dramatic symphonic brass horns on downbeat and drop punch
        if (beat === 0 || (isCulmination && (beat === 6 || beat === 12))) {
          this.playSymphonicBrassChords(time, chords, isCulmination ? 0.18 : 0.12);
        }
        break;
      }
    }
  }

  // ==============================================================
  // GENRE-SPECIFIC DRUMS & PERCUSSION GROOVE
  // ==============================================================
  private scheduleGenreDrums(
    time: number,
    songId: number,
    style: SongGenreStyle,
    bar: number,
    beat: number,
    isCulmination: boolean,
    isRiser: boolean
  ) {
    switch (style) {
      case 'lofi': {
        // Swung boom-bap! Kick on 0 and 10. Mellow rimshot on 8 ONLY! Soft tape hats on 0, 3, 6, 9, 12, 14.
        const isKick = beat === 0 || (beat === 10 && !isRiser);
        if (isKick) this.playLofiKick(time, 0.55);

        const isRim = beat === 8;
        if (isRim) this.playLofiRim(time, 0.40);

        if (beat === 0 || beat === 3 || beat === 6 || beat === 9 || beat === 12 || beat === 14) {
          this.playLofiHat(time, 0.05);
        }
        break;
      }

      case 'sad_hiphop': {
        // Half-time Emo Trap! 808 booming kick on 0, 10 (and 14 in drop). Snappy trap snare on 8 ONLY!
        const isKick = beat === 0 || beat === 10 || (isCulmination && beat === 14);
        if (isKick && !isRiser) this.play808TrapKick(time, isCulmination ? 0.75 : 0.62);

        const isSnare = beat === 8;
        if (isSnare) this.playTrapSnare(time, 0.50);

        // Trap Hi-Hats: 8ths normally, with blistering 32nd triplet rolls on beat 14-15!
        if (beat % 2 === 0) {
          this.playTrapHat(time, false, 0.06);
        } else if (isCulmination && (beat === 13 || beat === 15)) {
          this.playTrapHat(time, true, 0.04); // Fast trap hat roll!
        }
        break;
      }

      case 'chiptune': {
        // Authentic NES retro sound chip drums: square blip kicks, noise channel snare, noise tick hats
        const isKick = beat === 0 || beat === 8 || (isCulmination && beat === 12);
        if (isKick && !isRiser) this.play8BitKick(time, 0.50);

        const isSnare = isRiser ? beat % 2 === 0 : beat === 4 || beat === 12;
        if (isSnare) this.play8BitSnare(time, isRiser ? 0.25 : 0.42);

        if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
          this.play8BitHat(time, 0.06);
        }
        break;
      }

      case 'dnb': {
        // 165-170 BPM classic Amen-style breakbeat!
        // Kick on 0, 10; Snare on 4, 12; ghost syncopation on 7, 14
        const isKick = beat === 0 || beat === 10 || (isCulmination && beat === 15);
        if (isKick && !isRiser) this.playSynthKick(time, 0.70);

        const isSnare = beat === 4 || beat === 12;
        if (isSnare) this.playSynthSnare(time, 0.48);

        // Ghost syncopated snares giving that authentic liquid roll
        if (beat === 7 || beat === 14) {
          this.playBreakbeatGhostSnare(time, 0.20);
        }

        // Shuffling 16th rolling ride
        this.playAmenRide(time, beat % 2 === 0 ? 0.05 : 0.03);
        break;
      }

      case 'french_disco': {
        // Funky 4-on-the-floor disco! Kick on 0, 4, 8, 12. Claps on 4, 12. Open hats on EVERY offbeat (2, 6, 10, 14)!
        if (!isRiser || bar < 10) {
          this.playSynthKick(time, 0.65);
        }
        if (beat === 4 || beat === 12) {
          this.playDiscoClap(time, 0.42);
        }
        if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
          this.playSynthHat(time, true, 0.10); // Loud disco offbeat open hat
        } else if (beat % 2 === 0) {
          this.playSynthHat(time, false, 0.04);
        }
        break;
      }

      case 'acid_trance': {
        // Relentless driving trance kick on 0, 4, 8, 12; sizzling offbeat open hats on 2, 6, 10, 14
        if (!isRiser || bar < 10) {
          this.playTranceKick(time, 0.72);
        }
        if (beat === 4 || beat === 12) {
          this.playSynthSnare(time, 0.38);
        }
        if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
          this.playSynthHat(time, true, 0.09);
        } else {
          this.playSynthHat(time, false, 0.03);
        }
        break;
      }

      case 'industrial': {
        // Distorted industrial kick with syncopated double-hits (0, 3, 8, 11). Gated metallic snare on 4, 12.
        const isKick = beat === 0 || beat === 3 || beat === 8 || beat === 11;
        if (isKick && !isRiser) {
          this.playIndustrialKick(time, 0.70);
        }
        if (beat === 4 || beat === 12) {
          this.playIndustrialSnare(time, 0.46);
        }
        this.playIndustrialNoiseHat(time, beat % 2 === 0 ? 0.06 : 0.03);
        break;
      }

      case 'future_bass': {
        // Half-time future bass! Deep sub kick on 0, 10. Huge layered clap/snare on 8.
        const isKick = beat === 0 || beat === 10 || (isCulmination && beat === 14);
        if (isKick && !isRiser) this.play808TrapKick(time, 0.70);

        if (beat === 8) this.playTrapSnare(time, 0.55);

        if (beat % 2 === 0) {
          this.playSynthHat(time, false, 0.06);
        } else if (isCulmination && (beat === 7 || beat === 15)) {
          this.playSynthHat(time, false, 0.04);
        }
        break;
      }

      case 'hard_rave': {
        // Fast hardstyle kicks on 0, 4, 8, 12; bright rave snares on 4, 12
        if (!isRiser || bar < 11) {
          this.playHardstyleKick(time, 0.75);
        }
        if (beat === 4 || beat === 12) {
          this.playSynthSnare(time, 0.45);
        }
        if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
          this.playSynthHat(time, true, 0.08);
        }
        break;
      }

      case 'epic_boss':
      default: {
        // Thunderous boss battle kicks; rapid machine-gun rolls in the drop!
        const isKick =
          beat === 0 ||
          beat === 4 ||
          beat === 8 ||
          beat === 12 ||
          (isCulmination && (beat === 2 || beat === 6 || beat === 10 || beat === 14));
        if (isKick && (!isRiser || bar < 10)) {
          this.playBossDoubleKick(time, isCulmination ? 0.78 : 0.68);
        }
        const isSnare = beat === 4 || beat === 12 || (isRiser && beat % 2 === 0);
        if (isSnare) {
          this.playSynthSnare(time, isCulmination ? 0.50 : 0.40);
        }
        this.playSynthHat(time, beat % 4 === 2, 0.05);
        break;
      }
    }
  }

  // ==============================================================
  // GENRE-SPECIFIC BASSLINE SCHEDULER
  // ==============================================================
  private scheduleGenreBass(
    time: number,
    songId: number,
    style: SongGenreStyle,
    bar: number,
    beat: number,
    isCulmination: boolean,
    isRiser: boolean
  ) {
    const bassPitch = this.getSongBassPitch(songId, bar, beat);

    switch (style) {
      case 'lofi': {
        // Warm, round, deep sine sub bass on downbeats and syncopations (zero saw buzz!)
        if (beat === 0 || beat === 6 || beat === 10) {
          this.playLofiSubBass(time, bassPitch * 0.5, 0.38);
        }
        break;
      }

      case 'sad_hiphop': {
        // Sustained, sliding 808 sub bass that glides between notes
        if (beat === 0 || beat === 10) {
          const targetPitch = beat === 10 ? bassPitch * 0.5 * 1.12 : bassPitch * 0.5;
          this.play808SubGlide(time, bassPitch * 0.5, targetPitch, isCulmination ? 0.42 : 0.35);
        }
        break;
      }

      case 'chiptune': {
        // Authentic NES triangle wave bass playing 16th-note bouncing octave patterns!
        if (beat % 2 === 0) {
          const isOctave = beat === 2 || beat === 6 || beat === 10 || beat === 14;
          const freq = isOctave ? bassPitch * 2.0 : bassPitch;
          this.play8BitTriangleBass(time, freq, 0.28);
        }
        break;
      }

      case 'dnb': {
        // Deep detuned Reese bass with sweeping lowpass filter wobble
        if (beat === 0 || (isCulmination && beat === 8)) {
          this.playReeseBass(time, bassPitch * 0.5, isCulmination ? 0.35 : 0.28);
        }
        break;
      }

      case 'french_disco': {
        // Funky disco octave bounce (root on 0, octave on 2, root on 4, octave on 6...)
        if (beat % 2 === 0) {
          const isOctave = beat === 2 || beat === 6 || beat === 10 || beat === 14;
          this.playDiscoOctaveBass(time, isOctave ? bassPitch * 2.0 : bassPitch, isOctave, 0.32);
        }
        break;
      }

      case 'acid_trance': {
        // Legendary TB-303 rolling K-B-B-B 16th acid bassline (beats 1, 2, 3 and 5, 6, 7)
        if (beat !== 0 && beat !== 4 && beat !== 8 && beat !== 12) {
          const isAccent = beat === 3 || beat === 7 || beat === 11 || beat === 15;
          const isSlide = beat === 2 || beat === 10;
          this.playAcid303Step(time, bassPitch * (isAccent ? 1.5 : 1.0), isAccent, isSlide, 0.30);
        }
        break;
      }

      case 'industrial': {
        // Distorted, aggressive mid-range sawtooth bass with grit
        if (beat % 2 === 0) {
          this.playIndustrialDistortedBass(time, bassPitch, isCulmination);
        }
        break;
      }

      case 'future_bass': {
        // Clean deep 808 sub supporting the big chords
        if (beat === 0 || beat === 6 || (isCulmination && beat === 10)) {
          this.playFutureBassSub(time, bassPitch * 0.5, 0.34);
        }
        break;
      }

      case 'hard_rave': {
        // Offbeat reverse bass punching on 2, 6, 10, 14 with heavy pitch dive
        if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
          this.playHardstyleReverseBass(time, bassPitch, 0.36);
        }
        break;
      }

      case 'epic_boss':
      default: {
        // Colossal low-end sub roar with detuned sawtooth rumble
        if (beat % 2 === 0 || (isCulmination && (beat === 3 || beat === 11))) {
          this.playEpicBossBass(time, bassPitch, isCulmination);
        }
        break;
      }
    }
  }

  // ==============================================================
  // GENRE-SPECIFIC MELODIC LEAD HOOK SCHEDULER
  // ==============================================================
  private scheduleGenreLead(
    time: number,
    songId: number,
    style: SongGenreStyle,
    bar: number,
    beat: number,
    isCulmination: boolean,
    isRiser: boolean
  ) {
    const leadPitch = this.getSongLeadPitch(songId, bar, beat, isCulmination);
    if (leadPitch <= 0) return;

    switch (style) {
      case 'lofi': {
        // Gentle music-box chime or mellow whistle
        this.playMusicBoxLead(time, leadPitch, isCulmination ? 0.12 : 0.08);
        break;
      }

      case 'sad_hiphop': {
        // Melancholic sad trap flute / acoustic pluck with space delay
        this.playSadFlutePluck(time, leadPitch, isCulmination ? 0.14 : 0.10);
        break;
      }

      case 'chiptune': {
        // High-speed 8-bit square arpeggios dancing across octaves
        this.play8BitChiptuneArp(time, leadPitch, beat, isCulmination ? 0.12 : 0.08);
        break;
      }

      case 'dnb': {
        // Soaring melodic vocal-like synth hook
        this.playLiquidDnBLead(time, leadPitch, isCulmination ? 0.16 : 0.11);
        break;
      }

      case 'french_disco': {
        // Funky clavinet / filtered disco riff
        this.playDiscoFunkyRiff(time, leadPitch, isCulmination ? 0.14 : 0.10);
        break;
      }

      case 'acid_trance': {
        // Resonant TB-303 squelching lead hook
        this.playAcid303Lead(time, leadPitch, isCulmination ? 0.15 : 0.10);
        break;
      }

      case 'industrial': {
        // Searing laser sweep lead
        this.playIndustrialLaserLead(time, leadPitch, isCulmination ? 0.15 : 0.11);
        break;
      }

      case 'future_bass': {
        // Sparkling arpeggiated bells
        this.playSparkleBellLead(time, leadPitch, isCulmination ? 0.14 : 0.09);
        break;
      }

      case 'hard_rave': {
        // Big energetic festival rave lead
        this.playFestivalAnthemLead(time, leadPitch, isCulmination ? 0.16 : 0.12);
        break;
      }

      case 'epic_boss':
      default: {
        // Heroic virtuoso boss theme
        this.playHeroicBossTheme(time, leadPitch, isCulmination ? 0.18 : 0.13);
        break;
      }
    }
  }

  // ==============================================================
  // 23 HARMONIC CHORD VOICINGS & PROGRESSIONS
  // ==============================================================
  private getSongChord(songId: number, bar: number): number[] {
    const barMod = bar % 4;

    switch (songId) {
      case 1: // First Steps (C Major: C - G - Am - F)
        return [
          [261.63, 329.63, 392.0, 523.25],
          [196.0, 246.94, 293.66, 392.0],
          [220.0, 261.63, 329.63, 440.0],
          [174.61, 220.0, 261.63, 349.23],
        ][barMod];

      case 2: // Sunny Meadow (G Major: G - D - Em - C)
        return [
          [196.0, 246.94, 293.66, 392.0],
          [146.83, 220.0, 293.66, 369.99],
          [164.81, 196.0, 246.94, 329.63],
          [130.81, 164.81, 196.0, 261.63],
        ][barMod];

      case 3: // Pheromone Groove (D Minor: Dm7 - Gm7 - C7 - Fmaj7)
        return [
          [146.83, 220.0, 261.63, 349.23],
          [196.0, 233.08, 293.66, 349.23],
          [130.81, 196.0, 233.08, 261.63],
          [174.61, 220.0, 261.63, 329.63],
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

    const rootsTable: Record<number, number[]> = {
      1: [65.41, 49.0, 55.0, 43.65],
      2: [49.0, 36.71, 41.2, 32.7],
      3: [36.71, 49.0, 32.7, 43.65],
      4: [55.0, 41.2, 43.65, 49.0],
      5: [43.65, 32.7, 36.71, 58.27],
      6: [41.2, 32.7, 55.0, 36.71],
      7: [61.74, 49.0, 55.0, 46.25],
      8: [32.7, 51.91, 43.65, 49.0],
      9: [36.71, 58.27, 32.7, 55.0],
      10: [46.25, 36.71, 55.0, 41.2],
      11: [49.0, 38.89, 58.27, 43.65],
      12: [55.0, 36.71, 43.65, 49.0],
      13: [41.2, 49.0, 36.71, 32.7],
      14: [34.65, 55.0, 41.2, 61.74],
      15: [43.65, 34.65, 51.91, 38.89],
      16: [36.71, 38.89, 32.7, 36.71],
      17: [58.27, 43.65, 49.0, 38.89],
      18: [46.25, 41.2, 36.71, 34.65],
      19: [51.91, 41.2, 61.74, 46.25],
      20: [32.7, 51.91, 38.89, 58.27],
      21: [41.2, 32.7, 49.0, 36.71],
      22: [61.74, 49.0, 36.71, 55.0],
      23: [36.71, 58.27, 43.65, 32.7],
    };

    const roots = rootsTable[songId] || [55.0, 43.65, 65.41, 49.0];
    const root = roots[barMod];
    return root * (isUpbeat ? 2.0 : 1.0);
  }

  // --- 23 Unique Melodic Lead Hooks ---
  private getSongLeadPitch(songId: number, bar: number, beat: number, isCulmination: boolean): number {
    const barMod = bar % 4;

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

    const baseFreqs: Record<number, number[]> = {
      1: [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5],
      2: [392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99],
      3: [587.33, 659.25, 698.46, 783.99, 880.0, 932.33, 1046.5, 1174.66],
      4: [440.0, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.0],
      5: [349.23, 392.0, 440.0, 466.16, 523.25, 587.33, 659.25, 698.46],
      6: [659.25, 739.99, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51],
      7: [493.88, 554.37, 587.33, 659.25, 739.99, 783.99, 880.0, 987.77],
      8: [523.25, 587.33, 622.25, 698.46, 783.99, 830.61, 932.33, 1046.5],
      9: [587.33, 698.46, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1396.91],
      10: [739.99, 830.61, 880.0, 987.77, 1108.73, 1174.66, 1318.51, 1479.98],
      11: [392.0, 440.0, 466.16, 523.25, 587.33, 622.25, 698.46, 783.99],
      12: [440.0, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99, 880.0],
      13: [659.25, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51, 1567.98],
      14: [554.37, 622.25, 659.25, 739.99, 830.61, 880.0, 987.77, 1108.73],
      15: [698.46, 783.99, 830.61, 932.33, 1046.5, 1108.73, 1244.51, 1396.91],
      16: [587.33, 622.25, 698.46, 783.99, 880.0, 932.33, 1046.5, 1174.66],
      17: [466.16, 523.25, 587.33, 622.25, 698.46, 783.99, 880.0, 932.33],
      18: [739.99, 830.61, 880.0, 987.77, 1108.73, 1174.66, 1318.51, 1479.98],
      19: [830.61, 932.33, 987.77, 1108.73, 1244.51, 1318.51, 1479.98, 1661.22],
      20: [523.25, 587.33, 622.25, 698.46, 783.99, 830.61, 932.33, 1046.5],
      21: [659.25, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51, 1567.98],
      22: [493.88, 587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51],
      23: [587.33, 698.46, 783.99, 880.0, 1046.5, 1174.66, 1396.91, 1567.98],
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

    // Jump straight to the drop bar in preview!
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

    const menuBpm = 84; // Very calm, slow and unhurried tempo
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
        [174.61, 261.63, 329.63, 392.0],
        [164.81, 246.94, 293.66, 392.0],
        [146.83, 220.0, 261.63, 329.63],
        [130.81, 196.0, 246.94, 329.63],
      ];
      this.playCalmMenuPad(time, calmChords[bar], 2.8);
    }

    // Ethereal music box chime plucks on gentle syncopated beats
    if (beat === 4 || beat === 10) {
      const chimeChords = [
        [440.0, 659.25],
        [392.0, 587.33],
        [349.23, 523.25],
        [329.63, 493.88],
      ];
      chimeChords[bar].forEach((freq) => {
        this.playCalmChime(time, freq);
      });
    }

    // Gentle sub-pulse (soothing and low, no sharp click)
    if (beat === 0) {
      const subNotes = [87.31, 82.41, 73.42, 65.41];
      this.playCalmSubBass(time, subNotes[bar]);
    }
  }

  // ==============================================================
  // SYNTHESIZER VOICES & TIMBRES (Authentic Multi-Genre Generation)
  // ==============================================================

  // --- LO-FI VOICES ---
  private playRhodesChord(time: number, chordFreqs: number[], duration: number, volume: number = 0.10) {
    if (!this.ctx || !this.bgmGain) return;
    chordFreqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const oscTri = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + i * 0.015);

      oscTri.type = 'triangle';
      oscTri.frequency.setValueAtTime(freq * 2.0, time + i * 0.015);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, time);

      gain.gain.setValueAtTime(volume * 0.7, time + i * 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      oscTri.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain!);
      if (this.delayNode) gain.connect(this.delayNode);

      osc.start(time + i * 0.015);
      oscTri.start(time + i * 0.015);
      osc.stop(time + duration + 0.05);
      oscTri.stop(time + duration + 0.05);
    });
  }

  private playLofiSubBass(time: number, freq: number, volume: number = 0.35) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine'; // Pure round warm low-end
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.40);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.42);
  }

  private playLofiKick(time: number, volume: number = 0.55) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.16);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, time); // Mellow thud

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.19);
  }

  private playLofiRim(time: number, volume: number = 0.40) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(850, time);
    osc.frequency.exponentialRampToValueAtTime(300, time + 0.04);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    osc.connect(gain);
    gain.connect(this.bgmGain);
    if (this.delayNode) gain.connect(this.delayNode);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playLofiHat(time: number, volume: number = 0.05) {
    if (!this.ctx || !this.bgmGain) return;
    const dur = 0.035;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4500, time);
    filter.Q.setValueAtTime(2.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  private playMusicBoxLead(time: number, freq: number, volume: number = 0.10) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

    osc.connect(gain);
    gain.connect(this.bgmGain);
    if (this.delayNode) gain.connect(this.delayNode);

    osc.start(time);
    osc.stop(time + 0.48);
  }

  // --- TRAP / SAD HIP-HOP VOICES ---
  private playSadTrapPiano(time: number, chordFreqs: number[], duration: number, volume: number = 0.10) {
    if (!this.ctx || !this.bgmGain) return;
    chordFreqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + i * 0.03);

      gain.gain.setValueAtTime(volume, time + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(this.bgmGain!);
      if (this.delayNode) gain.connect(this.delayNode);

      osc.start(time + i * 0.03);
      osc.stop(time + duration + 0.05);
    });
  }

  private play808TrapKick(time: number, volume: number = 0.70) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.28);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.34);
  }

  private play808SubGlide(time: number, startFreq: number, targetFreq: number, volume: number = 0.38) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, time + 0.22);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.40);
  }

  private playTrapSnare(time: number, volume: number = 0.48) {
    if (!this.ctx || !this.bgmGain) return;
    const dur = 0.11;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, time);
    filter.Q.setValueAtTime(1.8, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  private playTrapHat(time: number, isRoll: boolean = false, volume: number = 0.05) {
    if (!this.ctx || !this.bgmGain) return;
    const dur = isRoll ? 0.025 : 0.05;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  private playSadFlutePluck(time: number, freq: number, volume: number = 0.12) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.bgmGain);
    if (this.delayNode) gain.connect(this.delayNode);

    osc.start(time);
    osc.stop(time + 0.38);
  }

  // --- 8-BIT CHIPTUNE VOICES ---
  private play8BitChordStabs(time: number, chordFreqs: number[], volume: number = 0.08) {
    if (!this.ctx || !this.bgmGain) return;
    chordFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(volume * 0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

      osc.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(time);
      osc.stop(time + 0.07);
    });
  }

  private play8BitKick(time: number, volume: number = 0.50) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.12);
  }

  private play8BitSnare(time: number, volume: number = 0.40) {
    if (!this.ctx || !this.bgmGain) return;
    const dur = 0.09;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // NES pseudo-random noise shift
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() > 0.5 ? 1 : -1) * 0.7 * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  private play8BitHat(time: number, volume: number = 0.06) {
    if (!this.ctx || !this.bgmGain) return;
    const dur = 0.025;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() > 0.5 ? 1 : -1) * 0.5;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  private play8BitTriangleBass(time: number, freq: number, volume: number = 0.28) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle'; // Pure NES triangle channel
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  private play8BitChiptuneArp(time: number, baseFreq: number, beat: number, volume: number = 0.10) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Fast 3-note arpeggio cycling (root, 3rd, 5th, octave)
    const arpMultipliers = [1.0, 1.25, 1.5, 2.0];
    const mult = arpMultipliers[beat % 4];

    osc.type = 'square';
    osc.frequency.setValueAtTime(baseFreq * mult, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(this.bgmGain);
    if (this.delayNode) gain.connect(this.delayNode);

    osc.start(time);
    osc.stop(time + 0.11);
  }

  // --- DRUM & BASS VOICES ---
  private playAtmosphericPad(time: number, chordFreqs: number[], duration: number, volume: number = 0.10) {
    if (!this.ctx || !this.bgmGain) return;
    chordFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(volume * 0.6, time + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(time);
      osc.stop(time + duration + 0.1);
    });
  }

  private playReeseBass(time: number, freq: number, volume: number = 0.32) {
    if (!this.ctx || !this.bgmGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.018, time); // Detuned for fat chorus beating

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, time);
    filter.Q.setValueAtTime(3.5, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.48);
    osc2.stop(time + 0.48);
  }

  private playBreakbeatGhostSnare(time: number, volume: number = 0.20) {
    if (!this.ctx || !this.bgmGain) return;
    const dur = 0.05;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  private playAmenRide(time: number, volume: number = 0.04) {
    if (!this.ctx || !this.bgmGain) return;
    const dur = 0.04;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  private playLiquidDnBLead(time: number, freq: number, volume: number = 0.14) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);
    if (this.delayNode) gain.connect(this.delayNode);

    osc.start(time);
    osc.stop(time + 0.30);
  }

  // --- FRENCH TOUCH / NU-DISCO VOICES ---
  private playFrenchFilterChords(time: number, chordFreqs: number[], filterCutoff: number, duration: number, volume: number = 0.12) {
    if (!this.ctx || !this.bgmGain) return;
    chordFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterCutoff, time);
      filter.Q.setValueAtTime(4.0, time); // Distinctive resonant sweep

      gain.gain.setValueAtTime(volume * 0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(time);
      osc.stop(time + duration + 0.05);
    });
  }

  private playDiscoOctaveBass(time: number, freq: number, isOctave: boolean, volume: number = 0.32) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isOctave ? 1200 : 700, time);
    filter.Q.setValueAtTime(3.0, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  private playDiscoClap(time: number, volume: number = 0.42) {
    if (!this.ctx || !this.bgmGain) return;
    // Multi-hit clap
    [0, 0.015, 0.03].forEach((delayOffset, idx) => {
      const dur = idx === 2 ? 0.14 : 0.02;
      const bufferSize = Math.floor(this.ctx!.sampleRate * dur);
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.6;
      }
      const noise = this.ctx!.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, time + delayOffset);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(volume * (idx === 2 ? 1.0 : 0.4), time + delayOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, time + delayOffset + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain!);

      noise.start(time + delayOffset);
      noise.stop(time + delayOffset + dur + 0.01);
    });
  }

  private playDiscoFunkyRiff(time: number, freq: number, volume: number = 0.13) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, time);
    filter.frequency.exponentialRampToValueAtTime(600, time + 0.12);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.17);
  }

  // --- ACID 303 & PSYTRANCE VOICES ---
  private playAcid303Step(time: number, freq: number, isAccent: boolean, isSlide: boolean, volume: number = 0.30) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    if (isSlide) {
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, time + 0.1);
    }

    // Legendary TB-303 high resonance filter squelch
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(isAccent ? 12.0 : 8.0, time);
    filter.frequency.setValueAtTime(isAccent ? 3200 : 1600, time);
    filter.frequency.exponentialRampToValueAtTime(350, time + (isSlide ? 0.18 : 0.12));

    gain.gain.setValueAtTime(volume * (isAccent ? 1.3 : 1.0), time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (isSlide ? 0.20 : 0.14));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.22);
  }

  private playTranceKick(time: number, volume: number = 0.72) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.14);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.18);
  }

  private playTrancePad(time: number, chordFreqs: number[], duration: number, volume: number = 0.08) {
    if (!this.ctx || !this.bgmGain) return;
    chordFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(volume * 0.5, time + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(time);
      osc.stop(time + duration + 0.05);
    });
  }

  private playAcid303Lead(time: number, freq: number, volume: number = 0.12) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(9.0, time);
    filter.frequency.setValueAtTime(2600, time);
    filter.frequency.exponentialRampToValueAtTime(700, time + 0.16);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);
    if (this.delayNode) gain.connect(this.delayNode);

    osc.start(time);
    osc.stop(time + 0.20);
  }

  // --- CYBERPUNK INDUSTRIAL VOICES ---
  private playDarkIndustrialDrone(time: number, chordFreqs: number[], duration: number, volume: number = 0.12) {
    if (!this.ctx || !this.bgmGain) return;
    chordFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq * 0.5, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, time);

      gain.gain.setValueAtTime(volume * 0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(time);
      osc.stop(time + duration + 0.05);
    });
  }

  private playIndustrialKick(time: number, volume: number = 0.70) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, time);
    subOsc.frequency.exponentialRampToValueAtTime(32, time + 0.16);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    subOsc.start(time);
    osc.stop(time + 0.20);
    subOsc.stop(time + 0.20);
  }

  private playIndustrialSnare(time: number, volume: number = 0.46) {
    if (!this.ctx || !this.bgmGain) return;
    const dur = 0.14;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.Q.setValueAtTime(2.2, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  private playIndustrialNoiseHat(time: number, volume: number = 0.05) {
    if (!this.ctx || !this.bgmGain) return;
    const dur = 0.03;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  private playIndustrialDistortedBass(time: number, freq: number, isCulmination: boolean) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isCulmination ? 1800 : 1200, time);
    filter.Q.setValueAtTime(4.5, time);

    gain.gain.setValueAtTime(isCulmination ? 0.36 : 0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.24);
  }

  private playIndustrialLaserLead(time: number, freq: number, volume: number = 0.14) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 1.5, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);
    if (this.delayNode) gain.connect(this.delayNode);

    osc.start(time);
    osc.stop(time + 0.18);
  }

  // --- FUTURE BASS VOICES ---
  private playFutureBassWobbleChords(time: number, chordFreqs: number[], volume: number = 0.14) {
    if (!this.ctx || !this.bgmGain) return;
    chordFreqs.forEach((freq) => {
      const osc1 = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, time);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq * 1.01, time);

      // Wobble envelope
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, time);
      filter.frequency.linearRampToValueAtTime(3200, time + 0.08);
      filter.frequency.exponentialRampToValueAtTime(600, time + 0.28);

      gain.gain.setValueAtTime(volume * 0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain!);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.35);
      osc2.stop(time + 0.35);
    });
  }

  private playFutureBassSub(time: number, freq: number, volume: number = 0.34) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.37);
  }

  private playSparkleBellLead(time: number, freq: number, volume: number = 0.12) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 2.0, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.26);

    osc.connect(gain);
    gain.connect(this.bgmGain);
    if (this.delayNode) gain.connect(this.delayNode);

    osc.start(time);
    osc.stop(time + 0.28);
  }

  // --- HARDSTYLE / RAVE VOICES ---
  private playRaveSuperSawChords(time: number, chordFreqs: number[], volume: number = 0.12) {
    if (!this.ctx || !this.bgmGain) return;
    chordFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(volume * 0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(time);
      osc.stop(time + 0.14);
    });
  }

  private playHardstyleKick(time: number, volume: number = 0.75) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.11);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.14);
  }

  private playHardstyleReverseBass(time: number, freq: number, volume: number = 0.36) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 1.5, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.75, time + 0.16);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, time);
    filter.Q.setValueAtTime(4.0, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.20);
  }

  private playFestivalAnthemLead(time: number, freq: number, volume: number = 0.15) {
    if (!this.ctx || !this.bgmGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.008, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.20);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.bgmGain);
    if (this.delayNode) gain.connect(this.delayNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.22);
    osc2.stop(time + 0.22);
  }

  // --- EPIC BOSS VOICES ---
  private playSymphonicBrassChords(time: number, chordFreqs: number[], volume: number = 0.16) {
    if (!this.ctx || !this.bgmGain) return;
    chordFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, time);
      filter.frequency.exponentialRampToValueAtTime(700, time + 0.28);

      gain.gain.setValueAtTime(volume * 0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(time);
      osc.stop(time + 0.35);
    });
  }

  private playBossDoubleKick(time: number, volume: number = 0.75) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(175, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.14);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  private playEpicBossBass(time: number, freq: number, isCulmination: boolean) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 0.5, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isCulmination ? 1600 : 900, time);
    filter.Q.setValueAtTime(3.5, time);

    gain.gain.setValueAtTime(isCulmination ? 0.36 : 0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    subOsc.start(time);
    osc.stop(time + 0.24);
    subOsc.stop(time + 0.24);
  }

  private playHeroicBossTheme(time: number, freq: number, volume: number = 0.16) {
    if (!this.ctx || !this.bgmGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(freq * 1.004, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3400, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);
    if (this.delayNode) gain.connect(this.delayNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.26);
    osc2.stop(time + 0.26);
  }

  // --- GENERAL SYNTH DRUMS (Standard fallbacks) ---
  private playSynthKick(time: number, volume: number = 0.65) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.15);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.17);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.19);
  }

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

    noise.start(time);
    noise.stop(time + 0.14);
  }

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

  // --- CALM MENU VOICES (Super gentle, relaxing ambient lounge) ---
  private playCalmMenuPad(time: number, chordFreqs: number[], duration: number) {
    if (!this.ctx || !this.menuGain) return;

    chordFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.035, time + 0.4);
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

    gain.gain.setValueAtTime(0.018, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);

    osc.connect(gain);
    gain.connect(this.menuGain);
    if (this.delayNode) gain.connect(this.delayNode);

    osc.start(time);
    osc.stop(time + 0.55);
  }

  private playCalmSubBass(time: number, freq: number) {
    if (!this.ctx || !this.menuGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.045, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);

    osc.connect(gain);
    gain.connect(this.menuGain);

    osc.start(time);
    osc.stop(time + 0.75);
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
