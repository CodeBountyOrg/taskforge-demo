import {
  completeGitHubSignIn,
  getSession,
  logout,
  startGitHubSignIn,
} from "./auth.js";
import { getInitialLocale, saveLocale, translate } from "./i18n.mjs";
import { load, loadLocal, save } from "./storage.js";
import { createTask, toggleTask, removeTask } from "./tasks.js";

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const list = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const authStatus = document.getElementById("auth-status");
const authAction = document.getElementById("auth-action");
const authAvatar = document.getElementById("auth-avatar");
const authMessage = document.getElementById("auth-message");
const localeSelect = document.getElementById("locale-select");

let tasks = [];
let user = null;
let locale = getInitialLocale();

async function init() {
  localeSelect.value = locale;
  applyTranslations();
  const localTasks = loadLocal();
  let completedSignIn = false;
  try {
    user = await completeGitHubSignIn();
    completedSignIn = Boolean(user);
  } catch (error) {
    setAuthMessage(error.message);
  }
  if (!user) {
    try {
      ({ user } = await getSession());
    } catch {
      user = null;
    }
  }
  tasks = await load(user);
  if (completedSignIn) {
    tasks = mergeTasks(localTasks, tasks);
    await save(tasks, user);
  }
  renderAuth();
  render();
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
    checkbox.addEventListener("change", async () => {
      tasks = toggleTask(tasks, task.id);
      await save(tasks, user);
      render();
    });

    const label = document.createElement("span");
    label.className = "task-title";
    label.textContent = task.title;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "task-delete";
    del.textContent = "x";
    del.setAttribute("aria-label", t("deleteTaskAria", { title: task.title }));
    del.addEventListener("click", async () => {
      tasks = removeTask(tasks, task.id);
      await save(tasks, user);
      render();
    });

    li.append(checkbox, label, del);
    list.appendChild(li);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  tasks = [createTask(title), ...tasks];
  await save(tasks, user);
  input.value = "";
  input.focus();
  render();
});

authAction.addEventListener("click", async () => {
  authAction.disabled = true;
  try {
    if (user) {
      await logout();
      user = null;
      tasks = await load(user);
      render();
      renderAuth();
      return;
    }
    await startGitHubSignIn();
  } catch (error) {
    setAuthMessage(error.message);
    authAction.disabled = false;
  }
});

localeSelect.addEventListener("change", () => {
  locale = localeSelect.value;
  saveLocale(locale);
  applyTranslations();
  renderAuth();
  render();
});

function renderAuth() {
  authAction.disabled = false;
  if (!user) {
    authAvatar.hidden = true;
    authAvatar.removeAttribute("src");
    authAvatar.removeAttribute("alt");
    authStatus.textContent = t("authLocal");
    authAction.textContent = t("signIn");
    return;
  }

  authAvatar.hidden = false;
  authAvatar.src = user.avatarUrl;
  authAvatar.alt = `${user.login}'s avatar`;
  authStatus.textContent = t("signedInAs", { login: user.login });
  authAction.textContent = t("logout");
  setAuthMessage("");
}

function applyTranslations() {
  document.documentElement.lang = locale;
  document.title = t("documentTitle");

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  }
  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }
}

function t(key, values) {
  return translate(locale, key, values);
}

function setAuthMessage(message) {
  authMessage.textContent = message;
  authMessage.hidden = !message;
}

function mergeTasks(localTasks, remoteTasks) {
  const byId = new Map();
  for (const task of [...remoteTasks, ...localTasks]) {
    byId.set(task.id, task);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

init();
