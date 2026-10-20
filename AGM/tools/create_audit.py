from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
p=json.loads((root/'content/projects.json').read_text(encoding='utf-8'))
titles={
'ai':'AI, Data & Digital Innovation','finance':'Finance','economics':'Economics, Education & Social Value','environment':'Water & Environment','workforce':'Workforce & Immigration','health':'Health & Wellbeing','indigenous':'Indigenous Research & Community Wellness','culture':'Arts, Culture & Place'}
with (root/'CONTENT_AUDIT.md').open('w', encoding='utf-8') as f:
 f.write('# Project-by-Project Source Audit\n\n')
 f.write('All twelve project cards and descriptions are grounded in the supplied, single-page original PDFs. Source files are preserved unmodified in `site/assets/posters/`. The thirteenth PDF is an institutional context page, not a research poster. No writer made up individual email addresses, headshots or numerical impact figures.\n\n')
 f.write('| # | Project as titled | Primary theme | Poster team, as printed | Source PDF (all p. 1) | Stage / source caution |\n|---|---|---|---|---|---|\n')
 for i,proj in enumerate(p,1):
  f.write(f'| {i:02d} | {proj["title"].replace("|","/")} | {titles[proj["category"]]} | {", ".join(proj["team"]) if proj["team"] else "No enumerated author team on poster"} | `{proj["pdfSource"]}` | {proj["status"]} |\n')
 f.write('\n## Institute-wide context (NOT a 13th poster)\n\n')
 f.write('`NORDIK_Executive_Summary_Page_11(2).pdf`, p. 11, from the 2025–2026 Annual Report: 22 projects, 40+ community collaborations, 26 employees, 18 student placements, 6 projects initiated/co-led by an Indigenous person or organization, 6 projects involving community-based researchers, and 5 involving Indigenous community-based researchers. All four strategic-goal counts are overlapping categories.\n\n')
 f.write('## Audit notes\n\n')
 f.write('- Source image-based spruce budworm poster was visually reviewed; its quantitative claims and team were transcribed from page 1.\n')
 f.write('- The two CST posters concern Indigenous-led community work and Residential School Survivors. Public distribution requires community permission.\n')
 f.write('- The survey methodology poster contains the conflicting 39/64 and 58% values; the online editorial summary does not propagate the conflict.\n')
 f.write('- Researcher labels preserve source variants, rather than guessing duplicate identities.\n')
 f.write('- Planned outcomes and prototype status are kept distinct from completed activities and experimentally reported findings.\n')
 f.write('- Methods, findings, metrics, partner attribution and exact original PDF mapping are editable under `content/projects.json` with a sourceNote per record.\n')
print('written audit')
