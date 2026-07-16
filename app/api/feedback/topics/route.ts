import { feedbackIsConfigured, updateTopicFeedback, upsertTopicFeedback } from "@/lib/feedback-store";
import { parseTopicThread, parseTopicThreadUpdate } from "@/lib/topic-contract";
import { getGitHubSession, withSessionCookie } from "@/lib/github-auth";

export async function POST(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to save a topic." }, { status: 401 }), setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "Account topics are not configured." }, { status: 503 }), setCookie);

  try {
    const raw = await request.text();
    if (raw.length > 12_000) throw new Error("Topic data is too large.");
    const topic = parseTopicThread(JSON.parse(raw));
    const saved = await upsertTopicFeedback(String(session.user.id), topic);
    return withSessionCookie(Response.json({ topic: saved }, { status: 201 }), setCookie);
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid topic." },
      { status: 400 },
    ), setCookie);
  }
}

export async function PATCH(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to update a topic." }, { status: 401 }), setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "Account topics are not configured." }, { status: 503 }), setCookie);

  try {
    const raw = await request.text();
    if (raw.length > 2_000) throw new Error("Topic update is too large.");
    const update = parseTopicThreadUpdate(JSON.parse(raw));
    const saved = await updateTopicFeedback(String(session.user.id), update);
    return withSessionCookie(Response.json({ topic: saved }), setCookie);
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid topic update." },
      { status: 400 },
    ), setCookie);
  }
}
