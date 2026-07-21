import assert from "node:assert/strict";
import test from "node:test";
import { appOrigin, appUrl, guardMutationRequest } from "../lib/request-security.ts";

const originalAppOrigin = process.env.BAXTORI_APP_ORIGIN;
const originalNodeEnv = process.env.NODE_ENV;

test.afterEach(() => {
  if (originalAppOrigin === undefined) delete process.env.BAXTORI_APP_ORIGIN;
  else process.env.BAXTORI_APP_ORIGIN = originalAppOrigin;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

test("uses the configured public origin for redirects", () => {
  process.env.BAXTORI_APP_ORIGIN = "https://baxtori.example/path";
  const request = new Request("https://attacker.example/api/auth/github/callback");

  assert.equal(appOrigin(request), "https://baxtori.example");
  assert.equal(appUrl(request, "/?github=connected").toString(), "https://baxtori.example/?github=connected");
});

test("does not trust a production request host when no origin is configured", () => {
  delete process.env.BAXTORI_APP_ORIGIN;
  process.env.NODE_ENV = "production";

  assert.equal(
    appOrigin(new Request("https://attacker.example/api/auth/github/callback")),
    "https://www.baxtori.com",
  );
});

test("allows a same-origin JSON mutation", () => {
  process.env.BAXTORI_APP_ORIGIN = "https://www.baxtori.com";
  const request = new Request("https://www.baxtori.com/api/feedback/state", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Origin: "https://www.baxtori.com",
      "Sec-Fetch-Site": "same-origin",
    },
    body: "{}",
  });

  assert.equal(guardMutationRequest(request, { requireJson: true }), null);
});

test("rejects a cross-site mutation", async () => {
  process.env.BAXTORI_APP_ORIGIN = "https://www.baxtori.com";
  const request = new Request("https://www.baxtori.com/api/feedback/state", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://attacker.example",
      "Sec-Fetch-Site": "cross-site",
    },
    body: "{}",
  });

  const response = guardMutationRequest(request, { requireJson: true });
  assert.equal(response?.status, 403);
  assert.deepEqual(await response?.json(), { error: "Cross-site requests are not allowed." });
});

test("rejects a non-JSON body before parsing", async () => {
  process.env.BAXTORI_APP_ORIGIN = "https://www.baxtori.com";
  const request = new Request("https://www.baxtori.com/api/feedback/state", {
    method: "PUT",
    headers: { Origin: "https://www.baxtori.com", "Content-Type": "text/plain" },
    body: "{}",
  });

  const response = guardMutationRequest(request, { requireJson: true });
  assert.equal(response?.status, 415);
  assert.deepEqual(await response?.json(), { error: "Content-Type must be application/json." });
});
