"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./trail-reader.module.css";

type FernFrond = {
  direction: -1 | 1;
  end: number;
  rotation: number;
  scale: number;
  start: number;
  x: number;
  y: number;
};

type FernStyle = CSSProperties & {
  "--frond-end": string;
  "--frond-start": string;
};

const FRONDS: FernFrond[] = [
  { direction: -1, end: 0.24, rotation: 13, scale: 0.55, start: 0.1, x: 294, y: 820 },
  { direction: 1, end: 0.26, rotation: -10, scale: 0.5, start: 0.12, x: 294, y: 814 },
  { direction: -1, end: 0.34, rotation: 8, scale: 0.78, start: 0.18, x: 285, y: 735 },
  { direction: 1, end: 0.36, rotation: -8, scale: 0.73, start: 0.2, x: 285, y: 728 },
  { direction: -1, end: 0.45, rotation: 4, scale: 0.97, start: 0.28, x: 267, y: 645 },
  { direction: 1, end: 0.47, rotation: -5, scale: 0.91, start: 0.3, x: 267, y: 638 },
  { direction: -1, end: 0.56, rotation: -1, scale: 1.12, start: 0.38, x: 249, y: 552 },
  { direction: 1, end: 0.58, rotation: 2, scale: 1.06, start: 0.4, x: 249, y: 545 },
  { direction: -1, end: 0.67, rotation: -7, scale: 1.08, start: 0.49, x: 227, y: 458 },
  { direction: 1, end: 0.69, rotation: 8, scale: 1.02, start: 0.51, x: 227, y: 451 },
  { direction: -1, end: 0.77, rotation: -15, scale: 0.91, start: 0.59, x: 199, y: 365 },
  { direction: 1, end: 0.79, rotation: 16, scale: 0.85, start: 0.61, x: 199, y: 358 },
  { direction: -1, end: 0.86, rotation: -24, scale: 0.67, start: 0.7, x: 171, y: 279 },
  { direction: 1, end: 0.88, rotation: 25, scale: 0.62, start: 0.72, x: 171, y: 273 },
];

function leafPath(x: number, y: number, scale: number, rotation: number) {
  return (
    <path
      d="M0 0 C 8 -9 22 -8 29 0 C 21 9 8 10 0 0 Z"
      transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}
    />
  );
}

function Frond({ direction, end, rotation, scale, start, x, y }: FernFrond) {
  const style: FernStyle = {
    "--frond-end": `${end * 100}%`,
    "--frond-start": `${start * 100}%`,
  };

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${direction * scale} ${scale})`}>
      <g
        className={styles.botanicalFrond}
        data-botanical-frond
        data-end={end}
        data-start={start}
        style={style}
      >
        <path className={styles.frondStem} d="M0 0 C 34 -4 79 -15 132 -6" />
        {leafPath(16, -2, 0.68, -48)}
        {leafPath(22, 1, 0.64, 42)}
        {leafPath(38, -7, 0.78, -47)}
        {leafPath(45, -1, 0.73, 39)}
        {leafPath(62, -11, 0.82, -43)}
        {leafPath(69, -4, 0.78, 36)}
        {leafPath(86, -14, 0.76, -38)}
        {leafPath(92, -7, 0.71, 31)}
        {leafPath(108, -14, 0.61, -32)}
        {leafPath(113, -8, 0.57, 24)}
        {leafPath(128, -7, 0.42, -4)}
      </g>
    </g>
  );
}

function progressBetween(progress: number, start: number, end: number) {
  return Math.max(0, Math.min(1, (progress - start) / (end - start)));
}

export function BotanicalProgress() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (CSS.supports("animation-timeline: scroll()")) return;

    const rachis = root.querySelector<SVGPathElement>("[data-botanical-rachis]");
    const curl = root.querySelector<SVGPathElement>("[data-botanical-curl]");
    const spores = root.querySelector<SVGGElement>("[data-botanical-spores]");
    const fronds = [...root.querySelectorAll<SVGGElement>("[data-botanical-frond]")];
    let frame = 0;

    const draw = () => {
      frame = 0;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, window.scrollY / scrollRange));
      const rachisProgress = progressBetween(progress, 0.02, 0.86);
      const curlProgress = progressBetween(progress, 0.72, 0.96);

      if (rachis) rachis.style.strokeDashoffset = String(1 - rachisProgress);
      if (curl) curl.style.strokeDashoffset = String(1 - curlProgress);
      if (spores) spores.style.opacity = String(progressBetween(progress, 0.82, 0.98));

      for (const frond of fronds) {
        const start = Number(frond.dataset.start);
        const end = Number(frond.dataset.end);
        const localProgress = progressBetween(progress, start, end);
        frond.style.opacity = String(localProgress);
        frond.style.transform = `scaleX(${0.04 + localProgress * 0.96}) rotate(${(1 - localProgress) * -18}deg)`;
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
    <div aria-hidden="true" className={styles.botanicalProgress} data-botanical-progress ref={rootRef}>
      <svg preserveAspectRatio="xMidYMax meet" role="presentation" viewBox="0 0 420 960">
        <g className={styles.botanicalGround}>
          <path d="M252 925 C 284 906 325 908 357 925 C 326 918 284 940 252 925 Z" />
          <path d="M286 924 C 255 943 231 943 205 936 M305 921 C 334 943 361 946 389 937" />
          <circle cx="272" cy="927" r="3" />
          <circle cx="318" cy="923" r="2" />
          <circle cx="344" cy="930" r="2.5" />
        </g>

        <path
          className={styles.botanicalRachisGhost}
          d="M304 918 C 295 844 300 775 280 704 C 258 626 256 548 240 468 C 223 378 196 307 160 239 C 139 200 132 158 145 126"
        />
        <path
          className={styles.botanicalRachis}
          d="M304 918 C 295 844 300 775 280 704 C 258 626 256 548 240 468 C 223 378 196 307 160 239 C 139 200 132 158 145 126"
          data-botanical-rachis
          pathLength="1"
        />

        {FRONDS.map((frond, index) => <Frond {...frond} key={`${frond.y}-${index}`} />)}

        <path
          className={styles.botanicalCurlGhost}
          d="M145 126 C 145 72 218 54 241 103 C 261 146 221 188 183 165 C 151 146 154 109 179 102 C 202 96 219 116 207 135 C 198 149 179 144 180 129"
        />
        <path
          className={styles.botanicalCurl}
          d="M145 126 C 145 72 218 54 241 103 C 261 146 221 188 183 165 C 151 146 154 109 179 102 C 202 96 219 116 207 135 C 198 149 179 144 180 129"
          data-botanical-curl
          pathLength="1"
        />

        <g className={styles.botanicalSpores} data-botanical-spores>
          <circle cx="72" cy="326" r="3" />
          <circle cx="56" cy="352" r="2" />
          <circle cx="83" cy="367" r="2.4" />
          <circle cx="344" cy="438" r="2.5" />
          <circle cx="365" cy="459" r="1.8" />
          <circle cx="337" cy="476" r="2" />
          <circle cx="109" cy="610" r="1.8" />
          <circle cx="91" cy="629" r="2.4" />
        </g>

        <g className={styles.botanicalCaption}>
          <text x="26" y="900">PTERIDOPHYTA</text>
          <text x="26" y="918">READING SPECIMEN · I—V</text>
        </g>
      </svg>
    </div>
  );
}
