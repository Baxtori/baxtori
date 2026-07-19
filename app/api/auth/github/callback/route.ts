import {
  clearCookieHeader,
  cookieHeader,
  githubHeaders,
  githubIsConfigured,
  GitHubSession,
  SESSION_COOKIE,
  parseCookies,
  sealSession,
  STATE_COOKIE,
  type TokenResponse,
} from "@/lib/github-auth";

type GitHubProfile = {
  avatar_url: string;
  id: number;
  login: string;
  name: string | null;
};

function redirectHome(request: Request, result: string, cookies: string[] = []) {
  const location = new URL("/", request.url);
  location.searchParams.set("github", result);
  const headers = new Headers({ Location: location.toString() });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

export async function GET(request: Request) {
  if (!githubIsConfigured()) return redirectHome(request, "not-configured");
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = parseCookies(request).get(STATE_COOKIE);
  const clearState = clearCookieHeader(request, STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectHome(request, "state-error", [clearState]);
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID?.trim() ?? "",
      client_secret: process.env.GITHUB_CLIENT_SECRET?.trim() ?? "",
      code,
      redirect_uri: new URL("/api/auth/github/callback", request.url).toString(),
    }),
    cache: "no-store",
  });
  const token = (await response.json()) as TokenResponse;
  if (!response.ok || !token.access_token) return redirectHome(request, "token-error", [clearState]);

  const profileResponse = await fetch("https://api.github.com/user", {
    headers: githubHeaders(token.access_token),
    cache: "no-store",
  });
  if (!profileResponse.ok) return redirectHome(request, "profile-error", [clearState]);
  const profile = (await profileResponse.json()) as GitHubProfile;
  const now = Date.now();
  const session: GitHubSession = {
    accessToken: token.access_token,
    accessTokenExpiresAt: token.expires_in ? now + token.expires_in * 1000 : undefined,
    refreshToken: token.refresh_token,
    refreshTokenExpiresAt: token.refresh_token_expires_in
      ? now + token.refresh_token_expires_in * 1000
      : undefined,
    user: {
      avatarUrl: profile.avatar_url,
      id: profile.id,
      login: profile.login,
      name: profile.name,
    },
  };
  const maxAge = token.refresh_token_expires_in ?? 60 * 60 * 24 * 30;
  const sessionCookie = cookieHeader(request, SESSION_COOKIE, await sealSession(session), maxAge);
  return redirectHome(request, "connected", [clearState, sessionCookie]);
}
