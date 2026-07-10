import { clearCookieHeader, SESSION_COOKIE, STATE_COOKIE } from "@/lib/github-auth";

export async function POST(request: Request) {
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  headers.append("Set-Cookie", clearCookieHeader(request, SESSION_COOKIE));
  headers.append("Set-Cookie", clearCookieHeader(request, STATE_COOKIE));
  return Response.json({ ok: true }, { headers });
}
