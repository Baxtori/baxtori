from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if text.count(old) != 1:
        raise SystemExit(f"Expected one match in {path}.")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "lib/repository-activity-snapshot.ts",
    '''  const retryAfter = Number(response.headers.get("retry-after"));
  const resetSeconds = Number(response.headers.get("x-ratelimit-reset"));''',
    '''  const retryAfterValue = response.headers.get("retry-after");
  const retryAfter = retryAfterValue === null ? Number.NaN : Number(retryAfterValue);
  const resetValue = response.headers.get("x-ratelimit-reset");
  const resetSeconds = resetValue === null ? Number.NaN : Number(resetValue);''',
)

replace_once(
    "tests/repository-activity-snapshot.test.mjs",
    '''test("an inaccessible repository does not stop later repositories", async () => {''',
    '''test("rate limiting without timing headers waits at least one minute", async () => {
  const result = await collectRepositoryActivitySnapshot({
    accessToken: "token",
    fetchImpl: async () => new Response("", { status: 403 }),
    now: Date.parse("2026-07-17T09:00:00Z"),
    repositories: [repository("teamleaderleo/a")],
    repositoryModes: {},
    since: "2026-07-10T00:00:00Z",
  });

  assert.equal(result.rateLimit?.retryAt, "2026-07-17T09:01:00.000Z");
});

test("an inaccessible repository does not stop later repositories", async () => {''',
)
