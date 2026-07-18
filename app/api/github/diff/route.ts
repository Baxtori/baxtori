import { buildGitHubCompareUrl, parseCodeDiffRequest, parseGitHubPatch } from "@/lib/code-diff";
import { getGitHubSession, githubHeaders, withSessionCookie } from "@/lib/github-auth";
import { demoDiffEvidence } from "@/lib/demo-evidence";

type GitHubCompareFile = {
  additions: number;
  deletions: number;
  filename: string;
  patch?: string;
};

type GitHubCompareResponse = {
  files?: GitHubCompareFile[];
  html_url?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isDemo = url.searchParams.get("demo") === "1";
  const auth = isDemo ? null : await getGitHubSession(request);
  if (auth && !auth.session) {
    return withSessionCookie(Response.json({ error: "Sign in with GitHub to read this diff." }, { status: 401 }), auth.setCookie);
  }

  let evidence;
  try {
    evidence = parseCodeDiffRequest(url);
  } catch (error) {
    const response = Response.json(
      { error: error instanceof Error ? error.message : "Invalid diff request." },
      { status: 400 },
    );
    return auth ? withSessionCookie(response, auth.setCookie) : response;
  }

  if (isDemo) {
    const published = demoDiffEvidence(evidence);
    return published
      ? Response.json(published, { headers: { "Cache-Control": "public, max-age=3600" } })
      : Response.json({ error: "This comparison is not part of the published demo." }, { status: 404 });
  }

  const { session, setCookie } = auth!;
  if (!session) throw new Error("Authenticated diff evidence lost its session.");

  const response = await fetch(buildGitHubCompareUrl(evidence.repository, evidence.base, evidence.head), {
    headers: githubHeaders(session.accessToken),
    cache: "no-store",
  });
  if (!response.ok) {
    return withSessionCookie(Response.json(
      { error: response.status === 404 ? "This comparison is unavailable with your current GitHub access." : "GitHub could not load this comparison." },
      { status: response.status === 404 ? 404 : 502 },
    ), setCookie);
  }

  const comparison = (await response.json()) as GitHubCompareResponse;
  const file = comparison.files?.find((candidate) => candidate.filename === evidence.path);
  if (!file?.patch) {
    return withSessionCookie(Response.json({ error: "GitHub did not provide an inline diff for this file." }, { status: 422 }), setCookie);
  }

  try {
    const lines = parseGitHubPatch(file.patch, evidence);
    return withSessionCookie(Response.json(
      {
        ...evidence,
        additions: file.additions,
        deletions: file.deletions,
        lines,
        sourceUrl: comparison.html_url ?? `https://github.com/${evidence.repository}/compare/${evidence.base}...${evidence.head}`,
      },
      { headers: { "Cache-Control": "private, max-age=300" } },
    ), setCookie);
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "This diff excerpt is unavailable." },
      { status: 422 },
    ), setCookie);
  }
}
