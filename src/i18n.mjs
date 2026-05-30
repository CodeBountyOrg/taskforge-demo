const STORAGE_KEY = "taskforge.locale";

const messages = {
  en: {
    addButton: "Add",
    authLocal: "Tasks are stored on this device.",
    deleteTaskAria: "Delete task: {title}",
    documentTitle: "TaskForge - open-source task tracker",
    emptyState: "No tasks yet. Add one above to get started.",
    languageLabel: "Language",
    logout: "Logout",
    newTaskAria: "Add a new task",
    signedInAs: "Signed in as {login}",
    signIn: "Sign in with GitHub",
    tagline: "A tiny task list that lives in your browser.",
    taskPlaceholder: "What needs doing?",
  },
  es: {
    addButton: "Agregar",
    authLocal: "Las tareas se guardan en este dispositivo.",
    deleteTaskAria: "Eliminar tarea: {title}",
    documentTitle: "TaskForge - gestor de tareas open source",
    emptyState: "Todavia no hay tareas. Agrega una arriba para empezar.",
    languageLabel: "Idioma",
    logout: "Cerrar sesion",
    newTaskAria: "Agregar una nueva tarea",
    signedInAs: "Sesion iniciada como {login}",
    signIn: "Iniciar sesion con GitHub",
    tagline: "Una lista de tareas pequena que vive en tu navegador.",
    taskPlaceholder: "Que hay que hacer?",
  },
};

export const SUPPORTED_LOCALES = Object.freeze(Object.keys(messages));

export function getInitialLocale({
  navigatorLanguage = globalThis.navigator?.language,
  storage = globalThis.localStorage,
} = {}) {
  const saved = readSavedLocale(storage);
  if (saved) return saved;
  return normalizeLocale(navigatorLanguage);
}

export function normalizeLocale(locale) {
  const normalized = String(locale || "")
    .trim()
    .toLowerCase();
  if (normalized.startsWith("es")) return "es";
  return "en";
}

export function readSavedLocale(storage = globalThis.localStorage) {
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    return SUPPORTED_LOCALES.includes(saved) ? saved : "";
  } catch {
    return "";
  }
}

export function saveLocale(locale, storage = globalThis.localStorage) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  try {
    storage?.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore storage failures so language switching remains non-blocking.
  }
}

export function translate(locale, key, values = {}) {
  const template = messages[locale]?.[key] || messages.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}
