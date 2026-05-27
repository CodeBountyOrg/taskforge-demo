import {
  completeGitHubSignIn,
  getSession,
  logout,
  startGitHubSignIn,
} from "./auth.js";
import { load, loadLocal, save } from "./storage.js";
import { createTask, toggleTask, removeTask } from "./tasks.js";
import { renderMarkdown } from "./markdown.js";

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const descriptionInput = document.getElementById("task-description");
const list = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const authStatus = document.getElementById("auth-status");
const authAction = document.getElementById("auth-action");
const authAvatar = document.getElementById("auth-avatar");
const authMessage = document.getElementById("auth-message");

let tasks = [];
let user = null;

async function init() {
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

    const content = document.createElement("div");
    content.className = "task-content";

    const label = document.createElement("span");
    label.className = "task-title";
    label.textContent = task.title;
    content.append(label);

    if (task.description) {
      const description = document.createElement("div");
      description.className = "task-description";
      description.innerHTML = renderMarkdown(task.description);
      content.append(description);
    }

    const del = document.createElement("button");
    del.type = "button";
    del.className = "task-delete";
    del.textContent = "✕";
    del.setAttribute("aria-label", `Delete task: ${task.title}`);
    del.addEventListener("click", async () => {
      tasks = removeTask(tasks, task.id);
      await save(tasks, user);
      render();
    });

    li.append(checkbox, content, del);
    list.appendChild(li);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  tasks = [createTask(title, descriptionInput.value), ...tasks];
  await save(tasks, user);
  input.value = "";
  descriptionInput.value = "";
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

function renderAuth() {
  authAction.disabled = false;
  if (!user) {
    authAvatar.hidden = true;
    authAvatar.removeAttribute("src");
    authAvatar.removeAttribute("alt");
    authStatus.textContent = "Tasks are stored on this device.";
    authAction.textContent = "Sign in with GitHub";
    return;
  }

  authAvatar.hidden = false;
  authAvatar.src = user.avatarUrl;
  authAvatar.alt = `${user.login}'s avatar`;
  authStatus.textContent = `Signed in as ${user.login}`;
  authAction.textContent = "Logout";
  setAuthMessage("");
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
