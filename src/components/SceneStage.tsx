"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GrunCharacter from "@/components/GrunCharacter";
import LayerEditorPanel from "@/components/LayerEditorPanel";
import WormHitTarget from "@/components/WormHitTarget";
import AmpelHitTarget from "@/components/AmpelHitTarget";
import KindHitTarget from "@/components/KindHitTarget";
import MossHitTargets from "@/components/MossHitTargets";
import SceneCanvasLoader from "@/components/canvas/SceneCanvasLoader";
import Chapter2Intro from "@/components/scene2/Chapter2Intro";
import Chapter2Scene from "@/components/scene2/Chapter2Scene";
import Chapter3Intro from "@/components/scene3/Chapter3Intro";
import Chapter3Inside from "@/components/scene3/Chapter3Inside";
import Chapter3Scene from "@/components/scene3/Chapter3Scene";
import { preloadChapter2BergAssets } from "@/constants/chapter2Config";
import NextScene from "@/components/scene2/NextScene";
import PageFlipOverlay, { PageFlipLeaf } from "@/components/scene2/PageFlipOverlay";
import PageTurnCue from "@/components/scene2/PageTurnCue";
import { preloadChapter1TableauAssets } from "@/constants/scene2Config";
import {
  createGrunFrameSource,
  type CardId,
  type EditorMode,
  type EditorState,
  type GrunFrameSource,
  type WorldView,
} from "@/components/canvas/worldView";
import { preloadSceneAssets } from "@/lib/preloadSceneAssets";
import {
  areWormMossRevealsComplete,
  GRUN_START_RATIO,
  GRUN_WALK_SPEED_BASE,
  INITIAL_MOSS_PHASES,
  SCENE_REFERENCE_HEIGHT,
  SHOW_LANDMARKS,
  getGrunFollowScroll,
  getSceneEndGrunWorldX,
  getGrunPostKindRevealStandX,
  getGrunPostRevealStandX,
  getPostLandmarkMaxGrunWorldX,
  getPostLandmarkMaxScroll,
  getBackgroundWhiteProgress,
  GRUN_STOP,
  GRUN_STOP_POSE_MS,
  getMsToNextStopPose,
  isAtStopPose,
  getGrunKindBarrierX,
  getGrunWormBarrierX,
  isGrunNearWorm,
  getMaxGrunWorldX,
  getMaxScroll,
  getSceneMetrics,
  scaleWorldX,
  type MossInstanceId,
  type MossPhases,
  type SceneMetrics,
} from "@/constants/sceneConfig";

const EMPTY_METRICS: SceneMetrics = { height: 0, width: 0, panoramaWidth: 0 };

type GrunSettleKind = "click" | "postReveal" | "postKind";

/** Grun's last step, slowing down onto a feet-together pose at the stop point. */
type GrunStop = {
  kind: GrunSettleKind;
  direction: 1 | -1;
  startX: number;
  /** World px this step covers (= distance to the stop point). */
  distance: number;
  /** Walk-cycle ms from the start of the step to the pose, and how much has played. */
  animTotal: number;
  animDone: number;
  /** Walk-cycle speed at the start: makes grun's speed continue smoothly when the steps are
   * stretched or shortened. */
  startRate: number;
};

type CameraMode = "grun" | "landmarkPaused";

type Chapter = 1 | 2 | 3;
type Chapter1Phase = "scroll" | "tableau";
type Chapter2Step = "intro" | "play";
type Chapter3Step = "intro" | "play" | "inside";

