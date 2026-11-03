"use client";

import { useEffect, useRef } from "react";
import {
  CHAPTER3_CAMERA_EASE,
  CHAPTER3_DEPTH,
  CHAPTER3_FADE_FAR,
  CHAPTER3_FADE_NEAR,
  CHAPTER3_FOCAL,
  CHAPTER3_KOSMO_COVER_PAD,
  CHAPTER3_KOSMO_KICK_EASE,
  CHAPTER3_KOSMO_KICK_GAIN,
  CHAPTER3_KOSMO_KICK_MAX,
  CHAPTER3_KOSMO_ROT_GAIN,
  CHAPTER3_KOSMO_SCALE_DRIFT,
  CHAPTER3_KOSMO_SCROLL_RANGE,
  CHAPTER3_KOSMO_SCROLL_SPAN,
  CHAPTER3_KOSMO_SHIFT_RATIO,
  CHAPTER3_KOSMO_ZOOM_MIN,
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
import { CHAPTER3_KOSMO_URL } from "@/constants/scene3Config";
import {
  CHAPTER3_PLANET_DISCOVER_SEC,
  CHAPTER3_PLANET_DRAG_INERTIA,
  CHAPTER3_PLANET_DRAG_SPEED,
  CHAPTER3_PLANET_GRAB_RADIUS,
  CHAPTER3_PLANET_FADE_IN_SEC,
  CHAPTER3_PLANET_FORWARD_MIN_SPEED,
  CHAPTER3_PLANET_RADIUS,
  CHAPTER3_PLANET_SPAWN_DIST,
  CHAPTER3_PLANET_STOP_DIST,
  CHAPTER3_PLANET_X,
  CHAPTER3_PLANET_Y,
} from "@/constants/chapter3PlanetConfig";
import {
  createChapter3GlassPlanet,
  type Chapter3PlanetFrame,
} from "@/components/scene3/chapter3GlassPlanet";

const FAR_Z = CHAPTER3_NEAR + CHAPTER3_DEPTH;

function drawKosmoBackdrop(
  ctx: CanvasRenderingContext2D,
  kosmo: HTMLImageElement,
  viewW: number,
  viewH: number,
  dpr: number,
  stageScale: number,
  yaw: number,
  pitch: number,
  lookX: number,
  lookY: number,
  scrollZoom: number,
) {
  const iw = kosmo.naturalWidth;
  const ih = kosmo.naturalHeight;
  if (!iw || !ih) return;

  const lookMag = lookX * lookX + lookY * lookY;
  const zoom = (1 + lookMag * CHAPTER3_KOSMO_SCALE_DRIFT) * scrollZoom;
  const cover = Math.max(viewW / iw, viewH / ih) * CHAPTER3_KOSMO_COVER_PAD * zoom;
  const w = iw * cover;
  const h = ih * cover;

  const rotPanX = -Math.tan(yaw) * viewW * CHAPTER3_KOSMO_ROT_GAIN;
  const rotPanY = -Math.tan(pitch) * viewH * CHAPTER3_KOSMO_ROT_GAIN;
  const shiftPanX = -lookX * CHAPTER3_LOOK_SHIFT_X * stageScale * CHAPTER3_KOSMO_SHIFT_RATIO;
  const shiftPanY = -lookY * CHAPTER3_LOOK_SHIFT_Y * stageScale * CHAPTER3_KOSMO_SHIFT_RATIO;
  const panX = rotPanX + shiftPanX;
  const panY = rotPanY + shiftPanY;

  ctx.globalAlpha = 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(kosmo, (viewW - w) / 2 + panX, (viewH - h) / 2 + panY, w, h);
}

/**
 * Chapter 3 — 3D star field on a canvas. Wheel flies the camera forward and back;
 * the pointer turns and shifts the camera toward itself (parallax by depth).
 */
export default function Chapter3Scene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const planetCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    const planetCanvas = planetCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!scene || !canvas || !planetCanvas || !ctx) return;

    const planet = createChapter3GlassPlanet(planetCanvas, canvas);

    const kosmo = new Image();
    kosmo.decoding = "async";
    kosmo.src = CHAPTER3_KOSMO_URL;

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
      planet.setSize(viewW, viewH, dpr);
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
    let kosmoKick = 0;
    let raf = 0;
    let lastNow = 0;
    /** Seconds spent flying forward; the planet appears once it reaches the threshold. */
    let forwardSec = 0;
    let planetZ: number | null = null;
    let planetFoundAt = 0;

    /** Last drawn planet on screen, for grab hit-testing. */
    let planetScreen: Chapter3PlanetFrame | null = null;
    let dragPointerId: number | null = null;
    let dragLastX = 0;
    let dragLastY = 0;
    let dragLastMoveAt = 0;
    /** Spin velocity in radians per 60fps frame, kept after release for inertia. */
    let spinX = 0;
    let spinY = 0;

    const draw = (now: number) => {
      const dt = lastNow ? Math.min(0.25, (now - lastNow) / 1000) : 0;
      lastNow = now;

      if (dragPointerId === null && (spinX !== 0 || spinY !== 0)) {
        const frames = dt * 60;
        planet.rotateBy(spinX * frames, spinY * frames);
        const decay = Math.pow(CHAPTER3_PLANET_DRAG_INERTIA, frames);
        spinX *= decay;
        spinY *= decay;
        if (Math.abs(spinX) < 1e-5 && Math.abs(spinY) < 1e-5) {
          spinX = 0;
          spinY = 0;
        }
      }

      if (planetZ !== null) targetZ = Math.min(targetZ, planetZ - CHAPTER3_PLANET_STOP_DIST);
      const prevCameraZ = cameraZ;
      cameraZ += (targetZ - cameraZ) * CHAPTER3_CAMERA_EASE;
      if (Math.abs(targetZ - cameraZ) < 0.05) cameraZ = targetZ;

      const velocity = cameraZ - prevCameraZ;
      if (planetZ === null && velocity > CHAPTER3_PLANET_FORWARD_MIN_SPEED) {
        forwardSec += dt;
        if (forwardSec >= CHAPTER3_PLANET_DISCOVER_SEC) {
          planetZ = cameraZ + CHAPTER3_PLANET_SPAWN_DIST;
          planetFoundAt = now;
        }
      }
      const kickTarget = Math.max(
        -CHAPTER3_KOSMO_KICK_MAX,
        Math.min(CHAPTER3_KOSMO_KICK_MAX, velocity * CHAPTER3_KOSMO_KICK_GAIN),
      );
      kosmoKick += (kickTarget - kosmoKick) * CHAPTER3_KOSMO_KICK_EASE;
      const depthZoom =
        1 + (CHAPTER3_KOSMO_SCROLL_RANGE * (Math.tanh(cameraZ / CHAPTER3_KOSMO_SCROLL_SPAN) + 1)) / 2;
      const kosmoZoom = Math.max(CHAPTER3_KOSMO_ZOOM_MIN, depthZoom + kosmoKick);
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

      if (kosmo.complete && kosmo.naturalWidth > 0) {
        drawKosmoBackdrop(ctx, kosmo, viewW, viewH, dpr, fit.scale, yaw, pitch, lookX, lookY, kosmoZoom);
      }

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

      let planetFrame: Chapter3PlanetFrame | null = null;
      if (planetZ !== null) {
        const z = planetZ - cameraZ;
        const relX = CHAPTER3_PLANET_X - shiftX;
        const relY = CHAPTER3_PLANET_Y - shiftY;
        const yawX = relX * cosYaw - z * sinYaw;
        const yawZ = relX * sinYaw + z * cosYaw;
        const viewY = relY * cosPitch - yawZ * sinPitch;
        const viewZ = relY * sinPitch + yawZ * cosPitch;
        if (viewZ > CHAPTER3_NEAR) {
          const proj = CHAPTER3_FOCAL / viewZ;
          const reveal = Math.min(1, (now - planetFoundAt) / 1000 / CHAPTER3_PLANET_FADE_IN_SEC);
          const distanceFade = Math.min(1, Math.max(0, (CHAPTER3_PLANET_SPAWN_DIST + 1600 - z) / 800));
          planetFrame = {
            x: cx + yawX * proj * fit.scale,
            y: cy + viewY * proj * fit.scale,
            radiusPx: CHAPTER3_PLANET_RADIUS * proj * fit.scale,
            opacity: reveal * reveal * (3 - 2 * reveal) * distanceFade,
            yaw,
            pitch,
            timeSec: t,
          };
        }
      }
      planet.render(planetFrame);
      planetScreen = planetFrame && planetFrame.opacity > 0.3 ? planetFrame : null;

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      targetZ += event.deltaY * unit * CHAPTER3_WHEEL_SPEED;
    };
    scene.addEventListener("wheel", onWheel, { passive: false });

    const isOverPlanet = (clientX: number, clientY: number) => {
      if (!planetScreen) return false;
      const reach = planetScreen.radiusPx * CHAPTER3_PLANET_GRAB_RADIUS;
      return Math.hypot(clientX - planetScreen.x, clientY - planetScreen.y) <= reach;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !isOverPlanet(event.clientX, event.clientY)) return;
      dragPointerId = event.pointerId;
      dragLastX = event.clientX;
      dragLastY = event.clientY;
      spinX = 0;
      spinY = 0;
      try {
        scene.setPointerCapture(event.pointerId);
      } catch {
        // Pointer already gone (e.g. released before capture); drag still ends on pointerup.
      }
      scene.style.cursor = "grabbing";
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId === dragPointerId) {
        const angleX = (event.clientX - dragLastX) * CHAPTER3_PLANET_DRAG_SPEED;
        const angleY = (event.clientY - dragLastY) * CHAPTER3_PLANET_DRAG_SPEED;
        dragLastX = event.clientX;
        dragLastY = event.clientY;
        dragLastMoveAt = event.timeStamp;
        planet.rotateBy(angleX, angleY);
        spinX = spinX * 0.5 + angleX * 0.5;
        spinY = spinY * 0.5 + angleY * 0.5;
        return;
      }
      pointerX = Math.max(-1, Math.min(1, (event.clientX / viewW) * 2 - 1));
      pointerY = Math.max(-1, Math.min(1, (event.clientY / viewH) * 2 - 1));
      scene.style.cursor = isOverPlanet(event.clientX, event.clientY) ? "grab" : "";
    };

    const endDrag = (event: PointerEvent) => {
      if (event.pointerId !== dragPointerId) return;
      dragPointerId = null;
      if (event.timeStamp - dragLastMoveAt > 90) {
        spinX = 0;
        spinY = 0;
      }
      if (scene.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
      scene.style.cursor = isOverPlanet(event.clientX, event.clientY) ? "grab" : "";
    };

    const onPointerLeave = () => {
      if (dragPointerId !== null) return;
      pointerX = 0;
      pointerY = 0;
    };
    scene.addEventListener("pointerdown", onPointerDown);
    scene.addEventListener("pointerup", endDrag);
    scene.addEventListener("pointercancel", endDrag);
    window.addEventListener("pointermove", onPointerMove);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      scene.removeEventListener("wheel", onWheel);
      scene.removeEventListener("pointerdown", onPointerDown);
      scene.removeEventListener("pointerup", endDrag);
      scene.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      planet.dispose();
    };
  }, []);

  return (
    <div ref={sceneRef} className="chapter3-scene chapter3-scene--visible" aria-label="3장">
      <canvas ref={canvasRef} className="chapter3-stars" />
      <canvas ref={planetCanvasRef} className="chapter3-stars" />
    </div>
  );
}
