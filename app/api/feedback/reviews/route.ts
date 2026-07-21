import { cancelReviewFeedback, feedbackIsConfigured, queueReviewFeedback } from "@/lib/feedback-store";
import { parseReviewRequest } from "@/lib/feedback-contract";
import { getGitHubIdentitySession, withSessionCookie } from "@/lib/github-auth";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: Request) {
  const { session, setCookie } = await getGitHubIdentitySession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to queue a re-review." }, { status: 401 }), setCookie);
  const mutationError = guardMutationRequest(request, { requireJson: true });
  if (mutationError) return withSessionCookie(mutationError, setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "The review queue is not configured." }, { status: 503 }), setCookie);

  let reviewRequest;
  try {
    const raw = await request.text();
    if (raw.length > 10_000) throw new Error("Review guidance is too large.");
    reviewRequest = parseReviewRequest(JSON.parse(raw));
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid review request." },
      { status: 400 },
    ), setCookie);
  }

  try {
    const queued = await queueReviewFeedback(String(session.user.id), reviewRequest);
    return withSessionCookie(Response.json({ request: queued }, { status: 201 }), setCookie);
  } catch {
    return withSessionCookie(Response.json({ error: "The re-review could not be queued." }, { status: 502 }), setCookie);
  }
}

export async function DELETE(request: Request) {
  const { session, setCookie } = await getGitHubIdentitySession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to change the review queue." }, { status: 401 }), setCookie);
  const mutationError = guardMutationRequest(request, { requireJson: true });
  if (mutationError) return withSessionCookie(mutationError, setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "The review queue is not configured." }, { status: 503 }), setCookie);

  let requestId: string;
  try {
    const body = (await request.json()) as { requestId?: unknown };
    if (typeof body.requestId !== "string" || !body.requestId || body.requestId.length > 100) throw new Error("Invalid review request ID.");
    requestId = body.requestId;
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid review request." },
      { status: 400 },
    ), setCookie);
  }

  try {
    await cancelReviewFeedback(String(session.user.id), requestId);
    return withSessionCookie(Response.json({ canceled: true }), setCookie);
  } catch {
    return withSessionCookie(Response.json({ error: "The review queue could not be updated." }, { status: 502 }), setCookie);
  }
}
