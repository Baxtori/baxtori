import {
  cookieHeader,
  createGitHubOAuthState,
  githubIsConfigured,
  githubOAuthAuthorizeUrl,
  STATE_COOKIE,
} from "@/lib/github-auth";

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  if (!githubIsConfigured() || !clientId) {
    return Response.json({ error: "GitHub sign-in is not configured yet." }, { status: 503 });
  }

  const state = await createGitHubOAuthState();
  const authorize = githubOAuthAuthorizeUrl(clientId, state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      "Set-Cookie": cookieHeader(request, STATE_COOKIE, state, 10 * 60),
    },
  });
}
