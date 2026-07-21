"use client";

import { useEffect, useRef } from "react";
import {
  BRANCHLET_GROWTH,
  BRANCHLET_REVEAL_DURATION,
  FERN_COMPLETION_PROGRESS,
} from "./botanical-growth";
import { BotanicalUnfurl } from "./botanical-unfurl";
import styles from "./trail-reader.module.css";

export function BotanicalProgress() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const readProgress = () => {
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      return Math.max(0, Math.min(1, window.scrollY / scrollRange));
    };

    const applyProgress = (rawProgress: number) => {
      const progress = Math.min(1, rawProgress / FERN_COMPLETION_PROGRESS);
      root.dataset.growth = progress.toFixed(3);
      root.style.setProperty("--scroll-progress", progress.toFixed(5));

      BRANCHLET_GROWTH.forEach(({ minimum, openingOpacity, start }, index) => {
        const duration = Math.min(BRANCHLET_REVEAL_DURATION, 1 - start);
        const stage = Math.max(0, Math.min(1, (progress - start) / duration));
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

    root.dataset.growthMode = "direct-scroll";

    const draw = () => {
      applyProgress(readProgress());
    };

    draw();
    window.addEventListener("scroll", draw, { passive: true });
    window.addEventListener("resize", draw);
    return () => {
      window.removeEventListener("scroll", draw);
      window.removeEventListener("resize", draw);
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
          pinnaGrowthClassName={styles.fernPinnaGrowth}
        />
      </div>
    </figure>
  );
}
