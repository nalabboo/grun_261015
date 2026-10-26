"use client";

import { useEffect, useState } from "react";
import {
  CHAPTER3_INTRO_FADEOUT_MS,
  CHAPTER3_INTRO_TITLE_MS,
  CHAPTER3_TITLE,
  CHAPTER3_TITLE_HOLD_MS,
} from "@/constants/scene3Config";
import { SCENE2_PAPIER, tableauAssetUrl } from "@/constants/scene2Config";

type Chapter3IntroProps = {
  onComplete: () => void;
};

export default function Chapter3Intro({ onComplete }: Chapter3IntroProps) {
  const [titleVisible, setTitleVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const showTitle = window.setTimeout(() => setTitleVisible(true), 400);
    const startFadeOut = window.setTimeout(
      () => setFadingOut(true),
      400 + CHAPTER3_INTRO_TITLE_MS + CHAPTER3_TITLE_HOLD_MS,
    );
    const finish = window.setTimeout(
      () => onComplete(),
      400 + CHAPTER3_INTRO_TITLE_MS + CHAPTER3_TITLE_HOLD_MS + CHAPTER3_INTRO_FADEOUT_MS,
    );

    return () => {
      window.clearTimeout(showTitle);
      window.clearTimeout(startFadeOut);
      window.clearTimeout(finish);
    };
  }, [onComplete]);

  return (
    <div
      className={`chapter2-intro chapter3-intro${fadingOut ? " chapter2-intro--out" : ""}`}
      style={{ backgroundImage: `url(${tableauAssetUrl(SCENE2_PAPIER)})` }}
    >
      <div className="chapter2-intro__veil" />
      <p
        className={`chapter2-intro__title chapter3-intro__title${titleVisible ? " chapter2-intro__title--visible" : ""}${fadingOut ? " chapter2-intro__title--out" : ""}`}
      >
        {CHAPTER3_TITLE}
      </p>
    </div>
  );
}
