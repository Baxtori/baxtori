import Image from "next/image";
import styles from "./trail-reader.module.css";

const SPECIMENS = [
  { label: "FILIX MAS", position: "68% 30%", src: "/art/male-fern-nature-print.png" },
  { label: "FOREST STUDY", position: "16% 46%", src: "/art/fern-shadow-photo.jpg" },
  { label: "PTERIDIUM", position: "58% 24%", src: "/art/bracken-nature-print.png" },
  { label: "CROZIER", position: "82% 68%", src: "/art/fiddlehead-floor-photo.jpg" },
] as const;

export function BotanicalDetail({ stage }: { stage: number }) {
  const specimenIndex = stage % SPECIMENS.length;
  const specimen = SPECIMENS[specimenIndex];

  return (
    <figure aria-hidden="true" className={styles.botanicalDetail} data-botanical-detail data-specimen={specimenIndex}>
      <Image
        alt=""
        fill
        sizes="(max-width: 760px) 44vw, 13vw"
        src={specimen.src}
        style={{ objectPosition: specimen.position }}
        unoptimized
      />
      <figcaption>{specimen.label}</figcaption>
    </figure>
  );
}
