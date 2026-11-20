import { getAudioContext, getAudioOutput, subscribeAudio } from "@/lib/audioContext";

export type GappedAmbientOptions = {
  url: string;
  volume: number;
  /** Silence after each full play before the next. */
  gapMs: number;
  fadeInMs: number;
  fadeOutMs: number;
};

/**
 * Plays a short ambience file to the end, waits `gapMs`, then plays again. Fades in/out on
 * start/stop like AmbientLoop. Waits until Web Audio is allowed and the file has loaded.
 */
export class GappedAmbient {
  private options: GappedAmbientOptions;
  private buffer: Promise<AudioBuffer | null> | null = null;
  private master: GainNode | null = null;
  private wanted = false;
  private active = false;
  private gapTimer = 0;
  private source: AudioBufferSourceNode | null = null;

  constructor(options: GappedAmbientOptions) {
    this.options = options;
  }

  private async decode(url: string, ctx: AudioContext): Promise<AudioBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`gapped ambient fetch ${response.status}: ${url}`);
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
  }

  private load(ctx: AudioContext) {
    this.buffer ??= this.decode(this.options.url, ctx).catch((error: unknown) => {
      console.error(error);
      return null;
    });
    return this.buffer;
  }

  private clearGapTimer() {
    window.clearTimeout(this.gapTimer);
    this.gapTimer = 0;
  }

  private stopSource() {
    const source = this.source;
    if (!source) return;
    this.source = null;
    try {
      source.stop();
    } catch {
      // already ended
    }
    source.disconnect();
  }

  private playOnce(ctx: AudioContext, buffer: AudioBuffer) {
    if (!this.wanted || !this.master) return;
    this.stopSource();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.master);
    source.onended = () => {
      if (this.source === source) this.source = null;
      source.disconnect();
      if (!this.wanted || !this.active) return;
      this.clearGapTimer();
      this.gapTimer = window.setTimeout(() => {
        if (this.wanted && this.active) this.playOnce(ctx, buffer);
      }, this.options.gapMs);
    };
    this.source = source;
    source.start(0);
  }

  start() {
    this.wanted = true;
    const ctx = getAudioContext();
    if (this.active) return;
    if (!ctx) {
      const off = subscribeAudio(() => {
        const next = getAudioContext();
        if (next?.state === "running") {
          off();
          if (this.wanted) this.start();
        }
      });
      return;
    }
    void this.load(ctx).then((buffer) => {
      if (!buffer || !this.wanted || this.active) return;
      if (ctx.state !== "running") {
        const retry = () => {
          if (ctx.state === "running") {
            ctx.removeEventListener("statechange", retry);
            if (this.wanted) this.start();
          }
        };
        ctx.addEventListener("statechange", retry);
        return;
      }
      this.active = true;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(
        this.options.volume,
        ctx.currentTime + this.options.fadeInMs / 1000,
      );
      master.connect(getAudioOutput(ctx));
      this.master = master;
      this.playOnce(ctx, buffer);
    });
  }

  stop() {
    this.wanted = false;
    this.active = false;
    this.clearGapTimer();
    this.stopSource();
    const ctx = getAudioContext();
    const master = this.master;
    if (!ctx || !master) {
      this.master = null;
      return;
    }
    const end = ctx.currentTime + this.options.fadeOutMs / 1000;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, end);
    window.setTimeout(() => {
      master.disconnect();
    }, this.options.fadeOutMs + 50);
    this.master = null;
  }
}