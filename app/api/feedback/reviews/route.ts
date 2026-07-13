import { cancelReviewFeedback, feedbackIsConfigured, queueReviewFeedback } from "@/lib/feedback-store";
import { parseReviewRequest } from "@/lib/feedback-contract";
import { getGitHubSession, withSessionCookie } from "@/lib/github-auth";

export async function POST(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to queue a re-review." }, { status: 401 }), setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "The review queue is not configured." }, { status: 503 }), setCookie);

  try {
    const raw = await request.text();
    if (raw.length > 10_000) throw new Error("Review guidance is too large.");
    const reviewRequest = parseReviewRequest(JSON.parse(raw));
    const queued = await queueReviewFeedback(String(session.user.id), reviewRequest);
    return withSessionCookie(Response.json({ request: queued }, { status: 201 }), setCookie);
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid review request." },
      { status: 400 },
    ), setCookie);
  }
}

export async function DELETE(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to change the review queue." }, { status: 401 }), setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "The review queue is not configured." }, { status: 503 }), setCookie);

  try {
    const body = (await request.json()) as { requestId?: unknown };
    if (typeof body.requestId !== "string" || !body.requestId || body.requestId.length > 100) throw new Error("Invalid review request ID.");
    await cancelReviewFeedback(String(session.user.id), body.requestId);
    return withSessionCookie(Response.json({ canceled: true }), setCookie);
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid review request." },
      { status: 400 },
    ), setCookie);
  }
}
