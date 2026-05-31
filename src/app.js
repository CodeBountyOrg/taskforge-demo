import {
  completeGitHubSignIn,
  getSession,
  logout,
  startGitHubSignIn,
} from "./auth.js";
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

let tasks = [];
let user = null;
const taskNodes = new Map();

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
  renderTasks();
}

function renderTasks() {
  list.textContent = "";
  taskNodes.clear();
  if (tasks.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  const fragment = document.createDocumentFragment();
  for (const task of tasks) {
    const node = createTaskNode(task);
    taskNodes.set(task.id, node);
    fragment.appendChild(node);
  }
  list.appendChild(fragment);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  const task = createTask(title);
  tasks = [task, ...tasks];
  await save(tasks, user);
  input.value = "";
  input.focus();
  prependTask(task);
});

list.addEventListener("change", async (event) => {
  if (!event.target.matches("[data-task-toggle]")) return;
  const taskId = event.target.closest(".task-item")?.dataset.id;
  if (!taskId) return;

  tasks = toggleTask(tasks, taskId);
  const task = tasks.find((item) => item.id === taskId);
  updateTaskNode(task);
  await save(tasks, user);
});

list.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-task-delete]");
  if (!deleteButton) return;
  const taskId = deleteButton.closest(".task-item")?.dataset.id;
  if (!taskId) return;

  tasks = removeTask(tasks, taskId);
  removeTaskNode(taskId);
  await save(tasks, user);
});

authAction.addEventListener("click", async () => {
  authAction.disabled = true;
  try {
    if (user) {
      await logout();
      user = null;
      tasks = await load(user);
      renderTasks();
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

function createTaskNode(task) {
  const li = document.createElement("li");
  li.className = "task-item" + (task.done ? " done" : "");
  li.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.dataset.taskToggle = "";

  const label = document.createElement("span");
  label.className = "task-title";
  label.textContent = task.title;

  const del = document.createElement("button");
  del.type = "button";
  del.className = "task-delete";
  del.textContent = "x";
  del.dataset.taskDelete = "";
  del.setAttribute("aria-label", `Delete task: ${task.title}`);

  li.append(checkbox, label, del);
  return li;
}

function prependTask(task) {
  const node = createTaskNode(task);
  taskNodes.set(task.id, node);
  list.prepend(node);
  emptyState.hidden = true;
}

function updateTaskNode(task) {
  const node = taskNodes.get(task.id);
  if (!node) return;
  node.classList.toggle("done", task.done);
  node.querySelector("[data-task-toggle]").checked = task.done;
}

function removeTaskNode(taskId) {
  const node = taskNodes.get(taskId);
  if (node) node.remove();
  taskNodes.delete(taskId);
  emptyState.hidden = tasks.length > 0;
}

function mergeTasks(localTasks, remoteTasks) {
  const byId = new Map();
  for (const task of [...remoteTasks, ...localTasks]) {
    byId.set(task.id, task);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

init();
