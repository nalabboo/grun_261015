import {
  isAudioRunning,
  runInAudioUnlockGesture,
  subscribeAudio,
} from "@/lib/audioContext";

export type BgmLoopOptions = {
  url: string;
  volume: number;
  fadeInMs: number;
  fadeOutMs: number;
};

/**
 * Chapter BGM via HTMLMediaElement (no `createMediaElementSource` — Safari is flaky unless
 * `play()` runs in the same gesture). Volume / fade use `audio.volume` only.
 */
export class BgmLoop {
  private options: BgmLoopOptions;
  private audio: HTMLAudioElement | null = null;
  private fadeTimer = 0;
  private unlockWaitOff: (() => void) | null = null;
  private wanted = false;
  private active = false;

  constructor(options: BgmLoopOptions) {
    this.options = options;
  }

  private clearUnlockWait() {
    this.unlockWaitOff?.();
    this.unlockWaitOff = null;
  }

  private ensureAudio() {
    if (!this.audio) {
      const audio = new Audio(this.options.url);
      audio.loop = true;
      audio.preload = "auto";
      this.audio = audio;
    }
    return this.audio;
  }

  private clearFade() {
    window.clearInterval(this.fadeTimer);
    this.fadeTimer = 0;
  }

  private fadeTo(volume: number, durationMs: number, onDone?: () => void) {
    const audio = this.audio;
    if (!audio) return;
    this.clearFade();
    const from = audio.volume;
    const start = performance.now();
    this.fadeTimer = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / durationMs);
      audio.volume = from + (volume - from) * t;
      if (t >= 1) {
        this.clearFade();
        onDone?.();
      }
    }, 32);
  }

  private tryPlay() {
    if (this.active || !this.wanted) return;
    const audio = this.ensureAudio();
    this.active = true;
    audio.volume = 0;
    const playResult = audio.play();
    if (playResult !== undefined) {
      void playResult.catch((error: unknown) => {
        console.error(error);
        this.active = false;
        audio.pause();
      });
    }
    this.fadeTo(this.options.volume, this.options.fadeInMs);
  }

  start() {
    this.wanted = true;
    if (isAudioRunning()) {
      this.clearUnlockWait();
      this.tryPlay();
      return;
    }
    this.clearUnlockWait();
    runInAudioUnlockGesture(() => this.tryPlay());
    this.unlockWaitOff = subscribeAudio(() => {
      if (isAudioRunning()) {
        this.clearUnlockWait();
        if (this.wanted && !this.active) this.tryPlay();
      }
    });
  }

  stop() {
    this.wanted = false;
    this.clearUnlockWait();
    const audio = this.audio;
    if (!audio || !this.active) {
      this.active = false;
      audio?.pause();
      if (audio) audio.currentTime = 0;
      return;
    }
    this.active = false;
    this.fadeTo(0, this.options.fadeOutMs, () => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
}