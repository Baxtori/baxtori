"use client";

import { useEffect, useRef } from "react";
import { BRANCHLET_GROWTH, BRANCHLET_REVEAL_DURATION } from "./botanical-growth";
import { BotanicalUnfurl } from "./botanical-unfurl";
import styles from "./trail-reader.module.css";

function smoothstep(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

export function BotanicalProgress() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const readProgress = () => {
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      return Math.max(0, Math.min(1, window.scrollY / scrollRange));
    };

    const applyProgress = (progress: number) => {
      const stemReveal = 0.22 + progress * 0.78;
      root.dataset.growth = progress.toFixed(3);
      root.style.setProperty("--scroll-progress", progress.toFixed(5));
      root.style.setProperty("--fern-stem-dash", (1 - stemReveal).toFixed(5));

      BRANCHLET_GROWTH.forEach(({ minimum, openingOpacity, start }, index) => {
        const duration = Math.min(BRANCHLET_REVEAL_DURATION, 1 - start);
        const stage = smoothstep((progress - start) / duration);
        const scale = minimum + (1 - minimum) * stage;
        const opacity = openingOpacity + stage * (1 - openingOpacity);
        root.style.setProperty(`--fern-stage-${index}`, scale.toFixed(5));
        root.style.setProperty(`--fern-stage-opacity-${index}`, opacity.toFixed(5));
      });
    };

    if (reduceMotion) {
      root.dataset.growthMode = "reduced-motion";
      applyProgress(1);
      return;
    }

    if (CSS.supports("animation-timeline: scroll()")) {
      root.dataset.growthMode = "native-scroll";
      return;
    }

    root.dataset.growthMode = "frame-synced";

    const draw = () => {
      frame = 0;
      applyProgress(readProgress());
    };

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
    <figure
      aria-hidden="true"
      className={styles.botanicalProgress}
      data-botanical-progress
      data-growth-mode="initializing"
      ref={rootRef}
    >
      <div className={styles.fernFrame} data-fern-frame>
        <BotanicalUnfurl
          className={styles.primaryFern}
          growthStrokeClassName={styles.fernGrowthStroke}
          pinnaGrowthClassName={styles.fernPinnaGrowth}
          stemGhostClassName={styles.fernStemGhost}
        />
      </div>
    </figure>
  );
}
