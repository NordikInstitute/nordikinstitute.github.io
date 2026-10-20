# Verification results — 19 October 2026

- Built **67 static HTML routes**, including the homepage, 12 unique project profiles, 12 poster readers, 7 theme rooms, 23 unique printed-name researcher profiles, poster wall, connections, impact, guided tours and about pages.
- Verified all 12 supplied PDFs are present, individually readable by PyMuPDF and preserved without modification.
- Verified 12 optimized thumbnails and 12 source-rendered high-resolution previews.
- **7/7 automated offline unit/integrity tests passed:** internal navigation, all image/PDF paths, project count, category rooms, reviewer gates, researcher path uniqueness and key source facts.
- JS source passed `node --check` syntax validation.
- Headless Chromium visual tests (loaded via in-memory pages due environment localhost/navigation restrictions): desktop homepage, gallery, project, poster reader, themes, poster wall, connections; mobile homepage, gallery, project.
- Gallery manual interaction check: `eyad gad` returns **2/12** projects; health filter returns **2/12**.
- Poster viewer interaction check: zoom increases to **125%** and PDF mode becomes visible.
- Mobile navigation button opens successfully; 390px viewport has **no unintended horizontal page overflow** on home/gallery/project.
- Site build defaults to **noindex/nofollow**; simulated production `--release` correctly rejected when publication approvals remain unset.

## Remaining real-world steps

- Confirm permissions and review the two sensitive CST items with community partners.
- Check live hosted navigation on the final domain, and real PDF controls on mobile Safari/Chrome. Full browser navigation via local HTTP was blocked by the container's administrative browser policy, though static asset links were verified programmatically and interactions tested with in-memory HTML.
- Set live hostname for printable QR codes.
- Verify poster captions, actual links and content with individual project leads before launch.
- Complete an accessibility review with people using actual assistive technology.
