"use client";

import { SCENE1_TABLEAU_GIGGLING, assetUrl } from "@/constants/sceneConfig";
import { getAudioOutput, whenAudioRunning } from "@/lib/audioContext";

let buffer: Promise<AudioBuffer | null> | null = null;

async function decodeGiggling(ctx: AudioContext): Promise<AudioBuffer | null> {
  try {
    const url = assetUrl(SCENE1_TABLEAU_GIGGLING.file);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`giggling fetch ${response.status}: ${url}`);
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
  buffer ??= decodeGiggling(ctx);
  return buffer;
}

/** Once when chapter 1 switches to the closing tableau (NextScene). */
export function playScene1TableauGigglingSound() {
  if (!SCENE1_TABLEAU_GIGGLING.enabled) return;
  whenAudioRunning((ctx) => {
    void getBuffer(ctx).then((audio) => {
      if (!audio || ctx.state !== "running") return;
      const at = ctx.currentTime + 0.02 + SCENE1_TABLEAU_GIGGLING.delayMs / 1000;
      const source = ctx.createBufferSource();
      source.buffer = audio;
      if (SCENE1_TABLEAU_GIGGLING.playbackRate !== 1) {
        source.playbackRate.value = SCENE1_TABLEAU_GIGGLING.playbackRate;
      }
      const gain = ctx.createGain();
      gain.gain.value = SCENE1_TABLEAU_GIGGLING.volume;
      source.connect(gain).connect(getAudioOutput(ctx));
      source.start(at);
      source.onended = () => gain.disconnect();
    });
  });
}