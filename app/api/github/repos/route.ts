import { feedbackIsConfigured, saveAuthorizedRepositoryInventory } from "@/lib/feedback-store";
import { getGitHubSession, withSessionCookie } from "@/lib/github-auth";
import { fetchGitHubRepositoryLibrary, GitHubRepositoryLibraryError } from "@/lib/github-repository-library";
import { guardRateLimit } from "@/lib/rate-limit";

const REPOSITORY_LIBRARY_LIMIT = { limit: 30, windowMs: 60_000 };

export async function GET(request: Request) {
  const { session, setCookie } = await getGitHubSession(request);
  if (!session) {
    return withSessionCookie(
      Response.json({ error: "Sign in with GitHub to load repositories." }, { status: 401 }),
      setCookie,
    );
  }
  const rateLimitError = guardRateLimit("github:repositories", String(session.user.id), REPOSITORY_LIBRARY_LIMIT);
  if (rateLimitError) return withSessionCookie(rateLimitError, setCookie);

  try {
    const library = await fetchGitHubRepositoryLibrary(session.accessToken);
    let inventorySaved = false;
    if (feedbackIsConfigured()) {
      try {
        await saveAuthorizedRepositoryInventory(String(session.user.id), session.user.login, library.repositories, library.truncated);
        inventorySaved = true;
      } catch {
        // Repository browsing remains available when account-backed inventory sync needs attention.
      }
    }
    return withSessionCookie(Response.json(
      { ...library, inventorySaved },
      {
        headers: { "Cache-Control": "private, max-age=60" },
      },
    ), setCookie);
  } catch (error) {
    const status = error instanceof GitHubRepositoryLibraryError ? error.status : 502;
    return withSessionCookie(Response.json(
      {
        error: error instanceof Error ? error.message : "GitHub repositories could not be loaded.",
        inventorySaved: false,
        repositories: [],
        truncated: false,
      },
      { status: status === 403 ? 429 : 502 },
    ), setCookie);
  }
}
