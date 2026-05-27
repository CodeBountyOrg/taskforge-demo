const LOCALE_KEY = "taskforge.locale";
const DEFAULT_LOCALE = "en";

const STRINGS = {
  en: {
    add: "Add",
    deleteTask: "Delete task: {title}",
    emptyState: "No tasks yet. Add one above to get started.",
    githubLink: "github.com/CodeBountyOrg/taskforge-demo",
    language: "Language",
    localStorage: "Tasks are stored on this device.",
    logout: "Logout",
    signIn: "Sign in with GitHub",
    signedInAs: "Signed in as {login}",
    tagline: "A tiny task list that lives in your browser.",
    taskPlaceholder: "What needs doing?",
    title: "TaskForge",
  },
  es: {
    add: "Agregar",
    deleteTask: "Eliminar tarea: {title}",
    emptyState: "Todavia no hay tareas. Agrega una arriba para empezar.",
    githubLink: "github.com/CodeBountyOrg/taskforge-demo",
    language: "Idioma",
    localStorage: "Las tareas se guardan en este dispositivo.",
    logout: "Cerrar sesion",
    signIn: "Iniciar sesion con GitHub",
    signedInAs: "Sesion iniciada como {login}",
    tagline: "Una lista de tareas pequena que vive en tu navegador.",
    taskPlaceholder: "Que hay que hacer?",
    title: "TaskForge",
  },
};

let currentLocale = detectInitialLocale();

export function initI18n(selectElement, onChange) {
  if (selectElement) {
    selectElement.value = currentLocale;
    selectElement.addEventListener("change", () => {
      setLocale(selectElement.value);
      onChange?.();
    });
  }
  applyTranslations();
}

export function setLocale(locale) {
  currentLocale = STRINGS[locale] ? locale : DEFAULT_LOCALE;
  window.localStorage.setItem(LOCALE_KEY, currentLocale);
  applyTranslations();
}

export function t(key, values = {}) {
  const template =
    STRINGS[currentLocale]?.[key] ?? STRINGS[DEFAULT_LOCALE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

function applyTranslations() {
  document.documentElement.lang = currentLocale;

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }

  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  }
}

function detectInitialLocale() {
  const savedLocale = window.localStorage.getItem(LOCALE_KEY);
  if (STRINGS[savedLocale]) return savedLocale;

  const browserLanguage = navigator.language?.toLowerCase() || "";
  return browserLanguage.startsWith("es") ? "es" : DEFAULT_LOCALE;
}
