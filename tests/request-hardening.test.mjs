import assert from "node:assert/strict";
import test from "node:test";
import { parseCookies } from "../lib/github-auth.ts";
import { isValidRepositoryName } from "../lib/repository-identity.ts";
import { parseCodeEvidenceRequest } from "../lib/code-evidence.ts";
import { parseCodeDiffRequest } from "../lib/code-diff.ts";

function requestWithCookie(cookie) {
  return new Request("https://baxtori.test/", { headers: { cookie } });
}

test("a malformed percent-sequence in a cookie does not throw", () => {
  const cookies = parseCookies(requestWithCookie("broken=%E0%A4%A; baxtori_github_state=ok"));
  assert.equal(cookies.get("broken"), "%E0%A4%A");
  assert.equal(cookies.get("baxtori_github_state"), "ok");
});

test("well-formed cookie values are still decoded", () => {
  const cookies = parseCookies(requestWithCookie("name=hello%20world"));
  assert.equal(cookies.get("name"), "hello world");
});

test("repository names cannot contain traversal segments", () => {
  assert.equal(isValidRepositoryName("teamleaderleo/baxtori"), true);
  assert.equal(isValidRepositoryName("team.leader/repo.name"), true);
  assert.equal(isValidRepositoryName("../.."), false);
  assert.equal(isValidRepositoryName("owner/.."), false);
  assert.equal(isValidRepositoryName("./repo"), false);
  assert.equal(isValidRepositoryName("owner"), false);
  assert.equal(isValidRepositoryName("owner/repo/extra"), false);
});

test("code evidence requests reject traversal repository names", () => {
  const url = new URL("https://baxtori.test/api/github/code?repo=..%2F..&commit=abcdef1&path=a.ts&start=1&end=2");
  assert.throws(() => parseCodeEvidenceRequest(url), /Invalid repository name/);
});

test("diff requests reject traversal repository names", () => {
  const url = new URL("https://baxtori.test/api/github/diff?repo=owner%2F..&base=abcdef1&head=abcdef2&path=a.ts&start=1&end=2");
  assert.throws(() => parseCodeDiffRequest(url), /Invalid repository name/);
});
