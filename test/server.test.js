const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  SESSION_COOKIE,
  createServer,
  flushDueAssignmentDigests,
  sanitizeTasks,
} = require("../server.js");

test("sanitizeTasks drops malformed rows and trims persisted fields", () => {
  assert.deepEqual(
    sanitizeTasks([
      {
        assigneeEmail: " Dev@Example.COM ",
        id: " a ",
        title: " Write tests ",
        done: 1,
        createdAt: 10,
      },
      { id: "", title: "missing id" },
      { id: "missing-title", title: "" },
      null,
    ]),
    [
      {
        assigneeEmail: "dev@example.com",
        id: "a",
        title: "Write tests",
        done: true,
        createdAt: 10,
      },
    ],
  );
});

test("GitHub OAuth exchange sets an HTTP-only session cookie without exposing tokens", async () => {
  const previousClientId = process.env.GITHUB_CLIENT_ID;
  process.env.GITHUB_CLIENT_ID = "client-id";
  const fetchCalls = [];
  const server = await listen(
    createServer({
      dataFile: await tempDataFile(),
      fetchImpl: async (url, options = {}) => {
        fetchCalls.push({ url, options });
        if (url === "https://github.com/login/oauth/access_token") {
          return jsonResponse({ access_token: "secret-token" });
        }
        if (url === "https://api.github.com/user") {
          return jsonResponse({
            id: 42,
            login: "newmattock",
            avatar_url: "https://avatars.githubusercontent.com/u/42",
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      },
    }),
  );

  try {
    const response = await request(server, "/api/auth/github/exchange", {
      method: "POST",
      body: {
        code: "code",
        codeVerifier: "verifier",
        redirectUri: "http://127.0.0.1:8000/",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.login, "newmattock");
    assert.equal(response.body.access_token, undefined);
    assert.match(response.headers.get("set-cookie"), /HttpOnly/);
    assert.match(response.headers.get("set-cookie"), /SameSite=Lax/);
    assert.equal(fetchCalls[0].options.body.includes("client_secret"), false);
    assert.match(fetchCalls[0].options.body, /code_verifier=verifier/);
  } finally {
    await close(server);
    restoreEnv("GITHUB_CLIENT_ID", previousClientId);
  }
});

test("authenticated task API persists tasks by GitHub user id", async () => {
  const previousClientId = process.env.GITHUB_CLIENT_ID;
  process.env.GITHUB_CLIENT_ID = "client-id";
  const dataFile = await tempDataFile();
  const server = await listen(
    createServer({
      dataFile,
      fetchImpl: async (url) => {
        if (url === "https://github.com/login/oauth/access_token") {
          return jsonResponse({ access_token: "token" });
        }
        return jsonResponse({
          id: 7,
          login: "octo",
          avatar_url: "https://example.com/avatar.png",
        });
      },
    }),
  );

  try {
    const login = await request(server, "/api/auth/github/exchange", {
      method: "POST",
      body: {
        code: "code",
        codeVerifier: "verifier",
        redirectUri: "http://127.0.0.1:8000/",
      },
    });
    const cookie = login.headers.get("set-cookie").split(";")[0];

    const unauthorized = await request(server, "/api/tasks");
    assert.equal(unauthorized.status, 401);

    const saved = await request(server, "/api/tasks", {
      method: "PUT",
      cookie,
      body: {
        tasks: [{ id: "task-1", title: "Ship OAuth", done: false }],
      },
    });
    assert.equal(saved.status, 200);

    const loaded = await request(server, "/api/tasks", { cookie });
    assert.deepEqual(loaded.body.tasks, [
      {
        id: "task-1",
        title: "Ship OAuth",
        done: false,
        createdAt: loaded.body.tasks[0].createdAt,
        assigneeEmail: "",
      },
    ]);

    const persisted = JSON.parse(await fs.readFile(dataFile, "utf8"));
    assert.equal(persisted.tasksByUser["7"][0].title, "Ship OAuth");
  } finally {
    await close(server);
    restoreEnv("GITHUB_CLIENT_ID", previousClientId);
  }
});

test("assignment updates are queued into delayed email digests", async () => {
  const previousClientId = process.env.GITHUB_CLIENT_ID;
  process.env.GITHUB_CLIENT_ID = "client-id";
  const dataFile = await tempDataFile();
  const sent = [];
  let now = 1000;
  const server = await listen(
    createServer({
      dataFile,
      digestIntervalMs: 60 * 60 * 1000,
      emailSender: { send: async (message) => sent.push(message) },
      fetchImpl: async (url) => {
        if (url === "https://github.com/login/oauth/access_token") {
          return jsonResponse({ access_token: "token" });
        }
        return jsonResponse({ id: 7, login: "octo", avatar_url: "" });
      },
      now: () => now,
      publicUrl: "https://taskforge.example",
      startDigestTimer: false,
    }),
  );

  try {
    const login = await request(server, "/api/auth/github/exchange", {
      method: "POST",
      body: {
        code: "code",
        codeVerifier: "verifier",
        redirectUri: "http://127.0.0.1:8000/",
      },
    });
    const cookie = login.headers.get("set-cookie").split(";")[0];

    const saved = await request(server, "/api/tasks", {
      method: "PUT",
      cookie,
      body: {
        tasks: [
          {
            assigneeEmail: "Dev@Example.COM",
            id: "task-1",
            title: "Review pull request",
            done: false,
          },
        ],
      },
    });

    assert.equal(saved.status, 200);
    assert.equal(sent.length, 0);

    const queued = JSON.parse(await fs.readFile(dataFile, "utf8"));
    assert.equal(
      queued.assignmentDigests["dev@example.com"].scheduledFor,
      now + 60 * 60 * 1000,
    );
    assert.equal(
      queued.assignmentDigests["dev@example.com"].assignments[0].taskTitle,
      "Review pull request",
    );

    now += 60 * 60 * 1000;
    const delivery = await flushDueAssignmentDigests(dataFile, {
      emailSender: { send: async (message) => sent.push(message) },
      now: () => now,
      publicUrl: "https://taskforge.example",
    });

    assert.deepEqual(delivery, { sent: 1 });
    assert.equal(sent[0].to, "dev@example.com");
    assert.match(sent[0].subject, /assignment digest/);
    assert.match(sent[0].text, /Review pull request/);
    assert.match(
      sent[0].text,
      /https:\/\/taskforge\.example\/api\/notifications\/unsubscribe\?token=/,
    );

    const delivered = JSON.parse(await fs.readFile(dataFile, "utf8"));
    assert.deepEqual(
      delivered.assignmentDigests["dev@example.com"].assignments,
      [],
    );
  } finally {
    await close(server);
    restoreEnv("GITHUB_CLIENT_ID", previousClientId);
  }
});

test("unsubscribe endpoint disables pending assignment digests", async () => {
  const dataFile = await tempDataFile();
  await fs.writeFile(
    dataFile,
    JSON.stringify({
      assignmentDigests: {
        "dev@example.com": {
          assignments: [
            {
              assignedAt: 1000,
              assignedBy: "octo",
              assigneeEmail: "dev@example.com",
              taskId: "task-1",
              taskTitle: "Review pull request",
            },
          ],
          lastSentAt: 0,
          scheduledFor: 1000,
          unsubscribeToken: "token-123",
          unsubscribed: false,
        },
      },
      tasksByUser: {},
    }),
  );
  const sent = [];
  const server = await listen(
    createServer({
      dataFile,
      emailSender: { send: async (message) => sent.push(message) },
      now: () => 2000,
      startDigestTimer: false,
    }),
  );

  try {
    const response = await request(
      server,
      "/api/notifications/unsubscribe?token=token-123",
    );
    assert.equal(response.status, 200);

    await flushDueAssignmentDigests(dataFile, {
      emailSender: { send: async (message) => sent.push(message) },
      now: () => 2000,
      publicUrl: "https://taskforge.example",
    });

    const data = JSON.parse(await fs.readFile(dataFile, "utf8"));
    assert.equal(data.assignmentDigests["dev@example.com"].unsubscribed, true);
    assert.deepEqual(data.assignmentDigests["dev@example.com"].assignments, []);
    assert.equal(sent.length, 0);
  } finally {
    await close(server);
  }
});

test("logout clears the server session and browser cookie", async () => {
  const previousClientId = process.env.GITHUB_CLIENT_ID;
  process.env.GITHUB_CLIENT_ID = "client-id";
  const server = await listen(
    createServer({
      dataFile: await tempDataFile(),
      fetchImpl: async (url) => {
        if (url === "https://github.com/login/oauth/access_token") {
          return jsonResponse({ access_token: "token" });
        }
        return jsonResponse({ id: 9, login: "octo", avatar_url: "" });
      },
    }),
  );

  try {
    const login = await request(server, "/api/auth/github/exchange", {
      method: "POST",
      body: {
        code: "code",
        codeVerifier: "verifier",
        redirectUri: "http://127.0.0.1:8000/",
      },
    });
    const cookie = login.headers.get("set-cookie").split(";")[0];

    const logout = await request(server, "/api/logout", {
      method: "POST",
      cookie,
    });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);

    const session = await request(server, "/api/session", { cookie });
    assert.equal(session.body.user, null);
  } finally {
    await close(server);
    restoreEnv("GITHUB_CLIENT_ID", previousClientId);
  }
});

test("static server blocks path traversal outside the app directory", async () => {
  const server = await listen(createServer({ dataFile: await tempDataFile() }));

  try {
    const status = await rawStatus(server, "/%2e%2e/package.json");
    assert.equal(status, 403);
  } finally {
    await close(server);
  }
});

async function tempDataFile() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "taskforge-"));
  return path.join(dir, "data.json");
}

function jsonResponse(payload, ok = true) {
  return {
    ok,
    json: async () => payload,
  };
}

async function request(server, pathname, options = {}) {
  const url = new URL(pathname, `http://127.0.0.1:${server.address().port}`);
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  return {
    body:
      text && contentType.includes("application/json") ? JSON.parse(text) : text,
    headers: response.headers,
    status: response.status,
  };
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function rawStatus(server, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        method: "GET",
        path,
        port: server.address().port,
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
