import { GRUN_FOOTSTEPS } from "@/constants/sceneConfig";
import { getAudioOutput, whenAudioRunning } from "@/lib/audioContext";

/**
 * Grun's bare feet on grass, synthesised with Web Audio (no sound file): every footfall is a
 * soft, low thud of the foot (muffled noise) plus the grass brushing round it (a short airy
 * swish and a few tiny crackles of blades). Every step is a little different.
 */

let noise: AudioBuffer | null = null;

function getNoise(ctx: AudioContext) {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = 0.9 * last + 0.1 * white;
    data[i] = white * 0.5 + last * 2;
  }
  return noise;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function burst(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  duration: number,
  gain: number,
  type: BiquadFilterType,
  frequency: number,
  q: number,
  attack: number,
  frequencyEnd?: number,
) {
  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(frequency, at);
  if (frequencyEnd) filter.frequency.exponentialRampToValueAtTime(frequencyEnd, at + duration);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), at + duration * attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(filter).connect(amp).connect(out);
  source.start(at, Math.random() * 0.8, duration + 0.05);
  source.onended = () => amp.disconnect();
}

/** One footfall. `strength` 0..1 (slower steps are softer). */
function playFootstepOnContext(ctx: AudioContext, strength: number) {
  const s = Math.max(0.15, Math.min(1, strength)) * rand(0.8, 1);
  const out = ctx.createGain();
  out.gain.value = GRUN_FOOTSTEPS.volume * s;
  out.connect(getAudioOutput(ctx));
  const at = ctx.currentTime + 0.005;

  // Heel, then the ball of the foot: two soft thuds close together (not too low, so laptop
  // speakers still play them).
  burst(ctx, out, at, rand(0.07, 0.1), 0.9, "lowpass", rand(280, 400), 0.9, 0.15);
  burst(ctx, out, at + rand(0.04, 0.07), rand(0.06, 0.09), 0.55, "lowpass", rand(360, 520), 0.8, 0.2);
  // Grass brushing round the foot: an airy swish.
  burst(ctx, out, at + 0.01, rand(0.12, 0.2), 0.45, "bandpass", rand(2400, 3600), 0.7, 0.3, rand(4500, 6500));
  // A few blades bending / snapping softly.
  const blades = Math.round(rand(2, 5));
  for (let i = 0; i < blades; i++) {
    burst(ctx, out, at + rand(0, 0.12), rand(0.006, 0.016), rand(0.12, 0.3), "highpass", rand(3500, 7000), 0.7, 0.1);
  }

  window.setTimeout(() => out.disconnect(), 600);
}

/** One footfall. `strength` 0..1 (slower steps are softer). */
export function playFootstep(strength = 1) {
  if (!GRUN_FOOTSTEPS.enabled) return;
  whenAudioRunning((ctx) => playFootstepOnContext(ctx, strength));
}
