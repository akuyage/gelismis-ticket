export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function escapeMentions(value) {
  return String(value)
    .replace(/@(everyone|here)/g, '@\u200b$1');
}

export function sanitizeText(value) {
  return escapeMentions(escapeHtml(value));
}