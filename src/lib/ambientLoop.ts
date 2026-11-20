import { getAudioContext, getAudioOutput, subscribeAudio } from "@/lib/audioContext";

export type AmbientLoopOptions = {
  url: string;
  /** Loudness, 0..1 (and above to boost). */
  volume: number;
  fadeInMs: number;
  fadeOutMs: number;
  /** Each pass overlaps the next by this much, so the loop never dips (the file fades in/out). */
  crossfadeMs: number;
};

/**
 * A long sound (e.g. wind) played on a seamless loop: each pass starts `crossfadeMs` before the
 * previous one ends and the two cross-fade. `start` / `stop` fade the whole thing in and out.
 * Waits quietly until sound is allowed (see audioContext.ts) and the file has loaded.
 */
export class AmbientLoop {
  private options: AmbientLoopOptions;
  private buffer: Promise<AudioBuffer | null> | null = null;
  private master: GainNode | null = null;
  private wanted = false;
  private playing = false;
  private timer = 0;
  private sources: AudioBufferSourceNode[] = [];

  constructor(options: AmbientLoopOptions) {
    this.options = options;
  }

  private async decodeAmbientFile(ctx: AudioContext, url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`ambient fetch ${response.status}: ${url}`);
    const data = await response.arrayBuffer();
    // Copy before decode — Safari can detach the backing buffer after the first decode attempt.
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
    this.buffer ??= this.decodeAmbientFile(ctx, this.options.url).catch((error: unknown) => {
      console.error(error);
      return null;
    });
    return this.buffer;
  }

  /** Fade in (once sound is allowed and loaded). */
  start() {
    this.wanted = true;
    const ctx = getAudioContext();
    if (this.playing) return;
    if (!ctx) {
      // No sound allowed yet (no click so far): start once the reader's first click made it.
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
      if (!buffer || !this.wanted || this.playing) return;
      if (ctx.state !== "running") {
        // Not allowed yet: try again once the reader has clicked / pressed a key.
        const retry = () => {
          if (ctx.state === "running") {
            ctx.removeEventListener("statechange", retry);
            if (this.wanted) this.start();
          }
        };
        ctx.addEventListener("statechange", retry);
        return;
      }
      this.playing = true;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(
        this.options.volume,
        ctx.currentTime + this.options.fadeInMs / 1000,
      );
      master.connect(getAudioOutput(ctx));
      this.master = master;
      this.schedulePass(ctx, buffer, ctx.currentTime, false);
    });
  }

  /** Fade out and stop. */
  stop() {
    this.wanted = false;
    const ctx = getAudioContext();
    const master = this.master;
    if (!ctx || !master || !this.playing) return;
    this.playing = false;
    window.clearTimeout(this.timer);
    const end = ctx.currentTime + this.options.fadeOutMs / 1000;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, end);
    const sources = this.sources;
    this.sources = [];
    window.setTimeout(() => {
      for (const source of sources) {
        try {
          source.stop();
        } catch {
          // already stopped
        }
      }
      master.disconnect();
    }, this.options.fadeOutMs + 100);
    this.master = null;
  }

  /** One pass of the file from `at`; the next pass is set up to overlap its end. */
  private schedulePass(ctx: AudioContext, buffer: AudioBuffer, at: number, fadeIn: boolean) {
    const master = this.master;
    if (!master) return;
    const xfade = Math.min(this.options.crossfadeMs / 1000, buffer.duration / 3);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(fadeIn ? 0 : 1, at);
    if (fadeIn) gain.gain.linearRampToValueAtTime(1, at + xfade);
    const nextAt = at + buffer.duration - xfade;
    gain.gain.setValueAtTime(1, nextAt);
    gain.gain.linearRampToValueAtTime(0, at + buffer.duration);
    source.connect(gain).connect(master);
    source.start(at);
    source.onended = () => {
      this.sources = this.sources.filter((s) => s !== source);
      gain.disconnect();
    };
    this.sources.push(source);
    // Set up the next pass a little ahead of time.
    const leadMs = Math.max(0, (nextAt - ctx.currentTime - 1) * 1000);
    this.timer = window.setTimeout(() => {
      if (this.playing && this.master === master) this.schedulePass(ctx, buffer, nextAt, true);
    }, leadMs);
  }
}
