const AUTH_STATE_KEY = "taskforge.githubOAuthState.v1";
const CODE_VERIFIER_KEY = "taskforge.githubCodeVerifier.v1";
const REDIRECT_URI_KEY = "taskforge.githubRedirectUri.v1";

export async function getSession() {
  const response = await fetch("/api/session", {
    credentials: "same-origin",
  });
  if (!response.ok) return { user: null };
  return response.json();
}

export async function startGitHubSignIn() {
  const config = await fetchJson("/api/auth/config");
  if (!config.clientId) {
    throw new Error("GitHub sign-in is not configured on this server.");
  }

  const state = randomString(24);
  const codeVerifier = randomString(64);
  const codeChallenge = await pkceChallenge(codeVerifier);
  const redirectUri =
    config.redirectUri || `${window.location.origin}${window.location.pathname}`;

  window.sessionStorage.setItem(AUTH_STATE_KEY, state);
  window.sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
  window.sessionStorage.setItem(REDIRECT_URI_KEY, redirectUri);

  const params = new URLSearchParams({
    client_id: config.clientId,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    redirect_uri: redirectUri,
    scope: config.scope || "read:user",
    state,
  });

  window.location.assign(`https://github.com/login/oauth/authorize?${params}`);
}

export async function completeGitHubSignIn() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code && !state) return null;

  const expectedState = window.sessionStorage.getItem(AUTH_STATE_KEY);
  const codeVerifier = window.sessionStorage.getItem(CODE_VERIFIER_KEY);
  const redirectUri =
    window.sessionStorage.getItem(REDIRECT_URI_KEY) ||
    `${window.location.origin}${window.location.pathname}`;
  window.sessionStorage.removeItem(AUTH_STATE_KEY);
  window.sessionStorage.removeItem(CODE_VERIFIER_KEY);
  window.sessionStorage.removeItem(REDIRECT_URI_KEY);

  if (!code || !state || !expectedState || state !== expectedState) {
    throw new Error("GitHub sign-in state did not match. Please try again.");
  }
  if (!codeVerifier) {
    throw new Error("GitHub sign-in verifier was missing. Please try again.");
  }

  const response = await fetch("/api/auth/github/exchange", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, codeVerifier, redirectUri }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "GitHub sign-in failed.");
  }

  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url);
  return payload.user;
}

export async function logout() {
  await fetch("/api/logout", {
    method: "POST",
    credentials: "same-origin",
  });
}

async function fetchJson(url) {
  const response = await fetch(url, { credentials: "same-origin" });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

function randomString(byteLength) {
  const bytes = new Uint8Array(byteLength);
  window.crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function pkceChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window
    .btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
