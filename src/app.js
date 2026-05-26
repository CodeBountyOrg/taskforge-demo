import { load, save } from "./storage.js";
import { createTask, toggleTask, removeTask } from "./tasks.js";
import { renderMarkdown } from "./markdown.js";

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const descriptionInput = document.getElementById("task-description");
const list = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");

let tasks = load();

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

    const content = document.createElement("div");
    content.className = "task-content";

    const label = document.createElement("span");
    label.className = "task-title";
    label.textContent = task.title;
    content.append(label);

    if (task.description) {
      const description = document.createElement("div");
      description.className = "task-description";
      description.append(renderMarkdown(task.description));
      content.append(description);
    }

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

    li.append(checkbox, content, del);
    list.appendChild(li);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  tasks = [createTask(title, descriptionInput.value), ...tasks];
  save(tasks);
  input.value = "";
  descriptionInput.value = "";
  input.focus();
  render();
});

render();
