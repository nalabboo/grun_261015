"use client";

import { useEffect, useRef } from "react";
import {
  INTRO_FLOATER_INSTANCES,
  INTRO_MARIMO_PHYSICS,
  type IntroFloaterInstance,
} from "@/constants/introFloatersConfig";

const REF_H = 1080;

type MarimoBody = {
  spec: IntroFloaterInstance;
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  angle: number;
  spin: number;
};

function marimoRadius(spec: IntroFloaterInstance, viewportHeight: number) {
  const h = spec.heightVh * viewportHeight;
  const w = h * (spec.width / spec.height);
  return Math.min(w, h) * 0.44;
}

function resolveMarimoCollisions(bodies: MarimoBody[], viewportHeight: number) {
  const { collisionRestitution: e } = INTRO_MARIMO_PHYSICS;
  const n = bodies.length;
  for (let i = 0; i < n; i++) {
    const a = bodies[i];
    const rA = marimoRadius(a.spec, viewportHeight);
    for (let j = i + 1; j < n; j++) {
      const b = bodies[j];
      const rB = marimoRadius(b.spec, viewportHeight);
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.hypot(dx, dy);
      const minDist = rA + rB;
      if (dist < 1e-4) {
        const angle = (i + j) * 0.31;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        dist = 1;
      }
      if (dist >= minDist) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      const sep = overlap * 0.5;
      a.x -= nx * sep;
      a.y -= ny * sep;
      b.x += nx * sep;
      b.y += ny * sep;

      const relVn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relVn < 0) {
        const impulse = (-(1 + e) * relVn) / 2;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
        const spinKick = impulse * INTRO_MARIMO_PHYSICS.collisionSpinScale;
        a.spin -= spinKick;
        b.spin += spinKick;
      }
    }
  }
}

function resolveWallCollisions(
  bodies: MarimoBody[],
  width: number,
  height: number,
  viewportHeight: number,
  pad: number,
) {
  const e = INTRO_MARIMO_PHYSICS.wallRestitution;
  for (const body of bodies) {
    const r = marimoRadius(body.spec, viewportHeight);
    const left = pad + r;
    const right = width - pad - r;
    const top = pad + r;
    const bottom = height - pad - r;
    if (body.x < left) {
      body.x = left;
      body.vx = Math.abs(body.vx) * e;
    } else if (body.x > right) {
      body.x = right;
      body.vx = -Math.abs(body.vx) * e;
    }
    if (body.y < top) {
      body.y = top;
      body.vy = Math.abs(body.vy) * e;
    } else if (body.y > bottom) {
      body.y = bottom;
      body.vy = -Math.abs(body.vy) * e;
    }
  }
}

