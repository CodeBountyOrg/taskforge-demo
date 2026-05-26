const STORAGE_KEY = "taskforge.lang.v1";

const strings = {
  en: {
    pageTitle: "TaskForge — open-source task tracker",
    heading: "TaskForge",
    tagline: "A tiny task list that lives in your browser.",
    placeholder: "What needs doing?",
    addButton: "Add",
    emptyState: "No tasks yet. Add one above to get started.",
    deleteLabel: (title) => `Delete task: ${title}`,
    langLabel: "Language",
  },
  es: {
    pageTitle: "TaskForge — gestor de tareas de código abierto",
    heading: "TaskForge",
    tagline: "Una pequeña lista de tareas que vive en tu navegador.",
    placeholder: "¿Qué hay que hacer?",
    addButton: "Añadir",
    emptyState: "No hay tareas aún. Añade una arriba para empezar.",
    deleteLabel: (title) => `Eliminar tarea: ${title}`,
    langLabel: "Idioma",
  },
};

const supported = Object.keys(strings);

function detectLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && supported.includes(stored)) return stored;
  const nav = navigator.language.slice(0, 2);
  return supported.includes(nav) ? nav : "en";
}

let currentLang = detectLang();

export function t(key) {
  const dict = strings[currentLang];
  return dict[key] ?? strings.en[key] ?? key;
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!supported.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  translatePage();
}

export function translatePage() {
  document.documentElement.lang = currentLang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const val = strings[currentLang]?.[key];
    if (val === undefined || val === null) return;
    if (typeof val === "function") return;
    el.textContent = val;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const val = strings[currentLang]?.[key];
    if (typeof val === "string") el.placeholder = val;
  });

  document.title = strings[currentLang]?.pageTitle ?? "TaskForge";

  document.querySelectorAll("[data-i18n-lang-switch]").forEach((el) => {
    el.value = currentLang;
  });
}
