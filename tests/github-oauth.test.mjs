import assert from "node:assert/strict";
import test from "node:test";

process.env.GITHUB_CLIENT_ID = "test-client-id";
process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
process.env.GITHUB_SESSION_SECRET = "test-session-secret-with-at-least-32-bytes";

const {
  createGitHubOAuthState,
  getGitHubIdentitySession,
  githubOAuthAuthorizeUrl,
  githubOAuthTokenBody,
  sealSession,
  SESSION_COOKIE,
  validateGitHubOAuthState,
} = await import("../lib/github-auth.ts");

test("GitHub OAuth state is encrypted, tamper-evident, and short-lived", async () => {
  const issuedAt = Date.now();
  const state = await createGitHubOAuthState(issuedAt);

  assert.equal(await validateGitHubOAuthState(state, issuedAt + 9 * 60 * 1000), true);
  assert.equal(await validateGitHubOAuthState(`${state}x`, issuedAt), false);
  assert.equal(await validateGitHubOAuthState(state, issuedAt + 11 * 60 * 1000), false);
  assert.equal(await validateGitHubOAuthState(state, issuedAt - 2 * 60 * 1000), false);
});

test("authorization lets the GitHub App choose its registered callback", async () => {
  const state = await createGitHubOAuthState();
  const location = githubOAuthAuthorizeUrl("test-client-id", state);

  assert.equal(location.origin, "https://github.com");
  assert.equal(location.searchParams.get("client_id"), "test-client-id");
  assert.equal(location.searchParams.has("redirect_uri"), false);
  assert.equal(await validateGitHubOAuthState(location.searchParams.get("state")), true);
});

test("token exchange uses the same registered callback default", () => {
  const tokenBody = githubOAuthTokenBody("test-code");

  assert.equal(tokenBody.get("client_id"), "test-client-id");
  assert.equal(tokenBody.get("client_secret"), "test-client-secret");
  assert.equal(tokenBody.get("code"), "test-code");
  assert.equal(tokenBody.has("redirect_uri"), false);
});

test("Baxtori account identity survives access-token expiry while refresh credentials remain live", async () => {
  const now = Date.now();
  const value = await sealSession({
    accessToken: "expired-token",
    accessTokenExpiresAt: now - 1_000,
    refreshToken: "live-refresh-token",
    refreshTokenExpiresAt: now + 60_000,
    user: { avatarUrl: "https://example.com/avatar", id: 42, login: "reader", name: null },
  });
  const request = new Request("https://www.baxtori.com/", {
    headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(value)}` },
  });

  const result = await getGitHubIdentitySession(request);
  assert.equal(result.session?.user.id, 42);
  assert.equal(result.setCookie, null);
});
