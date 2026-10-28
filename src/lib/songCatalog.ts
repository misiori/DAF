export interface SongTrack {
  id: number;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  key: string;
  difficultyTier: 'Easy' | 'Normal' | 'Hard' | 'Harder' | 'Insane' | 'Crazy';
  description: string;
}

export const SONG_CATALOG: SongTrack[] = [
  // --- EASY (Farms 1–4) ---
  {
    id: 1,
    title: 'First Steps',
    artist: 'Ant Farm Audio',
    genre: 'Chiptune Lofi',
    bpm: 112,
    key: 'C Major',
    difficultyTier: 'Easy',
    description: 'Playful retro intro with sunny 8-bit melodies and warm chords.',
  },
  {
    id: 2,
    title: 'Sunny Meadow',
    artist: 'Ant Farm Audio',
    genre: 'Melodic Synthpop',
    bpm: 120,
    key: 'G Major',
    difficultyTier: 'Easy',
    description: 'Bouncing bass, bright synth bells, and a soaring uplifting drop.',
  },
  {
    id: 3,
    title: 'Pheromone Groove',
    artist: 'Ant Farm Audio',
    genre: 'Funky Nu-Disco',
    bpm: 124,
    key: 'D Minor',
    difficultyTier: 'Easy',
    description: 'Funky bassline, crisp claps, and a rhythmic filtered groove.',
  },
  {
    id: 4,
    title: 'Cobblestone Run',
    artist: 'Ant Farm Audio',
    genre: 'French Touch Electro',
    bpm: 128,
    key: 'A Minor',
    difficultyTier: 'Easy',
    description: 'Pumping sidechain compression and sweeping disco filter culmination.',
  },

  // --- NORMAL (Farms 5–8) ---
  {
    id: 5,
    title: 'High Noon Highway',
    artist: 'Ant Farm Audio',
    genre: 'Eurobeat Electro',
    bpm: 132,
    key: 'F Major',
    difficultyTier: 'Normal',
    description: 'Galloping bassline, punchy brass stabs, and race-day culmination.',
  },
  {
    id: 6,
    title: 'Neon Horizon',
    artist: 'Ant Farm Audio',
    genre: 'Synthwave Outrun',
    bpm: 126,
    key: 'E Minor',
    difficultyTier: 'Normal',
    description: 'Deep analog bass, vintage lush chorus pads, and night-drive solo.',
  },
  {
    id: 7,
    title: 'Subterranean Velocity',
    artist: 'Ant Farm Audio',
    genre: 'Acid House 303',
    bpm: 134,
    key: 'B Minor',
    difficultyTier: 'Normal',
    description: 'Resonant squelch bass, driving four-on-the-floor, and peaking drop.',
  },
  {
    id: 8,
    title: 'Desert Sandstorm',
    artist: 'Ant Farm Audio',
    genre: 'Tech Trance',
    bpm: 136,
    key: 'C Minor',
    difficultyTier: 'Normal',
    description: 'Exotic minor scales, double-kick gallop, and a euphoric drop.',
  },

  // --- HARD (Farms 9–12) ---
  {
    id: 9,
    title: 'Electric Zenith',
    artist: 'Ant Farm Audio',
    genre: 'Glitch Hop',
    bpm: 105,
    key: 'D Minor',
    difficultyTier: 'Hard',
    description: 'Heavy half-time boom, snappy electronic snare, and laser leads.',
  },
  {
    id: 10,
    title: 'Crystal Reflections',
    artist: 'Ant Farm Audio',
    genre: 'Future Bass',
    bpm: 138,
    key: 'F# Minor',
    difficultyTier: 'Hard',
    description: 'Pitch-bent supersaw chords, sparkling arpeggios, and soaring drop.',
  },
  {
    id: 11,
    title: 'Deep Core',
    artist: 'Ant Farm Audio',
    genre: 'Cyberpunk Industrial',
    bpm: 130,
    key: 'G Minor',
    difficultyTier: 'Hard',
    description: 'Aggressive sawtooth growls, heavy darkwave drums, and sinister drop.',
  },
  {
    id: 12,
    title: 'Chitin Steel',
    artist: 'Ant Farm Audio',
    genre: 'Electro Breakbeat',
    bpm: 135,
    key: 'A Dorian',
    difficultyTier: 'Hard',
    description: 'Staccato synth power riffs, breakbeat syncopation, and driving climax.',
  },

  // --- HARDER (Farms 13–16) ---
  {
    id: 13,
    title: 'Against the Odds',
    artist: 'Ant Farm Audio',
    genre: 'Melodic Drum & Bass',
    bpm: 165,
    key: 'E Minor',
    difficultyTier: 'Harder',
    description: 'Fast 16th rolling DnB breakbeat, soaring emotional hook, and rush.',
  },
  {
    id: 14,
    title: 'Thermal Surge',
    artist: 'Ant Farm Audio',
    genre: 'Aggressive Dark Electro',
    bpm: 140,
    key: 'C# Minor',
    difficultyTier: 'Harder',
    description: 'Sizzling resonant basslines, alarm chords, and explosive lava drop.',
  },
  {
    id: 15,
    title: 'Emergency Protocol',
    artist: 'Ant Farm Audio',
    genre: 'Hard Dance',
    bpm: 148,
    key: 'F Minor',
    difficultyTier: 'Harder',
    description: 'Fast offbeat reverse bass, siren synths, and pure adrenaline peak.',
  },
  {
    id: 16,
    title: 'Acid Rain',
    artist: 'Ant Farm Audio',
    genre: 'Goa Psytrance',
    bpm: 145,
    key: 'D Phrygian',
    difficultyTier: 'Harder',
    description: 'Rolling hypnotic triplet bass, exotic scales, and cosmic peak.',
  },

  // --- INSANE (Farms 17–20) ---
  {
    id: 17,
    title: 'Starlight Beacon',
    artist: 'Ant Farm Audio',
    genre: 'Euphoric Hands Up',
    bpm: 142,
    key: 'Bb Major',
    difficultyTier: 'Insane',
    description: 'Joyful festival anthem hook, bright rave leads, and giant drop.',
  },
  {
    id: 18,
    title: 'Synaptic Voltage',
    artist: 'Ant Farm Audio',
    genre: 'Neurofunk DnB',
    bpm: 170,
    key: 'F# Minor',
    difficultyTier: 'Insane',
    description: 'Twisted reese bass, razor-sharp ghost snares, and frantic culmination.',
  },
  {
    id: 19,
    title: 'Chrono Distortion',
    artist: 'Ant Farm Audio',
    genre: 'Glitch Breakcore',
    bpm: 150,
    key: 'G# Minor',
    difficultyTier: 'Insane',
    description: 'Time-warp stutter fills, syncopated breaks, and dimensional climax.',
  },
  {
    id: 20,
    title: 'Genesis Protocol',
    artist: 'Ant Farm Audio',
    genre: 'Symphonic Cyberpunk',
    bpm: 144,
    key: 'C Minor',
    difficultyTier: 'Insane',
    description: 'Dramatic orchestral stabs, thunderous kick hits, and royal culmination.',
  },

  // --- CRAZY (Farms 21–23) ---
  {
    id: 21,
    title: 'Colony Extinction',
    artist: 'Ant Farm Audio',
    genre: 'Hardstyle Speed Electro',
    bpm: 155,
    key: 'E Minor',
    difficultyTier: 'Crazy',
    description: 'Distorted reverse bass, furious screaming leads, and apocalypse drop.',
  },
  {
    id: 22,
    title: 'Singularity Gate',
    artist: 'Ant Farm Audio',
    genre: 'High-Speed Chiptune Rave',
    bpm: 160,
    key: 'B Minor',
    difficultyTier: 'Crazy',
    description: 'Blistering 8-bit arpeggios, massive saw chords, and blinding rush.',
  },
  {
    id: 23,
    title: 'Final Stand of the Farm',
    artist: 'Ant Farm Audio',
    genre: 'Epic Boss Speedcore',
    bpm: 172,
    key: 'D Minor',
    difficultyTier: 'Crazy',
    description: 'Heroic boss theme with virtuoso synth solos and thunderous drop!',
  },
];

export function getSongById(id: number): SongTrack {
  const found = SONG_CATALOG.find((s) => s.id === id);
  return found || SONG_CATALOG[0];
}
