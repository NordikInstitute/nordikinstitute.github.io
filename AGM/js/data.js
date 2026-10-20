// Loads assets/projects.json (the single source of truth for the twelve
// posters) and derives the views the page needs.

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

// Compact names for chips and source tags.
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

// The same people appear with slightly different spellings across posters.
// Editorial normalisation; confirm with the teams before reuse elsewhere.
const NAME_ALIASES = {
  'Md Soaib Hossain': 'Md. Soaib Hossain',
  'Mushfika Latif': 'Mushfika Binta Latif',
};
export const normName = (n) => NAME_ALIASES[n] ?? n;

// Figures curated for the Evidence section. Every value and label is taken
// from the named project's metrics, intro or findings in projects.json.
export const EVIDENCE = [
  { slug: 'canadian-financial-stress-index', value: '649,804', label: 'posts from five national news outlets on X, 2017 to 2024, read for signs of financial stress.', size: 'wide', accent: true },
  { slug: 'water-quality-monitoring', value: '45k+', label: 'water-quality data points collected by community volunteers across 46 sites, 2021 to 2026.' },
  { slug: 'spruce-budworm-radar', value: '2,052', label: 'weather-radar scenes analysed for migrating spruce budworm swarms, across 57 experiments.' },
  { slug: 'water-quality-monitoring', value: '67', label: 'youth mentored, trained or hired, including 52 Indigenous youth interns and hires from 15 First Nations.' },
  { slug: 'counting-every-voice', value: '33', label: 'publicly identified local immigrant survey reports reviewed.' },
  { slug: 'rural-physician-recruitment', value: '18%', label: 'of Canada’s population lives in rural and remote communities, served by about 8% of physicians.', size: 'wide' },
  { slug: 'counting-every-voice', value: '18 of 23', label: 'compared surveys showed major divergence from census benchmarks in at least one category.' },
  { slug: 'volt-libraries', value: '7', label: 'domains used to describe the social value of Ontario’s public libraries, from education to civic space.' },
  { slug: 'water-quality-monitoring', value: '200+', label: 'volunteers took part in community-based water monitoring over five years.' },
  { slug: 'water-quality-monitoring', value: '4 of 8', label: 'pilot communities now independently manage expanded, permanent monitoring programs.' },
];

export async function loadProjects() {
  const res = await fetch('assets/projects.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`projects.json: HTTP ${res.status}`);
  const list = await res.json();
  return list.map((p, i) => ({
    ...p,
    index: i,
    num: String(i + 1).padStart(2, '0'),
    categoryLabel: CATEGORIES[p.category] ?? p.category,
    label: SHORT_LABELS[p.slug] ?? p.title.split(/[:—–]/)[0].trim(),
    team: (p.team ?? []).map(normName),
    thumb: `assets/thumbs/${p.slug}.webp`,
    preview: `assets/previews/${p.slug}.webp`,
    pdf: `assets/posters/${p.slug}.pdf`,
  }));
}

export function bySlug(projects) {
  return Object.fromEntries(projects.map((p) => [p.slug, p]));
}

export function categoryCounts(projects) {
  const counts = {};
  for (const p of projects) counts[p.category] = (counts[p.category] ?? 0) + 1;
  return Object.keys(CATEGORIES).filter((k) => counts[k]).map((k) => ({ key: k, label: CATEGORIES[k], count: counts[k] }));
}

export function researchers(projects) {
  const map = new Map();
  for (const p of projects) {
    for (const name of p.team) {
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(p);
    }
  }
  const surname = (n) => n.replace(/^Dr\.\s+/, '').split(' ').slice(-1)[0];
  return [...map.entries()]
    .map(([name, projs]) => ({ name, projects: projs }))
    .sort((a, b) => b.projects.length - a.projects.length || surname(a.name).localeCompare(surname(b.name)));
}

export function partners(projects) {
  const seen = new Map();
  for (const p of projects) for (const name of p.partners ?? []) if (!seen.has(name)) seen.set(name, p);
  return [...seen.keys()];
}

export function themes(projects) {
  const seen = new Set();
  for (const p of projects) for (const t of p.tags ?? []) seen.add(t);
  return [...seen];
}

// "2,052" -> {n: 2052, decimals: 0, prefix: '', suffix: ''}; "45k+" -> {n: 45, suffix: 'k+'}.
// Values that are ranges or years ("2017-24") are returned as null: shown as-is.
export function parseFigure(raw) {
  const s = String(raw).trim();
  if (/^\d{4}\s*[-–]\s*\d{2,4}$/.test(s) || /^\d{4}$/.test(s)) return null;
  const m = s.match(/^([^\d]*)([\d,]*\.?\d+)(.*)$/);
  if (!m) return null;
  const digits = m[2].replace(/,/g, '');
  const decimals = digits.includes('.') ? digits.split('.')[1].length : 0;
  return { n: parseFloat(digits), decimals, grouped: m[2].includes(','), prefix: m[1], suffix: m[3] };
}
