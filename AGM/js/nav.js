// Fixed navigation: reading-progress hairline, solid background once the hero
// is left, hides while reading down and returns on the way up, section spy,
// and the small-screen menu.

const { ScrollTrigger } = window;

export function initNav() {
  const nav = document.getElementById('nav');
  const progress = document.getElementById('nav-progress');
  const links = [...document.querySelectorAll('.nav__links a')];
  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('menu-btn');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const y = self.scroll();
      progress.style.transform = `scaleX(${self.progress.toFixed(4)})`;
      nav.classList.toggle('is-solid', y > 40);
      const goingDown = self.direction === 1;
      const hide = goingDown && y > window.innerHeight * 0.7 && !menu.classList.contains('is-open') && !nav.contains(document.activeElement);
      nav.classList.toggle('is-hidden', hide);
    },
  });

  const setCurrent = (id) => links.forEach((a) => {
    if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
  for (const a of links) {
    const sec = document.querySelector(a.getAttribute('href'));
    if (!sec) continue;
    ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => self.isActive && setCurrent(sec.id) });
  }

  // In-page links: smooth unless the reader prefers reduced motion.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2 || a.getAttribute('href').startsWith('#story/')) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    const top = a.getAttribute('href') === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    history.replaceState(null, '', a.getAttribute('href'));
  });

  function openMenu() {
    menu.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    nav.classList.remove('is-hidden');
    menu.querySelector('a')?.focus();
  }
  function closeMenu() {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  menuBtn.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { closeMenu(); menuBtn.focus(); }
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', closeMenu);
}
