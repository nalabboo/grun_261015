import { INTRO_SCRATCH_SOUND } from "@/constants/introConfig";
import { getAudioContext, getAudioOutput } from "@/lib/audioContext";

/**
 * "슥삭슥삭" while the reader rubs the intro title, synthesised with Web Audio (no sound file).
 * A looping paper-rub noise runs while the pointer is down; its loudness follows the pointer
 * speed (so each back-and-forth stroke swells and fades) and dies away as soon as the pointer
 * stops. A gritty high layer gets stronger on fast strokes; the stroke direction tints the tone.
 */

type Voice = {
  source: AudioBufferSourceNode;
  body: BiquadFilterNode;
  bodyGain: GainNode;
  gritGain: GainNode;
  out: GainNode;
};

let noise: AudioBuffer | null = null;
let voice: Voice | null = null;
let last: { x: number; y: number; t: number } | null = null;
let speed = 0;

function getNoise(ctx: AudioContext) {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  const length = ctx.sampleRate * 2;
  noise = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let soft = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    soft = 0.85 * soft + 0.15 * white;
    // Uneven paper fibres: little random bumps in the grain.
    const fibre = Math.random() < 0.004 ? (Math.random() * 2 - 1) * 2.5 : 0;
    data[i] = white * 0.45 + soft * 1.2 + fibre;
  }
  return noise;
}

function startVoice(): Voice | null {
  if (!INTRO_SCRATCH_SOUND.enabled) return null;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return null;
  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);
  source.loop = true;

  const out = ctx.createGain();
  out.gain.value = INTRO_SCRATCH_SOUND.volume;
  out.connect(getAudioOutput(ctx));

  // Body: the soft "슥" of eraser on paper.
  const body = ctx.createBiquadFilter();
  body.type = "bandpass";
  body.frequency.value = INTRO_SCRATCH_SOUND.toneHz;
  body.Q.value = 0.7;
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0;
  source.connect(body).connect(bodyGain).connect(out);

  // Grit: the crisp "삭" of fast strokes.
  const grit = ctx.createBiquadFilter();
  grit.type = "highpass";
  grit.frequency.value = 5200;
  const gritGain = ctx.createGain();
  gritGain.gain.value = 0;
  source.connect(grit).connect(gritGain).connect(out);

  source.start(0, Math.random() * 1.5);
  return { source, body, bodyGain, gritGain, out };
}

/** Pointer went down on the title. */
export function scratchSoundStart(x: number, y: number) {
  last = { x, y, t: performance.now() };
  speed = 0;
  voice ??= startVoice();
}

/** Pointer moved while rubbing. */
export function scratchSoundMove(x: number, y: number) {
  const now = performance.now();
  // The first pointerdown may only just have switched sound on: start late if needed.
  voice ??= startVoice();
  if (!last) {
    last = { x, y, t: now };
    return;
  }
  const dx = x - last.x;
  const dy = y - last.y;
  const dt = Math.max(4, now - last.t);
  last = { x, y, t: now };
  const instant = Math.hypot(dx, dy) / dt;
  speed = speed * 0.6 + instant * 0.4;
  if (!voice) return;

  const ctx = voice.source.context;
  const at = ctx.currentTime;
  const level = Math.min(1, speed / INTRO_SCRATCH_SOUND.fullSpeedPxPerMs);
  const body = level ** 0.8 * 0.9;
  const grit = level ** 1.6 * 0.45;
  // Strokes to the right / down a little brighter than strokes back.
  const direction = Math.sign(dx + dy * 0.5) || 1;
  const tone =
    INTRO_SCRATCH_SOUND.toneHz *
    (1 + direction * INTRO_SCRATCH_SOUND.directionTone * 0.5) *
    (0.85 + level * 0.3);

  for (const [param, value] of [
    [voice.bodyGain.gain, body],
    [voice.gritGain.gain, grit],
  ] as const) {
    param.cancelScheduledValues(at);
    param.setTargetAtTime(value, at, 0.02);
    // Fades out by itself unless the next move keeps it going.
    param.setTargetAtTime(0, at + 0.06, 0.05);
  }
  voice.body.frequency.cancelScheduledValues(at);
  voice.body.frequency.setTargetAtTime(tone, at, 0.03);
}

/** Pointer lifted / left. */
export function scratchSoundEnd() {
  last = null;
  speed = 0;
  const current = voice;
  voice = null;
  if (!current) return;
  const ctx = current.source.context;
  const at = ctx.currentTime;
  current.out.gain.cancelScheduledValues(at);
  current.out.gain.setTargetAtTime(0, at, 0.04);
  current.source.stop(at + 0.3);
  current.source.onended = () => current.out.disconnect();
}
