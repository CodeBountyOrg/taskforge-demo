const KEY = "taskforge.tasks.v1";

export function loadLocal() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocal(tasks) {
  window.localStorage.setItem(KEY, JSON.stringify(tasks));
}

export async function load(user) {
  if (!user) return loadLocal();
  try {
    const response = await fetch("/api/tasks", {
      credentials: "same-origin",
    });
    if (!response.ok) return loadLocal();
    const payload = await response.json();
    return Array.isArray(payload.tasks) ? payload.tasks : [];
  } catch {
    return loadLocal();
  }
}

export async function save(tasks, user) {
  saveLocal(tasks);
  if (!user) return;
  try {
    await fetch("/api/tasks", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tasks }),
    });
  } catch {
    // Keep local task changes usable if the sync endpoint is temporarily down.
  }
}
