const LINK_PATTERN = /\[([^\]]+)]\(([^)\s]+)\)/g;
const CODE_PATTERN = /`([^`]+)`/g;
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;
const ITALIC_PATTERN = /(^|[^*])\*([^*\n]+)\*/g;

export function renderMarkdown(markdown) {
  const lines = markdown
    .trim()
    .split(/\r?\n/)
    .map((line) => renderInline(line));

  return lines.join("<br>");
}

function renderInline(line) {
  return escapeHtml(line)
    .replace(CODE_PATTERN, "<code>$1</code>")
    .replace(BOLD_PATTERN, "<strong>$1</strong>")
    .replace(ITALIC_PATTERN, "$1<em>$2</em>")
    .replace(LINK_PATTERN, renderLink);
}

function renderLink(match, label, href) {
  const safeHref = safeUrl(href);
  if (!safeHref) return label;

  return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function safeUrl(href) {
  try {
    const url = new URL(href, window.location.href);
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) {
      return "";
    }
    return escapeAttribute(url.href);
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return value.replace(/"/g, "&quot;");
}
