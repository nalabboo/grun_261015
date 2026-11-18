"use client";

import { formatMoonSkyForConfig, MOON_SKY, type MoonSkyLayout } from "@/constants/sceneConfig";

const STORAGE_KEY = "grun-dev-moon-sky";

export function loadDevMoonSky(): Partial<MoonSkyLayout> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<MoonSkyLayout>;
  } catch {
    return null;
  }
}

export function saveDevMoonSky(layout: Pick<MoonSkyLayout, "screenXRatio" | "yFromTop" | "sizePx">) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

type MoonEditorPanelProps = {
  layout: MoonSkyLayout;
  onChange: (next: MoonSkyLayout) => void;
};

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 50,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  width: 240,
  padding: 12,
  borderRadius: 8,
  background: "rgba(0, 0, 0, 0.78)",
  color: "#fff",
  fontSize: 12,
  fontFamily: "var(--font-geist-mono), monospace",
  pointerEvents: "auto",
};

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };

const buttonStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid rgba(255, 255, 255, 0.35)",
  borderRadius: 4,
  background: "transparent",
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "inherit",
};

function mergeMoonSky(partial: Partial<MoonSkyLayout>, base: MoonSkyLayout): MoonSkyLayout {
  return {
    screenXRatio: partial.screenXRatio ?? base.screenXRatio,
    yFromTop: partial.yFromTop ?? base.yFromTop,
    sizePx: partial.sizePx ?? base.sizePx,
    parallax: base.parallax,
    opacity: base.opacity,
  };
}

/** Dev-only sliders for `MOON_SKY` (scene 1 moon). Values persist in localStorage. */
export default function MoonEditorPanel({ layout, onChange }: MoonEditorPanelProps) {
  const patch = (partial: Partial<MoonSkyLayout>) => {
    const next = mergeMoonSky({ ...layout, ...partial }, layout);
    onChange(next);
    saveDevMoonSky({
      screenXRatio: next.screenXRatio,
      yFromTop: next.yFromTop,
      sizePx: next.sizePx,
    });
  };

  const reset = () => {
    onChange({ ...MOON_SKY });
    localStorage.removeItem(STORAGE_KEY);
  };

  const copyConfig = async () => {
    const snippet = formatMoonSkyForConfig(layout);
    console.log("[MoonEditor]", snippet);
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      // Clipboard may be blocked; console still has the snippet.
    }
  };

  return (
    <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
      <div style={{ fontWeight: 600 }}>달 위치 (1장)</div>
      <p style={{ margin: 0, opacity: 0.75, lineHeight: 1.45 }}>
        맨 처음 화면 기준입니다. 씬 시작에서 보면서 맞추세요.
      </p>

      <label style={labelStyle}>
        <span>가로 (0 = 왼쪽, 1 = 오른쪽): {layout.screenXRatio.toFixed(3)}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={layout.screenXRatio}
          onChange={(e) => patch({ screenXRatio: Number(e.target.value) })}
        />
      </label>

      <label style={labelStyle}>
        <span>위에서 아래까지 비율: {layout.yFromTop.toFixed(3)}</span>
        <input
          type="range"
          min={0.02}
          max={0.45}
          step={0.005}
          value={layout.yFromTop}
          onChange={(e) => patch({ yFromTop: Number(e.target.value) })}
        />
      </label>

      <label style={labelStyle}>
        <span>크기 (1080p 기준 px): {Math.round(layout.sizePx)}</span>
        <input
          type="range"
          min={48}
          max={360}
          step={1}
          value={layout.sizePx}
          onChange={(e) => patch({ sizePx: Number(e.target.value) })}
        />
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button type="button" style={buttonStyle} onClick={reset}>
          기본값
        </button>
        <button type="button" style={buttonStyle} onClick={() => void copyConfig()}>
          config 복사
        </button>
      </div>
      <p style={{ margin: 0, opacity: 0.65, lineHeight: 1.4 }}>
        「config 복사」→ `sceneConfig.ts`의 `MOON_SKY`에 붙여 넣으면 배포값으로 고정됩니다.
      </p>
    </div>
  );
}