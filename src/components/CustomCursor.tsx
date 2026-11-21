"use client";

import { useEffect, useRef } from "react";
import { CUSTOM_CURSOR } from "@/constants/cursorConfig";

/**
 * Replaces the mouse cursor with the green brush star (hidden on touch screens). Turning the
 * mouse wheel spins it. The native cursor is hidden via `.custom-cursor-on` in globals.css.
 */
export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CUSTOM_CURSOR.enabled) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;
    document.documentElement.classList.add("custom-cursor-on");

    let x = -100;
    let y = -100;
    let angle = 0;
    let targetAngle = 0;
    let visible = false;
    let frame = 0;

    const draw = () => {
      frame = 0;
      angle += (targetAngle - angle) * CUSTOM_CURSOR.ease;
      if (Math.abs(targetAngle - angle) < 0.05) angle = targetAngle;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${angle}deg)`;
      if (angle !== targetAngle) frame = requestAnimationFrame(draw);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const show = (on: boolean) => {
      if (visible === on) return;
      visible = on;
      el.style.opacity = on ? "1" : "0";
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      x = event.clientX;
      y = event.clientY;
      show(true);
      schedule();
    };
    const onWheel = (event: WheelEvent) => {
      // Lines / pages → px, roughly.
      const px = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
      const step = Math.max(
        -CUSTOM_CURSOR.maxStepDeg,
        Math.min(CUSTOM_CURSOR.maxStepDeg, px * CUSTOM_CURSOR.degPerWheelPx),
      );
      targetAngle += step;
      schedule();
    };
    const onLeave = () => show(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("wheel", onWheel);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("custom-cursor-on");
    };
  }, []);

  if (!CUSTOM_CURSOR.enabled) return null;
  return (
    <div
      ref={ref}
      className="custom-cursor"
      aria-hidden
      style={{
        width: CUSTOM_CURSOR.sizePx,
        height: CUSTOM_CURSOR.sizePx,
        backgroundImage: `url(${CUSTOM_CURSOR.url})`,
      }}
    />
  );
}
