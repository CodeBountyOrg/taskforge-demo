import { load, save } from "./storage.js";
import { createTask, toggleTask, removeTask } from "./tasks.js";

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const list = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const themeToggle = document.getElementById("theme-toggle");
const themePreference = window.matchMedia("(prefers-color-scheme: dark)");
const THEME_KEY = "taskforge.theme";

let tasks = load();

function getStoredTheme() {
  const theme = window.localStorage.getItem(THEME_KEY);
  return theme === "dark" || theme === "light" ? theme : null;
}

function getActiveTheme() {
  return getStoredTheme() ?? (themePreference.matches ? "dark" : "light");
}

function updateThemeToggle() {
  const activeTheme = getActiveTheme();
  const isDark = activeTheme === "dark";
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-pressed", String(isDark));
}

function setTheme(theme) {
  window.localStorage.setItem(THEME_KEY, theme);
  document.documentElement.dataset.theme = theme;
  updateThemeToggle();
}

function render() {
  list.innerHTML = "";
  if (tasks.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  for (const task of tasks) {
    const li = document.createElement("li");
    li.className = "task-item" + (task.done ? " done" : "");
    li.dataset.id = task.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      tasks = toggleTask(tasks, task.id);
      save(tasks);
      render();
    });

    const label = document.createElement("span");
    label.className = "task-title";
    label.textContent = task.title;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "task-delete";
    del.textContent = "✕";
    del.setAttribute("aria-label", `Delete task: ${task.title}`);
    del.addEventListener("click", () => {
      tasks = removeTask(tasks, task.id);
      save(tasks);
      render();
    });

    li.append(checkbox, label, del);
    list.appendChild(li);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  tasks = [createTask(title), ...tasks];
  save(tasks);
  input.value = "";
  input.focus();
  render();
});

themeToggle.addEventListener("click", () => {
  setTheme(getActiveTheme() === "dark" ? "light" : "dark");
});

themePreference.addEventListener("change", () => {
  if (!getStoredTheme()) {
    updateThemeToggle();
  }
});

updateThemeToggle();
render();
