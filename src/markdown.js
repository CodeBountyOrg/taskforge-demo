const ALLOWED_TAGS = new Set(["A", "BR", "CODE", "EM", "STRONG"]);
const TEMPLATE = document.createElement("template");

export function renderMarkdown(markdown) {
  TEMPLATE.innerHTML = toHtml(markdown);
  sanitize(TEMPLATE.content);
  return TEMPLATE.content.cloneNode(true);
}

function toHtml(markdown) {
  return escapeHtml(markdown)
    .replace(/\r\n?/g, "\n")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

function sanitize(root) {
  for (const node of [...root.querySelectorAll("*")]) {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      node.replaceWith(document.createTextNode(node.textContent));
      continue;
    }

    for (const attr of [...node.attributes]) {
      if (node.tagName !== "A" || attr.name !== "href") node.removeAttribute(attr.name);
    }

    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      if (!href.startsWith("http://") && !href.startsWith("https://")) {
        node.replaceWith(document.createTextNode(node.textContent));
        continue;
      }
      node.target = "_blank";
      node.rel = "noopener noreferrer";
    }
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}
