"use client";

import { useEffect, useRef } from "react";
import styles from "./trail-reader.module.css";

type Pinnule = {
  along: number;
  angle: number;
  growthStart: number;
  scale: number;
};

type Pinna = {
  bend: number;
  growthStart: number;
  length: number;
  pinnules: Pinnule[];
  side: number;
  x: number;
  y: number;
};

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function cubicPoint(start: number, controlA: number, controlB: number, end: number, progress: number) {
  const inverse = 1 - progress;
  return inverse ** 3 * start
    + 3 * inverse ** 2 * progress * controlA
    + 3 * inverse * progress ** 2 * controlB
    + progress ** 3 * end;
}

function buildPinnae(): Pinna[] {
  const random = seededRandom(0xba67021);
  let previousSide = -1;

  return Array.from({ length: 21 }, (_, index) => {
    const progress = 0.055 + (index / 20) * 0.83 + (random() - 0.5) * 0.018;
    const repeatSide = random() > 0.78;
    const side = repeatSide ? previousSide : previousSide * -1;
    previousSide = side;
    const length = (128 + Math.sin(progress * Math.PI) * 245) * (0.78 + random() * 0.42);
    const growthStart = 0.06 + progress * 0.72;
    const pinnuleCount = 5 + Math.floor(random() * 4);
    const pinnules: Pinnule[] = [];

    for (let leafIndex = 0; leafIndex < pinnuleCount; leafIndex += 1) {
      const along = (leafIndex + 0.72 + random() * 0.45) / (pinnuleCount + 0.8);
      for (const leafSide of [-1, 1]) {
        if (leafIndex > 0 && leafIndex < pinnuleCount - 1 && random() < 0.13) continue;
        pinnules.push({
          along,
          angle: leafSide * (27 + random() * 22) + (random() - 0.5) * 8,
          growthStart: growthStart + 0.025 + along * 0.1 + random() * 0.025,
          scale: (0.74 + random() * 0.48) * (1 - along * 0.24),
        });
      }
    }

    return {
      bend: -34 + random() * 52,
      growthStart,
      length,
      pinnules,
      side,
      x: cubicPoint(208, 186, 330, 524, progress) + (random() - 0.5) * 13,
      y: cubicPoint(1030, 785, 420, 82, progress) + (random() - 0.5) * 16,
    };
  });
}

const PINNAE = buildPinnae();
const BLOOM_PETALS = (() => {
  const random = seededRandom(0xf10a3e7);
  return Array.from({ length: 11 }, (_, index) => ({
    angle: index * (360 / 11) + (random() - 0.5) * 15,
    growthStart: 0.34 + index * 0.026 + random() * 0.04,
    scaleX: 0.7 + random() * 0.42,
    scaleY: 0.76 + random() * 0.52,
  }));
})();

function smoothStep(start: number, end: number, value: number) {
  const progress = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return progress * progress * (3 - 2 * progress);
}

function renderFrond(animated: boolean) {
  return (
    <g className={animated ? styles.fernLive : styles.fernGhost}>
      <path
        className={styles.fernRachis}
        d="M208 1030 C186 785 330 420 524 82"
        data-fern-stem={animated ? "" : undefined}
        pathLength="1"
      />
      {PINNAE.map((pinna, pinnaIndex) => (
        <g key={pinnaIndex} transform={`translate(${pinna.x} ${pinna.y}) scale(${pinna.side} 1)`}>
          <g
            className={styles.fernPinnaGrowth}
            data-fern-pinna={animated ? "" : undefined}
            data-growth-start={pinna.growthStart}
            data-side={pinna.side}
          >
            <path
              className={styles.fernPinnaStem}
              d={`M0 0 C ${pinna.length * 0.28} ${pinna.bend} ${pinna.length * 0.68} ${pinna.bend * 0.72} ${pinna.length} ${pinna.bend * 0.18}`}
            />
            {pinna.pinnules.map((pinnule, leafIndex) => {
              const x = pinna.length * pinnule.along;
              const y = Math.sin(pinnule.along * Math.PI) * pinna.bend * 0.78;
              return (
                <g key={leafIndex} transform={`translate(${x} ${y}) rotate(${pinnule.angle})`}>
                  <use
                    className={styles.fernPinnule}
                    data-fern-pinnule={animated ? "" : undefined}
                    data-growth-start={pinnule.growthStart}
                    height={58 * pinnule.scale}
                    href="#fern-pinnule"
                    width={96 * pinnule.scale}
                    x="0"
                    y={-29 * pinnule.scale}
                  />
                </g>
              );
            })}
          </g>
        </g>
      ))}
      <path
        className={styles.fernFiddlehead}
        d="M524 82 C583 18 645 61 621 115 C600 162 535 150 546 94 C555 53 609 51 615 91"
        data-fern-curl={animated ? "" : undefined}
        pathLength="1"
      />
    </g>
  );
}

