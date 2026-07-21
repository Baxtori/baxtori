type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitEntry>();
const MAX_BUCKETS = 10_000;

function cleanExpiredBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Provides process-local burst protection for authenticated routes. Deployment
 * providers may run several isolated processes, so GitHub and the backing data
 * service remain the authoritative distributed limits.
 */
export function consumeRateLimit(scope: string, subject: string, policy: RateLimitPolicy, now = Date.now()): RateLimitResult {
  if (!scope || !subject) throw new Error("Rate-limit scope and subject are required.");
  if (!Number.isInteger(policy.limit) || policy.limit < 1 || !Number.isFinite(policy.windowMs) || policy.windowMs < 1) {
    throw new Error("Rate-limit policy is invalid.");
  }

  cleanExpiredBuckets(now);
  const bucketKey = `${scope}:${subject}`;
  const current = buckets.get(bucketKey);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + policy.windowMs }
    : current;
  entry.count += 1;
  buckets.set(bucketKey, entry);

  const allowed = entry.count <= policy.limit;
  return {
    allowed,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - entry.count),
    resetAt: entry.resetAt,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  const headers = new Headers({
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  });
  if (!result.allowed) headers.set("Retry-After", String(result.retryAfterSeconds));
  return headers;
}

export function rateLimitError(result: RateLimitResult) {
  return Response.json(
    { error: "Too many requests. Try again shortly." },
    { headers: rateLimitHeaders(result), status: 429 },
  );
}

export function guardRateLimit(scope: string, subject: string, policy: RateLimitPolicy) {
  const result = consumeRateLimit(scope, subject, policy);
  return result.allowed ? null : rateLimitError(result);
}
