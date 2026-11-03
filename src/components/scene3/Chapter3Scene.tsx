"use client";

import { useEffect, useRef } from "react";
import {
  CHAPTER3_CAMERA_EASE,
  CHAPTER3_DEPTH,
  CHAPTER3_FADE_FAR,
  CHAPTER3_FADE_NEAR,
  CHAPTER3_FOCAL,
  CHAPTER3_LOOK_EASE,
  CHAPTER3_LOOK_PITCH,
  CHAPTER3_LOOK_SHIFT_X,
  CHAPTER3_LOOK_SHIFT_Y,
  CHAPTER3_LOOK_YAW,
  CHAPTER3_NEAR,
  CHAPTER3_SIZE_EXPONENT,
  CHAPTER3_STAR_FILES,
  CHAPTER3_STARS,
  CHAPTER3_WHEEL_SPEED,
} from "@/constants/chapter3StarsConfig";
import {
  CHAPTER2_STAGE_HEIGHT,
  CHAPTER2_STAGE_WIDTH,
  getChapter2StageFit,
} from "@/constants/chapter2Viewport";

const FAR_Z = CHAPTER3_NEAR + CHAPTER3_DEPTH;

/**
 * Chapter 3 — 3D star field on a canvas. Wheel flies the camera forward and back;
 * the pointer turns and shifts the camera toward itself (parallax by depth).
 */
export default function Chapter3Scene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!scene || !canvas || !ctx) return;

    const images = CHAPTER3_STAR_FILES.map((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      return img;
    });

    let viewW = 0;
    let viewH = 0;
    let fit = getChapter2StageFit(window.innerWidth, window.innerHeight);
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      canvas.width = Math.round(viewW * dpr);
      canvas.height = Math.round(viewH * dpr);
      canvas.style.width = `${viewW}px`;
      canvas.style.height = `${viewH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fit = getChapter2StageFit(viewW, viewH);
    };
    resize();
    window.addEventListener("resize", resize);

    let cameraZ = 0;
    let targetZ = 0;
    /** Pointer in -1..1 from the window center, and the eased view following it. */
    let pointerX = 0;
    let pointerY = 0;
    let lookX = 0;
    let lookY = 0;
    let raf = 0;

    const draw = (now: number) => {
      cameraZ += (targetZ - cameraZ) * CHAPTER3_CAMERA_EASE;
      if (Math.abs(targetZ - cameraZ) < 0.05) cameraZ = targetZ;
      lookX += (pointerX - lookX) * CHAPTER3_LOOK_EASE;
      lookY += (pointerY - lookY) * CHAPTER3_LOOK_EASE;

      const yaw = lookX * CHAPTER3_LOOK_YAW;
      const pitch = lookY * CHAPTER3_LOOK_PITCH;
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      const shiftX = lookX * CHAPTER3_LOOK_SHIFT_X;
      const shiftY = lookY * CHAPTER3_LOOK_SHIFT_Y;

      const dpr = canvas.width / viewW;
      const t = now / 1000;
      const cx = fit.left + (CHAPTER2_STAGE_WIDTH / 2) * fit.scale;
      const cy = fit.top + (CHAPTER2_STAGE_HEIGHT / 2) * fit.scale;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewW, viewH);

      for (const star of CHAPTER3_STARS) {
        const img = images[star.fileIndex];
        if (!img.complete || img.naturalWidth === 0) continue;

        const wrapped = (((star.z - cameraZ) % CHAPTER3_DEPTH) + CHAPTER3_DEPTH) % CHAPTER3_DEPTH;
        const z = CHAPTER3_NEAR + wrapped;
        const fade = Math.min(1, (z - CHAPTER3_NEAR) / CHAPTER3_FADE_NEAR, (FAR_Z - z) / CHAPTER3_FADE_FAR);
        if (fade <= 0) continue;

        const relX = star.x - shiftX;
        const relY = star.y - shiftY;
        const yawX = relX * cosYaw - z * sinYaw;
        const yawZ = relX * sinYaw + z * cosYaw;
        const viewY = relY * cosPitch - yawZ * sinPitch;
        const viewZ = relY * sinPitch + yawZ * cosPitch;
        if (viewZ < CHAPTER3_NEAR) continue;

        const proj = CHAPTER3_FOCAL / viewZ;
        const sx = cx + yawX * proj * fit.scale;
        const sy = cy + viewY * proj * fit.scale;

        const pulse = 0.5 - 0.5 * Math.cos((t / star.twinkleSec) * Math.PI * 2 + star.phase);
        const h =
          star.baseHeightPx * Math.pow(proj, CHAPTER3_SIZE_EXPONENT) * fit.scale * (0.8 + 0.3 * pulse);
        const w = (h * img.naturalWidth) / img.naturalHeight;
        if (sx + w < 0 || sx - w > viewW || sy + h < 0 || sy - h > viewH) continue;

        ctx.globalAlpha = fade * (star.dimOpacity + (1 - star.dimOpacity) * pulse);
        const cos = Math.cos(star.rotateRad) * dpr;
        const sin = Math.sin(star.rotateRad) * dpr;
        ctx.setTransform(cos, sin, -sin, cos, sx * dpr, sy * dpr);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      targetZ += event.deltaY * unit * CHAPTER3_WHEEL_SPEED;
    };
    scene.addEventListener("wheel", onWheel, { passive: false });

    const onPointerMove = (event: PointerEvent) => {
      pointerX = Math.max(-1, Math.min(1, (event.clientX / viewW) * 2 - 1));
      pointerY = Math.max(-1, Math.min(1, (event.clientY / viewH) * 2 - 1));
    };
    const onPointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
    };
    window.addEventListener("pointermove", onPointerMove);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      scene.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div ref={sceneRef} className="chapter3-scene chapter3-scene--visible" aria-label="3장">
      <canvas ref={canvasRef} className="chapter3-stars" />
    </div>
  );
}