function renderBloom(animated: boolean) {
  return (
    <g className={animated ? styles.bloomLive : styles.bloomGhost}>
      <path
        className={styles.bloomStem}
        d="M702 924 C674 725 610 538 432 336"
        data-bloom-stem={animated ? "" : undefined}
        pathLength="1"
      />
      <path className={styles.bloomStem} d="M615 654 C705 608 750 531 772 452" />
      <g transform="translate(434 338)">
        {BLOOM_PETALS.map((petal, index) => (
          <g key={index} transform={`rotate(${petal.angle}) scale(${petal.scaleX} ${petal.scaleY})`}>
            <path
              className={styles.bloomPetal}
              d="M0 5 C-52 -43 -49 -139 2 -216 C68 -153 61 -49 0 5 Z"
              data-bloom-petal={animated ? "" : undefined}
              data-growth-start={petal.growthStart}
            />
          </g>
        ))}
        <circle className={styles.bloomHeart} cx="0" cy="0" data-bloom-heart={animated ? "" : undefined} r="58" />
      </g>
      <g transform="translate(773 452) rotate(28)">
        <path
          className={styles.bloomBud}
          d="M0 0 C-58 -24 -69 -91 -21 -135 C42 -107 54 -42 0 0 Z"
          data-bloom-petal={animated ? "" : undefined}
          data-growth-start="0.2"
        />
        <path className={styles.bloomStem} d="M0 0 C-23 -31 -32 -68 -21 -135" />
      </g>
      <path
        className={styles.bloomLeaf}
        d="M615 654 C532 612 495 678 522 744 C594 737 633 700 615 654 Z"
        data-bloom-petal={animated ? "" : undefined}
        data-growth-start="0.14"
      />
    </g>
  );
}

export function BotanicalProgress() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const fernStem = root.querySelector<SVGPathElement>("[data-fern-stem]");
    const fernCurl = root.querySelector<SVGPathElement>("[data-fern-curl]");
    const pinnae = Array.from(root.querySelectorAll<SVGGElement>("[data-fern-pinna]"));
    const pinnules = Array.from(root.querySelectorAll<SVGUseElement>("[data-fern-pinnule]"));
    const bloomStem = root.querySelector<SVGPathElement>("[data-bloom-stem]");
    const bloomPetals = Array.from(root.querySelectorAll<SVGGraphicsElement>("[data-bloom-petal]"));
    const bloomHeart = root.querySelector<SVGCircleElement>("[data-bloom-heart]");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const applyGrowth = (pageProgress: number) => {
      const fernGrowth = 0.28 + pageProgress * 0.72;
      const bloomGrowth = pageProgress;
      root.dataset.growth = pageProgress.toFixed(3);

      if (fernStem) fernStem.style.strokeDashoffset = String(1 - smoothStep(0.01, 0.9, fernGrowth));
      if (fernCurl) fernCurl.style.strokeDashoffset = String(1 - smoothStep(0.76, 0.99, fernGrowth));

      for (const pinna of pinnae) {
        const start = Number(pinna.dataset.growthStart ?? 0);
        const localGrowth = smoothStep(start, start + 0.18, fernGrowth);
        const curlDirection = Number(pinna.dataset.side ?? 1) * -18;
        pinna.style.opacity = String(0.04 + localGrowth * 0.96);
        pinna.style.scale = String(0.025 + localGrowth * 0.975);
        pinna.style.rotate = `${(1 - localGrowth) * curlDirection}deg`;
      }

      for (const pinnule of pinnules) {
        const start = Number(pinnule.dataset.growthStart ?? 0);
        const localGrowth = smoothStep(start, start + 0.12, fernGrowth);
        pinnule.style.opacity = String(localGrowth);
        pinnule.style.scale = String(0.025 + localGrowth * 0.975);
      }

      if (bloomStem) bloomStem.style.strokeDashoffset = String(1 - smoothStep(0.02, 0.52, bloomGrowth));
      for (const petal of bloomPetals) {
        const start = Number(petal.dataset.growthStart ?? 0);
        const localGrowth = smoothStep(start, start + 0.28, bloomGrowth);
        petal.style.opacity = String(localGrowth);
        petal.style.scale = String(0.035 + localGrowth * 0.965);
        petal.style.rotate = `${(1 - localGrowth) * 23}deg`;
      }
      if (bloomHeart) {
        const heartGrowth = smoothStep(0.58, 0.88, bloomGrowth);
        bloomHeart.style.opacity = String(heartGrowth);
        bloomHeart.style.scale = String(0.1 + heartGrowth * 0.9);
      }
    };

    const draw = () => {
      frame = 0;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      applyGrowth(Math.max(0, Math.min(1, window.scrollY / scrollRange)));
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
      <svg className={styles.fernStudy} data-botanical-plate role="presentation" viewBox="0 0 820 1080">
        <defs>
          <symbol id="fern-pinnule" viewBox="0 -30 96 60">
            <path d="M0 0 C13 -23 37 -32 61 -25 C77 -20 88 -9 95 0 C79 5 74 19 57 22 C35 25 16 16 0 0 Z" />
            <path d="M2 0 C26 -2 56 -1 88 0" />
          </symbol>
        </defs>
        {renderFrond(false)}
        {renderFrond(true)}
      </svg>
      <svg className={styles.bloomStudy} data-botanical-bloom role="presentation" viewBox="0 0 900 980">
        {renderBloom(false)}
        {renderBloom(true)}
      </svg>
    </figure>
  );
}
