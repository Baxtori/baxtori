import { getGitHubSession, githubHeaders, withSessionCookie } from "@/lib/github-auth";

type GitHubCommit = {
  sha: string;
  html_url: string;
  author: { login: string } | null;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
};

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export async function GET(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) {
    return withSessionCookie(
      Response.json({ error: "Sign in with GitHub to load activity." }, { status: 401 }),
      setCookie,
    );
  }
  const requestUrl = new URL(request.url);
  const repository = requestUrl.searchParams.get("repo")?.trim() ?? "";
  const requestedDays = Number(requestUrl.searchParams.get("days") ?? "14");
  const days = Number.isFinite(requestedDays)
    ? Math.min(Math.max(Math.round(requestedDays), 1), 90)
    : 14;

  if (!REPOSITORY_PATTERN.test(repository)) {
    return Response.json({ error: "Invalid repository name." }, { status: 400 });
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const endpoint = new URL(`https://api.github.com/repos/${repository}/commits`);
  endpoint.searchParams.set("since", since);
  endpoint.searchParams.set("per_page", "40");

  const response = await fetch(endpoint, {
    headers: githubHeaders(session.accessToken),
    cache: "no-store",
  });

  if (response.status === 409) {
    return withSessionCookie(Response.json({ commits: [], days, repository, since }), setCookie);
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
    { commits, days, repository, since },
    { headers: { "Cache-Control": "private, max-age=60" } },
  ), setCookie);
}