/** Marimos drift across the viewport; cursor proximity pushes them away. */
export default function IntroFloaters() {
  const anchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bodiesRef = useRef<MarimoBody[] | null>(null);
  const cursorRef = useRef({ x: 0, y: 0, active: false });
  const sizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const syncBodiesToViewport = (width: number, height: number) => {
      const prev = bodiesRef.current;
      if (!prev || prev.length !== INTRO_FLOATER_INSTANCES.length) {
        bodiesRef.current = INTRO_FLOATER_INSTANCES.map((spec) => ({
          spec,
          x: spec.xNorm * width,
          y: spec.yNorm * height,
          vx: 0,
          vy: 0,
          homeX: spec.xNorm * width,
          homeY: spec.yNorm * height,
          angle: 0,
          spin: spec.spinDegPerSec,
        }));
        return;
      }
      for (let i = 0; i < prev.length; i++) {
        const spec = INTRO_FLOATER_INSTANCES[i];
        const sx = sizeRef.current.width > 0 ? width / sizeRef.current.width : 1;
        const sy = sizeRef.current.height > 0 ? height / sizeRef.current.height : 1;
        prev[i].x *= sx;
        prev[i].y *= sy;
        prev[i].homeX = spec.xNorm * width;
        prev[i].homeY = spec.yNorm * height;
        prev[i].spec = spec;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      cursorRef.current = { x: event.clientX, y: event.clientY, active: true };
    };
    const onPointerLeave = () => {
      cursorRef.current.active = false;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);

    let raf = 0;
    let last = performance.now();
    const start = last;

    const tick = (now: number) => {
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;

      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width <= 0 || height <= 0) {
        raf = requestAnimationFrame(tick);
        return;
      }

      if (width !== sizeRef.current.width || height !== sizeRef.current.height) {
        syncBodiesToViewport(width, height);
        sizeRef.current = { width, height };
      }

      const bodies = bodiesRef.current;
      if (!bodies) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const scale = height / REF_H;
      const t = (now - start) / 1000;
      const cursor = cursorRef.current;
      const influence = INTRO_MARIMO_PHYSICS.cursorRadiusPx * scale;
      const {
        pushStrength,
        spring,
        damping,
        maxSpeedPx,
        collisionIterations,
        maxSpinDegPerSec,
        spinDamping,
      } = INTRO_MARIMO_PHYSICS;
      const damp = Math.pow(damping, dt * 60);
      const spinDamp = Math.pow(spinDamping, dt * 60);
      const pad = 16 * scale;

      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        const spec = body.spec;
        const driftPx = spec.driftRadiusPx * scale;
        const idleX =
          Math.sin(t * spec.driftHz + spec.phase) * driftPx +
          Math.sin(t * spec.driftHz2 + spec.phase * 1.3) * driftPx * 0.55 +
          Math.sin(t * 0.95 + spec.phase * 0.7) * driftPx * 0.28;
        const idleY =
          Math.cos(t * 0.78 + spec.phase * 0.9) * driftPx * 0.72 +
          Math.sin(t * 0.54 + spec.phase) * driftPx * 0.48 +
          Math.cos(t * 1.12 + spec.phase * 1.1) * driftPx * 0.22;
        const targetX = body.homeX + idleX;
        const targetY = body.homeY + idleY;

        body.vx += (targetX - body.x) * spring * dt;
        body.vy += (targetY - body.y) * spring * dt;

        if (cursor.active) {
          const dx = body.x - cursor.x;
          const dy = body.y - cursor.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.5 && dist < influence) {
            const falloff = 1 - dist / influence;
            const force = pushStrength * falloff * falloff * falloff * dt;
            body.vx += (dx / dist) * force;
            body.vy += (dy / dist) * force;
            body.spin +=
              falloff * INTRO_MARIMO_PHYSICS.cursorSpinBurst * dt * (dx > 0 ? 1 : -1);
          }
        }

        body.vx *= damp;
        body.vy *= damp;

        let speed = Math.hypot(body.vx, body.vy);
        if (speed > maxSpeedPx) {
          const k = maxSpeedPx / speed;
          body.vx *= k;
          body.vy *= k;
        }

        body.x += body.vx * dt;
        body.y += body.vy * dt;
      }

      for (let pass = 0; pass < collisionIterations; pass++) {
        resolveMarimoCollisions(bodies, height);
        resolveWallCollisions(bodies, width, height, height, pad);
      }

      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        const el = anchorRefs.current[i];
        body.spin = Math.max(-maxSpinDegPerSec, Math.min(maxSpinDegPerSec, body.spin));
        body.angle += body.spin * dt;
        body.spin *= spinDamp;
        if (!el) continue;
        el.style.opacity = "1";
        el.style.transform = `translate3d(${body.x}px, ${body.y}px, 0) translate(-50%, -50%) rotate(${body.angle}deg)`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div className="intro-floaters" aria-hidden>
      {INTRO_FLOATER_INSTANCES.map((spec, index) => (
        <div
          key={spec.id}
          ref={(node) => {
            anchorRefs.current[index] = node;
          }}
          className="intro-floaters__anchor"
        >
          <img
            src={spec.src}
            alt=""
            width={spec.width}
            height={spec.height}
            className="intro-floaters__sprite"
            style={{ height: `${spec.heightVh * 100}vh` }}
            draggable={false}
            decoding="async"
          />
        </div>
      ))}
    </div>
  );
}