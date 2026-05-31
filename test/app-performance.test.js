const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

test("task list rendering avoids full-list rebuilds for item actions", async () => {
  const appSource = await fs.readFile(
    path.join(__dirname, "..", "src", "app.js"),
    "utf8",
  );

  assert.equal(appSource.includes("list.innerHTML"), false);
  assert.match(appSource, /list\.addEventListener\("change"/);
  assert.match(appSource, /list\.addEventListener\("click"/);
  assert.match(appSource, /updateTaskNode\(task\)/);
  assert.match(appSource, /removeTaskNode\(taskId\)/);
});
