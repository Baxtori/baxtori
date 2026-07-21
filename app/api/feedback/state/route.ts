import { feedbackIsConfigured, getReaderFeedback, saveReaderFeedback } from "@/lib/feedback-store";
import { parseReaderState } from "@/lib/feedback-contract";
import { canonicalRepository } from "@/lib/repository-identity";
import { guardMutationRequest } from "@/lib/request-security";
import { canonicalizeEvidenceAddress } from "@/lib/topic-contract";
import { getGitHubIdentitySession, withSessionCookie } from "@/lib/github-auth";

export async function GET(request: Request) {
  const { session, setCookie } = await getGitHubIdentitySession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to load your reading state." }, { status: 401 }), setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ configured: false, reviewRequests: [], state: null, threadQuestions: [], topicThreads: [] }, { status: 200 }), setCookie);

  try {
    const result = await getReaderFeedback(String(session.user.id));
    const state = result.state?.payload ? parseReaderState(result.state.payload) : null;
    const reviewRequests = result.reviewRequests.map((reviewRequest) => ({
      ...reviewRequest,
      repository: canonicalRepository(reviewRequest.repository),
    }));
    const topicThreads = result.topicThreads.map((thread) => ({
      ...thread,
      evidence: canonicalizeEvidenceAddress(thread.evidence),
    }));
    const threadQuestions = result.threadQuestions.map((question) => ({
      ...question,
      evidence: canonicalizeEvidenceAddress(question.evidence),
    }));
    return withSessionCookie(Response.json({
      configured: true,
      reviewRequests,
      revision: result.state?.revision ?? 0,
      state,
      threadQuestions,
      topicThreads,
      updatedAt: result.state?.updatedAt ?? null,
    }, { headers: { "Cache-Control": "private, no-store" } }), setCookie);
  } catch {
    return withSessionCookie(Response.json({ error: "Your account state could not be loaded." }, { status: 502 }), setCookie);
  }
}

export async function PUT(request: Request) {
  const { session, setCookie } = await getGitHubIdentitySession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to save your reading state." }, { status: 401 }), setCookie);
  const mutationError = guardMutationRequest(request, { requireJson: true });
  if (mutationError) return withSessionCookie(mutationError, setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ configured: false }, { status: 503 }), setCookie);

  let payload;
  let baseRevision: number | undefined;
  try {
    const raw = await request.text();
    if (raw.length > 200_000) throw new Error("Reader state is too large.");
    const body = JSON.parse(raw) as { baseRevision?: unknown };
    payload = parseReaderState(body);
    baseRevision = typeof body.baseRevision === "number" && Number.isSafeInteger(body.baseRevision) && body.baseRevision >= 0
      ? body.baseRevision
      : undefined;
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid reader state." },
      { status: 400 },
    ), setCookie);
  }

  try {
    const saved = await saveReaderFeedback(String(session.user.id), session.user.login, payload, baseRevision);
    if (saved.conflict) {
      return withSessionCookie(Response.json(
        { conflict: true, revision: saved.revision, updatedAt: saved.updatedAt },
        { headers: { "Cache-Control": "private, no-store" }, status: 409 },
      ), setCookie);
    }
    return withSessionCookie(Response.json({ configured: true, ...saved }, { headers: { "Cache-Control": "private, no-store" } }), setCookie);
  } catch {
    return withSessionCookie(Response.json({ error: "Your reading state could not be saved." }, { status: 502 }), setCookie);
  }
}
