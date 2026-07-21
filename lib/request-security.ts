const DEFAULT_PRODUCTION_ORIGIN = "https://www.baxtori.com";

function normalizedConfiguredOrigin() {
  const configured = process.env.BAXTORI_APP_ORIGIN?.trim();
  if (!configured) return null;

  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Returns the public application origin used for redirects and CSRF checks.
 * Production never trusts a request-controlled Host header when the origin is
 * omitted; local and test requests retain their own origin for development.
 */
export function appOrigin(request: Request) {
  const configured = normalizedConfiguredOrigin();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return DEFAULT_PRODUCTION_ORIGIN;
  return new URL(request.url).origin;
}

export function appUrl(request: Request, pathname = "/") {
  return new URL(pathname, `${appOrigin(request)}/`);
}

function isJsonContentType(value: string | null) {
  if (!value) return false;
  const mediaType = value.split(";", 1)[0].trim().toLowerCase();
  return mediaType === "application/json" || mediaType.endsWith("+json");
}

function originIsAllowed(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === appOrigin(request);
  } catch {
    return false;
  }
}

export type MutationGuardOptions = {
  requireJson?: boolean;
};

/**
 * Applies the browser-facing mutation boundary shared by account write routes.
 * Non-browser clients may omit Origin, while browsers with a cross-site Origin
 * or Sec-Fetch-Site value are rejected. JSON routes also require a JSON media
 * type before parsing their body.
 */
export function guardMutationRequest(request: Request, options: MutationGuardOptions = {}) {
  if (!originIsAllowed(request)) {
    return Response.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  }
  if (options.requireJson && !isJsonContentType(request.headers.get("content-type"))) {
    return Response.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }
  return null;
}
