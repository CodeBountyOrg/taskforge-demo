const KEY = "taskforge.tasks.v1";

export function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function save(tasks) {
  window.localStorage.setItem(KEY, JSON.stringify(tasks));
}
