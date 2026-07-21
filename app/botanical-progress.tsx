"use client";

import { useEffect, useRef } from "react";
import { BotanicalUnfurl } from "./botanical-unfurl";
import styles from "./trail-reader.module.css";

const PINNA_MINIMUMS = [0.38, 0.32, 0.3, 0.27, 0.26, 0.23, 0.22, 0.2, 0.19, 0.17, 0.16, 0.14, 0.13, 0.11, 0.1, 0.08];
const PINNA_STARTS = [0, 0.04, 0.06, 0.12, 0.14, 0.2, 0.22, 0.28, 0.31, 0.37, 0.4, 0.47, 0.5, 0.58, 0.61, 0.68];
const PINNA_OPENING_OPACITY = [0.66, 0.22, 0.16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

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

    const applyProgress = (progress: number) => {
      const stemReveal = 0.22 + progress * 0.78;
      root.dataset.growth = progress.toFixed(3);
      root.style.setProperty("--scroll-progress", progress.toFixed(3));
      root.style.setProperty("--fern-stem-dash", (1 - stemReveal).toFixed(3));

      PINNA_MINIMUMS.forEach((minimum, index) => {
        const stage = smoothstep((progress - PINNA_STARTS[index]) / 0.28);
        const scale = minimum + (1 - minimum) * stage;
        const openingOpacity = PINNA_OPENING_OPACITY[index];
        const opacity = openingOpacity + stage * (1 - openingOpacity);
        root.style.setProperty(`--fern-stage-${index}`, scale.toFixed(3));
        root.style.setProperty(`--fern-stage-opacity-${index}`, opacity.toFixed(3));
      });
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
          pinnaGrowthClassName={styles.fernPinnaGrowth}
          stemGhostClassName={styles.fernStemGhost}
        />
      </div>
    </figure>
  );
}
