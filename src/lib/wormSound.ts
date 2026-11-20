import { WORM_TRANSFORM_SOUND, assetUrl } from "@/constants/sceneConfig";
import { getAudioOutput, whenAudioRunning } from "@/lib/audioContext";

let buffer: Promise<AudioBuffer | null> | null = null;

async function decodeWorm(ctx: AudioContext): Promise<AudioBuffer | null> {
  try {
    const url = assetUrl(WORM_TRANSFORM_SOUND.file);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`worm sound fetch ${response.status}: ${url}`);
    const data = await response.arrayBuffer();
    return await ctx.decodeAudioData(data.slice(0));
  } catch (error: unknown) {
    console.error(error);
    return null;
  }
}

function getBuffer(ctx: AudioContext) {
  buffer ??= decodeWorm(ctx);
  return buffer;
}

/** Plays once when the worm starts transforming (grey → green). */
export function playWormTransformSound() {
  if (!WORM_TRANSFORM_SOUND.enabled) return;
  whenAudioRunning((ctx) => {
  void getBuffer(ctx).then((audio) => {
    if (!audio || ctx.state !== "running") return;
    const source = ctx.createBufferSource();
    source.buffer = audio;
    if (WORM_TRANSFORM_SOUND.playbackRate !== 1) {
      source.playbackRate.value = WORM_TRANSFORM_SOUND.playbackRate;
    }
    const gain = ctx.createGain();
    gain.gain.value = WORM_TRANSFORM_SOUND.volume;
    source.connect(gain).connect(getAudioOutput(ctx));
    source.start(ctx.currentTime + 0.02);
    source.onended = () => gain.disconnect();
  });
  });
}