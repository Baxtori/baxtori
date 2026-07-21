import { headers } from "next/headers";
import { githubIsConfigured, readGitHubSession } from "@/lib/github-auth";
import BaxtoriApp, { type AuthStatus } from "./baxtori-app";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const request = new Request(`${protocol}://${host}`, { headers: new Headers(requestHeaders) });
  const session = await readGitHubSession(request);
  const initialAuth: AuthStatus = {
    appSlug: process.env.GITHUB_APP_SLUG?.trim() ?? null,
    authenticated: Boolean(session),
    configured: githubIsConfigured(),
    user: session?.user ?? null,
  };
  const query = await searchParams;

  return <BaxtoriApp initialAuth={initialAuth} initialDemoMode={query.demo === "1" || !initialAuth.authenticated} />;
}
