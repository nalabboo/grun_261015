"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { EditorMode } from "@/components/canvas/worldView";
import { SCENE_PERSPECTIVE_RATIO, SCENE_REFERENCE_HEIGHT } from "@/constants/sceneConfig";
import {
  CHAPTER2_BERG_DISPLAY_SCALE,
  CHAPTER2_BERG_LAYERS,
  CHAPTER2_BERG4_FIXED_LAYOUT,
  CHAPTER2_DEPTH_SIZE_STRENGTH,
  CHAPTER2_MOUSE_PARALLAX_GAIN,
  DEV_CHAPTER2_START_AT_SUBSCENE_23,
  DEV_CHAPTER2_START_AT_SUBSCENE_23_HOLD,
  CHAPTER2_SCROLL_BERG3_Y,
  CHAPTER2_SCROLL_BERG4_Y,
  CHAPTER2_SUBSCENE_SCROLL_WHEEL_GAIN,
  CHAPTER2_PAPIER_BG_URL,
} from "@/constants/chapter2Config";
import {
  CHAPTER2_SUBSCENE_SCROLL_MAX,
  getChapter2PropScrollOpacity,
  getChapter2PropScrollScaleMultiplier,
  getChapter2ScrollSegments,
} from "@/constants/chapter2ScrollMotion";
import { getChapter2Scroll22Progress } from "@/constants/chapter2Scroll22Motion";
import {
  getChapter2PlaybackScrollRaw,
  isChapter2PlaybackComplete,
  isChapter2PlaybackSubscene23OrLater,
  type Chapter2SubscenePlaybackPhase,
} from "@/constants/chapter2SubscenePlayback";
import {
  canChapter2ScrollStartSubscene23,
  CHAPTER2_SUBSCENE_23_SCROLL_ACCUM_MAX,
  CHAPTER2_SUBSCENE_23_SCROLL_WHEEL_GAIN,
  getChapter2BergSubscene23YOffset,
  isChapter2Subscene23ScrollAccumReady,
  getChapter2LaublRevealOpacity,
  getChapter2GrunSubscene23ScaleMul,
  getChapter2NariSubscene23ScaleMul,
  getChapter2BlauSteinReveal,
  getChapter2BlauFadeAfterLaublReveal,
  getChapter2BlauSlideFromLeftReveal,
  getChapter2Berg4PeakReveal,
  getChapter2LaublRevealPropMotion,
  getChapter2Subscene23IntroProgress,
  getChapter2YellowGelbExitVisibility,
  CHAPTER2_SUBSCENE_23_HOLD_ELAPSED_SEC,
  isChapter2Subscene23MotionComplete,
} from "@/constants/chapter2Subscene23Motion";
import {
  canChapter2ScrollStartSubscene24,
  CHAPTER2_SUBSCENE_24_SCROLL_ACCUM_MAX,
  CHAPTER2_SUBSCENE_24_SCROLL_WHEEL_GAIN,
  getChapter2BergSubscene24YOffset,
  getChapter2KokiRevealOpacity,
  getChapter2CoralSubscene24Shrink,
  getChapter2Subscene24CharacterShrink,
  getChapter2SporeSubscene24Exit,
  getChapter2SteinSubscene24Drop,
  getChapter2RCelemen2Subscene24Enter,
  getChapter2RCelemenSubscene24Enter,
  getChapter2RVulkanSubscene24Reveal,
  getChapter2RBlumeSubscene24Bloom,
  getChapter2RObstSubscene24GrowDuringBlume,
  getChapter2Subscene24EarthquakeShake,
  isChapter2Subscene24ScrollAccumReady,
} from "@/constants/chapter2Subscene24Motion";
import Chapter2Subscene24ClickMarimos from "@/components/scene2/Chapter2Subscene24ClickMarimos";
import Chapter2Subscene24GreenSpotlightOverlay from "@/components/scene2/Chapter2Subscene24GreenSpotlightOverlay";
import PageTurnButton from "@/components/scene2/PageTurnButton";
import {
  CHAPTER2_GREEN_SPOTLIGHT_CHARACTER_PROP_ID,
  measureChapter2GreenSpotlightHoleRadius,
  type Chapter2GreenSpotlightLockedCircle,
  CHAPTER2_GREEN_SPOTLIGHT_ZOOM_DELAY_MS,
  CHAPTER2_GREEN_SPOTLIGHT_ZOOM_DURATION_MS,
  CHAPTER2_GREEN_SPOTLIGHT_CHAPTER3_BUTTON_DELAY_MS,
  CHAPTER2_GREEN_SPOTLIGHT_FADE_MS,
  getChapter2GreenSpotlightSceneScale,
  isChapter2ClickMarimoBurstEnabled,
  isChapter2ClickMarimoGreenSpotlightActive,
} from "@/constants/chapter2Subscene24ClickMarimo";
import Chapter2BergLayer from "@/components/scene2/Chapter2BergLayer";
import Chapter2PropLayer from "@/components/scene2/Chapter2PropLayer";
import Chapter2FloatingBubbles from "@/components/scene2/Chapter2FloatingBubbles";
import Chapter2FloatingMarimos from "@/components/scene2/Chapter2FloatingMarimos";
import Chapter2FloatingNabis from "@/components/scene2/Chapter2FloatingNabis";
import Chapter2VogelFlyby from "@/components/scene2/Chapter2VogelFlyby";
import { CHAPTER2_VOGEL } from "@/constants/chapter2VogelConfig";
import {
  CHAPTER2_PROPS,
  chapter2PropIsSubscene23Exclusive,
  chapter2PropIsSubscene24Exclusive,
  getChapter2PropDefaultEdit,
  isChapter2PropTunable,
  sanitizeChapter2PropEdit,
  withChapter2PropUniformScale,
  type Chapter2PropConfig,
  type Chapter2PropEdit,
} from "@/constants/chapter2ObjectsConfig";
import {
  DEFAULT_CHAPTER2_BERG_EDIT,
  defaultChapter2TunableEdits,
  loadChapter2TunableEdits,
  sanitizeChapter2BergEditTransform,
  type Chapter2BergEditTransform,
  type Chapter2TunableId,
} from "@/constants/chapter2Layout";
import {
  defaultChapter2PropEdits,
  loadChapter2PropEdits,
  saveChapter2PropEdits,
  type Chapter2PropEditorState,
  type Chapter2TunablePropId,
} from "@/constants/chapter2PropLayout";