function getDevStartChapter(): Chapter {
  if (process.env.NODE_ENV !== "development") return 1;
  if (process.env.NEXT_PUBLIC_DEV_CHAPTER === "1") return 1;
  if (
    process.env.NEXT_PUBLIC_DEV_CHAPTER === "2" ||
    process.env.NEXT_PUBLIC_DEV_CHAPTER2 === "1"
  ) {
    return 2;
  }
  if (
    process.env.NEXT_PUBLIC_DEV_CHAPTER === "3" ||
    process.env.NEXT_PUBLIC_DEV_CHAPTER3 === "1"
  ) {
    return 3;
  }
  /** Dev default: 1장 스크롤. 3장=`?chapter=3` 또는 NEXT_PUBLIC_DEV_CHAPTER=3. */
  return 1;
}

const DEV_START_CHAPTER = getDevStartChapter();

function devChapter3StepFromEnv(): Chapter3Step | null {
  const step = process.env.NEXT_PUBLIC_DEV_CH3;
  if (step === "intro" || step === "play" || step === "inside") return step;
  return null;
}

function resolveDevChapter3Step(params: URLSearchParams): Chapter3Step {
  const step = params.get("ch3");
  if (step === "intro" || step === "play" || step === "inside") return step;
  return devChapter3StepFromEnv() ?? "play";
}

/** Scene 1 layer gizmo toolbar — off by default (`NEXT_PUBLIC_DEV_LAYER_EDIT=1`). */
const DEV_LAYER_EDITOR =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEV_LAYER_EDIT === "1";

/**
 * Rightmost grun world X allowed right now: `maxX`, and — until each has transformed — the
 * barrier in front of the worm (`getGrunWormBarrierX`) and the kid (`KIND_BLOCK_DISTANCE_PX`).
 */
function getGrunLimitX(
  state: {
    wormPhase: "b" | "revealing" | "g";
    kindPhase: "b" | "revealing" | "g";
    metrics: SceneMetrics;
  },
  maxX: number,
) {
  if (!SHOW_LANDMARKS || state.metrics.width <= 0) return maxX;
  let limit = maxX;
  if (state.wormPhase !== "g") limit = Math.min(limit, getGrunWormBarrierX(state.metrics));
  if (state.kindPhase !== "g") limit = Math.min(limit, getGrunKindBarrierX(state.metrics));
  return limit;
}

