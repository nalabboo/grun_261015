import { getAudioContext, getAudioOutput, subscribeAudio } from "@/lib/audioContext";

export type BgmLoopOptions = {
  url: string;
  volume: number;
  fadeInMs: number;
  fadeOutMs: number;
};

/**
 * Chapter BGM: one file on `AudioBufferSourceNode.loop`, faded in/out on start/stop. Waits until
 * Web Audio is allowed and the file has loaded.
 */
export class BgmLoop {
  private options: BgmLoopOptions;
  private buffer: Promise<AudioBuffer | null> | null = null;
  private master: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private wanted = false;
  private active = false;

  constructor(options: BgmLoopOptions) {
    this.options = options;
  }

  private async decode(url: string, ctx: AudioContext): Promise<AudioBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`bgm fetch ${response.status}: ${url}`);
    const data = await response.arrayBuffer();
    return await ctx.decodeAudioData(data.slice(0));
  }

  private load(ctx: AudioContext) {
    this.buffer ??= this.decode(this.options.url, ctx).catch((error: unknown) => {
      console.error(error);
      return null;
    });
    return this.buffer;
  }

  private stopSource() {
    const source = this.source;
    if (!source) return;
    this.source = null;
    try {
      source.stop();
    } catch {
      // already stopped
    }
    source.disconnect();
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
    void this.load(ctx).then((audio) => {
      if (!audio || !this.wanted || this.active) return;
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
      const source = ctx.createBufferSource();
      source.buffer = audio;
      source.loop = true;
      source.connect(master);
      source.start(0);
      this.source = source;
    });
  }

  stop() {
    this.wanted = false;
    this.active = false;
    const ctx = getAudioContext();
    const master = this.master;
    if (!ctx || !master) {
      this.stopSource();
      this.master = null;
      return;
    }
    const end = ctx.currentTime + this.options.fadeOutMs / 1000;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, end);
    window.setTimeout(() => {
      this.stopSource();
      master.disconnect();
    }, this.options.fadeOutMs + 50);
    this.master = null;
  }
}