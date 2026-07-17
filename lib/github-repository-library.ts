import { githubHeaders } from "./github-auth.ts";

export const GITHUB_REPOSITORY_PAGE_SIZE = 100;
export const GITHUB_REPOSITORY_MAX_PAGES = 50;

type GitHubRepository = {
  archived: boolean;
  default_branch: string;
  description: string | null;
  fork: boolean;
  full_name: string;
  html_url: string;
  id: number;
  language: string | null;
  name: string;
  open_issues_count: number;
  private: boolean;
  pushed_at: string | null;
  updated_at: string;
};

export type RepositoryLibraryEntry = {
  archived: boolean;
  defaultBranch: string;
  description: string | null;
  fork: boolean;
  fullName: string;
  id: number;
  language: string | null;
  name: string;
  openIssues: number;
  private: boolean;
  pushedAt: string | null;
  updatedAt: string;
  url: string;
};

export class GitHubRepositoryLibraryError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubRepositoryLibraryError";
    this.status = status;
  }
}

export async function fetchGitHubRepositoryLibrary(
  accessToken: string,
  options: {
    fetchImpl?: typeof fetch;
    maxPages?: number;
    pageSize?: number;
  } = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxPages = options.maxPages ?? GITHUB_REPOSITORY_MAX_PAGES;
  const pageSize = options.pageSize ?? GITHUB_REPOSITORY_PAGE_SIZE;
  if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error("maxPages must be a positive integer.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error("pageSize must be between 1 and 100.");

  const byId = new Map<number, GitHubRepository>();
  let truncated = false;
  let pagesFetched = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const endpoint = new URL("https://api.github.com/user/repos");
    endpoint.searchParams.set("affiliation", "owner,collaborator,organization_member");
    endpoint.searchParams.set("direction", "desc");
    endpoint.searchParams.set("page", String(page));
    endpoint.searchParams.set("per_page", String(pageSize));
    endpoint.searchParams.set("sort", "pushed");
    endpoint.searchParams.set("visibility", "all");

    const response = await fetchImpl(endpoint, {
      cache: "no-store",
      headers: githubHeaders(accessToken),
    });
    if (!response.ok) {
      throw new GitHubRepositoryLibraryError(
        response.status === 403
          ? "GitHub access needs attention. Try reconnecting your account."
          : "GitHub repositories could not be loaded.",
        response.status,
      );
    }

    const pageRepositories = await response.json();
    if (!Array.isArray(pageRepositories)) throw new GitHubRepositoryLibraryError("GitHub returned an invalid repository list.", 502);
    pagesFetched += 1;
    for (const repository of pageRepositories as GitHubRepository[]) byId.set(repository.id, repository);

    if (pageRepositories.length < pageSize) break;
    if (page === maxPages) truncated = true;
  }

  const repositories = [...byId.values()]
    .sort((left, right) => {
      const leftTime = left.pushed_at ? Date.parse(left.pushed_at) : 0;
      const rightTime = right.pushed_at ? Date.parse(right.pushed_at) : 0;
      return rightTime - leftTime || left.full_name.localeCompare(right.full_name);
    })
    .map((repository): RepositoryLibraryEntry => ({
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

  return { pagesFetched, repositories, truncated };
}
