const THEME_KEY = "taskforge.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const THEMES = new Set(["light", "dark"]);

export function getStoredTheme(storage = window.localStorage) {
  try {
    const value = storage.getItem(THEME_KEY);
    return THEMES.has(value) ? value : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(matchMedia = window.matchMedia) {
  if (typeof matchMedia !== "function") {
    return "light";
  }
  return matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export function resolveTheme({
  storage = window.localStorage,
  matchMedia = window.matchMedia,
} = {}) {
  return getStoredTheme(storage) ?? getSystemTheme(matchMedia);
}

export function applyTheme(theme, root = document.documentElement) {
  const nextTheme = THEMES.has(theme) ? theme : "light";
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;
  return nextTheme;
}

export function saveTheme(theme, storage = window.localStorage) {
  if (!THEMES.has(theme)) return;
  try {
    storage.setItem(THEME_KEY, theme);
  } catch {
    // Theme persistence is progressive enhancement; keep the UI usable.
  }
}

export function getNextTheme(currentTheme) {
  return currentTheme === "dark" ? "light" : "dark";
}

export function initThemeToggle({
  button,
  storage = window.localStorage,
  matchMedia = window.matchMedia,
  root = document.documentElement,
} = {}) {
  let theme = applyTheme(resolveTheme({ storage, matchMedia }), root);

  const renderButton = () => {
    button.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    button.setAttribute("aria-pressed", String(theme === "dark"));
    button.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
    );
  };

  renderButton();

  button.addEventListener("click", () => {
    theme = applyTheme(getNextTheme(theme), root);
    saveTheme(theme, storage);
    renderButton();
  });

  if (!getStoredTheme(storage) && typeof matchMedia === "function") {
    const media = matchMedia(DARK_QUERY);
    media.addEventListener?.("change", (event) => {
      if (getStoredTheme(storage)) return;
      theme = applyTheme(event.matches ? "dark" : "light", root);
      renderButton();
    });
  }
}
