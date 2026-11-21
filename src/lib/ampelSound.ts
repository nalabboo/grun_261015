"use client";

import { AMPEL_TRANSFORM_SOUND, assetUrl } from "@/constants/sceneConfig";
import { getAudioOutput, whenAudioRunning } from "@/lib/audioContext";

let buffer: Promise<AudioBuffer | null> | null = null;

async function decodeAmpel(ctx: AudioContext): Promise<AudioBuffer | null> {
  try {
    const url = assetUrl(AMPEL_TRANSFORM_SOUND.file);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`ampel sound fetch ${response.status}: ${url}`);
    const data = await response.arrayBuffer();
    try {
      return await ctx.decodeAudioData(data.slice(0));
    } catch (first) {
      if (url.includes(".mp3")) {
        const wavUrl = url.replace(/\.mp3(\?.*)?$/, ".wav$1");
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

function getBuffer(ctx: AudioContext) {
  buffer ??= decodeAmpel(ctx);
  return buffer;
}

/** Plays once when the traffic light is clicked (red → green clip). */
export function playAmpelTransformSound() {
  if (!AMPEL_TRANSFORM_SOUND.enabled) return;
  whenAudioRunning((ctx) => {
    void getBuffer(ctx).then((audio) => {
      if (!audio || ctx.state !== "running") return;
      const source = ctx.createBufferSource();
      source.buffer = audio;
      if (AMPEL_TRANSFORM_SOUND.playbackRate !== 1) {
        source.playbackRate.value = AMPEL_TRANSFORM_SOUND.playbackRate;
      }
      const gain = ctx.createGain();
      gain.gain.value = AMPEL_TRANSFORM_SOUND.volume;
      source.connect(gain).connect(getAudioOutput(ctx));
      source.start(ctx.currentTime + 0.02);
      source.onended = () => gain.disconnect();
    });
  });
}