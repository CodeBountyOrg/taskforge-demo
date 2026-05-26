import test from "node:test";
import assert from "node:assert/strict";

import {
  applyTheme,
  getNextTheme,
  getStoredTheme,
  initThemeToggle,
  resolveTheme,
  saveTheme,
} from "../src/theme.js";

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

function matchMedia(matches) {
  return () => ({
    matches,
    addEventListener() {},
  });
}

function button() {
  let click;
  return {
    attributes: {},
    textContent: "",
    addEventListener(event, handler) {
      if (event === "click") click = handler;
    },
    click() {
      click();
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

test("resolveTheme uses a saved user preference before system preference", () => {
  assert.equal(
    resolveTheme({
      storage: storage({ "taskforge.theme": "light" }),
      matchMedia: matchMedia(true),
    }),
    "light",
  );
});

test("resolveTheme falls back to the system preference on first load", () => {
  assert.equal(
    resolveTheme({ storage: storage(), matchMedia: matchMedia(true) }),
    "dark",
  );
  assert.equal(
    resolveTheme({ storage: storage(), matchMedia: matchMedia(false) }),
    "light",
  );
});

test("getStoredTheme ignores invalid stored values", () => {
  assert.equal(getStoredTheme(storage({ "taskforge.theme": "sepia" })), null);
});

test("saveTheme persists only supported themes", () => {
  const target = storage();
  saveTheme("dark", target);
  saveTheme("sepia", target);
  assert.equal(target.getItem("taskforge.theme"), "dark");
});

test("applyTheme updates the document theme and color scheme", () => {
  const root = { dataset: {}, style: {} };
  assert.equal(applyTheme("dark", root), "dark");
  assert.deepEqual(root, {
    dataset: { theme: "dark" },
    style: { colorScheme: "dark" },
  });
});

test("getNextTheme toggles between light and dark", () => {
  assert.equal(getNextTheme("dark"), "light");
  assert.equal(getNextTheme("light"), "dark");
});

test("initThemeToggle renders, toggles, and persists the user choice", () => {
  const root = { dataset: {}, style: {} };
  const target = storage();
  const toggle = button();

  initThemeToggle({
    button: toggle,
    storage: target,
    matchMedia: matchMedia(true),
    root,
  });

  assert.equal(root.dataset.theme, "dark");
  assert.equal(toggle.textContent, "Light mode");
  assert.equal(toggle.attributes["aria-pressed"], "true");

  toggle.click();

  assert.equal(root.dataset.theme, "light");
  assert.equal(root.style.colorScheme, "light");
  assert.equal(target.getItem("taskforge.theme"), "light");
  assert.equal(toggle.textContent, "Dark mode");
  assert.equal(toggle.attributes["aria-pressed"], "false");
});
