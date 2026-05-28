import { toggleTask, removeTask } from "./tasks.js";

let focusIndex = 0;

export function attachShortcuts({ getTasks, setTasks, focusInput }) {
  document.addEventListener("keydown", (e) => {
    const inInput = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";

    if (e.key === "/" && !inInput) {
      e.preventDefault();
      focusInput();
      return;
    }

    if (inInput) return;

    const tasks = getTasks();
    if (tasks.length === 0) return;

    if (e.key === "j") {
      focusIndex = Math.min(focusIndex + 1, tasks.length - 1);
      highlight(focusIndex);
    } else if (e.key === "k") {
      focusIndex = Math.max(focusIndex - 1, 0);
      highlight(focusIndex);
    } else if (e.key === "x") {
      const t = tasks[focusIndex];
      if (t) setTasks(toggleTask(tasks, t.id));
    } else if (e.key === "d" || e.key === "Backspace") {
      const t = tasks[focusIndex];
      if (t) setTasks(removeTask(tasks, t.id));
    }
  });
}

function highlight(i) {
  const items = document.querySelectorAll(".task-item");
  items.forEach((el, idx) => el.classList.toggle("focused", idx === i));
}
