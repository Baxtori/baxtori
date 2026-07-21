import { createGitHubOAuthState, githubIsConfigured, githubOAuthAuthorizeUrl } from "@/lib/github-auth";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  if (!githubIsConfigured() || !clientId) {
    return Response.json({ error: "GitHub sign-in is not configured yet." }, { status: 503 });
  }

  const state = await createGitHubOAuthState();
  const authorize = githubOAuthAuthorizeUrl(clientId, state);

  return new Response(null, {
    status: 302,
    headers: { Location: authorize.toString() },
  });
}
