const THEME_KEY = "taskforge.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function initTheme(toggleButton) {
  const mediaQuery = window.matchMedia?.(DARK_QUERY);

  applyTheme(getPreferredTheme(mediaQuery), toggleButton);

  toggleButton?.addEventListener("click", () => {
    const nextTheme = currentTheme() === "dark" ? "light" : "dark";
    window.localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme, toggleButton);
  });

  mediaQuery?.addEventListener("change", (event) => {
    if (window.localStorage.getItem(THEME_KEY)) return;
    applyTheme(event.matches ? "dark" : "light", toggleButton);
  });
}

function getPreferredTheme(mediaQuery) {
  const storedTheme = window.localStorage.getItem(THEME_KEY);
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  return mediaQuery?.matches ? "dark" : "light";
}

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme, toggleButton) {
  document.documentElement.dataset.theme = theme;
  if (!toggleButton) return;

  const nextTheme = theme === "dark" ? "light" : "dark";
  toggleButton.textContent = nextTheme === "dark" ? "Dark" : "Light";
  toggleButton.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
}
