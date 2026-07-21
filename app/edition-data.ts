import archivedEdition20260710 from "@/data/editions/2026-07-10.json";
import archivedEdition20260712 from "@/data/editions/2026-07-12.json";
import archivedEdition20260713 from "@/data/editions/2026-07-13.json";
import latestEdition from "@/data/latest.json";
import ourchivalMap from "@/data/maps/ourchival.json";
import oneMoreLegendMap from "@/data/maps/one-more-legend.json";
import repositoryMap from "@/data/repo-map.json";
import reviewPolicy from "@/data/review-policy.json";
import reviewScope from "@/data/review-scope.json";
import type { EditionSelectionRecord } from "@/lib/edition-ledger";
import type { HistoricalEdition } from "@/lib/edition-history";
import { storiesForEdition } from "@/lib/edition-stories";
import type { TopicThreadRecord } from "@/lib/story-topics";
import type { ArchiveEdition } from "./edition-history";
import type { RepoMapData } from "./repo-map";
import type { CodeEvidence } from "./story-code";

export type Tone = "blue" | "green" | "rust";

export type Story = {
  id: string;
  topicId: string;
  project: string;
  tone: Tone;
  timing: string;
  title: string;
  brief: string;
  learningValue: number;
  verdict: string;
  whatChanged: string;
  whyItMatters: string;
  verify: string;
  tradeoff: string;
  evidence: string;
  files: string[];
  codeEvidence?: CodeEvidence[];
  repository?: string;
  commits?: { sha: string; url: string }[];
};

export type Edition = {
  generatedAt: string;
  id: string;
  periodEnd: string;
  periodStart: string;
  quietRepositories: string[];
  selection?: EditionSelectionRecord;
  stories: Story[];
};

export type ReviewPolicy = {
  version: number;
  updatedAt: string;
  defaultLens: string;
  lenses: { id: string; label: string; instruction: string }[];
  preservedRules: string[];
};

export type ScopedRepository = {
  fullName: string;
  name: string;
  priority: "core" | "normal" | "low";
  mapStatus: "mapped" | "unmapped" | "empty";
};

export type ReviewScope = {
  updatedAt: string;
  lastReviewedAt: string;
  schedule: string;
  windowDays: number;
  repositories: ScopedRepository[];
};

// These stories are fixtures for explicit component previews. Published reader
// data always comes from EDITION, including a valid quiet edition with no stories.
export const DEMO_STORIES: Story[] = [
  {
    id: "checkout",
    topicId: "payment-retry-policy",
    project: "Checkout",
    tone: "blue",
    timing: "Tue, 11:40",
    title: "Payment retries now explain themselves.",
    brief: "Retry decisions are recorded beside each attempt, so support no longer has to reconstruct the story from logs.",
    learningValue: 5,
    verdict: "A clean boundary worth studying",
    whatChanged: "Processor failures, customer-action requirements, and exhausted retries now move through named states instead of one opaque queue path.",
    whyItMatters: "The system exposes policy as data. Support can explain an outcome, and product can measure where recovery actually stops.",
    verify: "Follow one already-queued job through the fallback path and confirm its reason stays stable across another attempt.",
    tradeoff: "The explicit state model adds a small migration and a temporary fallback for jobs already in flight.",
    evidence: "4 commits · 9 files · 18 tests",
    files: ["src/retries/classify.ts", "src/retries/record-decision.ts", "tests/retries/attempts.test.ts"],
  },
  {
    id: "studio",
    topicId: "workspace-membership-boundary",
    project: "Studio",
    tone: "green",
    timing: "Wed, 15:20",
    title: "Workspace permissions have a clearer edge.",
    brief: "Membership is resolved once at the route boundary instead of being rediscovered inside every mutation.",
    learningValue: 4,
    verdict: "Good direction, one edge to watch",
    whatChanged: "Mutations now receive an already-resolved membership context from a shared route guard.",
    whyItMatters: "Authorization becomes easier to audit because the decision is visible in one place instead of being scattered across handlers.",
    verify: "Compare direct membership, inherited admin access, and revoked membership across read and write routes.",
    tradeoff: "A bug in the shared guard would reach more routes, so inherited-role behavior deserves a compact test matrix.",
    evidence: "3 commits · 7 files · 12 permission cases",
    files: ["app/api/workspaces/[slug]/guard.ts", "lib/permissions/resolve-role.ts", "tests/permissions/inherited-role.test.ts"],
  },
  {
    id: "canvas",
    topicId: "animation-timing-compatibility",
    project: "Canvas",
    tone: "rust",
    timing: "Thu, 09:05",
    title: "The animation layer lost some old assumptions.",
    brief: "Three almost-identical timing helpers now route through one primitive while a compatibility switch protects this release.",
    learningValue: 3,
    verdict: "Useful cleanup with deliberate debt",
    whatChanged: "Shared timing behavior moved into one primitive and the three older helpers were retired.",
    whyItMatters: "The animation surface is smaller and easier to reason about without changing what users see during the current release window.",
    verify: "Remove the compatibility flag in a test branch and compare interrupted drag and resize transitions.",
    tradeoff: "Two paths remain until the next release, but keeping the switch avoids an unnecessary visual regression risk today.",
    evidence: "4 commits · 6 files · 3 helpers retired",
    files: ["lib/motion/timing.ts", "components/canvas/use-transition.ts", "components/canvas/motion-compat.ts"],
  },
];

export const EDITION = latestEdition as Edition;
export const STORIES: Story[] = storiesForEdition(EDITION.stories);
export const ARCHIVED_EDITIONS = [
  archivedEdition20260713,
  archivedEdition20260712,
  archivedEdition20260710,
] as ArchiveEdition[];
export const HISTORY_EDITIONS = [EDITION, ...ARCHIVED_EDITIONS] as unknown as readonly ArchiveEdition[];
export const HISTORY_EDITION_COUNT = new Set((HISTORY_EDITIONS as readonly HistoricalEdition[]).map((edition) => edition.id)).size;
export const REPOSITORY_MAP = repositoryMap as RepoMapData;
// Adding a repository map still means registering its JSON import here (the
// bundler needs a static path); data/repository-maps.json remains the registry
// the compiler scripts validate against.
export const REPOSITORY_MAPS = [REPOSITORY_MAP, ourchivalMap as RepoMapData, oneMoreLegendMap as RepoMapData];
export const REVIEW_POLICY = reviewPolicy as ReviewPolicy;
export const REVIEW_SCOPE = reviewScope as ReviewScope;
export const SCHEDULED_REPOSITORIES = REVIEW_SCOPE.repositories.map((repository) => repository.fullName);

export const DEMO_TOPIC_THREAD: TopicThreadRecord = {
  _id: "demo:reader-review-loop",
  evidence: {
    baseCommit: "cbd7740699209218ceef0a27223d9239f4c99bc5",
    endLine: 81,
    headCommit: "36379892e85bd1e3512663bcc7632a1c6a9a1be5",
    path: "convex/feedback.ts",
    repository: "Baxtori/baxtori",
    startLine: 44,
  },
  origin: "watch",
  sourceKey: "watch:Baxtori/baxtori:reader-review-loop",
  status: "active",
};
