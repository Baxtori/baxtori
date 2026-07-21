"use client";

import { useEffect, useRef } from "react";
import { BRANCHLET_GROWTH, BRANCHLET_REVEAL_DURATION } from "./botanical-growth";
import { BotanicalUnfurl } from "./botanical-unfurl";
import styles from "./trail-reader.module.css";

const PLAYHEAD_RESPONSE_MS = 92;
const PLAYHEAD_EPSILON = 0.0001;

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
      applyProgress(1);
      return;
    }

    let currentProgress = readProgress();
    let targetProgress = currentProgress;
    let previousTime = performance.now();

    const followPlayhead = (time: number) => {
      const elapsed = Math.min(64, Math.max(0, time - previousTime));
      const blend = 1 - Math.exp(-elapsed / PLAYHEAD_RESPONSE_MS);
      previousTime = time;
      currentProgress += (targetProgress - currentProgress) * blend;

      if (Math.abs(targetProgress - currentProgress) <= PLAYHEAD_EPSILON) {
        currentProgress = targetProgress;
        frame = 0;
      } else {
        frame = window.requestAnimationFrame(followPlayhead);
      }

      applyProgress(currentProgress);
    };

    const updateTarget = () => {
      targetProgress = readProgress();
      root.dataset.growthTarget = targetProgress.toFixed(3);
      if (!frame) {
        previousTime = performance.now();
        frame = window.requestAnimationFrame(followPlayhead);
      }
    };

    applyProgress(currentProgress);
    root.dataset.growthTarget = targetProgress.toFixed(3);
    window.addEventListener("scroll", updateTarget, { passive: true });
    window.addEventListener("resize", updateTarget);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateTarget);
      window.removeEventListener("resize", updateTarget);
    };
  }, []);

  return (
    <figure
      aria-hidden="true"
      className={styles.botanicalProgress}
      data-botanical-progress
      data-growth-mode="continuous"
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
