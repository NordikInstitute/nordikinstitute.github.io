# NORDIK Institute — Annual General Meeting page (2025–2026)

A single interactive page built around the NORDIK brand. The Great Lakes emblem is rendered as a 3D point cloud, and the twelve AGM research posters orbit it. Each poster is linked by a line to Sault Ste. Marie, where NORDIK is based. Static files only: there is no build step.

## Run it

The page uses ES modules and loads `assets/projects.json`, so it must be served over HTTP:

```bash
# from the repository root (the folder that contains AGM/)
python -m http.server 8000
# then open http://localhost:8000/AGM/
```

Fonts and GSAP are vendored, so the page works offline when served from a laptop.

## The experience

| Part | Behaviour |
|---|---|
| Hook (first visit, and again once 5 minutes have passed since it was last shown) | The official NORDIK logo draws in on paper (CSS, from the first frame, so nothing half-built shows while the scripts load; it sits a little higher to make room). Once it is fully drawn, a cinematic title line plays close under it, ending under its Great Lakes emblem: "Anniversary Celebration" slides in first in brand-blue metal with its own light sweep, then "20th" comes down beside it in polished gold, settles into focus and flares as a light sweep glints across it, and a warm streak of light crosses the line. As soon as that settles, the emblem and the text vanish together as the lights go down: the emblem dissolves into points, and the anniversary text takes its night colours and dissolves, left to right, into tiny glowing particles (sampled from the text itself) that drift out across the screen into soft, cloud-like drifts. The lettering glides to the top-left, and "Annual General Meeting · 2025–2026" then glows in beneath it. The points regather into a large point-cloud emblem, and the posters arrive in orbit; most particles fade as the hero assembles and the rest stay as a faint atmosphere behind it (`js/anniversary.js`, a 2D canvas). It plays at half speed, about 10 s. Skip with Esc, Enter, a scroll or the "Skip intro" button. Visits within 5 minutes of it open with a quick gather and just the atmosphere; the time is kept in `localStorage` as `agm-hook-shown-at`. To retire the anniversary text, drop `anniv-on` from the head script. |
| Executive summary | Under the lettering in the hero, card by card after it lands, with icons modelled on the PDF: collaborations and projects, the four strategic goals, Indigenous leadership and the team. On phones one card shows at a time and cycles (tap for the next). |
| Hero | The cloud tilts toward the pointer and parts around it; ring, lakes and pictograph sit at different depths. Hovering a poster point previews it and lights its line to Sault Ste. Marie; selecting it opens the poster. Scrolling away streams the points past the viewer. |
| Header | The white header holds only the NORDIK logo and three tabs: **Posters**, **Projects** and **Annual Report**. It is transparent over the hero and stays shown from the poster wall down, with the current tab underlined. On phones the logo and tab text shrink so all three fit (below 375 px the last tab reads "Report"). |
| Posters | The twelve posters as a tight tile wall, with no headings around them. On screens wider than 760 px the wall is exactly one screen tall: six columns with 6 px gaps (two featured posters take a 2×2 tile), with the grid's width worked out from the height left under the white header (logo and tabs, Posters active), so every poster shows whole on any desktop or laptop. The header stays shown over the wall and no poster sits beneath it. A scroll that stops between the hero and the wall settles on the wall. Portrait tablets get a 4×3 grid; phones get two scrolling columns. Hovering or focusing a tile flips it to show the poster's title, a one-line summary on the featured tiles, and its research team or partners. Clicking opens the poster itself. |
| Projects | All 22 projects of the year as a numbered list: the project, then each lead beside their email (mailto links), aligned down the list on desktop and stacked on phones. The data is `assets/project-list.json`. The ten projects with a poster on the wall have a "View poster" button that opens it. |
| Annual Report | The 2025–2026 annual report, *A Vision for Tomorrow* (`assets/reports/annual-report-2025-2026.pdf`, 35 pages): its cover (which opens the PDF), "Read the report" and "Download". The cover image is `annual-report-2025-2026-cover.webp`, rendered from page 1. |
| Footer | Just the NORDIK website and the contact email. |
| Poster viewer | The poster opens full width in a window you can scroll (wheel, touch, drag, or the scrollbar). Zoom enlarges it in place, and Download saves the PDF. Deep-link with `#story/<slug>`. ← and → move between posters; Esc closes. There is no written summary. |

