const INLINE_PATTERN =
  /(\[([^\]\n]+)\]\(([^)\s]+)\)|`([^`\n]+)`|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*)/g;

export function renderMarkdown(markdown) {
  const fragment = document.createDocumentFragment();
  const blocks = markdown
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const paragraph = document.createElement("p");
    renderInlineMarkdown(block, paragraph);
    fragment.append(paragraph);
  }

  return fragment;
}

function renderInlineMarkdown(text, parent) {
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    appendTextWithLineBreaks(parent, text.slice(lastIndex, match.index));
    parent.append(createInlineNode(match));
    lastIndex = match.index + match[0].length;
  }

  appendTextWithLineBreaks(parent, text.slice(lastIndex));
}

function createInlineNode(match) {
  if (match[2] && match[3]) {
    return createLink(match[2], match[3]);
  }
  if (match[4]) {
    return createElementWithText("code", match[4]);
  }
  if (match[5]) {
    return createElementWithText("strong", match[5]);
  }
  return createElementWithText("em", match[6]);
}

function createLink(label, href) {
  const safeUrl = toSafeUrl(href);
  if (!safeUrl) {
    return document.createTextNode(label);
  }

  const link = createElementWithText("a", label);
  link.href = safeUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function toSafeUrl(href) {
  try {
    const url = new URL(href, window.location.href);
    return ["http:", "https:", "mailto:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function createElementWithText(tagName, text) {
  const element = document.createElement(tagName);
  element.textContent = text;
  return element;
}

function appendTextWithLineBreaks(parent, text) {
  const lines = text.split("\n");

  lines.forEach((line, index) => {
    if (index > 0) {
      parent.append(document.createElement("br"));
    }
    parent.append(document.createTextNode(line));
  });
}
