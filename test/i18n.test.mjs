import assert from "node:assert/strict";
import test from "node:test";

import {
  getInitialLocale,
  normalizeLocale,
  saveLocale,
  translate,
} from "../src/i18n.mjs";

test("normalizes supported browser languages", () => {
  assert.equal(normalizeLocale("es-MX"), "es");
  assert.equal(normalizeLocale("ES"), "es");
  assert.equal(normalizeLocale("fr-FR"), "en");
  assert.equal(normalizeLocale(""), "en");
});

test("saved locale overrides browser detection", () => {
  const storage = memoryStorage({ "taskforge.locale": "es" });
  assert.equal(getInitialLocale({ navigatorLanguage: "en-US", storage }), "es");
});

test("invalid saved locale falls back to navigator language", () => {
  const storage = memoryStorage({ "taskforge.locale": "fr" });
  assert.equal(getInitialLocale({ navigatorLanguage: "es-ES", storage }), "es");
});

test("translation interpolates dynamic values", () => {
  assert.equal(
    translate("es", "signedInAs", { login: "octo" }),
    "Sesion iniciada como octo",
  );
  assert.equal(
    translate("en", "deleteTaskAria", { title: "Ship" }),
    "Delete task: Ship",
  );
});

test("saveLocale ignores unsupported locales", () => {
  const storage = memoryStorage();
  saveLocale("fr", storage);
  assert.equal(storage.getItem("taskforge.locale"), null);
  saveLocale("es", storage);
  assert.equal(storage.getItem("taskforge.locale"), "es");
});

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}
