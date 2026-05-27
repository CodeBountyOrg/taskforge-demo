const ALLOWED_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function renderMarkdown(markdown) {
  const escaped = escapeHtml(markdown || "");
  const withCode = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
  const withLinks = withCode.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_match, label, rawUrl) => {
      const url = safeUrl(rawUrl);
      if (!url) return label;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    },
  );
  const withBold = withLinks.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const withItalic = withBold.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return withItalic.replace(/\r?\n/g, "<br>");
}

function safeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl, window.location.origin);
    if (!ALLOWED_LINK_PROTOCOLS.has(url.protocol)) return "";
    return escapeAttribute(url.href);
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return String(value).replaceAll('"', "%22");
}
