"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GrunCharacter from "@/components/GrunCharacter";
import LayerEditorPanel from "@/components/LayerEditorPanel";
import WormHitTarget from "@/components/WormHitTarget";
import KindHitTarget from "@/components/KindHitTarget";
import MossHitTargets from "@/components/MossHitTargets";
import SceneCanvasLoader from "@/components/canvas/SceneCanvasLoader";
import Chapter2Intro from "@/components/scene2/Chapter2Intro";
import Chapter2Scene from "@/components/scene2/Chapter2Scene";
import { preloadChapter2BergAssets } from "@/constants/chapter2Config";
import NextScene from "@/components/scene2/NextScene";
import PageTurnButton from "@/components/scene2/PageTurnButton";
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
  getRemainingWalkLoopMs,
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

type CameraMode = "grun" | "landmarkPaused";

type Chapter = 1 | 2;
type Chapter1Phase = "scroll" | "tableau";
type Chapter2Step = "intro" | "play";

/** Local dev: open chapter 2 berg scene on load (set NEXT_PUBLIC_DEV_CHAPTER2=0 to disable). */
const DEV_START_CHAPTER2 =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEV_CHAPTER2 !== "0";

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
  const [mossPhases, setMossPhases] = useState<MossPhases>(INITIAL_MOSS_PHASES);
  const [walkingToKind, setWalkingToKind] = useState(false);
  const [grunPostRevealArrived, setGrunPostRevealArrived] = useState(false);
  const [grunIsWalking, setGrunIsWalking] = useState(false);
  const [grunWalkPlayStart, setGrunWalkPlayStart] = useState(0);
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
    grunIsWalking: false,
    grunWalkPlayStart: 0,
    grunSettlingUntil: 0,
    grunSettleDirection: 0 as -1 | 0 | 1,
    grunSettleKind: null as GrunSettleKind | null,
    grunLastWalkDirection: 1 as -1 | 1,
  });
  const viewRef = useRef<WorldView>({ worldScroll: 0, grunWorldX: 0 });
  const grunSourceRef = useRef<GrunFrameSource>(createGrunFrameSource());
  const prevHeightRef = useRef(0);
  const backgroundWhiteMaxRef = useRef(0);
  const [chapter, setChapter] = useState<Chapter>(DEV_START_CHAPTER2 ? 2 : 1);
  const [chapter1Phase, setChapter1Phase] = useState<Chapter1Phase>("scroll");
  const [tableauRevealed, setTableauRevealed] = useState(false);
  const [chapter2Step, setChapter2Step] = useState<Chapter2Step | null>(
    DEV_START_CHAPTER2 ? "play" : null,
  );
  const [chapter2PlayReady, setChapter2PlayReady] = useState(false);
  const [chapter2ExitScrollReady, setChapter2ExitScrollReady] = useState(false);
  const chapterRef = useRef<Chapter>(DEV_START_CHAPTER2 ? 2 : 1);
  const chapter1PhaseRef = useRef<Chapter1Phase>("scroll");

  useEffect(() => {
    if (chapter !== 2 || chapter2Step !== "play") {
      setChapter2PlayReady(false);
      setChapter2ExitScrollReady(false);
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
      );

      if (clickWorldX <= state.grunWorldX + 8) return;

      unlockPostLandmarkMovement(state);
      state.grunSettlingUntil = 0;
      state.grunSettleKind = null;
      state.targetWorldX = clickWorldX;
      setTargetWorldX(clickWorldX);
      return;
    }

    if (state.cameraMode !== "grun") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickScreenX = event.clientX - rect.left;
    const clickWorldX = Math.min(
      Math.max(0, clickScreenX + state.worldScroll),
      state.maxGrunX,
    );

    state.targetWorldX = clickWorldX;
    state.grunSettlingUntil = 0;
    state.grunSettleKind = null;
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
    stateRef.current.walkingAfterKindReveal = true;
    setKindPhase("g");
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

    const beginWalkCycle = (state: typeof stateRef.current) => {
      if (state.grunWalkPlayStart === 0) {
        state.grunWalkPlayStart = Date.now();
        setGrunWalkPlayStart(state.grunWalkPlayStart);
      }
    };

    const beginSettle = (
      state: typeof stateRef.current,
      direction: number,
      kind: GrunSettleKind,
    ) => {
      const walkDirection =
        direction !== 0 ? direction : state.grunLastWalkDirection || 1;

      beginWalkCycle(state);
      state.grunSettlingUntil =
        Date.now() + getRemainingWalkLoopMs(state.grunWalkPlayStart);
      state.grunSettleDirection = walkDirection > 0 ? 1 : -1;
      state.grunSettleKind = kind;
    };

    const clearWalkCycle = (state: typeof stateRef.current) => {
      state.grunWalkPlayStart = 0;
      state.grunSettlingUntil = 0;
      state.grunSettleDirection = 0;
      state.grunSettleKind = null;
      setGrunWalkPlayStart(0);
    };

    const finishSettle = (state: typeof stateRef.current) => {
      const kind = state.grunSettleKind;
      clearWalkCycle(state);

      switch (kind) {
        case "click":
          state.targetWorldX = null;
          setTargetWorldX(null);
          break;
        case "postReveal":
          state.walkingToKind = false;
          state.grunPostRevealArrived = true;
          setWalkingToKind(false);
          setGrunPostRevealArrived(true);
          break;
        case "postKind":
          state.walkingAfterKindReveal = false;
          break;
      }
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
      const grunXAtFrameStart = state.grunWorldX;
      let moved = false;
      const walkSpeed = GRUN_WALK_SPEED_BASE * (height / SCENE_REFERENCE_HEIGHT || 1);

      if (state.cameraMode === "grun") {
        if (state.targetWorldX !== null && state.grunSettlingUntil === 0) {
          const dx = state.targetWorldX - state.grunWorldX;

          if (Math.abs(dx) > 4) {
            beginWalkCycle(state);
            state.grunLastWalkDirection = (Math.sign(dx) || 1) as 1 | -1;
            state.grunWorldX += state.grunLastWalkDirection * walkSpeed * delta;
            state.grunWorldX = Math.min(state.grunWorldX, state.maxGrunX);
            moved = true;
          } else {
            beginSettle(state, state.grunLastWalkDirection, "click");
          }
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
        if (state.targetWorldX !== null && state.grunSettlingUntil === 0) {
          unlockPostLandmarkMovement(state);
          const dx = state.targetWorldX - state.grunWorldX;

          if (Math.abs(dx) > 4) {
            beginWalkCycle(state);
            state.grunLastWalkDirection = (Math.sign(dx) || 1) as 1 | -1;
            state.grunWorldX += state.grunLastWalkDirection * walkSpeed * delta;
            state.grunWorldX = Math.min(state.grunWorldX, state.maxGrunX);
            moved = true;
          } else {
            beginSettle(state, state.grunLastWalkDirection, "click");
          }
        } else if (
          state.walkingToKind &&
          areWormMossRevealsComplete(state.wormPhase, state.mossPhases) &&
          state.grunSettlingUntil === 0
        ) {
          const targetX = getGrunPostRevealStandX(state.metrics);
          const dx = targetX - state.grunWorldX;

          if (Math.abs(dx) > 4) {
            beginWalkCycle(state);
            state.grunLastWalkDirection = (Math.sign(dx) || 1) as 1 | -1;
            state.grunWorldX += state.grunLastWalkDirection * walkSpeed * delta;
            state.grunWorldX = Math.min(state.grunWorldX, state.maxGrunX);
            moved = true;
          } else {
            beginSettle(state, state.grunLastWalkDirection, "postReveal");
          }
        } else if (
          state.walkingAfterKindReveal &&
          state.kindPhase === "g" &&
          state.grunSettlingUntil === 0
        ) {
          const targetX = getGrunPostKindRevealStandX(state.metrics);
          const dx = targetX - state.grunWorldX;

          if (Math.abs(dx) > 4) {
            beginWalkCycle(state);
            state.grunLastWalkDirection = (Math.sign(dx) || 1) as 1 | -1;
            state.grunWorldX += state.grunLastWalkDirection * walkSpeed * delta;
            state.grunWorldX = Math.min(state.grunWorldX, state.maxGrunX);
            moved = true;
          } else {
            beginSettle(state, state.grunLastWalkDirection, "postKind");
          }
        }
      }

      if (state.grunSettlingUntil > 0) {
        const now = Date.now();
        if (now < state.grunSettlingUntil) {
          state.grunWorldX += state.grunSettleDirection * walkSpeed * delta;
          state.grunWorldX = Math.min(state.grunWorldX, state.maxGrunX);
          moved = true;
        } else {
          finishSettle(state);
        }
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

      const grunMovedThisFrame = Math.abs(state.grunWorldX - grunXAtFrameStart) > 0.01;
      const isSettling = state.grunSettlingUntil > Date.now();
      const nextGrunIsWalking = grunMovedThisFrame || isSettling;

      if (nextGrunIsWalking !== state.grunIsWalking) {
        state.grunIsWalking = nextGrunIsWalking;
        setGrunIsWalking(nextGrunIsWalking);
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
  const showScene = ready && assetsReady && glReady && metrics.height > 0;
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
        mossPhases={mossPhases}
        onWormRevealComplete={handleWormRevealComplete}
        onKindRevealComplete={handleKindRevealComplete}
        onMossRevealComplete={handleMossRevealComplete}
        editor={editor}
        onReady={handleGlReady}
      />
      <LayerEditorPanel
        editor={editor}
        onToggle={handleEditToggle}
        onSelect={handleEditSelect}
        onModeChange={handleEditMode}
      />
      <GrunCharacter
        sourceRef={grunSourceRef}
        isWalking={grunIsWalking}
        walkPlayStartMs={grunWalkPlayStart}
      />
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
        active={cameraMode === "landmarkPaused" && kindPhase === "b" && grunPostRevealArrived}
        onClick={handleKindClick}
      />
      <WormHitTarget
        worldScroll={worldScroll}
        metrics={metrics}
        active={cameraMode === "landmarkPaused" && wormPhase === "b"}
        onClick={handleWormClick}
      />
    </main>
    )}
    {showChapter1Tableau && (
      <NextScene onRevealComplete={handleTableauRevealComplete} />
    )}
    {showChapter1Tableau && tableauRevealed && (
      <PageTurnButton onTurn={handlePageTurn} />
    )}
    {chapter === 2 && chapter2Step === "play" && chapter2PlayReady && (
      <Chapter2Scene
        onExitScrollComplete={() => setChapter2ExitScrollReady(true)}
      />
    )}
    {chapter === 2 && chapter2Step === "play" && chapter2ExitScrollReady && (
      <PageTurnButton
        label="3장"
        onTurn={() => {
          /* next chapter hook — wire when scene 3 exists */
        }}
      />
    )}
    {chapter === 2 && chapter2Step === "intro" && (
      <Chapter2Intro onComplete={handleChapter2IntroComplete} />
    )}
    </>
  );
}
