// The Projects tab: every NORDIK project this year with its leads and their
// email addresses, from assets/project-list.json. A project that has a poster
// on the wall links to it (opened globally through [data-open], like a tile).

import { esc, fragment } from './util.js';

const { ScrollTrigger } = window;

function lead(l) {
  const email = l.email ? `<a class="plist__email" href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : '<span class="plist__email" aria-hidden="true"></span>';
  return `<li><span class="plist__name">${esc(l.name)}</span>${email}</li>`;
}

function item(p, i) {
  const poster = p.poster ? `<button class="plist__poster" type="button" data-open="${esc(p.poster)}">View poster</button>` : '';
  return `
  <li class="plist__item">
    <span class="plist__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
    <div class="plist__main">
      <h3 class="plist__title">${esc(p.title)}</h3>
      ${poster}
    </div>
    <ul class="plist__leads" aria-label="Project leads">${p.leads.map(lead).join('')}</ul>
  </li>`;
}

export async function initProjectList() {
  const list = document.getElementById('project-list');
  try {
    const res = await fetch('assets/project-list.json');
    if (!res.ok) throw new Error(`project-list.json: HTTP ${res.status}`);
    const { projects } = await res.json();
    list.append(fragment(projects.map(item).join('')));
    document.getElementById('project-count').textContent = projects.length;
  } catch (err) {
    console.error(err);
    list.append(fragment('<li class="plist__error">The project list could not be loaded. Please reload the page.</li>'));
  }
  // The list changes the page height, so the section markers below it move.
  ScrollTrigger.refresh();
}
