/**
 * One shared Web Audio context for all sound (page-turn sound, wind, footsteps…), with one master
 * output that every sound routes through.
 *
 * Browsers only let a page make sound after the reader has clicked / pressed a key / touched it
 * (scrolling doesn't count). `armAudio` listens for the first such input anywhere on the page
 * (rubbing the intro title counts). After unlock, output stays on.
 *
 * Safari is strict: the context is only created inside such an input handler (one made earlier
 * may never be allowed to start), and it is "unlocked" there by playing a tiny silent buffer.
 * HTML BGM must not `play()` before Web Audio `resume()` — it can leave the context suspended.
 */

let context: AudioContext | null = null;
let master: GainNode | null = null;
const listeners = new Set<() => void>();
/** BGM `HTMLAudioElement.play()` — only after Web Audio is running, or from this queue at gesture end. */
const gestureRunQueue: Array<() => void> = [];

/** The shared context, or null until the reader's first click / key / touch created it. */
export function getAudioContext() {
  return context;
}

function createAudioContext() {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    context.addEventListener("statechange", notify);
  }
  return context;
}

/** Where every sound connects to (instead of `ctx.destination`). */
export function getAudioOutput(ctx: AudioContext) {
  if (!master || master.context !== ctx) {
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  return master;
}

function notify() {
  for (const listener of listeners) listener();
}

/** Notify when the context is created or starts running (e.g. ambient loop). */
export function subscribeAudio(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isAudioRunning() {
  return context?.state === "running";
}

// Pointer / mouse up too: the intro calls preventDefault on pointerdown (rubbing), which in
// Safari stops the click that would otherwise count as the reader's gesture.
const UNLOCK_EVENTS = [
  "pointerdown",
  "pointerup",
  "mousedown",
  "mouseup",
  "click",
  "keydown",
  "keyup",
  "touchstart",
  "touchend",
] as const;

const GESTURE_EVENTS = new Set(["pointerdown", "touchstart", "mousedown", "keydown"]);

function detachUnlockListeners() {
  for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlockAudio, true);
}

function playSilentUnlock(ctx: AudioContext) {
  try {
    const silent = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = silent;
    source.connect(ctx.destination);
    source.start(0);
    const tap = ctx.createBufferSource();
    tap.buffer = silent;
    tap.connect(getAudioOutput(ctx));
    tap.start(0);
  } catch {
    // ignore
  }
}

function drainGestureQueue() {
  while (gestureRunQueue.length > 0) {
    const fn = gestureRunQueue.shift();
    try {
      fn?.();
    } catch {
      // ignore
    }
  }
}

/** Queue BGM `play()` until Web Audio is running (do not run Web Audio work here). */
export function runInAudioUnlockGesture(fn: () => void) {
  if (isAudioRunning()) {
    fn();
    return;
  }
  gestureRunQueue.push(fn);
}

/** Run once Web Audio is allowed (after unlock / resume). */
export function whenAudioRunning(fn: (ctx: AudioContext) => void) {
  const ctx = getAudioContext();
  if (ctx?.state === "running") {
    fn(ctx);
    return;
  }
  if (!ctx) {
    const off = subscribeAudio(() => {
      const next = getAudioContext();
      if (next?.state === "running") {
        off();
        fn(next);
      }
    });
    return;
  }
  const onState = () => {
    if (ctx.state === "running") {
      ctx.removeEventListener("statechange", onState);
      fn(ctx);
    }
  };
  ctx.addEventListener("statechange", onState);
  const off = subscribeAudio(() => {
    if (ctx.state === "running") {
      off();
      ctx.removeEventListener("statechange", onState);
      fn(ctx);
    }
  });
}

function finishUnlock(ctx: AudioContext) {
  if (ctx.state === "running") detachUnlockListeners();
  drainGestureQueue();
  notify();
}

/** Switches sound on. Must run inside a click / key / touch handler (Safari). */
export function unlockAudio() {
  const ctx = createAudioContext();
  if (!ctx) return;
  if (ctx.state === "running") {
    finishUnlock(ctx);
    return;
  }
  playSilentUnlock(ctx);
  void ctx
    .resume()
    .then(() => finishUnlock(ctx))
    .catch(() => notify());
  notify();
}

/** Call once (any time): sound gets switched on at the reader's first click / key / touch. */
export function armAudio() {
  if (typeof window === "undefined") return;
  for (const type of UNLOCK_EVENTS) {
    const passive = GESTURE_EVENTS.has(type) ? false : true;
    window.addEventListener(type, unlockAudio, { capture: true, passive });
  }
}