// Fixed navigation: solid once the hero is left, hides while reading down and
// returns on the way up, marks the current section, smooth in-page links.

const { ScrollTrigger } = window;

export function initNav() {
  const nav = document.getElementById('nav');
  const links = [...nav.querySelectorAll('a[href^="#"]')].filter((a) => a.getAttribute('href').length > 1 && a.getAttribute('href') !== '#top');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const y = self.scroll();
      nav.classList.toggle('is-solid', y > window.innerHeight * 0.6);
      nav.classList.toggle('is-hidden', self.direction === 1 && y > window.innerHeight * 0.9 && !nav.contains(document.activeElement));
    },
  });

  for (const a of links) {
    const sec = document.querySelector(a.getAttribute('href'));
    if (!sec) continue;
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => { if (self.isActive) links.forEach((l) => (l === a ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current'))); },
    });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    const href = a?.getAttribute('href');
    if (!href || href.length < 2 || href.startsWith('#story/')) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const top = href === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}
