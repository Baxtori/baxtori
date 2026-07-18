type PublishedEvidence = {
  base?: string;
  commit?: string;
  endLine: number;
  head?: string;
  path: string;
  repository: string;
  startLine: number;
};

type DemoSource = {
  base: string;
  head: string;
  lines: string[];
  path: string;
  repository: string;
  startLine: number;
};

const SOURCES: DemoSource[] = [
  {
    repository: "teamleaderleo/baxtori",
    path: "convex/feedback.ts",
    base: "cbd7740699209218ceef0a27223d9239f4c99bc5",
    head: "36379892e85bd1e3512663bcc7632a1c6a9a1be5",
    startLine: 44,
    lines: [
      "export const queueReviewRequest = mutation({",
      "  args: {",
      "    editionId: v.string(),",
      "    guidance: v.string(),",
      "    lensId: v.string(),",
      "    lensInstruction: v.string(),",
      "    lensLabel: v.string(),",
      "    repository: v.string(),",
      "    secret: v.string(),",
      "    storyId: v.string(),",
      "    storyTitle: v.string(),",
      "    userId: v.string(),",
      "  },",
      "  handler: async (ctx, args) => {",
      "    verifySecret(args.secret);",
      "    const queued = await ctx.db.query(\"reviewRequests\").withIndex(\"by_user_status\", (q) => q.eq(\"userId\", args.userId).eq(\"status\", \"queued\")).collect();",
      "    const now = Date.now();",
      "    for (const request of queued) {",
      "      if (request.storyId === args.storyId && request.editionId === args.editionId) {",
      "        await ctx.db.patch(request._id, { status: \"superseded\", updatedAt: now });",
      "      }",
      "    }",
      "    const requestId = await ctx.db.insert(\"reviewRequests\", {",
      "      createdAt: now,",
      "      editionId: args.editionId,",
      "      guidance: args.guidance,",
      "      lensId: args.lensId,",
      "      lensInstruction: args.lensInstruction,",
      "      lensLabel: args.lensLabel,",
      "      repository: args.repository,",
      "      status: \"queued\",",
      "      storyId: args.storyId,",
      "      storyTitle: args.storyTitle,",
      "      updatedAt: now,",
      "      userId: args.userId,",
      "    });",
      "    return await ctx.db.get(requestId);",
      "  },",
    ],
  },
  {
    repository: "teamleaderleo/baxtori",
    path: "app/page.tsx",
    base: "53a33fdb30789543ef3cdbf00fc6c7316a6bf5ed",
    head: "5c813ff9ff957a85c68ae706a9bae41e7f5e096d",
    startLine: 205,
    lines: [
      "  useEffect(() => {", "    try {", "      const saved = window.localStorage.getItem(STORAGE_KEY);", "      if (saved) {",
      "        const parsed = JSON.parse(saved) as Partial<SavedPreferences>;", "        if (parsed.states) setStates(parsed.states);",
      "        if (parsed.view === \"briefing\" || parsed.view === \"timeline\") setView(parsed.view);",
      "        if (typeof parsed.hideUnderstood === \"boolean\") setHideUnderstood(parsed.hideUnderstood);",
      "        if (parsed.editionId && EDITIONS.some((item) => item.id === parsed.editionId)) {", "          setEditionId(parsed.editionId);", "        }",
      "        if (", "          parsed.selectedProject === \"All projects\" ||", "          PROJECTS.some((project) => project.name === parsed.selectedProject)", "        ) {",
      "          setSelectedProject(parsed.selectedProject ?? \"All projects\");", "        }", "      }", "    } catch {",
      "      window.localStorage.removeItem(STORAGE_KEY);", "    } finally {", "      setHasHydrated(true);", "    }", "  }, []);", "",
      "  useEffect(() => {", "    if (!hasHydrated) return;", "    const preferences: SavedPreferences = {", "      editionId,", "      hideUnderstood,", "      selectedProject,",
    ],
  },
  {
    repository: "teamleaderleo/baxtori",
    path: "lib/github-activity.ts",
    base: "dc58f598d770ba6dc0a3596088756225fa121b63",
    head: "a27740e4560407947019ccce880b13de4a986559",
    startLine: 1,
    lines: [
      "const DAY_MS = 24 * 60 * 60 * 1000;", "", "type ActivityWindowInput = {", "  now?: number;", "  requestedDays: number;",
      "  requestedSince: string;", "};", "", "export function resolveActivityWindow({ now = Date.now(), requestedDays, requestedSince }: ActivityWindowInput) {",
      "  const days = Number.isFinite(requestedDays)", "    ? Math.min(Math.max(Math.round(requestedDays), 1), 90)", "    : 14;",
      "  const parsedSince = Date.parse(requestedSince);", "  const earliestAllowed = now - 90 * DAY_MS;",
      "  const usesReviewCursor = requestedSince.length > 0 && Number.isFinite(parsedSince) && parsedSince >= earliestAllowed && parsedSince <= now;", "",
      "  return {", "    days,", "    since: usesReviewCursor ? new Date(parsedSince).toISOString() : new Date(now - days * DAY_MS).toISOString(),",
      "    window: usesReviewCursor ? \"since-review\" as const : \"rolling\" as const,", "  };", "}",
    ],
  },
];

function matchingSource(evidence: PublishedEvidence) {
  return SOURCES.find((source) =>
    source.repository === evidence.repository &&
    source.path === evidence.path &&
    source.startLine === evidence.startLine &&
    source.startLine + source.lines.length - 1 === evidence.endLine &&
    source.head === (evidence.commit ?? evidence.head) &&
    (!evidence.base || source.base === evidence.base)
  );
}

export function demoCodeEvidence(evidence: PublishedEvidence) {
  const source = matchingSource(evidence);
  if (!source) return null;
  return {
    ...evidence,
    lines: source.lines.map((text, index) => ({ number: source.startLine + index, text })),
    sourceUrl: `https://github.com/${source.repository}/blob/${source.head}/${source.path}#L${source.startLine}-L${evidence.endLine}`,
  };
}

export function demoDiffEvidence(evidence: PublishedEvidence) {
  const source = matchingSource(evidence);
  if (!source || evidence.base !== source.base || evidence.head !== source.head) return null;
  return {
    ...evidence,
    additions: source.lines.filter(Boolean).length,
    deletions: 0,
    lines: [
      { kind: "hunk" as const, newNumber: null, oldNumber: null, text: `@@ published excerpt · +${source.startLine},${source.lines.length} @@` },
      ...source.lines.map((text, index) => ({ kind: "addition" as const, newNumber: source.startLine + index, oldNumber: null, text })),
    ],
    sourceUrl: `https://github.com/${source.repository}/compare/${source.base}...${source.head}`,
  };
}
