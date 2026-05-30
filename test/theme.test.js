const assert = require("node:assert/strict");
const test = require("node:test");

test("theme helpers resolve persisted and system preferences", async () => {
  const { nextTheme, normalizeTheme, resolveInitialTheme } = await import(
    "../src/theme.mjs"
  );

  assert.equal(normalizeTheme("dark"), "dark");
  assert.equal(normalizeTheme("sepia"), "");
  assert.equal(
    resolveInitialTheme({ storedTheme: "light", prefersDark: true }),
    "light",
  );
  assert.equal(resolveInitialTheme({ storedTheme: "", prefersDark: true }), "dark");
  assert.equal(resolveInitialTheme({ prefersDark: false }), "light");
  assert.equal(nextTheme("dark"), "light");
  assert.equal(nextTheme("light"), "dark");
});

test("applyTheme writes the root theme and color scheme", async () => {
  const { applyTheme } = await import("../src/theme.mjs");
  const root = {
    dataset: {},
    style: {},
  };

  assert.equal(applyTheme("dark", root), "dark");
  assert.equal(root.dataset.theme, "dark");
  assert.equal(root.style.colorScheme, "dark");

  assert.equal(applyTheme("invalid", root), "light");
  assert.equal(root.dataset.theme, "light");
  assert.equal(root.style.colorScheme, "light");
});
