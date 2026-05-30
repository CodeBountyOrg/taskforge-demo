import assert from "node:assert/strict";
import test from "node:test";

import { isSafeLink, parseMarkdown } from "../src/markdown.mjs";

test("parseMarkdown recognizes basic inline markdown", () => {
  assert.deepEqual(parseMarkdown("Ship **bold** and *italic* with `code`"), [
    [
      { type: "text", text: "Ship " },
      { type: "strong", text: "bold" },
      { type: "text", text: " and " },
      { type: "em", text: "italic" },
      { type: "text", text: " with " },
      { type: "code", text: "code" },
    ],
  ]);
});

test("parseMarkdown keeps multi-line descriptions", () => {
  assert.deepEqual(parseMarkdown("One\nTwo"), [
    [{ type: "text", text: "One" }],
    [{ type: "text", text: "Two" }],
  ]);
});

test("parseMarkdown accepts safe links and drops unsafe hrefs", () => {
  assert.deepEqual(
    parseMarkdown("[Docs](https://example.com) [Bad](javascript:alert(1))"),
    [
      [
        { type: "link", text: "Docs", url: "https://example.com" },
        { type: "text", text: " " },
        { type: "text", text: "Bad" },
      ],
    ],
  );
});

test("isSafeLink allows web and mail links only", () => {
  assert.equal(isSafeLink("https://example.com"), true);
  assert.equal(isSafeLink("http://example.com"), true);
  assert.equal(isSafeLink("mailto:hello@example.com"), true);
  assert.equal(isSafeLink("javascript:alert(1)"), false);
  assert.equal(isSafeLink("data:text/html,hello"), false);
});
