import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the reader presents Now, System, and Memory as its three primary jobs", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const primaryStart = page.indexOf('<nav className="primary-nav"');
  const primaryEnd = page.indexOf("</nav>", primaryStart);
  const primary = page.slice(primaryStart, primaryEnd);

  assert.ok(primaryStart > -1);
  assert.match(primary, /<span>Now<\/span>/);
  assert.match(primary, /<span>System<\/span>/);
  assert.match(primary, /<span>Memory<\/span>/);
  assert.doesNotMatch(primary, /Timeline|Repositories|Edition record|Review sources/);
});

test("edition mechanics remain available as supporting tools", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const secondaryStart = page.indexOf('<nav className="secondary-nav"');
  const secondaryEnd = page.indexOf("</nav>", secondaryStart);
  const secondary = page.slice(secondaryStart, secondaryEnd);

  assert.ok(secondaryStart > -1);
  assert.match(secondary, /Edition record/);
  assert.match(secondary, /Review sources/);
  assert.equal(page.match(/<EditionSelectionLedger edition=\{EDITION\} \/>/g)?.length, 1);
});

test("the product contract preserves progressive evidence density", async () => {
  const contract = await readFile(new URL("../docs/NORTH_STAR.md", import.meta.url), "utf8");

  assert.match(contract, /Low-density orientation, high-density inspection, zero density when nothing/);
  assert.match(contract, /30 seconds/);
  assert.match(contract, /10 minutes/);
  assert.match(contract, /Published editions remain immutable/);
  assert.match(contract, /time to trustworthy understanding/i);
});