export default function SceneStage() {
  const stageRef = useRef<HTMLElement>(null);
  const [worldScroll, setWorldScroll] = useState(0);
  const [grunWorldX, setGrunWorldX] = useState(0);
  const [targetWorldX, setTargetWorldX] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<SceneMetrics>(EMPTY_METRICS);
  const [ready, setReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [glReady, setGlReady] = useState(false);
  const [editor, setEditor] = useState<EditorState>({
    enabled: false,
    selectedId: null,
    mode: "translate",
  });
  const editEnabledRef = useRef(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("grun");
  const [wormPhase, setWormPhase] = useState<"b" | "revealing" | "g">("b");
  const [kindPhase, setKindPhase] = useState<"b" | "revealing" | "g">("b");
  const [ampelPhase, setAmpelPhase] = useState<"b" | "g">("b");
  const [mossPhases, setMossPhases] = useState<MossPhases>(INITIAL_MOSS_PHASES);
  const [walkingToKind, setWalkingToKind] = useState(false);
  const stateRef = useRef({
    worldScroll: 0,
    grunWorldX: 0,
    targetWorldX: null as number | null,
    maxScroll: 0,
    maxGrunX: 0,
    metrics: EMPTY_METRICS,
    cameraMode: "grun" as CameraMode,
    wormPhase: "b" as "b" | "revealing" | "g",
    kindPhase: "b" as "b" | "revealing" | "g",
    mossPhases: INITIAL_MOSS_PHASES,
    postLandmarkUnlocked: false,
    walkingToKind: false,
    walkingAfterKindReveal: false,
    grunPostRevealArrived: false,
    /** Walk-cycle time shown (ms). Standing still, it rests on a feet-together pose. */
    grunWalkPhaseMs: GRUN_STOP_POSE_MS[0],
    grunStop: null as GrunStop | null,
    grunLastWalkDirection: 1 as -1 | 1,
  });
  const viewRef = useRef<WorldView>({ worldScroll: 0, grunWorldX: 0 });
  const grunSourceRef = useRef<GrunFrameSource>(createGrunFrameSource());
  const prevHeightRef = useRef(0);
  const backgroundWhiteMaxRef = useRef(0);
  const [chapter, setChapter] = useState<Chapter>(DEV_START_CHAPTER);
  const [chapter1Phase, setChapter1Phase] = useState<Chapter1Phase>("scroll");
  const [tableauRevealed, setTableauRevealed] = useState(false);
  const [chapter2Step, setChapter2Step] = useState<Chapter2Step | null>(
    DEV_START_CHAPTER === 2 ? "play" : null,
  );
  const [chapter2PlayReady, setChapter2PlayReady] = useState(false);
  const [chapter3Step, setChapter3Step] = useState<Chapter3Step | null>(
    DEV_START_CHAPTER === 3 ? (devChapter3StepFromEnv() ?? "play") : null,
  );
  const chapterRef = useRef<Chapter>(DEV_START_CHAPTER);
  const chapter1PhaseRef = useRef<Chapter1Phase>("scroll");

  useEffect(() => {
    if (chapter !== 2 || chapter2Step !== "play") {
      setChapter2PlayReady(false);
      return;
    }
    let cancelled = false;
    void preloadChapter2BergAssets().then(() => {
      if (!cancelled) setChapter2PlayReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [chapter, chapter2Step]);

  const handlePageTurn = useCallback(() => {
    chapterRef.current = 2;
    setChapter(2);
    setChapter2Step("intro");
    void preloadChapter2BergAssets();
    stateRef.current.targetWorldX = null;
    setTargetWorldX(null);
  }, []);

  const handleChapter2IntroComplete = useCallback(() => {
    setChapter2Step("play");
  }, []);

  const handleChapter3PageTurn = useCallback(() => {
    chapterRef.current = 3;
    setChapter(3);
    setChapter2Step(null);
    setChapter3Step("intro");
  }, []);

  /** Page turn in progress, towards this chapter (see PageFlipOverlay). */
  const [pageFlipTo, setPageFlipTo] = useState<2 | 3 | null>(null);
  const startPageFlipTo2 = useCallback(() => setPageFlipTo((prev) => prev ?? 2), []);
  const startPageFlipTo3 = useCallback(() => setPageFlipTo((prev) => prev ?? 3), []);
  const handlePageFlipCovered = useCallback(() => {
    if (pageFlipTo === 2) handlePageTurn();
    else if (pageFlipTo === 3) handleChapter3PageTurn();
  }, [pageFlipTo, handlePageTurn, handleChapter3PageTurn]);
  const handlePageFlipDone = useCallback(() => setPageFlipTo(null), []);

  const handleChapter3IntroComplete = useCallback(() => {
    setChapter3Step("play");
  }, []);

  const handleChapter3EnterPlanet = useCallback(() => {
    setChapter3Step("inside");
  }, []);

  /** `?chapter=1|2|3` (prod preview too). Dev with no query uses DEV_START_CHAPTER. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("chapter");
    let target: Chapter | null = null;
    if (q === "1") target = 1;
    else if (q === "2") target = 2;
    else if (q === "3") target = 3;
    else if (process.env.NODE_ENV === "development") target = DEV_START_CHAPTER;
    if (target === null) return;

    chapterRef.current = target;
    setChapter(target);
    setChapter1Phase("scroll");
    chapter1PhaseRef.current = "scroll";
    setTableauRevealed(false);
    setChapter2Step(target === 2 ? "play" : null);
    if (target === 3) {
      setChapter3Step(resolveDevChapter3Step(params));
    } else {
      setChapter3Step(null);
    }

    if (target === 1) {
      const state = stateRef.current;
      state.targetWorldX = null;
      state.postLandmarkUnlocked = false;
      state.wormPhase = "b";
      state.kindPhase = "b";
      state.mossPhases = { ...INITIAL_MOSS_PHASES };
      state.walkingToKind = false;
      state.walkingAfterKindReveal = false;
      state.grunPostRevealArrived = false;
      state.grunStop = null;
      state.cameraMode = "grun";
      setTargetWorldX(null);
      setWormPhase("b");
      setKindPhase("b");
      setAmpelPhase("b");
      setMossPhases({ ...INITIAL_MOSS_PHASES });
      setWalkingToKind(false);
      setCameraMode("grun");
      backgroundWhiteMaxRef.current = 0;
    }
  }, []);

  const handleTableauRevealComplete = useCallback(() => {
    setTableauRevealed(true);
  }, []);

  useEffect(() => {
    if (!glReady) return;
    const timer = window.setTimeout(preloadChapter1TableauAssets, 1500);
    return () => window.clearTimeout(timer);
  }, [glReady]);

  useEffect(() => {
    let cancelled = false;

    preloadSceneAssets()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setAssetsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateLayout = () => {
      const height = stage.clientHeight;
      const width = stage.clientWidth;
      const nextMetrics = getSceneMetrics(height, width);
      const prevHeight = prevHeightRef.current;

      if (prevHeight > 0 && height !== prevHeight) {
        const state = stateRef.current;
        state.worldScroll = scaleWorldX(state.worldScroll, prevHeight, height);
        state.grunWorldX = scaleWorldX(state.grunWorldX, prevHeight, height);
        if (state.targetWorldX !== null) {
          state.targetWorldX = scaleWorldX(state.targetWorldX, prevHeight, height);
          setTargetWorldX(state.targetWorldX);
        }
        setWorldScroll(state.worldScroll);
        setGrunWorldX(state.grunWorldX);
      }

      const maxScroll = stateRef.current.postLandmarkUnlocked
        ? getPostLandmarkMaxScroll(nextMetrics)
        : getMaxScroll(nextMetrics);
      const maxGrunX = stateRef.current.postLandmarkUnlocked
        ? getPostLandmarkMaxGrunWorldX(nextMetrics)
        : getMaxGrunWorldX(nextMetrics);
      const startX = width * GRUN_START_RATIO;

      stateRef.current.maxScroll = maxScroll;
      stateRef.current.maxGrunX = maxGrunX;
      stateRef.current.metrics = nextMetrics;
      stateRef.current.worldScroll = Math.min(stateRef.current.worldScroll, maxScroll);
      stateRef.current.grunWorldX = Math.min(stateRef.current.grunWorldX, maxGrunX);

      if (width > 0) {
        stateRef.current.worldScroll = getGrunFollowScroll(
          nextMetrics,
          stateRef.current.grunWorldX,
          maxScroll,
        );
      }

      prevHeightRef.current = height;
      setMetrics(nextMetrics);
      setWorldScroll(stateRef.current.worldScroll);
      setGrunWorldX(stateRef.current.grunWorldX);

      if (!ready) {
        stateRef.current.grunWorldX = startX;
        stateRef.current.worldScroll = getGrunFollowScroll(
          nextMetrics,
          startX,
          maxScroll,
        );
        setGrunWorldX(startX);
        setWorldScroll(stateRef.current.worldScroll);
        setReady(true);
      }
    };

    updateLayout();

    const observer = new ResizeObserver(updateLayout);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [ready]);

  const unlockPostLandmarkMovement = useCallback((state: typeof stateRef.current) => {
    state.maxScroll = getPostLandmarkMaxScroll(state.metrics);
    state.maxGrunX = getPostLandmarkMaxGrunWorldX(state.metrics);
    state.postLandmarkUnlocked = true;
    state.cameraMode = "grun";
    setCameraMode("grun");
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (event.detail > 1) return;
    // Layer edit mode: clicks belong to TransformControls, not to grun walking.
    if (editEnabledRef.current) return;

    const state = stateRef.current;
    if (chapterRef.current !== 1) return;

    if (state.cameraMode === "landmarkPaused") {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickScreenX = event.clientX - rect.left;
      const clickWorldX = Math.min(
        Math.max(0, clickScreenX + state.worldScroll),
        getPostLandmarkMaxGrunWorldX(state.metrics),
        getGrunLimitX(state, getPostLandmarkMaxGrunWorldX(state.metrics)),
      );

      if (clickWorldX <= state.grunWorldX + 8) return;

      // Stay at the landmark (worm clickable) until the worm has transformed.
      if (state.wormPhase === "g") unlockPostLandmarkMovement(state);
      state.grunStop = null;
      state.targetWorldX = clickWorldX;
      setTargetWorldX(clickWorldX);
      return;
    }

    if (state.cameraMode !== "grun") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickScreenX = event.clientX - rect.left;
    const clickWorldX = Math.min(
      Math.max(0, clickScreenX + state.worldScroll),
      getGrunLimitX(state, state.maxGrunX),
    );

    state.targetWorldX = clickWorldX;
    state.grunStop = null;
    setTargetWorldX(clickWorldX);
  }, [unlockPostLandmarkMovement]);

  const handleGlReady = useCallback(() => setGlReady(true), []);

  const handleEditToggle = useCallback(() => {
    const enabled = !editEnabledRef.current;
    editEnabledRef.current = enabled;
    setEditor((prev) => ({ ...prev, enabled }));
  }, []);

  const handleEditSelect = useCallback((selectedId: CardId) => {
    setEditor((prev) => ({ ...prev, selectedId }));
  }, []);

  const handleEditMode = useCallback((mode: EditorMode) => {
    setEditor((prev) => (prev.mode === mode ? prev : { ...prev, mode }));
  }, []);

  const setCameraModeBoth = useCallback((mode: CameraMode) => {
    stateRef.current.cameraMode = mode;
    setCameraMode(mode);
  }, []);

  const tryStartWalkingToKind = useCallback(() => {
    const state = stateRef.current;
    if (
      state.cameraMode !== "landmarkPaused" ||
      state.walkingToKind ||
      !areWormMossRevealsComplete(state.wormPhase, state.mossPhases)
    ) {
      return;
    }
    state.walkingToKind = true;
    setWalkingToKind(true);
  }, []);

  const handleWormClick = useCallback(() => {
    if (stateRef.current.wormPhase !== "b") return;
    stateRef.current.wormPhase = "revealing";
    setWormPhase("revealing");
  }, []);

  const handleWormRevealComplete = useCallback(() => {
    stateRef.current.wormPhase = "g";
    setWormPhase("g");
    tryStartWalkingToKind();
  }, [tryStartWalkingToKind]);

  const handleKindClick = useCallback(() => {
    if (stateRef.current.kindPhase !== "b") return;
    stateRef.current.kindPhase = "revealing";
    setKindPhase("revealing");
  }, []);

  const handleKindRevealComplete = useCallback(() => {
    stateRef.current.kindPhase = "g";
    // Auto-step after the reveal only belongs to the guided landmark sequence.
    stateRef.current.walkingAfterKindReveal = stateRef.current.cameraMode === "landmarkPaused";
    setKindPhase("g");
  }, []);

  const handleAmpelClick = useCallback(() => setAmpelPhase("g"), []);

  const handleMossClick = useCallback((id: MossInstanceId) => {
    if (stateRef.current.mossPhases[id] !== "b") return;
    const nextPhases = { ...stateRef.current.mossPhases, [id]: "revealing" as const };
    stateRef.current.mossPhases = nextPhases;
    setMossPhases(nextPhases);
  }, []);

  const handleMossRevealComplete = useCallback((id: MossInstanceId) => {
    const nextPhases = { ...stateRef.current.mossPhases, [id]: "g" as const };
    stateRef.current.mossPhases = nextPhases;
    setMossPhases(nextPhases);
    tryStartWalkingToKind();
  }, [tryStartWalkingToKind]);

  useEffect(() => {
    let frameId = 0;
    let lastTime = performance.now();

    const finishStop = (state: typeof stateRef.current) => {
      const kind = state.grunStop?.kind;
      state.grunStop = null;

      switch (kind) {
        case "click":
          state.targetWorldX = null;
          setTargetWorldX(null);
          break;
        case "postReveal":
          state.walkingToKind = false;
          state.grunPostRevealArrived = true;
          setWalkingToKind(false);
          break;
        case "postKind":
          state.walkingAfterKindReveal = false;
          break;
      }
    };

    /**
     * One frame of walking towards `stopX`. Walks at full speed until the stop point is about
     * one step away, then starts the last step (GrunStop), which ends on a feet-together pose
     * right at `stopX`.
     */
    const walkToward = (
      state: typeof stateRef.current,
      stopX: number,
      kind: GrunSettleKind,
      speed: number,
      delta: number,
    ) => {
      const dx = stopX - state.grunWorldX;
      const distance = Math.abs(dx);
      if (distance <= 4 && isAtStopPose(state.grunWalkPhaseMs)) {
        // Already standing there.
        state.grunStop = {
          kind,
          direction: state.grunLastWalkDirection,
          startX: state.grunWorldX,
          distance: 0,
          animTotal: 0,
          animDone: 0,
          startRate: 1,
        };
        finishStop(state);
        return false;
      }
      const direction = (Math.sign(dx) || state.grunLastWalkDirection) as 1 | -1;
      state.grunLastWalkDirection = direction;

      // The next two feet-together poses, and how far grun gets by then at a normal stride.
      const toPose1 = getMsToNextStopPose(state.grunWalkPhaseMs);
      const toPose2 = toPose1 + getMsToNextStopPose(state.grunWalkPhaseMs + toPose1);
      const reach1 = (toPose1 / 1000) * speed;
      const reach2 = (toPose2 / 1000) * speed;
      // Stop within one step if it fits; take two slowing steps only when walking one more
      // full step would leave a last step that is too short.
      const onFirst = distance <= reach1 * GRUN_STOP.maxStretch;
      const onSecond = !onFirst && distance - reach1 < GRUN_STOP.minStretch * (reach2 - reach1);
      if (onFirst || onSecond) {
        const animTotal = onFirst ? toPose1 : toPose2;
        const stretch = Math.max(distance, 1) / ((animTotal / 1000) * speed);
        state.grunStop = {
          kind,
          direction,
          startX: state.grunWorldX,
          distance,
          animTotal,
          animDone: 0,
          startRate: Math.min(1.6, Math.max(0.6, 1 / stretch)),
        };
        return false;
      }

      state.grunWalkPhaseMs += delta * 1000;
      state.grunWorldX += direction * speed * delta;
      state.grunWorldX = Math.min(state.grunWorldX, getGrunLimitX(state, state.maxGrunX));
      return true;
    };

    /** One frame of the last step: slows down, legs and position in step. */
    const advanceStop = (state: typeof stateRef.current, delta: number) => {
      const stop = state.grunStop;
      if (!stop) return false;
      const u = stop.animTotal > 0 ? stop.animDone / stop.animTotal : 1;
      // Keep walking, then slow down more and more towards the end.
      const rate = stop.startRate + (GRUN_STOP.endRate - stop.startRate) * u * u;
      const step = Math.min(delta * 1000 * rate, stop.animTotal - stop.animDone);
      stop.animDone += step;
      state.grunWalkPhaseMs += step;
      const progress = stop.animTotal > 0 ? stop.animDone / stop.animTotal : 1;
      state.grunWorldX = Math.min(
        stop.startX + stop.direction * stop.distance * progress,
        getGrunLimitX(state, state.maxGrunX),
      );
      if (stop.animDone >= stop.animTotal - 1e-3) finishStop(state);
      return true;
    };

    const tick = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      if (chapterRef.current !== 1 || chapter1PhaseRef.current !== "scroll") {
        frameId = requestAnimationFrame(tick);
        return;
      }

      const state = stateRef.current;
      const { width, height } = state.metrics;
      let moved = false;
      const walkSpeed = GRUN_WALK_SPEED_BASE * (height / SCENE_REFERENCE_HEIGHT || 1);

      // Never walk past the barrier in front of the worm / kid.
      const limitX = getGrunLimitX(state, state.maxGrunX);

      if (state.cameraMode === "grun") {
        if (state.targetWorldX !== null && state.grunStop === null) {
          moved =
            walkToward(state, Math.min(state.targetWorldX, limitX), "click", walkSpeed, delta) ||
            moved;
        }

        if (
          !state.postLandmarkUnlocked &&
          SHOW_LANDMARKS &&
          width > 0 &&
          isGrunNearWorm(state.metrics, state.grunWorldX)
        ) {
          setCameraModeBoth("landmarkPaused");
        }
      } else if (state.cameraMode === "landmarkPaused" && width > 0) {
        if (state.targetWorldX !== null && state.grunStop === null) {
          if (state.wormPhase === "g") unlockPostLandmarkMovement(state);
          moved =
            walkToward(state, Math.min(state.targetWorldX, limitX), "click", walkSpeed, delta) ||
            moved;
        } else if (
          state.walkingToKind &&
          areWormMossRevealsComplete(state.wormPhase, state.mossPhases) &&
          state.grunStop === null
        ) {
          const targetX = Math.min(getGrunPostRevealStandX(state.metrics), limitX);
          moved = walkToward(state, targetX, "postReveal", walkSpeed, delta) || moved;
        } else if (
          state.walkingAfterKindReveal &&
          state.kindPhase === "g" &&
          state.grunStop === null
        ) {
          const targetX = Math.min(getGrunPostKindRevealStandX(state.metrics), limitX);
          moved = walkToward(state, targetX, "postKind", walkSpeed, delta) || moved;
        }
      }

      moved = advanceStop(state, delta) || moved;

      const grunSource = grunSourceRef.current;
      if (grunSource.timeMs !== state.grunWalkPhaseMs) {
        grunSource.timeMs = state.grunWalkPhaseMs;
        grunSource.dirty = true;
      }

      if (width > 0) {
        const prevScroll = state.worldScroll;
        state.worldScroll = getGrunFollowScroll(
          state.metrics,
          state.grunWorldX,
          state.maxScroll,
        );
        if (state.worldScroll !== prevScroll) {
          moved = true;
        }
      }

      if (
        width > 0 &&
        chapter1PhaseRef.current === "scroll" &&
        state.grunWorldX >= getSceneEndGrunWorldX(state.metrics)
      ) {
        chapter1PhaseRef.current = "tableau";
        setChapter1Phase("tableau");
        state.targetWorldX = null;
        setTargetWorldX(null);
      }

      viewRef.current.worldScroll = state.worldScroll;
      viewRef.current.grunWorldX = state.grunWorldX;

      if (moved) {
        setGrunWorldX(state.grunWorldX);
        setWorldScroll(state.worldScroll);
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [setCameraModeBoth, unlockPostLandmarkMovement]);

  const backgroundProgress = Math.max(
    backgroundWhiteMaxRef.current,
    // Before the first layout the metrics are empty, which would read as "fully white".
    metrics.height > 0 ? getBackgroundWhiteProgress(metrics, worldScroll) : 0,
  );
  backgroundWhiteMaxRef.current = backgroundProgress;
  const backgroundChannel = Math.round(backgroundProgress * 255);
  const showScene = ready && metrics.height > 0;
  const sceneStyle = {
    "--scene-h": `${metrics.height}px`,
    "--scene-w": `${metrics.width}px`,
    "--berg-w": `${metrics.panoramaWidth}px`,
    backgroundColor: `rgb(${backgroundChannel}, ${backgroundChannel}, ${backgroundChannel})`,
  } as React.CSSProperties;

  const showChapter1Scroll = chapter === 1 && chapter1Phase === "scroll";
  const showChapter1Tableau = chapter === 1 && chapter1Phase === "tableau";

  return (
    <>
    {showChapter1Scroll && (
    <main
      ref={stageRef}
      className={`scene-stage relative h-screen w-screen overflow-hidden cursor-pointer${showScene ? "" : " scene-stage--loading"}${editor.enabled ? " scene-stage--editing" : ""}`}
      style={sceneStyle}
      onClick={handleClick}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <SceneCanvasLoader
        metrics={metrics}
        viewRef={viewRef}
        grunSourceRef={grunSourceRef}
        wormPhase={wormPhase}
        kindPhase={kindPhase}
        ampelPhase={ampelPhase}
        mossPhases={mossPhases}
        onWormRevealComplete={handleWormRevealComplete}
        onKindRevealComplete={handleKindRevealComplete}
        onMossRevealComplete={handleMossRevealComplete}
        editor={editor}
        onReady={handleGlReady}
      />
      {DEV_LAYER_EDITOR && (
        <LayerEditorPanel
          editor={editor}
          onToggle={handleEditToggle}
          onSelect={handleEditSelect}
          onModeChange={handleEditMode}
        />
      )}
      <GrunCharacter sourceRef={grunSourceRef} />
      <MossHitTargets
        worldScroll={worldScroll}
        metrics={metrics}
        active={cameraMode === "landmarkPaused"}
        mossPhases={mossPhases}
        onMossClick={handleMossClick}
      />
      <KindHitTarget
        worldScroll={worldScroll}
        metrics={metrics}
        active={kindPhase === "b"}
        onClick={handleKindClick}
      />
      <WormHitTarget
        worldScroll={worldScroll}
        metrics={metrics}
        active={cameraMode === "landmarkPaused" && wormPhase === "b"}
        onClick={handleWormClick}
      />
      <AmpelHitTarget
        worldScroll={worldScroll}
        metrics={metrics}
        active={SHOW_LANDMARKS && ampelPhase === "b"}
        onClick={handleAmpelClick}
      />
    </main>
    )}
    {showChapter1Tableau && (
      <PageFlipLeaf turning={pageFlipTo === 2}>
        <NextScene onRevealComplete={handleTableauRevealComplete} />
        {tableauRevealed && <PageTurnCue onTurn={startPageFlipTo2} />}
      </PageFlipLeaf>
    )}
    {chapter === 2 && chapter2Step === "play" && chapter2PlayReady && (
      <PageFlipLeaf turning={pageFlipTo === 3}>
        <Chapter2Scene
          onSubscene23ScrollStart={() => {
            /* scene 2-3 motion — wire timeline next */
          }}
          onChapter3PageTurn={startPageFlipTo3}
        />
      </PageFlipLeaf>
    )}
    {pageFlipTo !== null && (
      <PageFlipOverlay onCovered={handlePageFlipCovered} onDone={handlePageFlipDone} />
    )}
    {chapter === 2 && chapter2Step === "intro" && (
      <Chapter2Intro onComplete={handleChapter2IntroComplete} />
    )}
    {chapter === 3 && chapter3Step === "intro" && (
      <Chapter3Intro onComplete={handleChapter3IntroComplete} />
    )}
    {chapter === 3 && chapter3Step === "play" && (
      <Chapter3Scene onEnterPlanet={handleChapter3EnterPlanet} />
    )}
    {chapter === 3 && chapter3Step === "inside" && <Chapter3Inside />}
    </>
  );
}
