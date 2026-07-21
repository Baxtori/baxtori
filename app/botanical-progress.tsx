"use client";

import { useLayoutEffect, useRef } from "react";
import {
  BRANCHLET_GROWTH,
  BRANCHLET_REVEAL_DURATION,
  FERN_COMPLETION_PROGRESS,
} from "./botanical-growth";
import { BotanicalUnfurl } from "./botanical-unfurl";
import styles from "./trail-reader.module.css";

export function BotanicalProgress() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const readProgress = () => {
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY;
      return Math.max(0, Math.min(1, scrollTop / scrollRange));
    };

    const applyProgress = (rawProgress: number) => {
      const progress = Math.min(1, rawProgress / FERN_COMPLETION_PROGRESS);
      root.dataset.growth = progress.toFixed(3);
      const variables = [`--scroll-progress:${progress.toFixed(5)}`];

      BRANCHLET_GROWTH.forEach(({ minimum, openingOpacity, start }, index) => {
        const duration = Math.min(BRANCHLET_REVEAL_DURATION, 1 - start);
        const stage = Math.max(0, Math.min(1, (progress - start) / duration));
        const scale = minimum + (1 - minimum) * stage;
        const opacity = openingOpacity + stage * (1 - openingOpacity);
        variables.push(`--fern-stage-${index}:${scale.toFixed(5)}`);
        variables.push(`--fern-stage-opacity-${index}:${opacity.toFixed(5)}`);
      });
      const finalReveal = Math.max(0, Math.min(1, (progress - 0.9) / 0.08));
      variables.push(`--fern-final-reveal:${finalReveal.toFixed(5)}`);
      root.style.cssText = variables.join(";");
    };

    if (reduceMotion) {
      root.dataset.growthMode = "reduced-motion";
      applyProgress(1);
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
