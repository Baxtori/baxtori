import { createQuestionFeedback, feedbackIsConfigured, updateQuestionFeedback } from "@/lib/feedback-store";
import { parseThreadQuestion, parseThreadQuestionUpdate } from "@/lib/topic-contract";
import { getGitHubIdentitySession, withSessionCookie } from "@/lib/github-auth";
import { guardRateLimit } from "@/lib/rate-limit";
import { guardMutationRequest } from "@/lib/request-security";

const ACCOUNT_MUTATION_LIMIT = { limit: 120, windowMs: 60_000 };

export async function POST(request: Request) {
  const { session, setCookie } = await getGitHubIdentitySession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to save a question." }, { status: 401 }), setCookie);
  const mutationError = guardMutationRequest(request, { requireJson: true });
  if (mutationError) return withSessionCookie(mutationError, setCookie);
  const rateLimitError = guardRateLimit("feedback:mutation", String(session.user.id), ACCOUNT_MUTATION_LIMIT);
  if (rateLimitError) return withSessionCookie(rateLimitError, setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "Account questions are not configured." }, { status: 503 }), setCookie);

  let question;
  try {
    const raw = await request.text();
    if (raw.length > 12_000) throw new Error("Question data is too large.");
    question = parseThreadQuestion(JSON.parse(raw));
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid question." },
      { status: 400 },
    ), setCookie);
  }

  try {
    const saved = await createQuestionFeedback(String(session.user.id), question);
    return withSessionCookie(Response.json({ question: saved }, { status: 201 }), setCookie);
  } catch {
    return withSessionCookie(Response.json({ error: "The question could not be saved." }, { status: 502 }), setCookie);
  }
}

export async function PATCH(request: Request) {
  const { session, setCookie } = await getGitHubIdentitySession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to update a question." }, { status: 401 }), setCookie);
  const mutationError = guardMutationRequest(request, { requireJson: true });
  if (mutationError) return withSessionCookie(mutationError, setCookie);
  const rateLimitError = guardRateLimit("feedback:mutation", String(session.user.id), ACCOUNT_MUTATION_LIMIT);
  if (rateLimitError) return withSessionCookie(rateLimitError, setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "Account questions are not configured." }, { status: 503 }), setCookie);

  let update;
  try {
    const raw = await request.text();
    if (raw.length > 6_000) throw new Error("Question update is too large.");
    update = parseThreadQuestionUpdate(JSON.parse(raw));
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid question update." },
      { status: 400 },
    ), setCookie);
  }

  try {
    const saved = await updateQuestionFeedback(String(session.user.id), update);
    return withSessionCookie(Response.json({ question: saved }), setCookie);
  } catch {
    return withSessionCookie(Response.json({ error: "The question could not be updated." }, { status: 502 }), setCookie);
  }
}
