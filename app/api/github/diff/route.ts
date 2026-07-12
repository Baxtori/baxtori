import { buildGitHubCompareUrl, parseCodeDiffRequest, parseGitHubPatch } from "@/lib/code-diff";
import { getGitHubSession, githubHeaders, withSessionCookie } from "@/lib/github-auth";

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
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) {
    return withSessionCookie(Response.json({ error: "Sign in with GitHub to read this diff." }, { status: 401 }), setCookie);
  }

  let evidence;
  try {
    evidence = parseCodeDiffRequest(new URL(request.url));
  } catch (error) {
    return withSessionCookie(Response.json(
      { error: error instanceof Error ? error.message : "Invalid diff request." },
      { status: 400 },
    ), setCookie);
  }

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
