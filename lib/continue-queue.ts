import { canonicalRepository } from "./repository-identity.ts";

export type ContinueItemKind = "area" | "question" | "review" | "story" | "watch";

export type ContinueItem = {
  id: string;
  kind: ContinueItemKind;
  minutes: number;
  priority: number;
  reason: string;
  repository: string;
  targetId: string;
  title: string;
  view: "briefing" | "map";
};

type QueueStory = {
  id: string;
  learningValue: number;
  project: string;
  repository?: string;
  title: string;
};

type QueueStoryState = {
  locked?: boolean;
  muted?: boolean;
  understood?: boolean;
  watching?: boolean;
};

type QueueArea = {
  freshness: number;
  id: string;
  importance: number;
  name: string;
  purpose: string;
  walkthrough?: { estimatedMinutes: number; outcome: string };
};

type QueueQuestion = {
  areaId: string;
  id: string;
  question: string;
  status: "open" | "resolved";
  whyItMatters: string;
};

type QueueMap = {
  areas: QueueArea[];
  questions: QueueQuestion[];
  repository: string;
};

type QueueReviewRequest = {
  guidance: string;
  repository: string;
  status: "canceled" | "processed" | "queued" | "superseded";
  storyId: string;
  storyTitle: string;
};

type BuildContinueQueueInput = {
  mapStates: Record<string, "introduced" | "revisit" | "skipped" | "understood" | "unexplored">;
  questionStates: Record<string, "irrelevant" | "open" | "resolved">;
  repositoryMaps: QueueMap[];
  reviewRequests: QueueReviewRequest[];
  stories: QueueStory[];
  storyStates: Record<string, QueueStoryState>;
};

function compareItems(left: ContinueItem, right: ContinueItem) {
  return right.priority - left.priority || left.minutes - right.minutes || left.id.localeCompare(right.id);
}

function mapState<T extends string>(states: Record<string, T>, repository: string, id: string, fallback: T) {
  return states[`${repository}:${id}`] ?? states[id] ?? fallback;
}

export function buildContinueQueue({
  mapStates,
  questionStates,
  repositoryMaps,
  reviewRequests,
  stories,
  storyStates,
}: BuildContinueQueueInput) {
  const items: ContinueItem[] = [];
  const unreadStoryIds = new Set<string>();

  for (const [storyIndex, story] of stories.entries()) {
    const state = storyStates[story.id] ?? {};
    const repository = canonicalRepository(story.repository ?? story.project);
    const readable = state.locked || !state.muted;

    if (readable && !state.understood) {
      unreadStoryIds.add(story.id);
      items.push({
        id: `story:${story.id}`,
        kind: "story",
        minutes: Math.max(3, Math.min(5, story.learningValue)),
        priority: 100 + story.learningValue * 4 + (stories.length - storyIndex) + (state.locked ? 12 : 0) + (state.watching ? 8 : 0),
        reason: state.locked
          ? "You pinned this story."
          : state.watching
            ? "This watched thread is still unread."
            : "Unread story from the current edition.",
        repository,
        targetId: story.id,
        title: story.title,
        view: "briefing",
      });
    }
  }

  for (const request of reviewRequests) {
    if (request.status !== "queued" || request.guidance.trim() || unreadStoryIds.has(request.storyId)) continue;
    items.push({
      id: `review:${request.storyId}`,
      kind: "review",
      minutes: 4,
      priority: 88,
      reason: "This queued re-review has no reader guidance yet.",
      repository: canonicalRepository(request.repository),
      targetId: request.storyId,
      title: request.storyTitle,
      view: "briefing",
    });
  }

  for (const repositoryMap of repositoryMaps) {
    const repository = canonicalRepository(repositoryMap.repository);
    const areasById = new Map(repositoryMap.areas.map((area) => [area.id, area]));

    for (const area of repositoryMap.areas) {
      const state = mapState(mapStates, repository, area.id, "unexplored");
      if (state === "skipped" || state === "understood") continue;
      const statePriority = state === "revisit" ? 90 : state === "introduced" ? 78 : 62;
      const description = area.walkthrough?.outcome ?? area.purpose;
      items.push({
        id: `area:${repository}:${area.id}`,
        kind: "area",
        minutes: Math.min(5, area.walkthrough?.estimatedMinutes ?? 5),
        priority: statePriority + area.importance * 3 + Math.round(area.freshness / 10),
        reason: state === "revisit"
          ? `Marked for another look. ${description}`
          : state === "introduced"
            ? `Already started. ${description}`
            : `Unreviewed map area. ${description}`,
        repository,
        targetId: area.id,
        title: area.name,
        view: "map",
      });
    }

    for (const question of repositoryMap.questions) {
      const disposition = mapState(questionStates, repository, question.id, question.status);
      if (disposition !== "open") continue;
      const area = areasById.get(question.areaId);
      items.push({
        id: `question:${repository}:${question.id}`,
        kind: "question",
        minutes: 5,
        priority: 76 + (area?.importance ?? 0) * 2,
        reason: `Open question${area ? ` in ${area.name}` : ""}. ${question.whyItMatters}`,
        repository,
        targetId: question.id,
        title: question.question,
        view: "map",
      });
    }
  }

  return items.sort(compareItems);
}

export function planContinueQueue(items: ContinueItem[], budget: number) {
  const plan: ContinueItem[] = [];
  let plannedMinutes = 0;

  for (const item of items) {
    if (plannedMinutes + item.minutes > budget) continue;
    plan.push(item);
    plannedMinutes += item.minutes;
  }

  return { items: plan, plannedMinutes };
}
