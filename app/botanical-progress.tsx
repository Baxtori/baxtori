"use client";

import { useEffect, useRef } from "react";
import { BotanicalIllustration } from "./botanical-illustration";
import styles from "./trail-reader.module.css";

export function BotanicalProgress() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const applyProgress = (progress: number) => {
      const lateProgress = Math.max(0, (progress - 0.46) / 0.54);
      root.dataset.growth = progress.toFixed(3);
      root.style.setProperty("--scroll-progress", progress.toFixed(3));
      root.style.setProperty("--late-progress", lateProgress.toFixed(3));
      root.style.setProperty("--fern-clip", `${((1 - progress) * 18).toFixed(2)}%`);
      root.style.setProperty("--bracken-clip", `${((1 - lateProgress) * 52).toFixed(2)}%`);
    };

    const draw = () => {
      frame = 0;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      applyProgress(Math.max(0, Math.min(1, window.scrollY / scrollRange)));
    };

    if (reduceMotion) {
      applyProgress(1);
      return;
    }

    const scheduleDraw = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("scroll", scheduleDraw, { passive: true });
    window.addEventListener("resize", scheduleDraw);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleDraw);
      window.removeEventListener("resize", scheduleDraw);
    };
  }, []);

  return (
    <figure aria-hidden="true" className={styles.botanicalProgress} data-botanical-progress ref={rootRef}>
      <BotanicalIllustration className={`${styles.botanicalSpecimen} ${styles.primaryFern}`} priority variant="frond" />
      <BotanicalIllustration className={`${styles.botanicalSpecimen} ${styles.secondaryFern}`} progressMarker variant="crozier" />
    </figure>
  );
}
