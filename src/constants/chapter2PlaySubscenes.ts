/**
 * Chapter 2 **play** sub-scenes — all in `Chapter2Scene` unless noted.
 *
 * ## 2-1
 * Scroll raw **0**. Baseline berg stack, marimos, grun_v, worm_g, spores at full scale.
 * No Nari, no gelb (새/나비), no y2 bergs.
 *
 * ## 2-2 (current production milestone)
 * One wheel down → auto playback (`chapter2SubscenePlayback.ts`) runs scroll raw **0 → max**
 * (`chapter2ScrollMotion.ts`): Nari fade-in, g_vogel, berg y2 + Y drift, grun shrink (after berg),
 * spore stagger shrink, nabi fly-in, marimo exits. Ends on **2-2 hold** (full 2-2 layout).
 *
 * ## 2-3
 * **3 s** after 2-2 hold, **scroll down** (accumulated wheel) → `2-3-playing`.
 * First beat: **라우블**, berg y2→b2 + drop, spore / gelb exits — `chapter2Subscene23Motion.ts`.
 */

export const CHAPTER2_PLAY_SUBSCENES = ["2-1", "2-2", "2-3"] as const;
export type Chapter2PlaySubscene = (typeof CHAPTER2_PLAY_SUBSCENES)[number];

/** Opening baseline (alias for docs / dev). */
export const CHAPTER2_PLAY_SUBSCENE_2_1 = "2-1" as const satisfies Chapter2PlaySubscene;

/** Nari + yellow gelb + y2 bergs + spore segment end state. */
export const CHAPTER2_PLAY_SUBSCENE_2_2 = "2-2" as const satisfies Chapter2PlaySubscene;

/** Post–2-2 scroll chapter (motion not wired yet). */
export const CHAPTER2_PLAY_SUBSCENE_2_3 = "2-3" as const satisfies Chapter2PlaySubscene;
