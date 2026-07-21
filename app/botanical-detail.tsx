import { BotanicalIllustration } from "./botanical-illustration";
import styles from "./trail-reader.module.css";

const SPECIMENS = ["FROND / 01", "PINNA / 02", "CROZIER / 03"] as const;

export function BotanicalDetail({ stage }: { stage: number }) {
  const specimenIndex = stage % SPECIMENS.length;
  const specimen = SPECIMENS[specimenIndex];

  return (
    <figure aria-hidden="true" className={styles.botanicalDetail} data-botanical-detail data-specimen={specimenIndex}>
      {(specimenIndex === 0 || specimenIndex === 1) && <BotanicalIllustration className={styles.detailFragment} variant="fragment" />}
      {specimenIndex === 2 && <BotanicalIllustration className={styles.detailFiddlehead} variant="fiddlehead" />}
      <figcaption>{specimen}</figcaption>
    </figure>
  );
}
