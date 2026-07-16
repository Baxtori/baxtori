import { createQuestionFeedback, feedbackIsConfigured, updateQuestionFeedback } from "@/lib/feedback-store";
import { parseThreadQuestion, parseThreadQuestionUpdate } from "@/lib/topic-contract";
import { getGitHubSession, withSessionCookie } from "@/lib/github-auth";

export async function POST(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to save a question." }, { status: 401 }), setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "Account questions are not configured." }, { status: 503 }), setCookie);

  try {
    const raw = await request.text();
    if (raw.length > 12_000) throw new Error("Question data is too large.");
    const question = parseThreadQuestion(JSON.parse(raw));
    const saved = await createQuestionFeedback(String(session.user.id), question);
    return withSessionCookie(Response.json({ question: saved }, { status: 201 }), setCookie);
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid question." },
      { status: 400 },
    ), setCookie);
  }
}

export async function PATCH(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to update a question." }, { status: 401 }), setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "Account questions are not configured." }, { status: 503 }), setCookie);

  try {
    const raw = await request.text();
    if (raw.length > 6_000) throw new Error("Question update is too large.");
    const update = parseThreadQuestionUpdate(JSON.parse(raw));
    const saved = await updateQuestionFeedback(String(session.user.id), update);
    return withSessionCookie(Response.json({ question: saved }), setCookie);
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid question update." },
      { status: 400 },
    ), setCookie);
  }
}
