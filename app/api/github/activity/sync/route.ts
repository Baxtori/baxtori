import {
  feedbackIsConfigured,
  getAuthorizedRepositoryInventory,
  saveRepositoryActivitySnapshot,
} from "@/lib/feedback-store";
import { getGitHubSession, withSessionCookie } from "@/lib/github-auth";
import { resolveActivityWindow } from "@/lib/github-activity";
import { collectRepositoryActivitySnapshot } from "@/lib/repository-activity-snapshot";
import type { RepositoryMode } from "@/lib/repository-modes";

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const MODES = new Set<RepositoryMode>(["automatic", "muted", "pinned"]);

export async function POST(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) {
    return withSessionCookie(
      Response.json({ error: "Sign in with GitHub to sync repository activity." }, { status: 401 }),
      setCookie,
    );
  }
  if (!feedbackIsConfigured()) {
    return withSessionCookie(
      Response.json({ error: "Account-backed activity sync is not configured." }, { status: 503 }),
      setCookie,
    );
  }

  try {
    const body = await request.json() as { repositoryModes?: unknown; since?: unknown };
    const repositoryModes = parseRepositoryModes(body.repositoryModes);
    const requestedSince = typeof body.since === "string" ? body.since.trim() : "";
    const { since } = resolveActivityWindow({ requestedDays: 14, requestedSince });
    const inventory = await getAuthorizedRepositoryInventory(String(session.user.id));
    if (!inventory) {
      return withSessionCookie(
        Response.json({ error: "Authorized repository inventory has not completed yet." }, { status: 409 }),
        setCookie,
      );
    }

    const snapshot = await collectRepositoryActivitySnapshot({
      accessToken: session.accessToken,
      repositories: inventory.repositories,
      repositoryModes,
      since,
    });
    await saveRepositoryActivitySnapshot(String(session.user.id), session.user.login, snapshot);
    const activity = Object.fromEntries(snapshot.records.map((record) => [record.repository, {
      commits: record.commits.map((commit) => ({
        author: commit.author,
        date: commit.date,
        message: commit.message,
        sha: commit.sha.slice(0, 7),
        url: commit.url,
      })),
      error: record.error ?? undefined,
      repository: record.repository,
      since: snapshot.since,
      status: record.status,
      truncated: record.truncated,
      window: "since-review" as const,
    }]));

    return withSessionCookie(Response.json({
      activity,
      deferredCount: snapshot.deferredCount,
      halted: snapshot.halted,
      rateLimit: snapshot.rateLimit,
      requestBudget: snapshot.requestBudget,
      requestCount: snapshot.requestCount,
      since: snapshot.since,
    }, { headers: { "Cache-Control": "private, no-store" } }), setCookie);
  } catch (error) {
    return withSessionCookie(Response.json({
      error: error instanceof Error ? error.message : "Repository activity could not be synchronized.",
    }, { status: 502 }), setCookie);
  }
}

function parseRepositoryModes(value: unknown) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid repository modes.");
  const entries = Object.entries(value);
  if (entries.length > 5_000) throw new Error("Repository modes are too large.");
  return Object.fromEntries(entries.map(([repository, mode]) => {
    if (!REPOSITORY_PATTERN.test(repository) || !MODES.has(mode as RepositoryMode)) throw new Error("Invalid repository mode.");
    return [repository, mode as RepositoryMode];
  }));
}
