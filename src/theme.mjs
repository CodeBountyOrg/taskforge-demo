export const THEME_KEY = "taskforge.theme";

const THEMES = new Set(["light", "dark"]);

export function normalizeTheme(value) {
  return THEMES.has(value) ? value : "";
}

export function resolveInitialTheme({ storedTheme, prefersDark = false } = {}) {
  return normalizeTheme(storedTheme) || (prefersDark ? "dark" : "light");
}

export function nextTheme(currentTheme) {
  return normalizeTheme(currentTheme) === "dark" ? "light" : "dark";
}

export function applyTheme(theme, root = document.documentElement) {
  const normalized = normalizeTheme(theme) || "light";
  root.dataset.theme = normalized;
  root.style.colorScheme = normalized;
  return normalized;
}

export function initThemeToggle({
  button = document.getElementById("theme-toggle"),
  root = document.documentElement,
  storage = window.localStorage,
  media = window.matchMedia("(prefers-color-scheme: dark)"),
} = {}) {
  let theme = applyTheme(
    resolveInitialTheme({
      storedTheme: storage.getItem(THEME_KEY),
      prefersDark: media.matches,
    }),
    root,
  );

  syncButton(button, theme);

  button.addEventListener("click", () => {
    theme = applyTheme(nextTheme(theme), root);
    storage.setItem(THEME_KEY, theme);
    syncButton(button, theme);
  });
}

function syncButton(button, theme) {
  const isDark = theme === "dark";
  button.setAttribute("aria-pressed", String(isDark));
  button.textContent = isDark ? "Light theme" : "Dark theme";
}
