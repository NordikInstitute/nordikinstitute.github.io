# NORDIK Research Atlas

**A complete, source-grounded digital exhibition for NORDIK Institute's Annual Meeting.**

The site includes 12 genuine PDF research posters, interactive reading rooms, eight subject collections, project summaries, research-team credits, 23 name-indexed researcher profile pages (printed names preserved), a digital poster hall, guided discovery routes, a research-connection constellation and an institute-wide impact page.

## Quick start — no dependency installation required

Requirements: **Python 3.10+** (for the local server). The already-generated site is in `site/` and needs no frameworks, APIs, database, npm, external fonts or external JavaScript.

The pages in `site/` are built for `https://nordikinstitute.github.io/AGM`, so internal links begin with `/AGM/`. Do not open `index.html` with `file://`. From this folder in PowerShell:

```powershell
$root = Join-Path $env:TEMP "nordik-agm-preview"
New-Item -ItemType Directory -Force -Path $root | Out-Null
$link = Join-Path $root "AGM"
if (Test-Path $link) { cmd /c rmdir $link }
cmd /c mklink /J $link "$PWD\site"
python -m http.server 8000 --directory $root
```

Open **http://localhost:8000/AGM/**. A build without `--base-path` is what you want if the exhibition will live at the host root instead; then serve `site/` directly.

`content/publication_approvals.json` is marked approved, and this `site/` build allows crawlers. The notes in that file and in `CONTENT_REVIEW.md` still say the two Shingwauk posters need community-partner confirmation before they are promoted. The supplied poster PDFs remain original and unmodified.

## What's working

| Feature | Implementation |
|---|---|
| Homepage | Museum/editorial presentation, original research imagery, real featured projects, institutional context |
| Explore | Full-text client-side search of projects, tags, findings, teams and partners; topic chips; sort; deep-linkable `?theme=` and `?q=` |
| Project profiles | 12 real summaries, methods, findings, team credits, source file references, related topics, official inquiry link |
| Research poster readers | 12 high-resolution source-derived image previews; zoom/fit/pan, fullscreen, open/download source PDF; browser-native vector PDF mode |
| Themes | Eight primary research rooms (AI, finance, economics and education, water, workforce, health, Indigenous research, culture); projects are also cross-linked by tags |
| Research teams | 23 printed-name profiles and project relationships; no inferred email addresses or photos |
| Poster hall | Theme filters, previous and next, a readable summary beside each poster, then the original sheet at full size |
| Research constellation | Interactive, accessible SVG with 15 documented topic or team links; equivalent text list |
| Guided tours | Three editorial trails with four actual projects each |
| Impact | Annual-report numbers clearly separated from poster-specific achievements |
| Physical/virtual bridge | Printable QR cards for every project after a real public hostname is configured |
| Mobile/accessibility | Responsive layouts, mobile nav, keyboard support, ARIA-labelled controls, reduced-motion support, accessible HTML summaries |
| Privacy | No accounts, trackers, cookies, personal-data submissions or third-party JS calls |

## Folder structure

```text
nordik-research-atlas/
├── site/                      # Complete ready-to-serve static website
│   ├── index.html
│   ├── explore/...
│   ├── themes/...             # 8 themed rooms
│   ├── projects/...           # 12 profiles and 12 poster readers
│   ├── people/...             # team profiles and directory
│   ├── wall/                  # all originals in a browsable gallery
│   ├── connections/          # interactive topic graph
│   ├── tour/...
│   ├── impact/ and about/
│   ├── qr-cards/
│   ├── assets/posters/        # the 12 ORIGINAL, unmodified PDFs
│   ├── assets/previews/       # source-derived 2,100px-wide WebP previews
│   ├── assets/thumbs/         # optimized poster thumbnail assets
│   ├── assets/reports/        # executive summary PDF
│   ├── data/                  # build's public, reviewed content JSON
│   └── static/                # working JavaScript and CSS
├── content/
│   ├── projects.json         # structured editorial source; edit here
│   └── publication_approvals.json  # false by default
├── src/styles.css            # responsive museum-inspired design
├── src/app.js                # accessible interactions
├── tools/build.py            # generate all static pages and optional QR cards
├── tools/generate_assets.py  # only needed to re-render PDF images
├── tests/test_site.py        # structural/content/source tests
├── CONTENT_REVIEW.md         # required launch checks and known discrepancies
└── CONTENT_AUDIT.md          # source-to-page project provenance inventory
```

## Updating the exhibition

Edit `content/projects.json` (real data is kept separate from page templates), and then rebuild:

```sh
python tools/build.py
```

If a source poster changes, place its replacement next to the original upload folder's equivalent path or adapt `tools/generate_assets.py` to your storage layout, run `python tools/generate_assets.py` (requires PyMuPDF and Pillow), and rebuild. Rendering assets is already completed for every poster; ordinary updates only require Python's standard library plus `qrcode` for QR card generation.

The builder's thumbnail converter looks for the original supplied PDF names in the **parent directory of this project**. To keep an uploaded-original workflow portable, you may copy the PDFs to the parent directory using the exact original filenames. Alternatively, edit `UPLOAD` in `tools/generate_assets.py`. The public site always uses the verified PDFs in `site/assets/posters/`.

## Preparing a release and real printable QR codes

1. Read `CONTENT_REVIEW.md`.
2. Mark each approved item in `content/publication_approvals.json` as `posterAndContentApproved: true`. For the two sensitive CSAA project records, also obtain partner sign-off and set `communityPartnerApproved: true`. Do not mark approvals prematurely.
3. Set your deployed HTTPS domain, such as `https://research.example.org` (replace this *example* with your real site).
4. Run:

```sh
python tools/build.py --release --base-url https://YOUR-ACTUAL-EXHIBITION-DOMAIN
python -m unittest discover -s tests -v
```

The release build **fails closed** if any approval is missing. Once approved, it generates public-indexable pages, a sitemap and twelve functional poster QR codes. Open `/qr-cards/` and print the cards (print CSS uses A4). The base URL is not invented in the delivered preview, so its initial QR print cards correctly show configuration placeholders instead of invalid scan codes.

## Deploying

Upload the **contents of `site/`**, not the entire source repository, to a static host's website root. Suitable services include Cloudflare Pages (Direct Upload), Netlify (drag/drop), AWS S3 + CDN, or a conventional web server. No server-side runtime is needed in production. For a hostname root, build with `--base-url https://research.example.org`. For a subdirectory such as `/AGM/`, use `--base-url https://nordikinstitute.github.io/AGM --base-path /AGM`; this prefixes generated internal links and the project search data request so the site works beneath that path.

Original PDFs total about 100 MB, so verify your hosting upload and bandwidth constraints. Poster thumbs and page HTML remain lightweight. The PDF preview uses native browser rendering and will work in modern browsers with PDF support; the fallback is the original PDF in its own tab.

**Research is grounded in the attached original PDFs**. For the organization's general positioning, see [NORDIK's official site](https://nordikinstitute.com/).
