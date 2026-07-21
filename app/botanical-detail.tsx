import { BotanicalIllustration } from "./botanical-illustration";
import styles from "./trail-reader.module.css";

export function BotanicalDetail({ stage }: { stage: number }) {
  const specimenIndex = stage % 3;
  const variant = specimenIndex === 1 ? "crozier" : "frond";

  return (
    <figure aria-hidden="true" className={styles.botanicalDetail} data-botanical-detail data-specimen={specimenIndex}>
      <BotanicalIllustration className={styles.detailSpecimen} variant={variant} />
    </figure>
  );
}
