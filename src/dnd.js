export function attachDragAndDrop(listEl, onReorder) {
  let dragging = null;

  listEl.addEventListener("dragstart", (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    dragging = e.target.closest(".task-item");
    if (!dragging) return;
    dragging.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });

  listEl.addEventListener("dragend", () => {
    if (dragging) {
      dragging.classList.remove("dragging");
      dragging = null;
      onReorder([...listEl.children].map((el) => el.dataset.id));
    }
  });

  listEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    const target = e.target.closest(".task-item");
    if (!target || target === dragging) return;
    const rect = target.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    listEl.insertBefore(dragging, after ? target.nextSibling : target);
  });
}