type Point = { x: number; y: number };

const SMOOTH = 0.07;
const SCROLL_SMOOTH = 0.09;
const SCROLL_WHEEL_START_MIN = 10;

type PropDragState = {
  id: Chapter2TunablePropId;
  mode: EditorMode;
  startClientX: number;
  startClientY: number;
  base: Chapter2PropEdit;
};

function getChapter2DepthFactor(viewportHeight: number, depthRatio: number) {
  const perspective = viewportHeight * SCENE_PERSPECTIVE_RATIO;
  const depth = depthRatio * viewportHeight;
  const full = perspective / Math.max(perspective - depth, 1);
  return 1 + (full - 1) * CHAPTER2_DEPTH_SIZE_STRENGTH;
}

function getChapter2PropDepthScale(viewportHeight: number, depthPx: number) {
  return getChapter2DepthFactor(viewportHeight, depthPx / SCENE_REFERENCE_HEIGHT);
}

type Chapter2SceneProps = {
  /** All 2-2 motions finished (auto playback). */
  onSequenceComplete?: () => void;
  /** First scroll after 2-2 hold — begin scene 2-3. */
  onSubscene23ScrollStart?: () => void;
  /** First scroll after 2-3 hold — begin scene 2-4. */
  onSubscene24ScrollStart?: () => void;
  /** User turned the page toward chapter 3 after the green spotlight zoom. */
  onChapter3PageTurn?: () => void;
};

