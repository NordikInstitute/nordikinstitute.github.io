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
| Hook (first visit, and again once 5 minutes have passed since it was last shown) | The official NORDIK logo appears on paper; CSS paints it from the first frame, so nothing half-built shows while the scripts load. Its emblem dissolves into points as the lights go down. The lettering glides to the top-left, and "Annual General Meeting · 2025–2026" then glows in beneath it. The points regather into a large point-cloud emblem, and the posters arrive in orbit. It plays at half speed, about 8 s. Skip with Esc, Enter, a scroll or the "Skip intro" button. Visits within 5 minutes of it open with a quick gather; the time is kept in `localStorage` as `agm-hook-shown-at`. |
| Hero | The cloud tilts toward the pointer and parts around it; ring, lakes and pictograph sit at different depths. Hovering a poster point previews it and lights its line to Sault Ste. Marie; selecting it opens the story. Scrolling away streams the points past the viewer. |
| Research | One shelf of the twelve posters. It pins and scrolls sideways on wide screens, and is a swipe rail on phones. Each card opens its story. |
| The year | Four figures from the 2025–2026 executive summary, plus the PDF. |
| Close | Thanks, NORDIK links, and links to the exhibition pages. |
| Story dialog | Poster with zoom, summary, research question, headline figures, findings, people, and links to the full project page and the PDF. Deep-link with `#story/<slug>`. ← and → move between stories; Esc closes. |

The two Residential Schools posters (CSAA) appear as neutral markers in the orbit rather than thumbnails. They are veiled on the shelf and open behind a content note that includes the Indian Residential Schools Crisis Line.

`prefers-reduced-motion: reduce` turns off the hook, the pinned shelf and all scroll-driven motion. The cloud is drawn once, assembled and still. Without WebGL, the static emblem is shown and the poster points still work.

## Brand assets (`assets/brand/`)

- **`great-lakes-emblem.svg`:** the supplied emblem. It is sampled into points and used as the favicon and nav mark.
- **`nordik-logo.svg`:** the supplied full logo.
- **`nordik-wordmark.svg`:** the lettering and tagline only, split from the full logo. It is a `<symbol>` whose colours come from the CSS variables `--wm-main` and `--wm-accent`, so the same file renders brand-blue on paper and white on night.

## Editing content

**After changing any CSS or JS file, bump the version** in `index.html`: search and replace the `?v=2026-10-20.8` string, which appears in the import map, the module preloads, the stylesheet link and the main script. That stops browsers serving a stale mix of old and new files after a refresh or a deploy.


- **Posters:** `assets/projects.json`. Images are found by `slug` in `assets/thumbs/`, `assets/previews/` and `assets/posters/`. `sensitive: true` gives the content-note treatment described above.
- **Short names and the name-spelling normalisation:** `js/data.js`.
- **The four figures:** `index.html`, section `#year`.
- **The hub:** `HUB_UV` in `js/hero.js` is the St. Marys River on the emblem, as fractions of its width and height.

**Do not deploy** the raw files supplied for the redesign if they sit in this folder: `Great_Lakes_Logo_Vector_Files.zip`, `NORDIK_Institute_Logo_Vector_Files.zip` and `page_hook.mp4`. The video is a recording of a third-party site.

## Structure

```
AGM/
  index.html          hero, research shelf, year, close, story dialog
  css/agm.css         brand tokens, components, responsive and reduced-motion rules
  js/main.js          boot order
  js/hero.js          hook choreography, orbit, links to the hub, pointer tilt, scroll-away
  js/pointcloud.js    WebGL renderer: emblem sampling, intro → dust → home motion, 3D tilt
  js/shelf.js         pinned / swipe research shelf
  js/dialog.js        story dialog, zoom, content gate, deep links
  js/motion.js        reveals and count-ups
  js/nav.js           solid/hidden nav, section marking, smooth links
  js/data.js          loads projects.json
  js/util.js          escaping and DOM helpers
  vendor/             GSAP 3.15.0 + ScrollTrigger (GSAP standard "no charge" licence)
  fonts/              EB Garamond, Barlow (SIL OFL; see fonts/licenses)
  assets/brand/       NORDIK logo, emblem and wordmark
  assets/             posters, previews, thumbnails, projects.json, reports/
```

**Coexistence with the generated exhibition.** In the published repository this page is the `/AGM/` landing page. The pages generated by `tools/build.py` stay as they were: `projects/<slug>/` (the QR-code destinations), `wall/`, `tour/`, `people/` and the rest. Each story links to its project page, and the close links to the exhibition. `tools/build.py` also writes `index.html`, so leave that file out when copying a fresh build into `AGM/`.

## Testing

`tools/verify-site.mjs` (in the deliverables folder) runs 41 end-to-end checks over the Chrome DevTools Protocol. They cover:

- the hook: half-speed timing, the 5-minute replay window, the top-left lettering and glowing AGM line, and skipping;
- the point cloud;
- poster previews and opening stories;
- the content gate;
- the pinned shelf and the four figures;
- deep links, reduced motion, and mobile at 390 px.

Run it with:

```bash
chrome --headless=new --remote-debugging-port=9223 --user-data-dir=%TEMP%\agm-test about:blank
CDP_PORT=9223 node verify-site.mjs http://127.0.0.1:8000/AGM/ ./verify-out
```
