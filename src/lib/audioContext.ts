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
 */

let context: AudioContext | null = null;
let master: GainNode | null = null;
const listeners = new Set<() => void>();

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

function detachUnlockListeners() {
  for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlockAudio, true);
}

/** Switches sound on. Must run inside a click / key / touch handler (Safari). */
export function unlockAudio() {
  const ctx = createAudioContext();
  if (!ctx) return;
  if (ctx.state === "running") {
    detachUnlockListeners();
    notify();
    return;
  }
  // Safari: a silent sound played right inside the gesture unlocks the context (same output path as the rest of the app).
  try {
    const silent = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = silent;
    source.connect(getAudioOutput(ctx));
    source.start(0);
  } catch {
    // ignore
  }
  void ctx.resume().then(() => {
    if (ctx.state === "running") detachUnlockListeners();
    notify();
  });
  notify();
}

/** Call once (any time): sound gets switched on at the reader's first click / key / touch. */
export function armAudio() {
  if (typeof window === "undefined") return;
  for (const type of UNLOCK_EVENTS) {
    window.addEventListener(type, unlockAudio, { capture: true, passive: true });
  }
}
