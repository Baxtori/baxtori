"use client";

import { useEffect, useRef } from "react";
import styles from "./trail-reader.module.css";

const PINNAE = Array.from({ length: 14 }, (_, index) => {
  const progress = index / 13;
  return {
    growthStart: 0.08 + progress * 0.72,
    length: 72 + Math.sin(progress * Math.PI) * 198,
    x: 287 + progress * progress * 138,
    y: 946 - progress * 730,
  };
});

const PINNULE_COUNT = 7;

function smoothStep(start: number, end: number, value: number) {
  const progress = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return progress * progress * (3 - 2 * progress);
}

function renderFrond(animated: boolean) {
  return (
    <g className={animated ? styles.fernLive : styles.fernGhost}>
      <path
        className={styles.fernRachis}
        d="M286 1018 C277 884 280 724 312 576 C344 426 391 305 492 112"
        data-fern-stem={animated ? "" : undefined}
        pathLength="1"
      />
      {PINNAE.flatMap((pinna, pinnaIndex) => [-1, 1].map((side) => (
        <g
          key={`${pinnaIndex}-${side}`}
          transform={`translate(${pinna.x} ${pinna.y}) scale(${side} 1)`}
        >
          <g
            className={styles.fernPinnaGrowth}
            data-fern-pinna={animated ? "" : undefined}
            data-growth-start={pinna.growthStart}
            data-side={side}
          >
            <path
              className={styles.fernPinnaStem}
              d={`M0 0 C ${pinna.length * 0.34} -10 ${pinna.length * 0.72} -16 ${pinna.length} -4`}
            />
            {Array.from({ length: PINNULE_COUNT }, (_, leafletIndex) => {
              const along = (leafletIndex + 1) / (PINNULE_COUNT + 1);
              const size = 1.02 - along * 0.42;
              const x = pinna.length * along;
              const y = -Math.sin(along * Math.PI) * 12;
              const start = pinna.growthStart + 0.025 + along * 0.085;
              return [-1, 1].map((leafSide) => (
                <g
                  key={`${leafletIndex}-${leafSide}`}
                  transform={`translate(${x} ${y}) rotate(${leafSide * (31 - along * 9)})`}
                >
                  <use
                    className={styles.fernPinnule}
                    data-fern-pinnule={animated ? "" : undefined}
                    data-growth-start={start}
                    height={24 * size}
                    href="#fern-pinnule"
                    width={49 * size}
                    x="0"
                    y={-12 * size}
                  />
                </g>
              ));
            })}
          </g>
        </g>
      )))}
      <path
        className={styles.fernFiddlehead}
        d="M492 112 C531 70 558 103 541 132 C527 155 493 145 500 119 C506 98 535 96 539 116"
        data-fern-curl={animated ? "" : undefined}
        pathLength="1"
      />
    </g>
  );
}

export function BotanicalProgress() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const stem = root.querySelector<SVGPathElement>("[data-fern-stem]");
    const curl = root.querySelector<SVGPathElement>("[data-fern-curl]");
    const pinnae = Array.from(root.querySelectorAll<SVGGElement>("[data-fern-pinna]"));
    const pinnules = Array.from(root.querySelectorAll<SVGUseElement>("[data-fern-pinnule]"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const applyGrowth = (growth: number) => {
      root.style.setProperty("--fern-growth", growth.toFixed(3));
      root.dataset.growth = growth.toFixed(3);

      if (stem) stem.style.strokeDashoffset = String(1 - smoothStep(0.02, 0.9, growth));
      if (curl) curl.style.strokeDashoffset = String(1 - smoothStep(0.72, 0.98, growth));

      for (const pinna of pinnae) {
        const start = Number(pinna.dataset.growthStart ?? 0);
        const localGrowth = smoothStep(start, start + 0.16, growth);
        const curlDirection = Number(pinna.dataset.side ?? 1) * -13;
        pinna.style.opacity = String(0.08 + localGrowth * 0.92);
        pinna.style.scale = String(0.035 + localGrowth * 0.965);
        pinna.style.rotate = `${(1 - localGrowth) * curlDirection}deg`;
      }

      for (const pinnule of pinnules) {
        const start = Number(pinnule.dataset.growthStart ?? 0);
        const localGrowth = smoothStep(start, start + 0.1, growth);
        pinnule.style.opacity = String(localGrowth);
        pinnule.style.scale = String(0.04 + localGrowth * 0.96);
      }
    };

    const draw = () => {
      frame = 0;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const pageProgress = Math.max(0, Math.min(1, window.scrollY / scrollRange));
      applyGrowth(0.34 + pageProgress * 0.66);
    };

    if (reduceMotion) {
      applyGrowth(1);
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
      <svg className={styles.fernStudy} data-botanical-plate role="presentation" viewBox="0 0 700 1080">
        <defs>
          <symbol id="fern-pinnule" viewBox="0 -12 49 24">
            <path d="M0 0 C10 -9 30 -11 48 -1 C33 8 13 10 0 0 Z" />
            <path d="M1 0 C17 -1 31 -1 44 0" />
          </symbol>
        </defs>
        {renderFrond(false)}
        {renderFrond(true)}
      </svg>
    </figure>
  );
}
