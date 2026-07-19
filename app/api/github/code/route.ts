import { buildGitHubContentsUrl, parseCodeEvidenceRequest, selectCodeLines } from "@/lib/code-evidence";
import { getGitHubSession, githubHeaders, withSessionCookie } from "@/lib/github-auth";
import { demoCodeEvidence } from "@/lib/demo-evidence";

const MAX_SOURCE_BYTES = 250_000;

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("demo") === "1") {
    let evidence;
    try {
      evidence = parseCodeEvidenceRequest(url);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid code request." },
        { status: 400 },
      );
    }
    const published = demoCodeEvidence(evidence);
    return published
      ? Response.json(published, { headers: { "Cache-Control": "public, max-age=3600" } })
      : Response.json({ error: "This excerpt is not part of the published demo." }, { status: 404 });
  }

  const { session, setCookie } = await getGitHubSession(request);
  if (!session) {
    return withSessionCookie(
      Response.json({ error: "Sign in with GitHub to read this code." }, { status: 401 }),
      setCookie,
    );
  }

  let evidence;
  try {
    evidence = parseCodeEvidenceRequest(url);
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid code request." },
      { status: 400 },
    ), setCookie);
  }

  const response = await fetch(buildGitHubContentsUrl(evidence.repository, evidence.path, evidence.commit), {
    headers: {
      ...githubHeaders(session.accessToken),
      Accept: "application/vnd.github.raw+json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return withSessionCookie(Response.json(
      {
        error: response.status === 404
          ? "This file is unavailable at the reviewed commit with your current GitHub access."
          : "GitHub could not load this code excerpt.",
      },
      { status: response.status === 404 ? 404 : 502 },
    ), setCookie);
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_BYTES) {
    return withSessionCookie(Response.json({ error: "This source file is too large for an inline excerpt." }, { status: 413 }), setCookie);
  }

  const source = await response.text();
  if (new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES) {
    return withSessionCookie(Response.json({ error: "This source file is too large for an inline excerpt." }, { status: 413 }), setCookie);
  }

  try {
    const lines = selectCodeLines(source, evidence);
    const sourceUrl = `https://github.com/${evidence.repository}/blob/${evidence.commit}/${evidence.path}#L${evidence.startLine}-L${evidence.endLine}`;
    return withSessionCookie(Response.json(
      { ...evidence, lines, sourceUrl },
      { headers: { "Cache-Control": "private, max-age=300" } },
    ), setCookie);
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "This code excerpt is unavailable." },
      { status: 416 },
    ), setCookie);
  }
}
