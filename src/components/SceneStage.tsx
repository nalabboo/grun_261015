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
  SCENE1_EXIT,
  getGrunDisplayWidth,
  getGrunPostKindRevealStandX,
  getGrunPostRevealStandX,
  getPostLandmarkMaxGrunWorldX,
  getPostLandmarkMaxScroll,
  getBackgroundWhiteProgress,
  GRUN_STOP,
  SCROLL_WALK,
  GRUN_WALK,
  GRUN_STOP_POSE_MS,
  getMsToNextStopPose,
  isAtStopPose,
  getGrunKindBarrierX,
  getGrunWormBarrierX,
  isWormInView,
  getWormFocusScroll,
  getKindFocusScroll,
  isKindInView,
  isAmpelInView,
  getAmpelFocusScroll,
  getGrunAmpelBarrierX,
  WORM_CAMERA,
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
/** "exit": grun walks off screen while a white light fills it (SCENE1_EXIT). */
type Chapter1Phase = "scroll" | "exit" | "tableau";
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
    ampelGreen: boolean;
    metrics: SceneMetrics;
  },
  maxX: number,
) {
  if (!SHOW_LANDMARKS || state.metrics.width <= 0) return maxX;
  let limit = maxX;
  if (state.wormPhase !== "g") limit = Math.min(limit, getGrunWormBarrierX(state.metrics));
  if (state.kindPhase !== "g") limit = Math.min(limit, getGrunKindBarrierX(state.metrics));
  if (!state.ampelGreen) limit = Math.min(limit, getGrunAmpelBarrierX(state.metrics));
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
    /** Grun keeps walking at full speed until this time (performance.now) while scrolling. */
    scrollWalkUntil: 0,
    /** Camera: 0 = follows grun, 1 = shows the worm / the kid. */
    wormCameraBlend: 0,
    kindCameraBlend: 0,
    kindCameraOn: false,
    /** Traffic light: green once its turn clip has played; camera like the kid's. */
    ampelGreen: false,
    ampelCameraBlend: 0,
    ampelCameraOn: false,
    ampelCameraReleased: false,
    /** Walking off screen at the end of chapter 1 (camera held at `exitScroll`). */
    exiting: false,
    exitScroll: 0,
    /** Set when grun walks on after the kid turned green: the camera follows grun again. */
    kindCameraReleased: false,
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
  /** White light at the end of chapter 1: blooming in ("in", from `lightX` % across) or clearing. */
  const [exitLight, setExitLight] = useState<{ stage: "in" | "out"; lightX: number } | null>(null);

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
      state.wormCameraBlend = 0;
      state.kindCameraBlend = 0;
      state.kindCameraOn = false;
      state.kindCameraReleased = false;
      state.ampelGreen = false;
      state.ampelCameraBlend = 0;
      state.ampelCameraOn = false;
      state.ampelCameraReleased = false;
      state.exiting = false;
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

  /**
   * Scrolling down walks grun forward: moves his target ahead by the scroll distance (capped a
   * little ahead of him). Scrolling up drops what is left of the way.
   */
  const pushWalkForward = useCallback((amount: number) => {
    // Layer edit mode: input belongs to TransformControls, not to grun walking.
    if (editEnabledRef.current) return;
    if (chapterRef.current !== 1 || chapter1PhaseRef.current !== "scroll") return;
    const state = stateRef.current;
    if (state.exiting) return;
    if (state.metrics.width <= 0) return;
    if (state.cameraMode !== "grun" && state.cameraMode !== "landmarkPaused") return;

    if (amount <= 0) {
      if (state.targetWorldX !== null && state.grunStop === null) {
        state.targetWorldX = state.grunWorldX;
      }
      state.scrollWalkUntil = 0;
      return;
    }

    // Leaving the worm once it has transformed; walking on after the kid turned green.
    if (state.cameraMode === "landmarkPaused" && state.wormPhase === "g") {
      unlockPostLandmarkMovement(state);
    }
    if (state.kindPhase === "g") state.kindCameraReleased = true;
    if (state.ampelGreen) state.ampelCameraReleased = true;

    const scale = state.metrics.height / SCENE_REFERENCE_HEIGHT || 1;
    const maxX =
      state.cameraMode === "landmarkPaused"
        ? getPostLandmarkMaxGrunWorldX(state.metrics)
        : state.maxGrunX;
    const limitX = getGrunLimitX(state, maxX);
    const maxLead =
      ((GRUN_WALK_SPEED_BASE * scale * GRUN_WALK.loopMs) / 1000) * SCROLL_WALK.maxLeadCycles;
    const from = Math.max(state.targetWorldX ?? state.grunWorldX, state.grunWorldX);
    const next = Math.min(
      from + amount * scale * SCROLL_WALK.gain,
      state.grunWorldX + maxLead,
      limitX,
    );
    state.scrollWalkUntil = performance.now() + SCROLL_WALK.holdMs;
    if (next <= (state.targetWorldX ?? state.grunWorldX) + 0.5) return;

    // Already slowing down to a stop short of the new target: keep walking instead.
    const stop = state.grunStop;
    if (stop && stop.kind === "click" && next > stop.startX + stop.direction * stop.distance + 2) {
      state.grunStop = null;
    }
    state.targetWorldX = next;
  }, [unlockPostLandmarkMovement]);

  useEffect(() => {
    if (chapter !== 1 || chapter1Phase !== "scroll") return;
    let touchY: number | null = null;
    const onWheel = (event: WheelEvent) => {
      // Lines / pages → px for mice that report them.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      pushWalkForward(event.deltaY * unit);
    };
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (touchY === null || y === undefined) return;
      pushWalkForward((touchY - y) * SCROLL_WALK.touchGain);
      touchY = y;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(event.key)) {
        pushWalkForward(SCROLL_WALK.keyStepPx);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) {
        pushWalkForward(-1);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [chapter, chapter1Phase, pushWalkForward]);

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
    const state = stateRef.current;
    state.wormPhase = "g";
    setWormPhase("g");
    if (state.cameraMode !== "landmarkPaused" || state.postLandmarkUnlocked) return;

    // Grun walks on to the kid by himself; the camera glides on to the kid with him.
    unlockPostLandmarkMovement(state);
    if (state.kindPhase === "g") state.kindCameraReleased = true;
    // Kid already green: walk on to the traffic light instead.
    const kidStandX = Math.min(
      state.kindPhase === "g"
        ? getGrunAmpelBarrierX(state.metrics)
        : getGrunKindBarrierX(state.metrics),
      getGrunLimitX(state, state.maxGrunX),
    );
    if (kidStandX > state.grunWorldX + 8) {
      state.grunStop = null;
      state.targetWorldX = kidStandX;
      setTargetWorldX(kidStandX);
    }
  }, [unlockPostLandmarkMovement]);

  const handleKindClick = useCallback(() => {
    if (stateRef.current.kindPhase !== "b") return;
    stateRef.current.kindPhase = "revealing";
    setKindPhase("revealing");
  }, []);

  const handleKindRevealComplete = useCallback(() => {
    const state = stateRef.current;
    state.kindPhase = "g";
    // Auto-step after the reveal only belongs to the guided landmark sequence.
    state.walkingAfterKindReveal = state.cameraMode === "landmarkPaused";
    setKindPhase("g");
    // Past the worm: grun walks on to the traffic light by himself, the camera with him.
    if (state.cameraMode !== "grun" || !state.postLandmarkUnlocked || state.exiting) return;
    state.kindCameraReleased = true;
    const ampelStandX = Math.min(
      getGrunAmpelBarrierX(state.metrics),
      getGrunLimitX(state, state.maxGrunX),
    );
    if (ampelStandX > state.grunWorldX + 8) {
      state.grunStop = null;
      state.targetWorldX = ampelStandX;
      setTargetWorldX(ampelStandX);
    }
  }, []);

  const handleAmpelClick = useCallback(() => setAmpelPhase("g"), []);
  /** The traffic light's turn clip has played: grun may walk on. */
  const handleAmpelSwitchComplete = useCallback(() => {
    stateRef.current.ampelGreen = true;
  }, []);

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

      // While the reader keeps scrolling, just keep walking (no stop planned yet), unless he
      // is walking up to the worm / kid barrier.
      const scrolling =
        kind === "click" &&
        performance.now() < state.scrollWalkUntil &&
        stopX < getGrunLimitX(state, state.maxGrunX) - 1;
      if (scrolling) {
        if (distance <= 1) return false;
        const step = Math.min(speed * delta, distance);
        state.grunWalkPhaseMs += (step / speed) * 1000;
        state.grunWorldX += direction * step;
        return true;
      }

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
        const natural = (animTotal / 1000) * speed;
        // A click target may be passed a little rather than taking a tiny, shuffling last
        // stride; the barrier in front of the worm / kid never.
        let stepDistance = distance;
        if (kind === "click") {
          const room =
            direction > 0
              ? Math.max(distance, getGrunLimitX(state, state.maxGrunX) - state.grunWorldX)
              : Number.POSITIVE_INFINITY;
          stepDistance = Math.min(Math.max(distance, natural * GRUN_STOP.minStretch), room);
        }
        const stretch = Math.max(stepDistance, 1) / natural;
        state.grunStop = {
          kind,
          direction,
          startX: state.grunWorldX,
          distance: stepDistance,
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
      // Keep walking, then slow down more and more during the last walk cycle.
      const decelMs = Math.min(stop.animTotal, GRUN_WALK.loopMs);
      const u =
        decelMs > 0
          ? Math.min(1, Math.max(0, (stop.animDone - (stop.animTotal - decelMs)) / decelMs))
          : 1;
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

      if (chapterRef.current !== 1 || chapter1PhaseRef.current === "tableau") {
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
          isWormInView(state.metrics, state.worldScroll)
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

      // Traffic light green and grun at it: he walks on by himself, out of the picture.
      if (
        !state.exiting &&
        state.ampelGreen &&
        width > 0 &&
        state.grunWorldX >= getGrunAmpelBarrierX(state.metrics) - 2
      ) {
        state.exiting = true;
        state.exitScroll = state.worldScroll;
        state.maxGrunX = state.worldScroll + width * 3;
        state.grunStop = null;
        state.targetWorldX = state.worldScroll + width + getGrunDisplayWidth(state.metrics) * 1.5;
        setTargetWorldX(state.targetWorldX);
      }

      if (state.exiting) {
        // The camera stays; grun walks out on the right.
        if (state.worldScroll !== state.exitScroll) {
          state.worldScroll = state.exitScroll;
          moved = true;
        }
      } else if (width > 0) {
        const prevScroll = state.worldScroll;
        const followScroll = getGrunFollowScroll(
          state.metrics,
          state.grunWorldX,
          state.maxScroll,
        );
        // Glide to the worm while grun is held there, then on to the kid, and back to grun
        // when he walks on past the kid.
        const wormFocus = state.cameraMode === "landmarkPaused" && !state.postLandmarkUnlocked;
        // Latches once the kid is on screen after the worm part (the worm view shows the kid).
        if (
          SHOW_LANDMARKS &&
          !wormFocus &&
          state.postLandmarkUnlocked &&
          isKindInView(state.metrics, prevScroll)
        ) {
          state.kindCameraOn = true;
        }
        const kindFocus = state.kindCameraOn && !state.kindCameraReleased;
        // Then the traffic light, once grun has left the kid.
        if (
          SHOW_LANDMARKS &&
          !wormFocus &&
          !kindFocus &&
          state.postLandmarkUnlocked &&
          isAmpelInView(state.metrics, prevScroll)
        ) {
          state.ampelCameraOn = true;
        }
        const ampelFocus = state.ampelCameraOn && !state.ampelCameraReleased;
        const blendStep = (delta * 1000) / WORM_CAMERA.blendMs;
        const approach = (value: number, on: boolean) =>
          on ? Math.min(1, value + blendStep) : Math.max(0, value - blendStep);
        state.wormCameraBlend = approach(state.wormCameraBlend, wormFocus);
        state.kindCameraBlend = approach(state.kindCameraBlend, kindFocus);
        state.ampelCameraBlend = approach(state.ampelCameraBlend, ampelFocus);
        const ease = (b: number) => b * b * (3 - 2 * b);
        const wormWeight = ease(state.wormCameraBlend);
        const kindWeight = ease(state.kindCameraBlend);
        const ampelWeight = ease(state.ampelCameraBlend);
        let scroll = followScroll;
        if (wormWeight > 0) {
          scroll +=
            (getWormFocusScroll(state.metrics, state.grunWorldX, state.maxScroll) - followScroll) *
            wormWeight;
        }
        if (kindWeight > 0) {
          scroll +=
            (getKindFocusScroll(state.metrics, state.grunWorldX, state.maxScroll) - followScroll) *
            kindWeight;
        }
        if (ampelWeight > 0) {
          scroll +=
            (getAmpelFocusScroll(state.metrics, state.grunWorldX, state.maxScroll) - followScroll) *
            ampelWeight;
        }
        state.worldScroll = scroll;
        if (state.worldScroll !== prevScroll) {
          moved = true;
        }
      }

      // Partly out of the picture: a white light blooms from him and fills the screen; under
      // the full white the whole scene is swapped for the tableau, then the light clears.
      const grunWidth = getGrunDisplayWidth(state.metrics);
      if (
        state.exiting &&
        chapter1PhaseRef.current === "scroll" &&
        state.grunWorldX - state.worldScroll >= width - grunWidth * (1 - SCENE1_EXIT.startOutRatio)
      ) {
        chapter1PhaseRef.current = "exit";
        setChapter1Phase("exit");
        const grunCenter = state.grunWorldX - state.worldScroll + grunWidth / 2;
        setExitLight({ stage: "in", lightX: Math.min(100, (grunCenter / width) * 100) });
        window.setTimeout(() => {
          if (chapter1PhaseRef.current !== "exit") return;
          chapter1PhaseRef.current = "tableau";
          setChapter1Phase("tableau");
          state.targetWorldX = null;
          setTargetWorldX(null);
          setExitLight((light) => (light ? { ...light, stage: "out" } : null));
          window.setTimeout(() => setExitLight(null), SCENE1_EXIT.lightOutMs);
        }, SCENE1_EXIT.lightInMs);
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

  const showChapter1Scroll = chapter === 1 && chapter1Phase !== "tableau";
  const showChapter1Tableau = chapter === 1 && chapter1Phase === "tableau";

  return (
    <>
    {showChapter1Scroll && (
    <main
      ref={stageRef}
      className={`scene-stage relative h-screen w-screen overflow-hidden${showScene ? "" : " scene-stage--loading"}${editor.enabled ? " scene-stage--editing" : ""}`}
      style={sceneStyle}
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
        onAmpelSwitchComplete={handleAmpelSwitchComplete}
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
    {chapter === 1 && exitLight && (
      <div
        className={`scene1-light scene1-light--${exitLight.stage}`}
        aria-hidden
        style={
          {
            "--scene1-light-x": `${exitLight.lightX}%`,
            "--scene1-light-in": `${SCENE1_EXIT.lightInMs}ms`,
            "--scene1-light-out": `${SCENE1_EXIT.lightOutMs}ms`,
          } as React.CSSProperties
        }
      />
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
