export type GitHubUser = {
  avatarUrl: string;
  id: number;
  login: string;
  name: string | null;
};

export type GitHubSession = {
  accessToken: string;
  accessTokenExpiresAt?: number;
  refreshToken?: string;
  refreshTokenExpiresAt?: number;
  user: GitHubUser;
};

type TokenResponse = {
  access_token?: string;
  error?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

export const SESSION_COOKIE = "baxtori_github_session";
export const STATE_COOKIE = "baxtori_github_state";

export function githubIsConfigured() {
  return Boolean(
    process.env.GITHUB_CLIENT_ID?.trim() &&
      process.env.GITHUB_CLIENT_SECRET?.trim() &&
      process.env.GITHUB_SESSION_SECRET?.trim(),
  );
}

export function parseCookies(request: Request) {
  const cookies = new Map<string, string>();
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    cookies.set(part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim()));
  }
  return cookies;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sessionKey() {
  const secret = process.env.GITHUB_SESSION_SECRET?.trim();
  if (!secret) throw new Error("GitHub session encryption is not configured.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealSession(session: GitHubSession) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(session));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await sessionKey(), plaintext);
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

async function openSession(value: string) {
  try {
    const [iv, encrypted] = value.split(".");
    if (!iv || !encrypted) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(iv) },
      await sessionKey(),
      base64UrlToBytes(encrypted),
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as GitHubSession;
  } catch {
    return null;
  }
}

export function cookieHeader(request: Request, name: string, value: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearCookieHeader(request: Request, name: string) {
  return cookieHeader(request, name, "", 0);
}

async function refreshSession(session: GitHubSession) {
  if (!session.refreshToken) return null;
  const body = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID?.trim() ?? "",
    client_secret: process.env.GITHUB_CLIENT_SECRET?.trim() ?? "",
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
  });
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const token = (await response.json()) as TokenResponse;
  if (!response.ok || !token.access_token) return null;
  const now = Date.now();
  return {
    ...session,
    accessToken: token.access_token,
    accessTokenExpiresAt: token.expires_in ? now + token.expires_in * 1000 : undefined,
    refreshToken: token.refresh_token ?? session.refreshToken,
    refreshTokenExpiresAt: token.refresh_token_expires_in
      ? now + token.refresh_token_expires_in * 1000
      : session.refreshTokenExpiresAt,
  } satisfies GitHubSession;
}

export async function getGitHubSession(request: Request) {
  const value = parseCookies(request).get(SESSION_COOKIE);
  if (!value || !githubIsConfigured()) return { session: null, setCookie: null };
  let session = await openSession(value);
  if (!session) return { session: null, setCookie: clearCookieHeader(request, SESSION_COOKIE) };

  if (session.accessTokenExpiresAt && session.accessTokenExpiresAt <= Date.now() + 5 * 60 * 1000) {
    session = await refreshSession(session);
    if (!session) return { session: null, setCookie: clearCookieHeader(request, SESSION_COOKIE) };
    const maxAge = session.refreshTokenExpiresAt
      ? Math.max(0, Math.floor((session.refreshTokenExpiresAt - Date.now()) / 1000))
      : 60 * 60 * 24 * 30;
    return { session, setCookie: cookieHeader(request, SESSION_COOKIE, await sealSession(session), maxAge) };
  }

  return { session, setCookie: null };
}

export function githubHeaders(accessToken: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "baxtori-code-backstory",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function withSessionCookie(response: Response, setCookie: string | null) {
  if (setCookie) response.headers.append("Set-Cookie", setCookie);
  return response;
}
