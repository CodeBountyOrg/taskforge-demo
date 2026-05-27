const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8000);
const PUBLIC_DIR = __dirname;
const PUBLIC_ROOT = `${PUBLIC_DIR}${path.sep}`;
const DATA_FILE =
  process.env.TASKFORGE_DATA_FILE ||
  path.join(__dirname, ".taskforge-data.json");
const SESSION_COOKIE = "taskforge_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const sessions = new Map();

function createServer(options = {}) {
  const dataFile = options.dataFile || DATA_FILE;
  const fetchImpl = options.fetchImpl || global.fetch;
  const sessionStore = options.sessionStore || sessions;

  return http.createServer(async (req, res) => {
    try {
      if (req.url.startsWith("/api/")) {
        await handleApi(req, res, { dataFile, fetchImpl, sessionStore });
        return;
      }
      await serveStatic(req, res);
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { error: "internal_server_error" });
    }
  });
}

async function handleApi(req, res, context) {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/auth/config") {
    sendJson(res, 200, {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      redirectUri: process.env.GITHUB_REDIRECT_URI || "",
      scope: "read:user",
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/github/exchange") {
    await exchangeGitHubCode(req, res, context);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/session") {
    const session = getSession(req, context.sessionStore);
    sendJson(res, 200, { user: session?.user || null });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/logout") {
    const sessionId = getCookie(req, SESSION_COOKIE);
    if (sessionId) context.sessionStore.delete(sessionId);
    setSessionCookie(res, "", 0);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/tasks") {
    await handleTasks(req, res, context);
    return;
  }

  sendJson(res, 404, { error: "not_found" });
}

async function exchangeGitHubCode(req, res, { fetchImpl, sessionStore }) {
  if (!process.env.GITHUB_CLIENT_ID) {
    sendJson(res, 503, { error: "github_oauth_not_configured" });
    return;
  }
  if (typeof fetchImpl !== "function") {
    sendJson(res, 503, { error: "fetch_unavailable" });
    return;
  }

  const body = await readJson(req);
  const code = normalizeString(body.code);
  const codeVerifier = normalizeString(body.codeVerifier);
  const redirectUri = normalizeString(body.redirectUri);

  if (!code || !codeVerifier || !redirectUri) {
    sendJson(res, 400, { error: "missing_oauth_fields" });
    return;
  }

  const tokenParams = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });
  if (process.env.GITHUB_CLIENT_SECRET) {
    tokenParams.set("client_secret", process.env.GITHUB_CLIENT_SECRET);
  }

  const tokenResponse = await fetchImpl(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    },
  );
  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.access_token) {
    sendJson(res, 401, {
      error: "github_oauth_failed",
      detail: tokenData.error || "token_exchange_failed",
    });
    return;
  }

  const userResponse = await fetchImpl("https://api.github.com/user", {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${tokenData.access_token}`,
      "user-agent": "taskforge-demo",
    },
  });
  const userData = await userResponse.json();

  if (!userResponse.ok || !userData.login) {
    sendJson(res, 401, { error: "github_user_lookup_failed" });
    return;
  }

  const sessionId = crypto.randomBytes(32).toString("hex");
  const user = {
    id: String(userData.id),
    login: userData.login,
    avatarUrl: userData.avatar_url || "",
  };
  sessionStore.set(sessionId, {
    user,
    createdAt: Date.now(),
  });

  setSessionCookie(res, sessionId, SESSION_MAX_AGE_SECONDS);
  sendJson(res, 200, { user });
}

async function handleTasks(req, res, { dataFile, sessionStore }) {
  const session = getSession(req, sessionStore);
  if (!session) {
    sendJson(res, 401, { error: "authentication_required" });
    return;
  }

  if (req.method === "GET") {
    const data = await readData(dataFile);
    sendJson(res, 200, { tasks: data.tasksByUser[session.user.id] || [] });
    return;
  }

  if (req.method === "PUT") {
    const body = await readJson(req);
    const tasks = sanitizeTasks(body.tasks);
    const data = await readData(dataFile);
    data.tasksByUser[session.user.id] = tasks;
    await writeData(dataFile, data);
    sendJson(res, 200, { tasks });
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

async function serveStatic(req, res) {
  const rawPathname = req.url.split(/[?#]/)[0];
  let decodedRawPathname;
  try {
    decodedRawPathname = decodeURIComponent(rawPathname);
  } catch {
    sendText(res, 400, "Bad request");
    return;
  }
  if (decodedRawPathname.split("/").includes("..")) {
    sendText(res, 403, "Forbidden");
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.resolve(
    PUBLIC_DIR,
    `.${decodeURIComponent(requestedPath)}`,
  );

  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_ROOT)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "content-type": CONTENT_TYPES[ext] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendText(res, 404, "Not found");
      return;
    }
    throw error;
  }
}

async function readData(dataFile) {
  try {
    const parsed = JSON.parse(await fs.readFile(dataFile, "utf8"));
    if (parsed && typeof parsed === "object" && parsed.tasksByUser) {
      return parsed;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return { tasksByUser: {} };
}

async function writeData(dataFile, data) {
  await fs.writeFile(dataFile, `${JSON.stringify(data, null, 2)}\n`);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sanitizeTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .filter((task) => task && typeof task === "object")
    .map((task) => ({
      id: normalizeString(task.id).slice(0, 128),
      title: normalizeString(task.title).slice(0, 500),
      done: Boolean(task.done),
      createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now(),
    }))
    .filter((task) => task.id && task.title);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getSession(req, sessionStore) {
  const sessionId = getCookie(req, SESSION_COOKIE);
  if (!sessionId) return null;
  return sessionStore.get(sessionId) || null;
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";
  for (const cookie of cookieHeader.split(";")) {
    const [key, ...value] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function setSessionCookie(res, value, maxAge) {
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  res.setHeader("set-cookie", attrs.join("; "));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

if (require.main === module) {
  createServer().listen(PORT, HOST, () => {
    console.log(`TaskForge listening at http://${HOST}:${PORT}`);
  });
}

module.exports = {
  SESSION_COOKIE,
  createServer,
  sanitizeTasks,
};
