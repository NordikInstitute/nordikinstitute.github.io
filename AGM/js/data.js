// Loads assets/projects.json, the single source of truth for the twelve posters.

export const CATEGORIES = {
  ai: 'AI & data',
  environment: 'Environment',
  finance: 'Finance',
  economics: 'Economics',
  workforce: 'Workforce & immigration',
  health: 'Health',
  indigenous: 'Indigenous partnerships',
  culture: 'Arts & culture',
};

// Compact names used in previews.
const SHORT_LABELS = {
  'spruce-budworm-radar': 'Spruce budworm radar',
  'data-north': 'DATA NORTH',
  'water-quality-monitoring': 'Water quality monitoring',
  'canadian-financial-stress-index': 'Financial stress index',
  'volt-libraries': 'V.O.L.T. libraries',
  'newcomer-skills': 'Newcomer skills',
  'counting-every-voice': 'Counting Every Voice',
  'adhd-workplace': 'ADHD in the workplace',
  'rural-physician-recruitment': 'Rural physician recruitment',
  'csaa-ongoing-support': 'CSAA ongoing support',
  'csaa-unmarked-burials': 'Unmarked burials',
  'in-situ': 'IN SITU',
};

// The same people appear with slightly different spellings across posters
// (merge confirmed by the organiser, 2026-10-19).
const NAME_ALIASES = { 'Md Soaib Hossain': 'Md. Soaib Hossain', 'Mushfika Latif': 'Mushfika Binta Latif' };

export async function loadProjects() {
  const res = await fetch('assets/projects.json');
  if (!res.ok) throw new Error(`projects.json: HTTP ${res.status}`);
  const list = await res.json();
  return list.map((p, i) => ({
    ...p,
    num: String(i + 1).padStart(2, '0'),
    categoryLabel: CATEGORIES[p.category] ?? p.category,
    label: SHORT_LABELS[p.slug] ?? p.title.split(/[:—–]/)[0].trim(),
    team: (p.team ?? []).map((n) => NAME_ALIASES[n] ?? n),
    thumb: `assets/thumbs/${p.slug}.webp`,
    preview: `assets/previews/${p.slug}.webp`,
    pdf: `assets/posters/${p.slug}.pdf`,
  }));
}

// "40" -> {n: 40, prefix: '', suffix: ''}; ranges and years return null.
export function parseFigure(raw) {
  const s = String(raw).trim();
  if (/^\d{4}\s*[-–]\s*\d{2,4}$/.test(s)) return null;
  const m = s.match(/^([^\d]*)([\d,]*\.?\d+)(.*)$/);
  return m ? { n: parseFloat(m[2].replace(/,/g, '')), prefix: m[1], suffix: m[3] } : null;
}
