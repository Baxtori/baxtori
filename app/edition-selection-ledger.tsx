import { buildEditionLedgerView, type EditionLedgerInput } from "@/lib/edition-ledger";
import styles from "./edition-selection-ledger.module.css";

const PRIORITY_LABELS = {
  "reader-directed": "Reader-directed",
  "significant-change": "Significant change",
  "useful-comprehension": "Useful comprehension",
  optional: "Optional",
} as const;

export function EditionSelectionLedger({ edition }: { edition: EditionLedgerInput }) {
  const ledger = buildEditionLedgerView(edition);

  return (
    <section className={styles.ledger} aria-labelledby="edition-selection-heading">
      <div className={styles.heading}>
        <div>
          <span>Edition selection</span>
          <h2 id="edition-selection-heading">Why these findings are here</h2>
          <p>{ledger.description}</p>
        </div>
        <strong>{ledger.headline}</strong>
      </div>

      <div className={styles.metrics} aria-label="Edition selection summary">
        {ledger.metrics.map((metric) => (
          <div key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>

      <details className={styles.details}>
        <summary>{ledger.recorded ? "See inclusion and omission reasons" : "See what this edition did not record"}</summary>
        {ledger.selection ? (
          <div className={styles.sections}>
            <LedgerSection title="Published" empty="No finding met the publication threshold.">
              {ledger.selection.included.map((finding) => {
                const story = edition.stories.find((candidate) => candidate.id === finding.storyId);
                return (
                  <li key={finding.storyId}>
                    <div>
                      <span>{PRIORITY_LABELS[finding.priority]} · {finding.estimatedMinutes} min</span>
                      <strong>{story?.title ?? finding.storyId}</strong>
                      <p>{finding.reason}</p>
                    </div>
                    <code>{finding.repository}</code>
                  </li>
                );
              })}
            </LedgerSection>

            <LedgerSection title="Deferred" empty="No qualifying finding was deferred.">
              {ledger.selection.deferred.map((finding) => (
                <li key={finding.id}>
                  <div>
                    <span>{PRIORITY_LABELS[finding.priority]} · {finding.estimatedMinutes} min</span>
                    <strong>{finding.title}</strong>
                    <p>{finding.reason}</p>
                  </div>
                  <code>{finding.repository}</code>
                </li>
              ))}
            </LedgerSection>

            <LedgerSection title="Excluded after review" empty="No reviewed finding was excluded.">
              {ledger.selection.excluded.map((finding) => (
                <li key={finding.id}>
                  <div>
                    <span>{PRIORITY_LABELS[finding.priority]}</span>
                    <strong>{finding.title}</strong>
                    <p>{finding.reason}</p>
                  </div>
                  <code>{finding.repository}</code>
                </li>
              ))}
            </LedgerSection>

            <RepositorySection title="Left quiet" items={ledger.selection.quiet} empty="No repository was recorded as quiet." />
            <RepositorySection title="Inaccessible" items={ledger.selection.inaccessible} empty="No requested source was recorded as inaccessible." />
          </div>
        ) : (
          <div className={styles.legacy}>
            <p>These values are unknown, not zero:</p>
            <ul>
              {ledger.unknownFields.map((field) => <li key={field}>{field}</li>)}
            </ul>
            <p>Future editions retain literal inclusion, deferral, exclusion, quiet, and access reasons.</p>
          </div>
        )}
      </details>
    </section>
  );
}

function LedgerSection({
  children,
  empty,
  title,
}: {
  children: React.ReactNode;
  empty: string;
  title: string;
}) {
  const childCount = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      {childCount ? <ul>{children}</ul> : <p className={styles.empty}>{empty}</p>}
    </section>
  );
}

function RepositorySection({
  empty,
  items,
  title,
}: {
  empty: string;
  items: { reason: string; repository: string }[];
  title: string;
}) {
  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item.repository}>
              <div>
                <strong>{item.repository}</strong>
                <p>{item.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className={styles.empty}>{empty}</p>}
    </section>
  );
}
