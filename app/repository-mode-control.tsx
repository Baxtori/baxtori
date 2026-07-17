import { REPOSITORY_MODE_DESCRIPTIONS, REPOSITORY_MODE_LABELS, type RepositoryMode } from "@/lib/repository-modes";
import styles from "./repository-modes.module.css";

const MODES: RepositoryMode[] = ["pinned", "automatic", "muted"];

export function RepositoryModeControl({
  mode,
  onChange,
  repository,
}: {
  mode: RepositoryMode;
  onChange: (mode: RepositoryMode) => void;
  repository: string;
}) {
  return (
    <div className={styles.control} aria-label={`Review mode for ${repository}`} role="group">
      {MODES.map((candidate) => (
        <button
          aria-pressed={mode === candidate}
          key={candidate}
          onClick={() => onChange(candidate)}
          title={REPOSITORY_MODE_DESCRIPTIONS[candidate]}
          type="button"
        >
          {REPOSITORY_MODE_LABELS[candidate]}
        </button>
      ))}
    </div>
  );
}
