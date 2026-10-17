"use client";

import { useEffect, useState } from "react";
import {
  CHAPTER2_INTRO_HOLD_MS,
  CHAPTER2_INTRO_TITLE_MS,
  CHAPTER2_TITLE,
  SCENE2_PAPIER,
  tableauAssetUrl,
} from "@/constants/scene2Config";

type Chapter2IntroProps = {
  onComplete: () => void;
};

export default function Chapter2Intro({ onComplete }: Chapter2IntroProps) {
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    const showTitle = window.setTimeout(() => setTitleVisible(true), 400);
    const finish = window.setTimeout(
      () => onComplete(),
      400 + CHAPTER2_INTRO_TITLE_MS + CHAPTER2_INTRO_HOLD_MS,
    );

    return () => {
      window.clearTimeout(showTitle);
      window.clearTimeout(finish);
    };
  }, [onComplete]);

  return (
    <div
      className="chapter2-intro"
      style={{ backgroundImage: `url(${tableauAssetUrl(SCENE2_PAPIER)})` }}
    >
      <div className="chapter2-intro__veil" />
      <p
        className={`chapter2-intro__title${titleVisible ? " chapter2-intro__title--visible" : ""}`}
      >
        {CHAPTER2_TITLE}
      </p>
    </div>
  );
}
