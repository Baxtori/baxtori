import { getGitHubSession, githubHeaders, withSessionCookie } from "@/lib/github-auth";
import { resolveActivityWindow } from "@/lib/github-activity";
import { guardRateLimit } from "@/lib/rate-limit";
import { isValidRepositoryName } from "@/lib/repository-identity";

type GitHubCommit = {
  sha: string;
  html_url: string;
  author: { login: string } | null;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
};

const ACTIVITY_LIMIT = { limit: 60, windowMs: 60_000 };

export async function GET(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) {
    return withSessionCookie(
      Response.json({ error: "Sign in with GitHub to load activity." }, { status: 401 }),
      setCookie,
    );
  }
  const rateLimitError = guardRateLimit("github:activity", String(session.user.id), ACTIVITY_LIMIT);
  if (rateLimitError) return withSessionCookie(rateLimitError, setCookie);

  const requestUrl = new URL(request.url);
  const repository = requestUrl.searchParams.get("repo")?.trim() ?? "";
  const requestedDays = Number(requestUrl.searchParams.get("days") ?? "14");
  const requestedSince = requestUrl.searchParams.get("since")?.trim() ?? "";

  if (!isValidRepositoryName(repository)) {
    return withSessionCookie(Response.json({ error: "Invalid repository name." }, { status: 400 }), setCookie);
  }

  const { days, since, window } = resolveActivityWindow({ requestedDays, requestedSince });
  const endpoint = new URL(`https://api.github.com/repos/${repository}/commits`);
  endpoint.searchParams.set("since", since);
  endpoint.searchParams.set("per_page", "40");

  const response = await fetch(endpoint, {
    headers: githubHeaders(session.accessToken),
    cache: "no-store",
  });

  if (response.status === 409) {
    return withSessionCookie(Response.json({ commits: [], days, repository, since, truncated: false, window }), setCookie);
  }

  if (!response.ok) {
    return withSessionCookie(Response.json(
      {
        commits: [],
        days,
        error: response.status === 404
          ? "Repository activity is unavailable with the current GitHub scope."
          : "Recent commits could not be loaded.",
        repository,
        since,
        truncated: false,
        window,
      },
      { status: response.status === 404 ? 404 : 502 },
    ), setCookie);
  }

  const rawCommits = (await response.json()) as GitHubCommit[];
  const commits = rawCommits.map((item) => ({
    author: item.author?.login ?? item.commit.author?.name ?? "Unknown author",
    date: item.commit.author?.date ?? null,
    message: item.commit.message.split("\n")[0],
    sha: item.sha.slice(0, 7),
    url: item.html_url,
  }));

  return withSessionCookie(Response.json(
    { commits, days, repository, since, truncated: rawCommits.length === 40, window },
    { headers: { "Cache-Control": "private, max-age=60" } },
  ), setCookie);
}
