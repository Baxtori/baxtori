import { cookieHeader, githubIsConfigured, STATE_COOKIE } from "@/lib/github-auth";

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  if (!githubIsConfigured() || !clientId) {
    return Response.json({ error: "GitHub sign-in is not configured yet." }, { status: 503 });
  }

  const state = crypto.randomUUID();
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", new URL("/api/auth/github/callback", request.url).toString());
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      "Set-Cookie": cookieHeader(request, STATE_COOKIE, state, 10 * 60),
    },
  });
}
