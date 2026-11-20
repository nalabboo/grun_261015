import { PAGE_TURN_SOUND } from "@/constants/pageTurnConfig";
import { assetUrl } from "@/constants/sceneConfig";
import { armAudio, getAudioOutput, whenAudioRunning } from "@/lib/audioContext";

/**
 * Paper page-turn sound from `scene1/sound/papier.mp3`, once per PageFlipOverlay run.
 *
 * Browsers only let a page make sound after the reader has clicked / pressed a key / touched it
 * (scrolling doesn't count). Sound is armed at the reader's first such input on the page.
 */

let buffer: Promise<AudioBuffer | null> | null = null;

async function decodePageFlip(ctx: AudioContext): Promise<AudioBuffer | null> {
  try {
    const url = assetUrl(PAGE_TURN_SOUND.file);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`page-flip fetch ${response.status}: ${url}`);
    const data = await response.arrayBuffer();
    return await ctx.decodeAudioData(data.slice(0));
  } catch (error: unknown) {
    console.error(error);
    return null;
  }
}

function getBuffer(ctx: AudioContext) {
  buffer ??= decodePageFlip(ctx);
  return buffer;
}

/** Call once (any time): sound gets switched on at the reader's first click / key / touch. */
export const armPageFlipSound = armAudio;

/** Plays the page-turn sound (in step with PageFlipOverlay). */
export function playPageFlipSound() {
  if (!PAGE_TURN_SOUND.enabled) return;
  whenAudioRunning((ctx) => {
    void getBuffer(ctx).then((audio) => {
      if (!audio || ctx.state !== "running") return;
      const source = ctx.createBufferSource();
      source.buffer = audio;
      if (PAGE_TURN_SOUND.playbackRate !== 1) {
        source.playbackRate.value = PAGE_TURN_SOUND.playbackRate;
      }
      const gain = ctx.createGain();
      gain.gain.value = PAGE_TURN_SOUND.volume;
      source.connect(gain).connect(getAudioOutput(ctx));
      const at = ctx.currentTime + 0.02;
      source.start(at);
      source.onended = () => gain.disconnect();
    });
  });
}