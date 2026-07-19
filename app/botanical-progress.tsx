"use client";

/* eslint-disable @next/next/no-img-element -- Vinext's next/image shim cannot resolve the worker image binding; these local archival scans have explicit intrinsic dimensions. */

import { useEffect, useRef } from "react";
import styles from "./trail-reader.module.css";

const MALE_FERN = "/art/male-fern-nature-print.png";
const BRACKEN = "/art/bracken-nature-print.png";

function progressBetween(progress: number, start: number, end: number) {
  return Math.max(0, Math.min(1, (progress - start) / (end - start)));
}

export function BotanicalProgress() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (CSS.supports("animation-timeline: scroll()")) return;

    const reveal = root.querySelector<HTMLElement>("[data-botanical-reveal]");
    const plate = root.querySelector<HTMLImageElement>("[data-botanical-plate]");
    let frame = 0;

    const draw = () => {
      frame = 0;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, window.scrollY / scrollRange));
      const revealProgress = progressBetween(progress, 0.02, 0.94);
      if (reveal) reveal.style.clipPath = `inset(${(1 - revealProgress) * 100}% 0 0)`;
      if (plate) {
        plate.style.filter = `sepia(${0.42 - revealProgress * 0.28}) saturate(${0.62 + revealProgress * 0.38}) contrast(${0.9 + revealProgress * 0.08})`;
        plate.style.transform = `translateY(${(1 - revealProgress) * 7}%) scale(${0.94 + revealProgress * 0.06})`;
      }
    };

    const scheduleDraw = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    root.dataset.fallback = "true";
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
      <img alt="" className={styles.botanicalPlateGhost} height="2296" src={MALE_FERN} width="1384" />
      <div className={styles.botanicalPlateReveal} data-botanical-reveal>
        <img alt="" className={styles.botanicalPlate} data-botanical-plate height="2296" src={MALE_FERN} width="1384" />
      </div>
      <figcaption className={styles.botanicalCaption}>
        <span>Plate XIV</span>
        <em>Lastrea filix-mas</em>
        <small>Nature-printed · H. Bradbury · 1855</small>
      </figcaption>
    </figure>
  );
}

export function BotanicalDetail({ stage }: { stage: number }) {
  const position = ["50% 19%", "38% 42%", "66% 31%", "23% 68%"][stage % 4];
  return (
    <figure aria-hidden="true" className={styles.botanicalDetail}>
      <div>
        <img alt="" height="2448" src={BRACKEN} style={{ objectPosition: position }} width="1589" />
      </div>
      <figcaption><span>Plate XLIV</span><em>Pteridium aquilinum</em></figcaption>
    </figure>
  );
}
