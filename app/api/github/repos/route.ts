import { getGitHubSession, withSessionCookie } from "@/lib/github-auth";
import { fetchGitHubRepositoryLibrary, GitHubRepositoryLibraryError } from "@/lib/github-repository-library";

export async function GET(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) {
    return withSessionCookie(
      Response.json({ error: "Sign in with GitHub to load repositories." }, { status: 401 }),
      setCookie,
    );
  }

  try {
    const library = await fetchGitHubRepositoryLibrary(session.accessToken);
    return withSessionCookie(Response.json(
      library,
      {
        headers: { "Cache-Control": "private, max-age=60" },
      },
    ), setCookie);
  } catch (error) {
    const status = error instanceof GitHubRepositoryLibraryError ? error.status : 502;
    return withSessionCookie(Response.json(
      {
        error: error instanceof Error ? error.message : "GitHub repositories could not be loaded.",
        repositories: [],
        truncated: false,
      },
      { status: status === 403 ? 429 : 502 },
    ), setCookie);
  }
}