`prefers-reduced-motion: reduce` turns off the hook and all scroll-driven motion, and the wall tiles fade to their backs instead of turning. The cloud is drawn once, assembled and still. Without WebGL, the static emblem is shown and the poster points still work.

## Brand assets (`assets/brand/`)

- **`great-lakes-emblem.svg`:** the supplied emblem. It is sampled into points and used as the favicon and nav mark.
- **`nordik-logo.svg`:** the supplied full logo.
- **`nordik-wordmark.svg`:** the lettering and tagline only, split from the full logo. It is a `<symbol>` whose colours come from the CSS variables `--wm-main` and `--wm-accent`, so the same file renders brand-blue on paper and white on night.

## Editing content

**After changing any CSS or JS file, bump the version** in `index.html`: search and replace the `?v=2026-10-20.41` string, which appears in the import map, the module preloads, the stylesheet link and the main script. That stops browsers serving a stale mix of old and new files after a refresh or a deploy.


- **Projects list:** `assets/project-list.json` (title, leads with optional email, and an optional `poster` slug that adds the "View poster" button).
- **Posters:** `assets/projects.json`. Images are found by `slug` in `assets/thumbs/`, `assets/previews/` and `assets/posters/`.
- **Short names and the name-spelling normalisation:** `js/data.js`.
- **Executive-summary figures:** `index.html`, `#summary` (each number is in `data-n`).
- **The hub:** `HUB_UV` in `js/hero.js` is the St. Marys River on the emblem, as fractions of its width and height.

**Do not deploy** the raw files supplied for the redesign if they sit in this folder: `Great_Lakes_Logo_Vector_Files.zip`, `NORDIK_Institute_Logo_Vector_Files.zip` and `page_hook.mp4`. The video is a recording of a third-party site.

## Structure

```
AGM/
  index.html          header tabs, hero, poster wall, projects, annual report, footer, story dialog
  css/agm.css         brand tokens, components, responsive and reduced-motion rules
  js/main.js          boot order
  js/hero.js          hook choreography, orbit, links to the hub, pointer tilt, scroll-away
  js/anniversary.js   20th anniversary text with the logo: text to particles, lasting atmosphere
  js/pointcloud.js    WebGL renderer: emblem sampling, intro → dust → home motion, 3D tilt
  js/wall.js          poster tile wall (flip on hover, click to open)
  js/project-list.js  Projects tab: renders assets/project-list.json
  js/dialog.js        poster viewer, zoom, deep links
  js/motion.js        reveals and count-ups
  js/nav.js           solid/hidden nav, section marking, smooth links
  js/data.js          loads projects.json
  js/util.js          escaping and DOM helpers
  vendor/             GSAP 3.15.0 + ScrollTrigger (GSAP standard "no charge" licence)
  fonts/              EB Garamond, Barlow (SIL OFL; see fonts/licenses)
  assets/brand/       NORDIK logo, emblem and wordmark
  assets/             posters, previews, thumbnails, projects.json, reports/
```

**Coexistence with the generated exhibition.** In the published repository this page is the `/AGM/` landing page. The pages generated by `tools/build.py` stay as they were: `projects/<slug>/` (the QR-code destinations), `wall/`, `tour/`, `people/` and the rest. `tools/build.py` also writes `index.html`, so leave that file out when copying a fresh build into `AGM/`.

## Testing

`tools/verify-site.mjs` (in the deliverables folder) runs 64 end-to-end checks over the Chrome DevTools Protocol. They cover:

- the 20th anniversary text: shown under the logo from the first frame (also on phones), vanishing with it into particles, the lasting atmosphere, and none of it under reduced motion;
- the hook: half-speed timing, the 5-minute replay window, the top-left lettering and glowing AGM line, and skipping;
- the point cloud;
- poster previews and opening the poster;
- the poster wall (tight grid, no headings, one full screen at 1440×900 and 1536×730, the scroll snap, hover flip with title and authors, click to the poster);
- the header tabs, the project list (22 projects, 40 leads, 39 email links, 10 poster links) and the annual report placeholder;
- deep links, reduced motion, and mobile at 390 px.

Run it with:

```bash
chrome --headless=new --remote-debugging-port=9223 --user-data-dir=%TEMP%\agm-test about:blank
CDP_PORT=9223 node verify-site.mjs http://127.0.0.1:8000/AGM/ ./verify-out
```
