"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
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
      const fernReveal = 0.45 + progress * 0.55;
      root.dataset.growth = progress.toFixed(3);
      root.style.setProperty("--scroll-progress", progress.toFixed(3));
      root.style.setProperty("--late-progress", lateProgress.toFixed(3));
      root.style.setProperty("--fern-clip", `${((1 - fernReveal) * 68).toFixed(2)}%`);
      root.style.setProperty("--bracken-clip", `${((1 - lateProgress) * 54).toFixed(2)}%`);
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
      <Image
        alt=""
        className={`${styles.botanicalImage} ${styles.fernPhotograph}`}
        height={1536}
        priority
        sizes="(max-width: 760px) 72vw, 38vw"
        src="/art/fern-shadow-photo.jpg"
        unoptimized
        width={1024}
      />
      <Image
        alt=""
        className={`${styles.botanicalImage} ${styles.maleFernPlate}`}
        data-botanical-plate
        height={2296}
        priority
        sizes="(max-width: 760px) 92vw, 46vw"
        src="/art/male-fern-nature-print.png"
        unoptimized
        width={1384}
      />
      <Image
        alt=""
        className={`${styles.botanicalImage} ${styles.brackenPlate}`}
        height={2448}
        sizes="(max-width: 760px) 70vw, 38vw"
        src="/art/bracken-nature-print.png"
        unoptimized
        width={1589}
      />
      <Image
        alt=""
        className={`${styles.botanicalImage} ${styles.fiddleheadPhotograph}`}
        data-botanical-bloom
        height={1024}
        sizes="(max-width: 760px) 72vw, 40vw"
        src="/art/fiddlehead-floor-photo.jpg"
        unoptimized
        width={1536}
      />
    </figure>
  );
}
