import { canonicalRepository } from "./repository-identity.ts";
import type { EvidenceAddress, TopicThreadInput } from "./topic-contract.ts";

export type StoryTopic = {
  codeEvidence?: {
    baseCommit: string;
    commit: string;
    endLine: number;
    path: string;
    startLine: number;
  }[];
  id: string;
  repository?: string;
  title: string;
  topicId: string;
};

export type TopicThreadRecord = {
  _id: string;
  evidence: EvidenceAddress;
  origin: "question" | "watch";
  sourceKey: string;
  status: "active" | "resolved" | "snoozed";
};

export function storyTopicSourceKey(
  story: Pick<StoryTopic, "repository" | "topicId">,
) {
  if (!story.repository || !story.topicId) return null;
  return `watch:${canonicalRepository(story.repository)}:${story.topicId}`;
}

export function storyWatchInput(
  story: StoryTopic,
  editionId: string,
): TopicThreadInput | null {
  const sourceKey = storyTopicSourceKey(story);
  const excerpt = story.codeEvidence?.[0];
  if (!sourceKey || !story.repository || !excerpt) return null;
  return {
    editionId,
    evidence: {
      baseCommit: excerpt.baseCommit,
      endLine: excerpt.endLine,
      headCommit: excerpt.commit,
      path: excerpt.path,
      repository: canonicalRepository(story.repository),
      startLine: excerpt.startLine,
    },
    origin: "watch",
    sourceKey,
    storyId: story.id,
    storyTitle: story.title,
    title: story.title,
  };
}

export function activeWatchThreadFor<T extends TopicThreadRecord>(
  threads: T[],
  story: Pick<StoryTopic, "repository" | "topicId">,
) {
  const sourceKey = storyTopicSourceKey(story);
  if (!sourceKey) return undefined;
  return threads.find(
    (thread) =>
      thread.sourceKey === sourceKey &&
      thread.origin === "watch" &&
      thread.status === "active",
  );
}
