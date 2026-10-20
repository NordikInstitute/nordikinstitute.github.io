// Tiny DOM helpers. All dynamic text goes through esc() or textContent.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function html(strings, ...values) {
  return strings.reduce((out, s, i) => out + s + (i < values.length ? values[i] : ''), '');
}

export function fragment(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content;
}

export const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

export function notice(message, ms = 9000) {
  const el = document.createElement('p');
  el.className = 'notice';
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.append(el);
  if (ms) setTimeout(() => el.remove(), ms);
  return el;
}
