export function parseMarkdown(value) {
  return normalizeText(value)
    .split(/\r?\n/)
    .map((line) => parseInline(line));
}

export function renderMarkdown(value, doc = document) {
  const fragment = doc.createDocumentFragment();
  const lines = parseMarkdown(value);

  lines.forEach((line, index) => {
    if (index > 0) fragment.append(doc.createElement("br"));
    for (const token of line) {
      fragment.append(renderToken(token, doc));
    }
  });

  return fragment;
}

export function isSafeLink(url) {
  const normalized = normalizeText(url);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized, "https://taskforge.local");
    return ["http:", "https:", "mailto:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function parseInline(value) {
  const text = normalizeText(value);
  const tokens = [];
  let cursor = 0;

  while (cursor < text.length) {
    const codeEnd = startsAt(text, cursor, "`")
      ? text.indexOf("`", cursor + 1)
      : -1;
    if (codeEnd > cursor + 1) {
      tokens.push({ type: "code", text: text.slice(cursor + 1, codeEnd) });
      cursor = codeEnd + 1;
      continue;
    }

    const boldEnd = startsAt(text, cursor, "**")
      ? text.indexOf("**", cursor + 2)
      : -1;
    if (boldEnd > cursor + 2) {
      tokens.push({ type: "strong", text: text.slice(cursor + 2, boldEnd) });
      cursor = boldEnd + 2;
      continue;
    }

    const italicEnd =
      startsAt(text, cursor, "*") && !startsAt(text, cursor, "**")
        ? text.indexOf("*", cursor + 1)
        : -1;
    if (italicEnd > cursor + 1) {
      tokens.push({ type: "em", text: text.slice(cursor + 1, italicEnd) });
      cursor = italicEnd + 1;
      continue;
    }

    const link = parseLink(text, cursor);
    if (link) {
      tokens.push(link);
      cursor = link.nextCursor;
      continue;
    }

    const nextSpecial = findNextSpecial(text, cursor + 1);
    tokens.push({
      type: "text",
      text: text.slice(cursor, nextSpecial === -1 ? text.length : nextSpecial),
    });
    cursor = nextSpecial === -1 ? text.length : nextSpecial;
  }

  return tokens.map(({ nextCursor, ...token }) => token);
}

function parseLink(text, cursor) {
  if (!startsAt(text, cursor, "[")) return null;
  const labelEnd = text.indexOf("]", cursor + 1);
  if (labelEnd <= cursor + 1 || text[labelEnd + 1] !== "(") return null;
  const urlEnd = findLinkUrlEnd(text, labelEnd + 2);
  if (urlEnd <= labelEnd + 2) return null;

  const label = text.slice(cursor + 1, labelEnd);
  const url = text.slice(labelEnd + 2, urlEnd).trim();
  if (!isSafeLink(url)) {
    return { type: "text", text: label, nextCursor: urlEnd + 1 };
  }
  return { type: "link", text: label, url, nextCursor: urlEnd + 1 };
}

function findLinkUrlEnd(text, start) {
  let depth = 1;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === "(") depth += 1;
    if (text[index] === ")") depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function renderToken(token, doc) {
  if (token.type === "strong") {
    const element = doc.createElement("strong");
    element.textContent = token.text;
    return element;
  }
  if (token.type === "em") {
    const element = doc.createElement("em");
    element.textContent = token.text;
    return element;
  }
  if (token.type === "code") {
    const element = doc.createElement("code");
    element.textContent = token.text;
    return element;
  }
  if (token.type === "link") {
    const element = doc.createElement("a");
    element.href = token.url;
    element.target = "_blank";
    element.rel = "noopener noreferrer";
    element.textContent = token.text;
    return element;
  }
  return doc.createTextNode(token.text);
}

function findNextSpecial(text, start) {
  const indexes = ["`", "*", "["]
    .map((char) => text.indexOf(char, start))
    .filter((index) => index !== -1);
  return indexes.length ? Math.min(...indexes) : -1;
}

function normalizeText(value) {
  return typeof value === "string" ? value : "";
}

function startsAt(text, index, match) {
  return text.slice(index, index + match.length) === match;
}
