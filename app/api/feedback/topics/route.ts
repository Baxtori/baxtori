import { feedbackIsConfigured, updateTopicFeedback, upsertTopicFeedback } from "@/lib/feedback-store";
import { parseTopicThread, parseTopicThreadUpdate } from "@/lib/topic-contract";
import { getGitHubIdentitySession, withSessionCookie } from "@/lib/github-auth";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: Request) {
  const { session, setCookie } = await getGitHubIdentitySession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to save a topic." }, { status: 401 }), setCookie);
  const mutationError = guardMutationRequest(request, { requireJson: true });
  if (mutationError) return withSessionCookie(mutationError, setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "Account topics are not configured." }, { status: 503 }), setCookie);

  let topic;
  try {
    const raw = await request.text();
    if (raw.length > 12_000) throw new Error("Topic data is too large.");
    topic = parseTopicThread(JSON.parse(raw));
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid topic." },
      { status: 400 },
    ), setCookie);
  }

  try {
    const saved = await upsertTopicFeedback(String(session.user.id), topic);
    return withSessionCookie(Response.json({ topic: saved }, { status: 201 }), setCookie);
  } catch {
    return withSessionCookie(Response.json({ error: "The topic could not be saved." }, { status: 502 }), setCookie);
  }
}

export async function PATCH(request: Request) {
  const { session, setCookie } = await getGitHubIdentitySession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to update a topic." }, { status: 401 }), setCookie);
  const mutationError = guardMutationRequest(request, { requireJson: true });
  if (mutationError) return withSessionCookie(mutationError, setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "Account topics are not configured." }, { status: 503 }), setCookie);

  let update;
  try {
    const raw = await request.text();
    if (raw.length > 2_000) throw new Error("Topic update is too large.");
    update = parseTopicThreadUpdate(JSON.parse(raw));
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid topic update." },
      { status: 400 },
    ), setCookie);
  }

  try {
    const saved = await updateTopicFeedback(String(session.user.id), update);
    return withSessionCookie(Response.json({ topic: saved }), setCookie);
  } catch {
    return withSessionCookie(Response.json({ error: "The topic could not be updated." }, { status: 502 }), setCookie);
  }
}
