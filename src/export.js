function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function exportJson(tasks) {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
  download(blob, `taskforge-export-${todayStamp()}.json`);
}

export function exportCsv(tasks) {
  const header = "id,title,done,createdAt\n";
  const rows = tasks
    .map((t) => [t.id, csvEscape(t.title), t.done, t.createdAt].join(","))
    .join("\n");
  const blob = new Blob([header + rows + "\n"], { type: "text/csv" });
  download(blob, `taskforge-export-${todayStamp()}.csv`);
}

function csvEscape(s) {
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function download(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
