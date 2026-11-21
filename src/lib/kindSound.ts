import { KIND_TRANSFORM_SOUND, assetUrl } from "@/constants/sceneConfig";
import { getAudioOutput, whenAudioRunning } from "@/lib/audioContext";

let bufferWav: Promise<AudioBuffer | null> | null = null;
let bufferMp3: Promise<AudioBuffer | null> | null = null;

async function decodeSound(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`kind sound fetch ${response.status}: ${url}`);
    const data = await response.arrayBuffer();
    try {
      return await ctx.decodeAudioData(data.slice(0));
    } catch (first) {
      if (url.endsWith(".mp3")) {
        const wavUrl = `${url.slice(0, -4)}.wav`;
        const wavRes = await fetch(wavUrl);
        if (!wavRes.ok) throw first;
        const wavData = await wavRes.arrayBuffer();
        return await ctx.decodeAudioData(wavData.slice(0));
      }
      throw first;
    }
  } catch (error: unknown) {
    console.error(error);
    return null;
  }
}

function getWavBuffer(ctx: AudioContext) {
  bufferWav ??= decodeSound(ctx, assetUrl(KIND_TRANSFORM_SOUND.file));
  return bufferWav;
}

function getMp3Buffer(ctx: AudioContext) {
  bufferMp3 ??= decodeSound(ctx, assetUrl(KIND_TRANSFORM_SOUND.file2));
  return bufferMp3;
}

function playClip(
  ctx: AudioContext,
  buffer: AudioBuffer,
  volume: number,
  playbackRate: number,
  at: number,
) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  if (playbackRate !== 1) source.playbackRate.value = playbackRate;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(getAudioOutput(ctx));
  source.start(at);
  const duration = buffer.duration / (playbackRate || 1);
  source.onended = () => gain.disconnect();
  return { source, duration };
}

/** Plays kind.mp3, then laugh.mp3 right after (kid grey → green). */
export function playKindTransformSound() {
  if (!KIND_TRANSFORM_SOUND.enabled) return;
  whenAudioRunning((ctx) => {
    void Promise.all([getWavBuffer(ctx), getMp3Buffer(ctx)]).then(([wav, mp3]) => {
      if (ctx.state !== "running") return;
      const t0 = ctx.currentTime + 0.02 + KIND_TRANSFORM_SOUND.delayMs / 1000;
      if (!wav) {
        if (mp3) {
          playClip(ctx, mp3, KIND_TRANSFORM_SOUND.volume2, KIND_TRANSFORM_SOUND.playbackRate2, t0);
        }
        return;
      }
      const first = playClip(
        ctx,
        wav,
        KIND_TRANSFORM_SOUND.volume,
        KIND_TRANSFORM_SOUND.playbackRate,
        t0,
      );
      if (!mp3) return;
      const t1 = t0 + first.duration;
      playClip(ctx, mp3, KIND_TRANSFORM_SOUND.volume2, KIND_TRANSFORM_SOUND.playbackRate2, t1);
    });
  });
}