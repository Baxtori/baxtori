"use client";

import type { Story } from "./edition-data";
import { EditionSelectionLedger } from "./edition-selection-ledger";
import type { EditionLedgerInput } from "@/lib/edition-ledger";

type TimelineStory = Story & { timing: string };

type EditionTimelineProps = {
  edition: EditionLedgerInput & { quietRepositories: string[] };
  onOpenStory: (story: Story) => void;
  stories: TimelineStory[];
};

export function EditionTimeline({ edition, onOpenStory, stories }: EditionTimelineProps) {
  return (
    <section className="timeline-view" aria-labelledby="timeline-heading">
      <div className="section-heading">
        <div><span>Publication record</span><h2 id="timeline-heading">Stories in this edition</h2></div>
      </div>
      <ol>
        {stories.map((story) => (
          <li key={story.id}>
            <time>{story.timing}</time>
            <div>
              <span>{story.project}</span>
              <h3>{story.title}</h3>
              <button onClick={() => onOpenStory(story)} type="button">Open story</button>
            </div>
          </li>
        ))}
        <li className="routine-rollup">
          <time>All week</time>
          <div>
            <span>Other repositories</span>
            <h3>{edition.quietRepositories.length
              ? `${edition.quietRepositories.length} ${edition.quietRepositories.length === 1 ? "repository had" : "repositories had"} no published story.`
              : "No other repositories were recorded."}</h3>
          </div>
        </li>
      </ol>
      <EditionSelectionLedger edition={edition} />
    </section>
  );
}
