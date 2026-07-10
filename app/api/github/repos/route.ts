import { getGitHubSession, githubHeaders, withSessionCookie } from "@/lib/github-auth";

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  language: string | null;
  default_branch: string;
  pushed_at: string | null;
  updated_at: string;
  html_url: string;
  open_issues_count: number;
  owner: { login: string };
};

export async function GET(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) {
    return withSessionCookie(
      Response.json({ error: "Sign in with GitHub to load repositories." }, { status: 401 }),
      setCookie,
    );
  }

  const endpoint = new URL("https://api.github.com/user/repos");

  endpoint.searchParams.set("per_page", "100");
  endpoint.searchParams.set("sort", "pushed");
  endpoint.searchParams.set("direction", "desc");
  endpoint.searchParams.set("affiliation", "owner,collaborator,organization_member");
  endpoint.searchParams.set("visibility", "all");

  const response = await fetch(endpoint, {
    headers: githubHeaders(session.accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    return withSessionCookie(Response.json(
      {
        error: response.status === 403
          ? "GitHub access needs attention. Try reconnecting your account."
          : "GitHub repositories could not be loaded.",
        repositories: [],
      },
      { status: response.status === 403 ? 429 : 502 },
    ), setCookie);
  }

  const rawRepositories = (await response.json()) as GitHubRepository[];
  const repositories = rawRepositories
    .sort((a, b) => {
      const aTime = a.pushed_at ? Date.parse(a.pushed_at) : 0;
      const bTime = b.pushed_at ? Date.parse(b.pushed_at) : 0;
      return bTime - aTime;
    })
    .map((repository) => ({
      archived: repository.archived,
      defaultBranch: repository.default_branch,
      description: repository.description,
      fork: repository.fork,
      fullName: repository.full_name,
      id: repository.id,
      language: repository.language,
      name: repository.name,
      openIssues: repository.open_issues_count,
      private: repository.private,
      pushedAt: repository.pushed_at,
      updatedAt: repository.updated_at,
      url: repository.html_url,
    }));

  return withSessionCookie(Response.json(
    {
      repositories,
    },
    {
      headers: { "Cache-Control": "private, max-age=60" },
    },
  ), setCookie);
}
