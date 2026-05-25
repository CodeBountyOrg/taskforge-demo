const TOKEN_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function renderMarkdown(markdown) {
  const fragment = document.createDocumentFragment();
  const blocks = String(markdown || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const paragraph = document.createElement("p");
    appendInlineMarkdown(paragraph, block.replace(/\n/g, " "));
    fragment.appendChild(paragraph);
  }

  return fragment;
}

function appendInlineMarkdown(parent, text) {
  let index = 0;
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    if (match.index > index) {
      parent.append(document.createTextNode(text.slice(index, match.index)));
    }
    parent.append(createInlineNode(match[0]));
    index = match.index + match[0].length;
  }

  if (index < text.length) {
    parent.append(document.createTextNode(text.slice(index)));
  }
}

function createInlineNode(token) {
  if (token.startsWith("`")) {
    const code = document.createElement("code");
    code.textContent = token.slice(1, -1);
    return code;
  }

  if (token.startsWith("**")) {
    const strong = document.createElement("strong");
    strong.textContent = token.slice(2, -2);
    return strong;
  }

  if (token.startsWith("*")) {
    const emphasis = document.createElement("em");
    emphasis.textContent = token.slice(1, -1);
    return emphasis;
  }

  const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (linkMatch) {
    return createSafeLink(linkMatch[1], linkMatch[2]);
  }

  return document.createTextNode(token);
}

function createSafeLink(label, rawUrl) {
  const anchor = document.createElement("a");
  anchor.textContent = label;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";

  const url = safeUrl(rawUrl);
  if (url) {
    anchor.href = url;
  }

  return anchor;
}

function safeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl, window.location.href);
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
