// All sound effects here are synthesized in real time with the Web Audio
// API — no audio files. Everything is short, punchy, and arcade-flavored:
// oscillator blips and noise bursts shaped with fast envelopes, in the same
// spirit as procedurally-generated SFX (no pre-recorded assets to license
// or ship).

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

function envelopeGain(audio: AudioContext, attack: number, decay: number, peak: number): GainNode {
  const gain = audio.createGain();
  const t0 = audio.currentTime;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  return gain;
}

function blip(freq: number, opts: { duration?: number; type?: OscillatorType; peak?: number; sweepTo?: number } = {}): void {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;

  const { duration = 0.09, type = "square", peak = 0.18, sweepTo } = opts;
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  if (sweepTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(sweepTo, audio.currentTime + duration);
  }

  const gain = envelopeGain(audio, 0.005, duration, peak);
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration + 0.02);
}

function noiseBurst(opts: { duration?: number; peak?: number; filterFreq?: number } = {}): void {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;

  const { duration = 0.08, peak = 0.12, filterFreq = 2200 } = opts;
  const bufferSize = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = audio.createBufferSource();
  noise.buffer = buffer;

  const filter = audio.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = filterFreq;

  const gain = envelopeGain(audio, 0.002, duration, peak);
  noise.connect(filter).connect(gain).connect(audio.destination);
  noise.start();
}

/** A 3D button being pressed — a short, dry mechanical clack.
 *
 * Two layers, both deliberately brief: a clicky high noise transient for
 * the plastic contact, plus a fast downward square sweep for the body of
 * the key travelling. Kept quieter and drier than the gameplay sounds
 * (nothing rings out) because a UI click can fire many times in a row and
 * shouldn't compete with the board's own effects. */
export function playButtonClick(): void {
  noiseBurst({ duration: 0.025, peak: 0.07, filterFreq: 5200 });
  blip(240, { type: "square", duration: 0.045, peak: 0.075, sweepTo: 130 });
}

/** Marble picked up / selected. */
export function playSelect(): void {
  blip(520, { type: "square", duration: 0.05, peak: 0.1 });
}

/** A single glide step while a marble travels its path. */
export function playGlideTick(): void {
  blip(760, { type: "triangle", duration: 0.03, peak: 0.05 });
}

/** Marble settles into its destination (or a spawn lands). */
export function playPlace(): void {
  blip(300, { type: "square", duration: 0.06, peak: 0.14, sweepTo: 220 });
  noiseBurst({ duration: 0.04, peak: 0.06, filterFreq: 3000 });
}

/** Line clear — a rising multi-voice arcade chime, pitch and voice count
 * scale with how many marbles popped, plus a sub thump for weight. */
export function playClear(lineLength: number): void {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;

  const baseFreq = 440;
  const voices = Math.min(3 + Math.floor((lineLength - 5) / 2), 8);
  for (let i = 0; i < voices; i++) {
    const freq = baseFreq * Math.pow(2, i / 6);
    const delay = i * 0.045;
    setTimeout(() => blip(freq, { type: "square", duration: 0.16, peak: 0.14 }), delay * 1000);
  }
  // Sub-bass thump for arcade punch, coincides with the first voice.
  blip(90, { type: "sine", duration: 0.18, peak: 0.22, sweepTo: 55 });
}

/** The Pretender topples off his pedestal when the table fills up — a low,
 * wavering, detuned "Boooooo" crowd jeer. Three sawtooth voices, each with
 * its own vibrato rate and slight downward pitch bend, lowpass-filtered so
 * it reads as a vocal jeer rather than a synth chord. */
export function playPretenderBoo(): void {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;

  const duration = 0.9;
  const t0 = audio.currentTime;

  [140, 150, 132].forEach((freq, i) => {
    const osc = audio.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.linearRampToValueAtTime(freq * 0.85, t0 + duration);

    const vibrato = audio.createOscillator();
    vibrato.frequency.value = 5 + i;
    const vibratoGain = audio.createGain();
    vibratoGain.gain.value = 8;
    vibrato.connect(vibratoGain).connect(osc.frequency);

    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.12, t0 + 0.15);
    gain.gain.setValueAtTime(0.12, t0 + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(filter).connect(gain).connect(audio.destination);
    osc.start(t0);
    vibrato.start(t0);
    osc.stop(t0 + duration + 0.05);
    vibrato.stop(t0 + duration + 0.05);
  });
}

/** Win — the Pretender dethrones the King: a short triumphant ascending fanfare. */
export function playWin(): void {
  const notes = [392, 523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => blip(freq, { type: "square", duration: 0.2, peak: 0.18 }), i * 110);
  });
}

/** The King tumbles off his pedestal when the Pretender dethrones him — this
 * is the player's win, so it plays as a bouncy, comical "boioioing" spring
 * wobble (a decaying pitch LFO) rather than a scream, landing in a soft
 * thud right as playWin's fanfare kicks in. */
export function playKingFall(): void {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;

  const duration = 1.0;
  const t0 = audio.currentTime;

  const spring = audio.createOscillator();
  spring.type = "sine";
  spring.frequency.setValueAtTime(420, t0);

  const wobble = audio.createOscillator();
  wobble.frequency.value = 12;
  const wobbleGain = audio.createGain();
  wobbleGain.gain.setValueAtTime(150, t0);
  wobbleGain.gain.exponentialRampToValueAtTime(4, t0 + duration);
  wobble.connect(wobbleGain).connect(spring.frequency);

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(0.2, t0 + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  spring.connect(gain).connect(audio.destination);
  spring.start(t0);
  wobble.start(t0);
  spring.stop(t0 + duration + 0.05);
  wobble.stop(t0 + duration + 0.05);

  setTimeout(
    () => {
      blip(220, { type: "square", duration: 0.12, peak: 0.16, sweepTo: 150 });
    },
    duration * 1000 * 0.9,
  );
}

/** Resumes the audio context on first user gesture (browsers block autoplay). */
export function primeAudio(): void {
  getCtx();
}
