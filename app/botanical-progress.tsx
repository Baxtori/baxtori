"use client";

import { useEffect, useRef } from "react";
import { BotanicalUnfurl } from "./botanical-unfurl";
import styles from "./trail-reader.module.css";

export function BotanicalProgress() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const applyProgress = (progress: number) => {
      const reveal = 0.36 + progress * 0.64;
      root.dataset.growth = progress.toFixed(3);
      root.style.setProperty("--scroll-progress", progress.toFixed(3));
      root.style.setProperty("--fern-reveal", reveal.toFixed(3));
      root.style.setProperty("--fern-dash", (1 - reveal).toFixed(3));
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
      <div className={styles.fernFrame} data-fern-frame>
        <BotanicalUnfurl
          className={styles.primaryFern}
          growthStrokeClassName={styles.fernGrowthStroke}
        />
      </div>
    </figure>
  );
}
