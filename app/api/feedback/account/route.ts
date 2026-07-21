import { clearCookieHeader, getGitHubIdentitySession, SESSION_COOKIE, STATE_COOKIE, withSessionCookie } from "@/lib/github-auth";
import { deleteReaderAccount, exportReaderAccount, feedbackIsConfigured } from "@/lib/feedback-store";
import { guardMutationRequest } from "@/lib/request-security";

export async function GET(request: Request) {
  const { session, setCookie } = await getGitHubIdentitySession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to export your Baxtori data." }, { status: 401 }), setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "Account storage is not configured." }, { status: 503 }), setCookie);

  try {
    const data = await exportReaderAccount(String(session.user.id));
    return withSessionCookie(Response.json({ exportedAt: new Date().toISOString(), githubUser: session.user, ...data }, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="baxtori-${session.user.login}-export.json"`,
      },
    }), setCookie);
  } catch {
    return withSessionCookie(Response.json({ error: "Your Baxtori data could not be exported." }, { status: 502 }), setCookie);
  }
}

export async function DELETE(request: Request) {
  const { session, setCookie } = await getGitHubIdentitySession(request);
  if (!session) return withSessionCookie(Response.json({ error: "Sign in with GitHub to delete your Baxtori data." }, { status: 401 }), setCookie);
  const mutationError = guardMutationRequest(request);
  if (mutationError) return withSessionCookie(mutationError, setCookie);
  if (!feedbackIsConfigured()) return withSessionCookie(Response.json({ error: "Account storage is not configured." }, { status: 503 }), setCookie);

  try {
    const result = await deleteReaderAccount(String(session.user.id));
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    headers.append("Set-Cookie", clearCookieHeader(request, SESSION_COOKIE));
    headers.append("Set-Cookie", clearCookieHeader(request, STATE_COOKIE));
    if (setCookie) headers.append("Set-Cookie", setCookie);
    return Response.json({ ok: true, ...result }, { headers });
  } catch {
    return withSessionCookie(Response.json({ error: "Your Baxtori data could not be deleted." }, { status: 502 }), setCookie);
  }
}
