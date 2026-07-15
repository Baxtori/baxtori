import { feedbackIsConfigured, getReaderFeedback, saveReaderFeedback } from "@/lib/feedback-store";
import { parseReaderState } from "@/lib/feedback-contract";
import { canonicalRepository } from "@/lib/repository-identity";
import { getGitHubSession, withSessionCookie } from "@/lib/github-auth";

export async function GET(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to load your reading state." }, { status: 401 }), setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ configured: false, reviewRequests: [], state: null }, { status: 200 }), setCookie);

  try {
    const result = await getReaderFeedback(String(session.user.id));
    const state = result.state?.payload ? parseReaderState(result.state.payload) : null;
    const reviewRequests = result.reviewRequests.map((reviewRequest) => ({
      ...reviewRequest,
      repository: canonicalRepository(reviewRequest.repository),
    }));
    return withSessionCookie(Response.json({
      configured: true,
      reviewRequests,
      revision: result.state?.revision ?? 0,
      state,
      updatedAt: result.state?.updatedAt ?? null,
    }, { headers: { "Cache-Control": "private, no-store" } }), setCookie);
  } catch {
    return withSessionCookie(Response.json({ error: "Your account state could not be loaded." }, { status: 502 }), setCookie);
  }
}

export async function PUT(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to save your reading state." }, { status: 401 }), setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ configured: false }, { status: 503 }), setCookie);

  try {
    const raw = await request.text();
    if (raw.length > 200_000) throw new Error("Reader state is too large.");
    const payload = parseReaderState(JSON.parse(raw));
    const saved = await saveReaderFeedback(String(session.user.id), session.user.login, payload);
    return withSessionCookie(Response.json({ configured: true, ...saved }, { headers: { "Cache-Control": "private, no-store" } }), setCookie);
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid reader state." },
      { status: 400 },
    ), setCookie);
  }
}
