const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function renderMarkdown(markdown) {
  const root = document.createDocumentFragment();
  const blocks = String(markdown || "").replace(/\r\n?/g, "\n").split(/\n{2,}/);

  for (const block of blocks) {
    const text = block.trim();
    if (!text) continue;
    const p = document.createElement("p");
    appendInlineMarkdown(p, text.replace(/\n/g, " "));
    root.append(p);
  }

  return root;
}

function appendInlineMarkdown(parent, source) {
  const pattern = /(`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let index = 0;
  for (const match of source.matchAll(pattern)) {
    appendText(parent, source.slice(index, match.index));
    if (match[2]) appendElement(parent, "code", match[2]);
    else if (match[3] && match[4]) appendLink(parent, match[3], match[4]);
    else if (match[5]) appendElement(parent, "strong", match[5]);
    else if (match[6]) appendElement(parent, "em", match[6]);
    index = match.index + match[0].length;
  }
  appendText(parent, source.slice(index));
}

function appendText(parent, text) {
  if (text) parent.append(document.createTextNode(text));
}

function appendElement(parent, tagName, text) {
  const element = document.createElement(tagName);
  element.textContent = text;
  parent.append(element);
}

function appendLink(parent, text, href) {
  try {
    const url = new URL(href, window.location.href);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      appendText(parent, text);
      return;
    }
    const a = document.createElement("a");
    a.href = url.href;
    a.textContent = text;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    parent.append(a);
  } catch {
    appendText(parent, text);
  }
}
