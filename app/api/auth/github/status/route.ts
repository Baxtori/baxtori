import { getGitHubIdentitySession, githubIsConfigured, withSessionCookie } from "@/lib/github-auth";

export async function GET(request: Request) {
  const { session, setCookie } = await getGitHubIdentitySession(request);
  return withSessionCookie(
    Response.json(
      {
        appSlug: process.env.GITHUB_APP_SLUG?.trim() ?? null,
        authenticated: Boolean(session),
        configured: githubIsConfigured(),
        user: session?.user ?? null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    ),
    setCookie,
  );
}
