import type { ContinueItem } from "./continue-queue.ts";

export type TrailStory = {
  brief: string;
  codeEvidence?: {
    endLine: number;
    path: string;
    startLine: number;
    title: string;
  }[];
  evidence: string;
  files: string[];
  id: string;
  project: string;
  repository?: string;
  timing: string;
  title: string;
  tradeoff: string;
  verify: string;
  verdict: string;
  whatChanged: string;
  whyItMatters: string;
};

export type TrailOpeningScene = {
  id: string;
  kind: "opening";
  nextReason: string | null;
  nextTitle: string | null;
};

export type TrailStoryScene = {
  id: string;
  item: ContinueItem;
  kind: "story";
  story: TrailStory;
};

export type TrailStudyScene = {
  id: string;
  item: ContinueItem;
  kind: "study";
};

export type TrailEndScene = {
  deferredCount: number;
  id: string;
  kind: "end";
  quietRepositories: string[];
};

export type TrailScene =
  | TrailOpeningScene
  | TrailStoryScene
  | TrailStudyScene
  | TrailEndScene;

export type ReaderTrail = {
  budgetMinutes: number;
  editionId: string;
  id: string;
  plannedMinutes: number;
  scenes: TrailScene[];
};

type BuildReaderTrailInput = {
  budgetMinutes: number;
  editionId: string;
  items: ContinueItem[];
  plannedMinutes: number;
  quietRepositories: string[];
  stories: TrailStory[];
  totalItemCount: number;
};

function sceneId(item: ContinueItem) {
  return `trail-${item.kind}-${item.targetId.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function buildReaderTrail({
  budgetMinutes,
  editionId,
  items,
  plannedMinutes,
  quietRepositories,
  stories,
  totalItemCount,
}: BuildReaderTrailInput): ReaderTrail {
  const storiesById = new Map(stories.map((story) => [story.id, story]));
  const readingScenes: (TrailStoryScene | TrailStudyScene)[] = items.map((item) => {
    const story = item.kind === "story" || item.kind === "watch" || item.kind === "review"
      ? storiesById.get(item.targetId)
      : undefined;

    if (story) {
      return {
        id: sceneId(item),
        item: { ...item },
        kind: "story",
        story: {
          ...story,
          codeEvidence: story.codeEvidence?.map((evidence) => ({ ...evidence })),
          files: [...story.files],
        },
      };
    }

    return { id: sceneId(item), item: { ...item }, kind: "study" };
  });

  const firstItem = items[0] ?? null;
  const scenes: TrailScene[] = [
    {
      id: "trail-opening",
      kind: "opening",
      nextReason: firstItem?.reason ?? null,
      nextTitle: firstItem?.title ?? null,
    },
    ...readingScenes,
    {
      deferredCount: Math.max(0, totalItemCount - items.length),
      id: "trail-end",
      kind: "end",
      quietRepositories: [...quietRepositories],
    },
  ];

  const itemSignature = items.map((item) => item.id).join("|") || "quiet";
  return {
    budgetMinutes,
    editionId,
    id: `${editionId}:${budgetMinutes}:${itemSignature}`,
    plannedMinutes,
    scenes,
  };
}
