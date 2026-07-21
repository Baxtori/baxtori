import { clearCookieHeader, SESSION_COOKIE, STATE_COOKIE } from "@/lib/github-auth";
import { guardMutationRequest } from "@/lib/request-security";

export async function POST(request: Request) {
  const mutationError = guardMutationRequest(request);
  if (mutationError) return mutationError;

  const headers = new Headers({ "Cache-Control": "private, no-store" });
  headers.append("Set-Cookie", clearCookieHeader(request, SESSION_COOKIE));
  headers.append("Set-Cookie", clearCookieHeader(request, STATE_COOKIE));
  return Response.json({ ok: true }, { headers });
}