/** Chapter 2 — stacked berg layers with mouse parallax. */
export default function Chapter2Scene({
  onSequenceComplete,
  onSubscene23ScrollStart,
  onSubscene24ScrollStart,
  onChapter3PageTurn,
}: Chapter2SceneProps) {
  const targetRef = useRef<Point>({ x: 0, y: 0 });
  const smoothRef = useRef<Point>({ x: 0, y: 0 });
  const propDragRef = useRef<PropDragState | null>(null);
  const devChapter2Skip =
    DEV_CHAPTER2_START_AT_SUBSCENE_23_HOLD || DEV_CHAPTER2_START_AT_SUBSCENE_23;
  const scrollTargetRef = useRef(devChapter2Skip ? CHAPTER2_SUBSCENE_SCROLL_MAX : 0);
  const scrollSmoothRef = useRef(devChapter2Skip ? CHAPTER2_SUBSCENE_SCROLL_MAX : 0);
  const playbackPhaseRef = useRef<Chapter2SubscenePlaybackPhase>(
    DEV_CHAPTER2_START_AT_SUBSCENE_23_HOLD
      ? "2-3-complete"
      : DEV_CHAPTER2_START_AT_SUBSCENE_23
        ? "2-3-playing"
        : "2-1",
  );
  const playbackStartMsRef = useRef(0);
  const subscene22CompleteAtMsRef = useRef(0);
  const subscene23StartMsRef = useRef(0);
  const sequenceCompleteFiredRef = useRef(false);
  const subscene23StartFiredRef = useRef(false);
  const subscene23ScrollAccumRef = useRef(0);
  const subscene23CompleteAtMsRef = useRef(0);
  const subscene24StartMsRef = useRef(0);
  const subscene24StartFiredRef = useRef(false);
  const subscene24ScrollAccumRef = useRef(0);
  const onSequenceCompleteRef = useRef(onSequenceComplete);
  const onSubscene23ScrollStartRef = useRef(onSubscene23ScrollStart);
  const onSubscene24ScrollStartRef = useRef(onSubscene24ScrollStart);
  const editorEnabledRef = useRef(false);
  const [frame, setFrame] = useState(0);

  onSequenceCompleteRef.current = onSequenceComplete;
  onSubscene23ScrollStartRef.current = onSubscene23ScrollStart;
  onSubscene24ScrollStartRef.current = onSubscene24ScrollStart;

  const [editor, setEditor] = useState<Chapter2PropEditorState>({
    enabled: false,
    selectedId: "spore2_0",
    mode: "translate",
  });
  editorEnabledRef.current = editor.enabled;
  const [propEdits, setPropEdits] = useState(defaultChapter2PropEdits);
  const [propEditsReady, setPropEditsReady] = useState(false);

  const [tunableEdits, setTunableEdits] = useState(defaultChapter2TunableEdits);
  const [viewportHeight, setViewportHeight] = useState(SCENE_REFERENCE_HEIGHT);
  const [devEditsReady, setDevEditsReady] = useState(false);
  const [clickMarimoBurst, setClickMarimoBurst] = useState({
    seq: 0,
    x: 0,
    y: 0,
  });
  const sceneShellRef = useRef<HTMLDivElement>(null);
  const sceneContentRef = useRef<HTMLDivElement>(null);
  const [greenSpotlightZoom, setGreenSpotlightZoom] = useState(0);
  const [lockedSpotlightHole, setLockedSpotlightHole] =
    useState<Chapter2GreenSpotlightLockedCircle | null>(null);
  const greenSpotlightZoomOriginRef = useRef({ x: 0, y: 0 });
  const greenSpotlightTimelineStartRef = useRef(0);
  const greenSpotlightGeometryLockedRef = useRef(false);
  const [chapter3PageTurnVisible, setChapter3PageTurnVisible] = useState(false);

  useEffect(() => {
    setTunableEdits(loadChapter2TunableEdits());
    setPropEdits(loadChapter2PropEdits());
    setViewportHeight(window.innerHeight);
    setDevEditsReady(true);
    setPropEditsReady(true);

    const now = performance.now();
    if (DEV_CHAPTER2_START_AT_SUBSCENE_23_HOLD) {
      playbackPhaseRef.current = "2-3-complete";
      scrollTargetRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
      scrollSmoothRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
      subscene22CompleteAtMsRef.current = now;
      subscene23StartMsRef.current = now;
      subscene23StartFiredRef.current = true;
      subscene23CompleteAtMsRef.current = now;
      sequenceCompleteFiredRef.current = true;
    } else if (DEV_CHAPTER2_START_AT_SUBSCENE_23) {
      playbackPhaseRef.current = "2-3-playing";
      scrollTargetRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
      scrollSmoothRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
      subscene22CompleteAtMsRef.current = now;
      subscene23StartMsRef.current = now;
      subscene23StartFiredRef.current = true;
      sequenceCompleteFiredRef.current = true;
    }
  }, []);

  const patchProp = useCallback(
    (id: Chapter2TunablePropId, patch: Partial<Chapter2PropEdit>) => {
      setPropEdits((prev) => {
        const merged = sanitizeChapter2PropEdit(
          {
            ...prev[id],
            ...withChapter2PropUniformScale(patch, prev[id]),
            ...(patch.blurRatio !== undefined ? { blurRatio: patch.blurRatio } : {}),
          },
          getChapter2PropDefaultEdit(id),
        );
        const next = { ...prev, [id]: merged };
        saveChapter2PropEdits(next);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (editor.enabled) return;
      targetRef.current = {
        x: (event.clientX / window.innerWidth - 0.5) * 2,
        y: (event.clientY / window.innerHeight - 0.5) * 2,
      };
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [editor.enabled]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (editor.enabled) {
        event.preventDefault();
        const next =
          scrollTargetRef.current + event.deltaY * CHAPTER2_SUBSCENE_SCROLL_WHEEL_GAIN;
        scrollTargetRef.current = Math.min(
          CHAPTER2_SUBSCENE_SCROLL_MAX,
          Math.max(0, next),
        );
        return;
      }

      event.preventDefault();
      const phase = playbackPhaseRef.current;

      if (phase === "2-1") {
        if (event.deltaY > SCROLL_WHEEL_START_MIN) {
          playbackPhaseRef.current = "2-2-playing";
          playbackStartMsRef.current = performance.now();
        }
        return;
      }

      if (phase === "2-2-playing" || phase === "2-3-playing" || phase === "2-4-playing") {
        return;
      }

      if (phase === "2-2-complete" && event.deltaY > 0) {
        if (canChapter2ScrollStartSubscene23(subscene22CompleteAtMsRef.current)) {
          subscene23ScrollAccumRef.current = Math.min(
            CHAPTER2_SUBSCENE_23_SCROLL_ACCUM_MAX,
            subscene23ScrollAccumRef.current +
              event.deltaY * CHAPTER2_SUBSCENE_23_SCROLL_WHEEL_GAIN,
          );
          if (
            !subscene23StartFiredRef.current &&
            isChapter2Subscene23ScrollAccumReady(subscene23ScrollAccumRef.current)
          ) {
            subscene23StartFiredRef.current = true;
            playbackPhaseRef.current = "2-3-playing";
            subscene23StartMsRef.current = performance.now();
            onSubscene23ScrollStartRef.current?.();
          }
        }
        return;
      }

      if (phase === "2-3-complete" && event.deltaY > 0) {
        if (canChapter2ScrollStartSubscene24(subscene23CompleteAtMsRef.current)) {
          subscene24ScrollAccumRef.current = Math.min(
            CHAPTER2_SUBSCENE_24_SCROLL_ACCUM_MAX,
            subscene24ScrollAccumRef.current +
              event.deltaY * CHAPTER2_SUBSCENE_24_SCROLL_WHEEL_GAIN,
          );
          if (
            !subscene24StartFiredRef.current &&
            isChapter2Subscene24ScrollAccumReady(subscene24ScrollAccumRef.current)
          ) {
            subscene24StartFiredRef.current = true;
            playbackPhaseRef.current = "2-4-playing";
            subscene24StartMsRef.current = performance.now();
            onSubscene24ScrollStartRef.current?.();
          }
        }
        return;
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [editor.enabled]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const target = targetRef.current;
      const smooth = smoothRef.current;
      smooth.x += (target.x - smooth.x) * SMOOTH;
      smooth.y += (target.y - smooth.y) * SMOOTH;

      const playbackPhase = playbackPhaseRef.current;
      if (playbackPhase === "2-2-playing") {
        const elapsedSec = (performance.now() - playbackStartMsRef.current) / 1000;
        const raw = getChapter2PlaybackScrollRaw(elapsedSec);
        scrollTargetRef.current = raw;
        scrollSmoothRef.current = raw;

        if (isChapter2PlaybackComplete(elapsedSec)) {
          playbackPhaseRef.current = "2-2-complete";
          scrollTargetRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
          scrollSmoothRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
          if (subscene22CompleteAtMsRef.current === 0) {
            subscene22CompleteAtMsRef.current = performance.now();
          }
          if (!sequenceCompleteFiredRef.current) {
            sequenceCompleteFiredRef.current = true;
            onSequenceCompleteRef.current?.();
          }
        }
      } else if (playbackPhase === "2-2-complete") {
        scrollTargetRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
        scrollSmoothRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
        if (subscene22CompleteAtMsRef.current === 0) {
          subscene22CompleteAtMsRef.current = performance.now();
        }
      } else if (playbackPhase === "2-3-playing") {
        scrollTargetRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
        scrollSmoothRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
        const elapsed23Sec =
          subscene23StartMsRef.current > 0
            ? (performance.now() - subscene23StartMsRef.current) / 1000
            : 0;
        if (
          isChapter2Subscene23MotionComplete(elapsed23Sec) &&
          subscene23CompleteAtMsRef.current === 0
        ) {
          subscene23CompleteAtMsRef.current = performance.now();
          playbackPhaseRef.current = "2-3-complete";
        }
      } else if (playbackPhase === "2-3-complete" || playbackPhase === "2-4-playing") {
        scrollTargetRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
        scrollSmoothRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
      } else if (playbackPhase === "2-1") {
        scrollTargetRef.current = 0;
        scrollSmoothRef.current += (0 - scrollSmoothRef.current) * SCROLL_SMOOTH;
      } else if (!editorEnabledRef.current) {
        scrollTargetRef.current = CHAPTER2_SUBSCENE_SCROLL_MAX;
        scrollSmoothRef.current +=
          (CHAPTER2_SUBSCENE_SCROLL_MAX - scrollSmoothRef.current) * SCROLL_SMOOTH;
      } else {
        scrollSmoothRef.current +=
          (scrollTargetRef.current - scrollSmoothRef.current) * SCROLL_SMOOTH;
      }

      setFrame((f) => f + 1);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!editor.enabled) return;

    const onPointerMove = (event: PointerEvent) => {
      const drag = propDragRef.current;
      if (!drag) return;

      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;
      const base = drag.base;

      if (drag.mode === "translate") {
        patchProp(drag.id, { x: base.x + dx, y: base.y + dy });
        return;
      }

      const factor = Math.max(0.2, 1 - dy * 0.004);
      patchProp(drag.id, { scale: base.scale * factor });
    };

    const onPointerUp = () => {
      propDragRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [editor.enabled, patchProp]);

  const handlePropDragStart = useCallback(
    (id: Chapter2TunablePropId, clientX: number, clientY: number) => {
      if (!editor.enabled) return;
      setEditor((prev) => ({ ...prev, selectedId: id }));
      propDragRef.current = {
        id,
        mode: editor.mode,
        startClientX: clientX,
        startClientY: clientY,
        base: { ...propEdits[id] },
      };
    },
    [editor.enabled, editor.mode, propEdits],
  );

  const handleScenePointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      if (editor.enabled) return;
      const elapsed24Sec =
        subscene24StartMsRef.current > 0
          ? (performance.now() - subscene24StartMsRef.current) / 1000
          : 0;
      if (isChapter2ClickMarimoGreenSpotlightActive(clickMarimoBurst.seq)) {
        return;
      }
      if (
        !isChapter2ClickMarimoBurstEnabled(playbackPhaseRef.current, elapsed24Sec)
      ) {
        return;
      }
      const content = sceneContentRef.current;
      const rect = content?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
      setClickMarimoBurst((prev) => ({
        seq: prev.seq + 1,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }));
    },
    [editor.enabled, clickMarimoBurst.seq],
  );

  useEffect(() => {
    if (!isChapter2ClickMarimoGreenSpotlightActive(clickMarimoBurst.seq)) {
      setChapter3PageTurnVisible(false);
      return;
    }
    if (greenSpotlightZoom < 0.999) {
      setChapter3PageTurnVisible(false);
      return;
    }
    const timer = window.setTimeout(
      () => setChapter3PageTurnVisible(true),
      CHAPTER2_GREEN_SPOTLIGHT_CHAPTER3_BUTTON_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [clickMarimoBurst.seq, greenSpotlightZoom]);

  useEffect(() => {
    const active = isChapter2ClickMarimoGreenSpotlightActive(clickMarimoBurst.seq);
    if (!active) {
      greenSpotlightGeometryLockedRef.current = false;
      greenSpotlightTimelineStartRef.current = 0;
      setLockedSpotlightHole(null);
      setGreenSpotlightZoom(0);
      return;
    }

    if (!greenSpotlightGeometryLockedRef.current) {
      let captureRaf = 0;
      captureRaf = requestAnimationFrame(() => {
        const shell = sceneShellRef.current;
        const content = sceneContentRef.current;
        const hero = content?.querySelector(".chapter2-green-spotlight-target-hero");
        if (!(hero instanceof HTMLElement) || !shell || !content) return;

        const elRect = hero.getBoundingClientRect();
        const shellRect = shell.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const cx = elRect.left + elRect.width / 2 - shellRect.left;
        const cy = elRect.top + elRect.height / 2 - shellRect.top;

        setLockedSpotlightHole({
          cx,
          cy,
          r: measureChapter2GreenSpotlightHoleRadius(elRect.width, elRect.height),
        });
        greenSpotlightZoomOriginRef.current = {
          x: elRect.left + elRect.width / 2 - contentRect.left,
          y: elRect.top + elRect.height / 2 - contentRect.top,
        };
        greenSpotlightGeometryLockedRef.current = true;
      });
      return () => cancelAnimationFrame(captureRaf);
    }
  }, [clickMarimoBurst.seq]);

  useEffect(() => {
    const active = isChapter2ClickMarimoGreenSpotlightActive(clickMarimoBurst.seq);
    if (!active) return;

    if (greenSpotlightTimelineStartRef.current === 0) {
      greenSpotlightTimelineStartRef.current = performance.now();
    }

    let raf = 0;
    const zoomDelay =
      CHAPTER2_GREEN_SPOTLIGHT_FADE_MS + CHAPTER2_GREEN_SPOTLIGHT_ZOOM_DELAY_MS;

    const tick = (now: number) => {
      const elapsed = now - greenSpotlightTimelineStartRef.current;
      if (elapsed < zoomDelay) {
        setGreenSpotlightZoom(0);
      } else {
        const t = Math.min(
          1,
          (elapsed - zoomDelay) / CHAPTER2_GREEN_SPOTLIGHT_ZOOM_DURATION_MS,
        );
        setGreenSpotlightZoom(1 - (1 - t) ** 2.1);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clickMarimoBurst.seq]);

  const smooth = smoothRef.current;
  const mouseX = smooth.x * CHAPTER2_MOUSE_PARALLAX_GAIN;
  const mouseY = smooth.y * CHAPTER2_MOUSE_PARALLAX_GAIN;
  const scrollAmount = scrollSmoothRef.current;
  const scrollSegments = getChapter2ScrollSegments(scrollAmount);
  const scroll22Progress = getChapter2Scroll22Progress(scrollSegments.raw);
  void frame;

  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : SCENE_REFERENCE_HEIGHT;

  const playbackPhase = playbackPhaseRef.current;
  const subscene23MotionPhase: Chapter2SubscenePlaybackPhase =
    playbackPhase === "2-3-complete" || playbackPhase === "2-4-playing"
      ? "2-3-playing"
      : playbackPhase;
  const subscene23ElapsedSec =
    playbackPhase === "2-3-playing" && subscene23StartMsRef.current > 0
      ? (performance.now() - subscene23StartMsRef.current) / 1000
      : playbackPhase === "2-3-complete" || playbackPhase === "2-4-playing"
        ? CHAPTER2_SUBSCENE_23_HOLD_ELAPSED_SEC
        : 0;
  const subscene24ElapsedSec =
    playbackPhase === "2-4-playing" && subscene24StartMsRef.current > 0
      ? (performance.now() - subscene24StartMsRef.current) / 1000
      : 0;
  const clickMarimoBurstEnabled = isChapter2ClickMarimoBurstEnabled(
    playbackPhase,
    subscene24ElapsedSec,
  );
  const clickMarimoGreenSpotlight = isChapter2ClickMarimoGreenSpotlightActive(
    clickMarimoBurst.seq,
  );
  const greenSpotlightSceneScale = getChapter2GreenSpotlightSceneScale(greenSpotlightZoom);
  const greenSpotlightZoomOrigin = greenSpotlightZoomOriginRef.current;
  const greenSpotlightPanX = (1 - greenSpotlightSceneScale) * greenSpotlightZoomOrigin.x;
  const greenSpotlightPanY = (1 - greenSpotlightSceneScale) * greenSpotlightZoomOrigin.y;
  const earthquakeShake = getChapter2Subscene24EarthquakeShake(
    playbackPhase,
    subscene24ElapsedSec,
    performance.now(),
  );
  const subscene23IntroProgress = getChapter2Subscene23IntroProgress(
    playbackPhase,
    subscene23ElapsedSec,
  );
  const bergSubscene24Y = (bergId: "berg2" | "berg3" | "berg4") =>
    getChapter2BergSubscene24YOffset(
      bergId,
      playbackPhase,
      subscene24ElapsedSec,
      viewportHeight,
    );
  const berg2SubsceneY =
    getChapter2BergSubscene23YOffset("berg2", subscene23IntroProgress) +
    bergSubscene24Y("berg2");

  const berg4ScrollY = scrollSegments.berg * CHAPTER2_SCROLL_BERG4_Y;
  const berg3ScrollY = scrollSegments.berg * CHAPTER2_SCROLL_BERG3_Y;
  /** 2-2 hold / 2-3 / 2-4: keep y2 bergs visible for b2 crossfade (scroll raw already at max). */
  const bergY2ScrollBlend =
    playbackPhase === "2-2-complete" ||
    playbackPhase === "2-3-playing" ||
    playbackPhase === "2-3-complete" ||
    playbackPhase === "2-4-playing"
      ? 1
      : scrollSegments.berg;

  const motion = Math.hypot(mouseX, mouseY);
  const breathe = 1 + motion * 0.014;
  const parallaxBreathe = breathe + motion * 0.004;

  const foregroundLayers = CHAPTER2_BERG_LAYERS.filter((layer) => layer.id !== "berg4");
  const foregroundScales = foregroundLayers.map((layer) => {
    const depthFactor = getChapter2DepthFactor(viewportHeight, layer.depthRatio);
    const layerBreathe = parallaxBreathe + (layer.depth - 2) * 0.0012 * motion;
    return depthFactor * layer.layerScale * layerBreathe;
  });
  const maxForegroundScale = Math.max(...foregroundScales, 1);

  const berg4Layer = CHAPTER2_BERG_LAYERS.find((layer) => layer.id === "berg4");
  const behindBerg4Props = CHAPTER2_PROPS.filter((prop) => prop.stack === "behindBerg4").sort(
    (a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id),
  );
  const attachedInFrontOfBerg4Props = CHAPTER2_PROPS.filter(
    (prop) => prop.stack === "aboveBerg4" && prop.attachToBergId === "berg4",
  ).sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
  const aboveBerg4Props = CHAPTER2_PROPS.filter(
    (prop) => prop.stack === "aboveBerg4" && prop.attachToBergId !== "berg4",
  ).sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
  const behindBerg3Props = CHAPTER2_PROPS.filter((prop) => prop.stack === "behindBerg3").sort(
    (a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id),
  );
  const aboveBerg3Props = CHAPTER2_PROPS.filter((prop) => prop.stack === "aboveBerg3").sort(
    (a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id),
  );
  const betweenBerg3AndBerg2Props = CHAPTER2_PROPS.filter(
    (prop) => prop.stack === "betweenBerg3AndBerg2",
  ).sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
  const rObst4Prop = CHAPTER2_PROPS.find((prop) => prop.id === "r_obst4");
  const rVulkanProp = CHAPTER2_PROPS.find((prop) => prop.id === "r_vulkan");
  const rCelemen2Prop = CHAPTER2_PROPS.find((prop) => prop.id === "r_celemen2");
  const behindBerg2Props = CHAPTER2_PROPS.filter((prop) => prop.stack === "behindBerg2");
  const midBerg2Props = CHAPTER2_PROPS.filter(
    (prop) =>
      prop.stack === "midBerg2" &&
      prop.id !== "r_vulkan" &&
      prop.id !== "r_celemen2" &&
      prop.id !== "r_obst4",
  ).sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
  const aboveBerg2Props = CHAPTER2_PROPS.filter((prop) => prop.stack === "aboveBerg2").sort(
    (a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id),
  );

  type BergPropMotion = { shiftX: number; shiftY: number; bergScale: number };

  const berg4EditForProps = devEditsReady
    ? tunableEdits.berg4
    : CHAPTER2_BERG4_FIXED_LAYOUT;
  const berg4PropMotion: BergPropMotion | undefined = berg4Layer
    ? {
        shiftX: mouseX * berg4Layer.parallax + berg4EditForProps.x,
        shiftY:
          mouseY * berg4Layer.parallax * 0.65 +
          berg4EditForProps.y +
          berg4ScrollY +
          getChapter2BergSubscene23YOffset("berg4", subscene23IntroProgress) +
          bergSubscene24Y("berg4"),
        bergScale: berg4EditForProps.scale,
      }
    : undefined;

  const renderPropLayer = (
    prop: Chapter2PropConfig,
    berg2Motion?: BergPropMotion,
    berg4Motion?: BergPropMotion,
    berg3Motion?: BergPropMotion,
  ) => {
    const attachedBerg2 = berg2Motion && prop.attachToBergId === "berg2";
    const attachedBerg3 = berg3Motion && prop.attachToBergId === "berg3";
    const attachedBerg4 = berg4Motion && prop.attachToBergId === "berg4";
    const shiftX = attachedBerg2
      ? berg2Motion.shiftX
      : attachedBerg3
        ? berg3Motion.shiftX
        : attachedBerg4
          ? berg4Motion.shiftX
          : mouseX * prop.parallax;
    const shiftY = attachedBerg2
      ? berg2Motion.shiftY
      : attachedBerg3
        ? berg3Motion.shiftY
        : attachedBerg4
          ? berg4Motion.shiftY
          : mouseY * prop.parallax * 0.65;
    const bergScale = attachedBerg2
      ? berg2Motion.bergScale
      : attachedBerg3
        ? berg3Motion.bergScale
        : attachedBerg4
          ? berg4Motion.bergScale
          : getChapter2PropDepthScale(viewportHeight, prop.depthPx);
    if (
      !editor.enabled &&
      chapter2PropIsSubscene23Exclusive(prop) &&
      !isChapter2PlaybackSubscene23OrLater(playbackPhase)
    ) {
      return null;
    }
    if (
      !editor.enabled &&
      chapter2PropIsSubscene24Exclusive(prop) &&
      playbackPhase !== "2-4-playing"
    ) {
      return null;
    }

    const layout = propEditsReady ? propEdits[prop.id] : getChapter2PropDefaultEdit(prop.id);
    let scrollScaleMul = getChapter2PropScrollScaleMultiplier(
      prop,
      layout,
      viewportHeight,
      bergScale,
      scrollSegments,
    );
    let scrollScaleYMul: number | undefined;
    let scrollOpacity = getChapter2PropScrollOpacity(prop, scrollSegments);
    let layoutYOffset = 0;
    let layoutXOffset = 0;
    if (prop.revealOnSubscene23) {
      scrollOpacity *= getChapter2LaublRevealOpacity(playbackPhase, subscene23ElapsedSec);
    }
    if (prop.revealOnSubscene24) {
      scrollOpacity *= getChapter2KokiRevealOpacity(playbackPhase, subscene24ElapsedSec);
    }
    if (prop.revealWithBerg24Drop) {
      const vulkanReveal = getChapter2RVulkanSubscene24Reveal(
        prop.id,
        playbackPhase,
        subscene24ElapsedSec,
        viewportHeight,
      );
      if (vulkanReveal) {
        scrollOpacity *= vulkanReveal.opacity;
        layoutYOffset += vulkanReveal.riseYOffsetPx;
        scrollScaleMul *= vulkanReveal.scaleMul;
      }
    }
    if (prop.revealFromBottomLeftAfterVulkan) {
      const celemEnter = getChapter2RCelemenSubscene24Enter(
        prop.id,
        playbackPhase,
        subscene24ElapsedSec,
        viewportWidth,
        viewportHeight,
      );
      if (celemEnter) {
        scrollOpacity *= celemEnter.opacity;
        layoutXOffset += celemEnter.slideXOffsetPx;
        layoutYOffset += celemEnter.slideYOffsetPx;
      }
    }
    if (prop.revealRiseDuringCelem1Enter) {
      const celem2Enter = getChapter2RCelemen2Subscene24Enter(
        prop.id,
        playbackPhase,
        subscene24ElapsedSec,
        viewportWidth,
        viewportHeight,
      );
      if (celem2Enter) {
        scrollOpacity *= celem2Enter.opacity;
        layoutXOffset += celem2Enter.slideXOffsetPx;
        layoutYOffset += celem2Enter.slideYOffsetPx;
        scrollScaleMul *= celem2Enter.scaleMul;
      }
    }
    if (prop.revealBloomAfterVulkan) {
      const blumeBloom = getChapter2RBlumeSubscene24Bloom(
        prop.id,
        playbackPhase,
        subscene24ElapsedSec,
      );
      if (blumeBloom) {
        scrollOpacity *= blumeBloom.opacity;
        layoutYOffset += blumeBloom.riseYOffsetPx;
        scrollScaleMul *= blumeBloom.scaleMul;
      }
    }
    if (prop.revealGrowFromTopDuringBlumeBloom) {
      const obstGrow = getChapter2RObstSubscene24GrowDuringBlume(
        prop.id,
        playbackPhase,
        subscene24ElapsedSec,
        viewportHeight,
      );
      if (obstGrow) {
        scrollOpacity *= obstGrow.opacity;
        layoutYOffset += obstGrow.dropYOffsetPx;
        scrollScaleMul *= obstGrow.scaleMul;
        scrollScaleYMul = (scrollScaleYMul ?? scrollScaleMul) * obstGrow.scaleYMul;
      }
    }
    if (prop.revealFromBottomAfterLaubl) {
      const steinReveal = getChapter2BlauSteinReveal(
        prop.id,
        playbackPhase,
        subscene23ElapsedSec,
      );
      if (steinReveal) {
        scrollOpacity *= steinReveal.opacity;
        layoutYOffset += steinReveal.riseYOffsetPx;
      }
    }
    if (prop.revealFadeAfterLaubl) {
      const fadeReveal = getChapter2BlauFadeAfterLaublReveal(
        prop.id,
        playbackPhase,
        subscene23ElapsedSec,
      );
      if (fadeReveal) {
        scrollOpacity *= fadeReveal.opacity;
        scrollScaleMul *= fadeReveal.scaleMul;
      }
    }
    if (prop.revealFromLeftAfterLaubl) {
      const slideReveal = getChapter2BlauSlideFromLeftReveal(
        prop.id,
        playbackPhase,
        subscene23ElapsedSec,
      );
      if (slideReveal) {
        scrollOpacity *= slideReveal.opacity;
        layoutXOffset += slideReveal.slideXOffsetPx;
      }
    }
    if (prop.revealFromBerg4PeakAfterLaubl) {
      const peakReveal = getChapter2Berg4PeakReveal(
        prop.id,
        playbackPhase,
        subscene23ElapsedSec,
      );
      if (peakReveal) {
        scrollOpacity *= peakReveal.opacity;
        layoutYOffset += peakReveal.riseYOffsetPx;
        scrollScaleMul *= peakReveal.scaleMul;
      }
    }
    const laublBeat = getChapter2LaublRevealPropMotion(
      prop.id,
      subscene23MotionPhase,
      subscene23ElapsedSec,
    );
    if (laublBeat) {
      scrollScaleMul *= laublBeat.scaleMul;
      scrollOpacity *= laublBeat.opacity;
      layoutYOffset = laublBeat.yOffsetPx;
    }
    const kokiCharacterShrink = getChapter2Subscene24CharacterShrink(
      prop.id,
      playbackPhase,
      subscene24ElapsedSec,
    );
    if (kokiCharacterShrink) {
      scrollScaleMul *= kokiCharacterShrink.scaleMul;
      layoutYOffset += kokiCharacterShrink.yOffsetPx;
    }
    const coral24Shrink = getChapter2CoralSubscene24Shrink(
      prop.id,
      playbackPhase,
      subscene24ElapsedSec,
    );
    if (coral24Shrink) {
      scrollScaleMul *= coral24Shrink.scaleMul;
      layoutYOffset += coral24Shrink.yOffsetPx;
    }
    const stein24Drop = getChapter2SteinSubscene24Drop(
      prop.id,
      playbackPhase,
      subscene24ElapsedSec,
    );
    if (stein24Drop) {
      layoutYOffset += stein24Drop.yOffsetPx;
    }
    if (!kokiCharacterShrink && prop.id === "grun_v") {
      scrollScaleMul *= getChapter2GrunSubscene23ScaleMul(playbackPhase, subscene23ElapsedSec);
    } else if (prop.id === "nari") {
      scrollScaleMul *= getChapter2NariSubscene23ScaleMul(playbackPhase, subscene23ElapsedSec);
    }
    const spore24Exit = getChapter2SporeSubscene24Exit(
      prop.id,
      playbackPhase,
      subscene24ElapsedSec,
    );
    if (spore24Exit) {
      scrollOpacity *= spore24Exit.opacity;
      layoutYOffset += spore24Exit.yOffsetPx;
      scrollScaleMul *= spore24Exit.scaleMul;
    }
    const tunable = isChapter2PropTunable(prop.id);
    const isSelected = tunable && editor.selectedId === prop.id;
    return (
      <Chapter2PropLayer
        key={prop.id}
        prop={prop}
        viewportHeight={viewportHeight}
        shiftX={shiftX}
        shiftY={shiftY}
        bergScale={bergScale}
        scrollScaleMul={scrollScaleMul}
        scrollScaleYMul={scrollScaleYMul}
        scrollOpacity={scrollOpacity}
        layoutYOffset={layoutYOffset}
        layoutXOffset={layoutXOffset}
        layout={layout}
        editorActive={editor.enabled && tunable}
        isSelected={isSelected}
        editMode={editor.mode}
        onSelect={() => {
          if (!tunable) return;
          setEditor((prev) => ({ ...prev, selectedId: prop.id as Chapter2TunablePropId }));
        }}
        onDragStart={(x, y) => {
          if (!tunable) return;
          handlePropDragStart(prop.id as Chapter2TunablePropId, x, y);
        }}
        greenSpotlightCharacterTarget={
          clickMarimoGreenSpotlight &&
          prop.id === CHAPTER2_GREEN_SPOTLIGHT_CHARACTER_PROP_ID
        }
      />
    );
  };

  return (
    <div
      ref={sceneShellRef}
      className={`chapter2-scene chapter2-scene--visible${editor.enabled ? " chapter2-scene--editing" : ""}`}
      onPointerDownCapture={handleScenePointerDownCapture}
    >
      <div
        ref={sceneContentRef}
        className="chapter2-scene-content"
        style={{
          ["--berg-scale" as string]: String(CHAPTER2_BERG_DISPLAY_SCALE),
          transform: `translate3d(${earthquakeShake.x + greenSpotlightPanX}px, ${earthquakeShake.y + greenSpotlightPanY}px, 0) scale(${greenSpotlightSceneScale})`,
        }}
      >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CHAPTER2_PAPIER_BG_URL}
        alt=""
        draggable={false}
        decoding="async"
        className="chapter2-papier-bg"
      />

      {berg4Layer && (() => {
        const berg4Edit = devEditsReady
          ? tunableEdits.berg4
          : CHAPTER2_BERG4_FIXED_LAYOUT;
        const berg4ShiftX = mouseX * berg4Layer.parallax;
        const berg4ShiftY = mouseY * berg4Layer.parallax * 0.65;
        return (
          <>
            {behindBerg4Props.map((prop) => renderPropLayer(prop, undefined, berg4PropMotion))}
          <Chapter2BergLayer
            key={berg4Layer.id}
            layer={berg4Layer}
            viewportHeight={viewportHeight}
            shiftX={berg4ShiftX}
            shiftY={berg4ShiftY}
            scrollYOffset={
              berg4ScrollY +
              getChapter2BergSubscene23YOffset("berg4", subscene23IntroProgress) +
              bergSubscene24Y("berg4")
            }
            scrollBlend={bergY2ScrollBlend}
            subscene23Blend={subscene23IntroProgress}
            scale={1}
            edit={berg4Edit}
          />
            {attachedInFrontOfBerg4Props.map((prop) =>
              renderPropLayer(prop, undefined, berg4PropMotion),
            )}
          </>
        );
      })()}

      {aboveBerg4Props.map((prop) => renderPropLayer(prop, undefined, berg4PropMotion))}

      {foregroundLayers.map((layer, index) => {
        const shiftX = mouseX * layer.parallax;
        const shiftY = mouseY * layer.parallax * 0.65;
        const scale = foregroundScales[index] / maxForegroundScale;
        const tunableId = layer.id as Chapter2TunableId;
        const edit = devEditsReady
          ? tunableEdits[tunableId]
          : DEFAULT_CHAPTER2_BERG_EDIT;
        const berg3PropMotion: BergPropMotion | undefined =
          layer.id === "berg3"
            ? {
                shiftX: shiftX + edit.x,
                shiftY:
                  shiftY +
                  edit.y +
                  berg3ScrollY +
                  getChapter2BergSubscene23YOffset("berg3", subscene23IntroProgress) +
                  bergSubscene24Y("berg3"),
                bergScale: scale * edit.scale,
              }
            : undefined;
        return (
          <Fragment key={layer.id}>
            {layer.id === "berg2" && (
              <Chapter2VogelFlyby
                viewportHeight={viewportHeight}
                shiftX={mouseX * CHAPTER2_VOGEL.parallax}
                shiftY={mouseY * CHAPTER2_VOGEL.parallax * 0.65}
                nariProgress={scrollSegments.nari}
                subscene23Phase={playbackPhase}
                subscene23ElapsedSec={subscene23ElapsedSec}
              />
            )}
            {layer.id === "berg2" && behindBerg2Props.map((prop) => renderPropLayer(prop))}
            {layer.id === "berg2" && rObst4Prop && renderPropLayer(rObst4Prop)}
            {layer.id === "berg2" && rVulkanProp && renderPropLayer(rVulkanProp)}
            {layer.id === "berg2" && rCelemen2Prop && renderPropLayer(rCelemen2Prop)}
            {layer.id === "berg2" &&
              midBerg2Props.map((prop) => renderPropLayer(prop))}
            {layer.id === "berg3" &&
              behindBerg3Props.map((prop) =>
                renderPropLayer(prop, undefined, undefined, berg3PropMotion),
              )}
            <Chapter2BergLayer
              layer={layer}
              viewportHeight={viewportHeight}
              shiftX={shiftX}
              shiftY={shiftY}
              scrollYOffset={
                layer.id === "berg3"
                  ? berg3ScrollY +
                    getChapter2BergSubscene23YOffset("berg3", subscene23IntroProgress) +
                    bergSubscene24Y("berg3")
                  : layer.id === "berg2"
                    ? berg2SubsceneY
                    : 0
              }
              scrollBlend={layer.id === "berg3" ? bergY2ScrollBlend : 0}
              subscene23Blend={layer.id === "berg3" ? subscene23IntroProgress : 0}
              scale={scale}
              edit={edit}
            />
            {layer.id === "berg2" &&
              aboveBerg2Props.map((prop) =>
                renderPropLayer(prop, {
                  shiftX: shiftX + edit.x,
                  shiftY: shiftY + edit.y + berg2SubsceneY,
                  bergScale: scale * edit.scale,
                }),
              )}
            {layer.id === "berg3" &&
              aboveBerg3Props.map((prop) =>
                renderPropLayer(prop, undefined, undefined, berg3PropMotion),
              )}
            {/* 산3 → 돌3 → 산2: after berg3 stack, before berg2 PNG (see CHAPTER2_PROP_Z_*). */}
            {layer.id === "berg3" &&
              betweenBerg3AndBerg2Props.map((prop) => renderPropLayer(prop))}
          </Fragment>
        );
      })}

      <Chapter2FloatingBubbles
        playbackPhase={playbackPhase}
        subscene23ElapsedSec={subscene23ElapsedSec}
        subscene24ElapsedSec={subscene24ElapsedSec}
      />

      <Chapter2FloatingMarimos
        sporeProgress={scrollSegments.spore}
        scroll22Progress={scroll22Progress}
        subscene23Phase={subscene23MotionPhase}
        subscene23ElapsedSec={subscene23ElapsedSec}
      />

      <Chapter2FloatingNabis
        sporeProgress={scrollSegments.spore}
        scroll22Progress={scroll22Progress}
        subscene23Phase={playbackPhase}
        subscene23ElapsedSec={subscene23ElapsedSec}
        subscene24ElapsedSec={subscene24ElapsedSec}
        yellowExitVisibility={getChapter2YellowGelbExitVisibility(
          subscene23MotionPhase,
          subscene23ElapsedSec,
        )}
      />

      <Chapter2Subscene24ClickMarimos
        enabled={clickMarimoBurstEnabled}
        burstSeq={clickMarimoBurst.seq}
        burstX={clickMarimoBurst.x}
        burstY={clickMarimoBurst.y}
      />

      </div>

      <Chapter2Subscene24GreenSpotlightOverlay
        active={clickMarimoGreenSpotlight}
        lockedCircle={lockedSpotlightHole}
      />

      {chapter3PageTurnVisible && onChapter3PageTurn && (
        <PageTurnButton label="3장" onTurn={onChapter3PageTurn} />
      )}

    </div>
  );
}
