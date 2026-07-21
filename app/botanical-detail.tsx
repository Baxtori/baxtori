/* eslint-disable @next/next/no-img-element -- Vinext's next/image shim cannot resolve the worker image binding; this local archival scan has explicit intrinsic dimensions. */

import type { CSSProperties } from "react";
import styles from "./trail-reader.module.css";

const BRACKEN = "/art/bracken-nature-print.png";
const PLATE_STYLES = ["50% 19%", "38% 42%", "66% 31%", "23% 68%"]
  .map((objectPosition) => ({ objectPosition })) satisfies CSSProperties[];

export function BotanicalDetail({ stage }: { stage: number }) {
  const plateStyle = PLATE_STYLES[stage % PLATE_STYLES.length];

  return (
    <figure aria-hidden="true" className={styles.botanicalDetail} data-botanical-detail>
      <div>
        <img
          alt=""
          decoding="async"
          height="2448"
          loading="lazy"
          src={BRACKEN}
          style={plateStyle}
          width="1589"
        />
      </div>
      <figcaption><span>Plate XLIV</span><em>Pteridium aquilinum</em></figcaption>
    </figure>
  );
}
