#!/usr/bin/env python3
"""Build the NORDIK Research Atlas as a dependency-free static website.

Usage: python tools/build.py [--base-url https://exhibition.example.org] [--base-path /AGM]
Paths: site/index.html; site/projects/{slug}/index.html; etc.
Release governance: see CONTENT_REVIEW.md before deploying.
"""
from pathlib import Path
from collections import Counter,defaultdict
from html import escape as h
from urllib.parse import quote
import json, shutil, argparse, re, datetime, os

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'site'
P=json.loads((ROOT/'content'/'projects.json').read_text(encoding='utf-8'))
for p in P: p['categoryName']=''
BY={p['slug']:p for p in P}
CATS=[
 ('ai','AI, Data & Digital Innovation','New tools for seeing patterns, understanding places and making sense of data.','01','aqua'),
 ('finance','Finance','A high-frequency reading of financial stress in Canadian news, set beside established market measures.','02','navy'),
 ('economics','Economics, Education & Social Value','How public institutions, especially libraries, account for learning, culture and community value.','03','gold'),
 ('environment','Water & Environment','Community-led monitoring and care for waters from Lake Superior to Lake Huron.','04','forest'),
 ('workforce','Workforce & Immigration','Connecting newcomer skills, local evidence and opportunity in Northern communities.','05','coral'),
 ('health','Health & Wellbeing','Improving support, access and quality of life through thoughtful research.','06','berry'),
 ('indigenous','Indigenous Research & Community Wellness','Grounded in community leadership, care, truth-telling and respectful stewardship.','07','clay'),
 ('culture','Arts, Culture & Place','Creative industries and the cultural ties that help non-urban places thrive.','08','purple')]
CM={r[0]:r for r in CATS}
THEME_WORD=('One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve'.split()+[str(len(CATS))])[len(CATS)-1]
for p in P:p['categoryName']=CM[p['category']][1]
TOURS=[
 {'slug':'data-to-decisions','name':'From Data to Decisions','eyebrow':'The data trail','intro':'Follow the journey from observing patterns to finding evidence that communities can use.','projects':['spruce-budworm-radar','data-north','canadian-financial-stress-index','counting-every-voice']},
 {'slug':'knowledge-and-resilience','name':'Community Knowledge & Resilience','eyebrow':'The community trail','intro':'Meet projects centred on local knowledge, community voice, shared spaces and cultural vitality.','projects':['water-quality-monitoring','csaa-ongoing-support','in-situ','volt-libraries']},
 {'slug':'people-and-possibility','name':'People, Place & Possibility','eyebrow':'The wellbeing trail','intro':'Explore the relationships between opportunity, inclusion, workforce systems and health.','projects':['newcomer-skills','counting-every-voice','adhd-workplace','rural-physician-recruitment']}
]
# Curated, purely topical cross-links, never assertions of formal collaboration.
LINKS=[('spruce-budworm-radar','water-quality-monitoring','Environmental monitoring'),('spruce-budworm-radar','data-north','Data and digital methods'),('spruce-budworm-radar','canadian-financial-stress-index','Machine learning approaches'),('data-north','canadian-financial-stress-index','Planned data-platform connection'),('data-north','counting-every-voice','Reliable community evidence'),('data-north','newcomer-skills','Data for regional planning'),('volt-libraries','in-situ','Cultural and social value'),('volt-libraries','counting-every-voice','Measuring community outcomes'),('newcomer-skills','counting-every-voice','Newcomer research methods'),('newcomer-skills','adhd-workplace','Workplace inclusion'),('adhd-workplace','rural-physician-recruitment','Health and work'),('csaa-ongoing-support','csaa-unmarked-burials','Community Support Team'),('csaa-ongoing-support','in-situ','Community and cultural resilience'),('water-quality-monitoring','in-situ','Place-based community work'),('rural-physician-recruitment','newcomer-skills','Regional workforce shortages')]

args=None
PEOPLE=defaultdict(list)
for p in P:
 for name in p.get('team',[]): PEOPLE[name].append(p)
def slugify(s):
 if s=='Md Soaib Hossain':return 'md-soaib-hossain-data-north'
 if s=='Md. Soaib Hossain':return 'md-soaib-hossain-finance'
 return re.sub(r'[^a-z0-9]+','-',s.lower().replace('dr. ','').replace('md. ','').replace('md ','' )).strip('-')
def E(s):return h(str(s),quote=True)
def site_prefix():return '/'+args.base_path.strip('/') if args and args.base_path else ''
def prefix_root_links(html,prefix):
 if not prefix:return html
 return re.sub(r'((?:href|src|data-src)=["\'])/(?!/)',lambda m:m.group(1)+prefix+'/',html)
def img(slug,kind='thumbs'):return f'/assets/{kind}/{slug}.webp'
def proj(slug):return '/projects/'+slug+'/'
def link(url,text,klass='',extra=''):return f'<a href="{E(url)}" class="{klass}" {extra}>{text}</a>'
def category_path(k):return f'/themes/{k}/'
def chip(text):return f'<span class="meta-chip">{E(text)}</span>'
def metric_pair(num,caption):return f'<div class="stat-item"><strong>{E(num)}</strong><span>{E(caption)}</span></div>'
def arrow():return '<span aria-hidden="true">↗</span>'
def poster_image(p,kind='thumbs',alt=None,extra=''):
    alt=alt or f"Original research poster for {p['title']}"
    return f'<img src="{img(p["slug"],kind)}" alt="{E(alt)}" loading="lazy" decoding="async" {extra}>'
def pp(p):return proj(p['slug'])
def teamurl(name):return '/people/'+slugify(name)+'/'

def nav(active):
 navitems=[('Exhibition','/explore/','explore'),('Themes','/themes/','themes'),('People','/people/','people'),('Connections','/connections/','connections'),('Impact','/impact/','impact')]
 items=''.join(f'<a href="{url}" '+('aria-current="page" ' if active==key else '')+f'>{label}</a>' for label,url,key in navitems)
 return '''<a class="skip-link" href="#main">Skip to main content</a>
 <div class="announcement"><div class="wrap announce-inside"><span><span class="status-dot"></span> NORDIK INSTITUTE <span class="announcement-sep">/</span> 2025–2026 RESEARCH SHOWCASE</span><span class="announcement-right">A digital companion to the Annual Meeting <span aria-hidden="true">↗</span></span></div></div>
 <header class="site-header"><div class="wrap header-inside"><a href="/" class="brand" aria-label="NORDIK Research Atlas — home"><span class="brand-symbol" aria-hidden="true">N<span class="brand-punct">✳</span></span><span class="brand-type"><b>NORDIK</b><small>RESEARCH ATLAS</small></span></a><nav class="desktop-nav" aria-label="Main navigation">'''+items+'''</nav><div class="nav-actions"><a href="/wall/" class="button button-dark button-small">Visit the poster wall <span aria-hidden="true">↗</span></a><button class="mobile-toggle" type="button" id="mobile-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="Toggle menu"><span></span><span></span><span></span></button></div></div><nav class="mobile-nav" aria-label="Mobile navigation" id="mobile-nav" hidden>'''+items+'<a href="/wall/">Poster wall ↗</a></nav></header>'

def footer():
 return '''<footer class="footer"><div class="wrap"><div class="footer-top"><div class="footer-identity"><div class="foot-mark">N<span>✳</span></div><h2>Ideas rooted in place.<br><em>Research for possibility.</em></h2><p>A digital window into community-engaged research at NORDIK Institute.</p></div><div class="footer-links"><div><b>Explore</b><a href="/explore/">All projects</a><a href="/themes/">Themes</a><a href="/people/">Research teams</a><a href="/tour/">Guided tours</a></div><div><b>About</b><a href="/impact/">Our impact</a><a href="/about/">About this exhibition</a><a href="https://nordikinstitute.com/" rel="noopener" target="_blank">NORDIK Institute ↗</a><a href="mailto:info@nordikinstitute.com">Get in touch ↗</a></div></div></div><div class="footer-bottom"><span>© NORDIK Research Atlas · Exhibition preview, 2026</span><span>Research content comes from the supplied exhibition posters. <a href="/about/">Credits & accessibility</a></span></div></div></footer>'''

def page(title, desc, body, active='',slug_path='/', ogimage=None):
 og=ogimage or '/assets/thumbs/water-quality-monitoring.webp'
 if args and args.base_url:og=args.base_url.rstrip('/')+og
 robot=('index,follow' if args and args.release else 'noindex,nofollow')
 fulltitle=title+' | NORDIK Research Atlas'
 return f'''<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="robots" content="{robot}"><meta name="site-base-path" content="{E(site_prefix())}"><meta name="theme-color" content="#122f39"><meta name="description" content="{E(desc)}"><title>{E(fulltitle)}</title><meta property="og:title" content="{E(fulltitle)}"><meta property="og:description" content="{E(desc)}"><meta property="og:type" content="website"><meta property="og:image" content="{E(og)}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/static/styles.css"><script src="/static/app.js" defer></script></head><body>{nav(active)}<main id="main">{body}</main>{footer()}</body></html>'''

def write(path,html):
 p=OUT/path/'index.html';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(prefix_root_links(html,site_prefix()),encoding='utf-8')

def project_card(p,i=0,extra=''):
 k=CM[p['category']]
 return f'''<article class="project-card {extra}" data-title="{E(p['title'])}" data-cat="{E(p['category'])}" data-tags="{E(' '.join(p['tags']))}"><a href="{pp(p)}" class="card-image" aria-label="Explore {E(p['title'])}">{poster_image(p)}<span class="card-image-icon" aria-hidden="true">↗</span></a><div class="card-copy"><div class="card-topline"><span class="category-dot {k[4]}"></span><span>{E(k[1])}</span></div><h3><a href="{pp(p)}">{E(p['shortTitle'])}</a></h3><p>{E(p['subtitle'])}</p><div class="card-bottom"><span>PROJECT {i+1:02d} / 12</span><a href="{pp(p)}" aria-label="Explore {E(p['title'])}">Discover <span aria-hidden="true">↗</span></a></div></div></article>'''

def section_head(kicker,title,action='',body=''):
 return f'<div class="section-heading"><div><span class="eyebrow">{E(kicker)}</span><h2>{title}</h2>{body}</div>{action}</div>'

def home():
 hero_cards=''.join(f'<a class="hero-poster hero-poster-{i}" href="{pp(BY[s])}" aria-label="Explore {E(BY[s]["title"])}">{poster_image(BY[s])}<span class="hero-poster-caption">{E(BY[s]["shortTitle"])}</span></a>' for i,s in enumerate(['water-quality-monitoring','spruce-budworm-radar','in-situ'],1))
 cat_icons={'ai':'✳','finance':'◈','environment':'≈','economics':'↗','workforce':'◎','health':'✺','indigenous':'✧','culture':'✱'}
 category_cards=''.join(f'<a href="{category_path(k)}" class="theme-tile theme-{tone}"><div class="theme-tile-top"><span class="theme-number">{num} / {len(CATS):02d}</span><span class="theme-icon" aria-hidden="true">{cat_icons[k]}</span></div><h3>{E(name)}</h3><div class="theme-bottom"><span>{sum(p["category"]==k for p in P)} project{ "s" if sum(p["category"]==k for p in P)!=1 else ""}</span><span aria-hidden="true">↗</span></div></a>' for k,name,desc,num,tone in CATS)
 features=''.join(project_card(BY[s],list(BY).index(s),'featured-card') for s in ['water-quality-monitoring','data-north','csaa-ongoing-support','volt-libraries'])
 body=f'''<section class="hero"><div class="wrap hero-grid"><div class="hero-copy"><div class="hero-line"><span class="gold-line"></span> AN EXHIBITION OF IDEAS, PEOPLE & PLACE</div><h1>Research changes how we see a <em>place.</em></h1><p>Across Northern Ontario and beyond, people are asking better questions, building meaningful partnerships, and creating knowledge that matters. Explore the work behind the stories.</p><div class="hero-cta"><a href="/explore/" class="button button-gold">Explore the research <span aria-hidden="true">↗</span></a><a href="/tour/" class="ghost-link">Take a guided tour <span aria-hidden="true">↗</span></a></div><div class="hero-down"><span class="round-mini" aria-hidden="true">↓</span> SCROLL TO EXPLORE <span class="hero-stroke"></span> 12 PROJECTS · {len(CATS)} THEMES</div></div><div class="hero-visual" aria-label="Collage of three original research posters"><div class="hero-decoration decoration-one"></div><div class="hero-decoration decoration-two"></div><div class="hero-orbit hero-orbit-1"></div><div class="hero-orbit hero-orbit-2"></div>{hero_cards}<div class="hero-pin"><span>✦</span><b>Made of<br>connections.</b></div></div></div><div class="hero-foot-curve"></div></section>
 <section class="count-band"><div class="wrap count-row"><div class="count-intro"><span class="eyebrow">The exhibition, at a glance</span><p>A snapshot of the many ways NORDIK connects knowledge, communities and change.</p></div><div class="count-display">{metric_pair('12','research posters')}{metric_pair(str(len(CATS)),'themes to explore')}{metric_pair('22','institute-wide projects¹')}{metric_pair('40+','community collaborations¹')}</div></div><div class="wrap count-note">¹ From the 2025–2026 institutional executive summary; not counts of posters in this exhibition.</div></section>
 <section class="section section-themes"><div class="wrap">{section_head('FIND YOUR CURIOSITY',f'{THEME_WORD} themes. <em>Countless connections.</em>','<a href="/themes/" class="text-action">View all themes ↗</a>','<p>Artificial intelligence, finance, economics and education, water, health, workforce, Indigenous research and culture. Start with the question you care about.</p>')}<div class="theme-grid">{category_cards}</div></div></section>
 <section class="section section-selected"><div class="wrap">{section_head('FROM THE EXHIBITION','Ideas worth <em>exploring.</em>','<a href="/explore/" class="text-action">Browse all 12 projects ↗</a>','<p>Research that looks closer, thinks bigger and invites us to imagine what comes next.</p>')}<div class="project-grid featured-grid">{features}</div></div></section>
 <section class="feature-split"><div class="wrap feature-split-grid"><div class="feature-words"><span class="eyebrow light">A DIFFERENT WAY TO DISCOVER</span><h2>Every project is part of a <em>larger story.</em></h2><p>See the unexpected threads between AI and forest health, libraries and community value, or public health and regional workforce challenges.</p><div class="split-links"><a href="/connections/" class="button button-gold">Explore the connections ↗</a><a href="/wall/" class="ghost-link">Visit the poster wall ↗</a></div></div><div class="feature-art" aria-hidden="true"><div class="orbit-ring r1"></div><div class="orbit-ring r2"></div><div class="orbit-ring r3"></div><i class="orbit-core">N<span>✳</span></i><i class="orbit-label label-a">DATA</i><i class="orbit-label label-b">PEOPLE</i><i class="orbit-label label-c">PLACE</i><i class="orbit-label label-d">IMPACT</i><i class="orbit-spark spark-a"></i><i class="orbit-spark spark-b"></i></div></div></section>
 <section class="section section-journeys"><div class="wrap">{section_head('FOLLOW A THREAD','A little curiosity can take you <em>far.</em>','<a href="/tour/" class="text-action">See guided journeys ↗</a>')}<div class="journey-grid">{tour_tiles()}</div></div></section>
 <section class="closing-cta"><div class="wrap closing-inner"><span class="eyebrow">RESEARCH FOR EVERYONE</span><h2>There’s always more<br>to the <em>story.</em></h2><p>Meet the researchers, study the posters, and explore the questions shaping stronger communities.</p><a href="/wall/" class="button button-dark">Step inside the poster hall ↗</a></div></section>'''
 return page('Discover the ideas',f'Explore 12 real NORDIK research posters across {len(CATS)} themes, with research teams and impact stories.',body)

def explore():
 chips='<button class="filter-chip selected" type="button" data-filter="all" aria-pressed="true">All projects <span>12</span></button>'+''.join(f'<button class="filter-chip" type="button" data-filter="{k}" aria-pressed="false">{E(name.split(" & ")[0])} <span>{sum(p["category"]==k for p in P)}</span></button>' for k,name,*_ in CATS)
 cards=''.join(project_card(p,i) for i,p in enumerate(P))
 body=f'''<section class="page-intro page-intro-sage"><div class="wrap"><div class="crumb"><a href="/">Home</a> / The exhibition</div><span class="eyebrow">THE EXHIBITION / ALL 12 PROJECTS</span><h1>Explore what we're <em>discovering.</em></h1><p>Twelve projects. Real questions. New perspectives. Search the research, or follow a theme that sparks your curiosity.</p></div></section><section class="section explore-section"><div class="wrap"><div class="filters" id="filters"><label class="search-control"><span class="search-symbol" aria-hidden="true">⌕</span><span class="sr-only">Search projects, people or keywords</span><input id="project-search" type="search" placeholder="Search projects, people or topics…" autocomplete="off"></label><label class="sort-control">Sort by <select id="project-sort"><option value="curated">Curated order</option><option value="az">Title A–Z</option><option value="za">Title Z–A</option></select></label></div><div class="chip-row" role="group" aria-label="Filter by theme">{chips}</div><div class="results-head"><span id="results-label" aria-live="polite">Showing all 12 projects</span><a href="/wall/">Prefer the poster wall? ↗</a></div><div class="project-grid" id="project-grid">{cards}</div><div class="no-results" id="empty-projects" hidden><h3>No projects match that search.</h3><p>Try another keyword or clear the filters to see all 12.</p><button type="button" class="button button-dark" id="reset-filters">Clear filters</button></div></div></section>'''
 return page('Explore all projects','Search, filter and discover the 12 real research posters in the NORDIK Research Atlas.',body,active='explore')

def theme_list():
 theme_html=''.join(f'''<a href="{category_path(k)}" class="theme-editorial theme-editorial-{tone}"><div class="themerail"><span>{num}</span><span aria-hidden="true">↗</span></div><div class="theme-editorial-content"><span class="eyebrow">{sum(p["category"]==k for p in P)} PROJECT{'' if sum(p['category']==k for p in P)==1 else 'S'}</span><h2>{E(name)}</h2><p>{E(desc)}</p><span class="inline-action">Explore this theme <span aria-hidden="true">↗</span></span></div><div class="theme-art">{poster_image(next(p for p in P if p['category']==k))}</div></a>''' for k,name,desc,num,tone in CATS)
 body=f'''<section class="page-intro page-intro-cream"><div class="wrap"><div class="crumb"><a href="/">Home</a> / Themes</div><span class="eyebrow">EXPLORE BY THEME</span><h1>Different disciplines. <em>Shared purpose.</em></h1><p>Find your way through {len(CATS)} areas of inquiry, including artificial intelligence, finance, economics and education, and water. Projects also connect across themes.</p></div></section><section class="section"><div class="wrap"><div class="themes-editorial">{theme_html}</div></div></section>'''
 return page('Research themes',f'Explore {len(CATS)} research disciplines and community-impact themes.',body,'themes')

def theme_detail(k):
 _,name,desc,num,tone=CM[k];members=[p for p in P if p['category']==k]
 cards=''.join(project_card(p,list(BY).index(p['slug'])) for p in members)
 body=f'''<section class="page-intro page-intro-sage theme-detail-hero"><div class="wrap"><div class="crumb"><a href="/">Home</a> / <a href="/themes/">Themes</a> / {E(name)}</div><span class="eyebrow">RESEARCH THEME {E(num)} / {len(CATS):02d}</span><h1>{E(name)}</h1><p>{E(desc)}</p><span class="theme-countline">{len(members)} original research poster{'' if len(members)==1 else 's'} in this collection</span></div></section><section class="section"><div class="wrap"><div class="section-heading"><div><span class="eyebrow">THE COLLECTION</span><h2>Discover the <em>projects.</em></h2></div><a class="text-action" href="/themes/">← All themes</a></div><div class="project-grid">{cards}</div><div class="browse-next"><p>Curiosity doesn't stop at one theme.</p><a href="/connections/" class="button button-dark">Explore cross-disciplinary connections ↗</a></div></div></section>'''
 return page(name,desc,body,'themes')

def ul(items,klass='detail-list'):
 return '<ul class="'+klass+'">'+''.join('<li>'+E(x)+'</li>' for x in items)+'</ul>' if items else ''

def project_detail(p):
 k=CM[p['category']]
 keydata=''.join(f'<div class="mini-metric"><strong>{E(num)}</strong><span>{E(label)}</span></div>' for num,label in p.get('metrics',[]))
 people=''.join(f'<a class="person-link" href="{teamurl(name)}"><span class="person-avatar" aria-hidden="true">{E("".join(x[0] for x in re.sub(r"^Dr\\. |^Md\\. |^Md ","",name).split()[:2]))}</span><span>{E(name)}</span><span class="person-arrow" aria-hidden="true">↗</span></a>' for name in p['team']) if p['team'] else '<p class="small-muted">Individual poster authors are not separately identified in the supplied source. See project partners and poster credits.</p>'
 contrib=''
 if p.get('contributors'):
  contrib='<h3>Named contributors in the poster</h3><ul class="contributors">'+''.join(f'<li><b>{E(c["name"])}</b><span>{E(c["role"])}</span></li>' for c in p['contributors'])+'</ul>'
 partners=''.join('<li>'+E(x)+'</li>' for x in p.get('partners',[]))
 external=''.join(f'<a class="resource-link" href="{E(l["url"])}" target="_blank" rel="noopener noreferrer">{E(l["title"])} <span aria-hidden="true">↗</span></a>' for l in p['externalLinks'])
 impacts=f'<div class="insight"><div class="insight-symbol">✳</div><div><span class="eyebrow">WHAT THIS COULD MEAN</span><p>{E(p["impact"])}</p></div></div>'
 note='<aside class="care-note"><span class="care-icon">✧</span><div><strong>Research with care</strong><p>This project concerns Residential School Survivors, families and Indigenous community leadership. The poster contains sensitive history; content is shared here for exhibition review. Public use, imagery and descriptions require approval from the appropriate community partners. Protected database records are not made available here.</p></div></aside>' if p['sensitive'] else ''
 related=''.join(project_card(BY[s],list(BY).index(s)) for s in p['related'][:3])
 subject=quote('Inquiry about NORDIK research: '+p['title'])
 body=f'''<section class="project-hero"><div class="wrap"><div class="crumb"><a href="/">Home</a> / <a href="/explore/">Projects</a> / {E(p['shortTitle'])}</div><div class="project-hero-grid"><div class="project-hero-copy"><span class="eyebrow"><span class="category-dot {E(k[4])}"></span> {E(k[1])}</span><h1>{E(p['title'])}</h1><p class="project-lede">{E(p['subtitle'])}</p><div class="project-meta"><span><b>RESEARCH STATUS</b>{E(p['status'])}</span><span><b>FOCUS</b>{E(' · '.join(p['tags'][:3]))}</span></div><div class="hero-actions"><a href="{pp(p)}poster/" class="button button-dark">Explore the original poster ↗</a><a href="/explore/" class="text-action">← Back to projects</a></div></div><a class="detail-poster-wrap" href="{pp(p)}poster/" aria-label="Open interactive poster viewer for {E(p['title'])}">{poster_image(p, 'previews',extra='fetchpriority="high"')}<span class="detail-poster-overlay">View full poster <span aria-hidden="true">↗</span></span></a></div></div></section><div class="wrap project-detail-layout"><div class="project-main">{note}<section class="project-story"><span class="eyebrow">01 / THE BIG QUESTION</span><h2>What is this research <em>about?</em></h2><p class="large-para">{E(p['intro'])}</p><blockquote class="research-question">“{E(p['question'])}”</blockquote></section><section class="project-story"><span class="eyebrow">02 / THE APPROACH</span><h2>How the work <em>comes together.</em></h2>{ul(p['methods'])}</section><section class="project-story"><span class="eyebrow">03 / WHAT WE'RE LEARNING</span><h2>Findings & <em>progress.</em></h2>{ul(p['findings'],'finding-list')}{('<div class="mini-metrics">'+keydata+'</div>') if keydata else ''}{impacts}</section><section class="project-story"><span class="eyebrow">04 / GO FURTHER</span><h2>Explore the <em>sources.</em></h2><p>The original research poster is preserved as supplied. The summaries here are written for a broader audience; refer to the poster for full context and figures.</p><div class="resource-stack"><a class="resource-link" href="{pp(p)}poster/">Read the original poster online <span aria-hidden="true">↗</span></a><a class="resource-link" href="/assets/posters/{E(p['slug'])}.pdf" target="_blank" rel="noopener">Open source PDF in a new tab <span aria-hidden="true">↗</span></a>{external}</div><p class="source-fineprint">Source: {E(p['pdfSource'])}, page 1. {E(p.get('sourceNote',''))}</p></section></div><aside class="project-sidebar"><div class="sidebar-panel"><span class="eyebrow">THE PEOPLE BEHIND THE WORK</span><h3>Research team</h3><div class="person-list">{people}</div>{contrib}</div>{('<div class="sidebar-panel"><span class="eyebrow">WORKING WITH</span><h3>Named organizations</h3><ul class="partner-list">'+partners+'</ul></div>') if partners else ''}<div class="sidebar-panel sidebar-contact"><span class="eyebrow">START A CONVERSATION</span><h3>Research opens doors.</h3><p>Interested in this work? Contact the institute and mention this project.</p><a class="button button-outline" href="mailto:info@nordikinstitute.com?subject={subject}">Contact NORDIK ↗</a></div></aside></div><section class="section related-section"><div class="wrap">{section_head('KEEP DISCOVERING','Follow the <em>connections.</em>','<a class="text-action" href="/connections/">See the constellation ↗</a>','<p>Other projects with shared methods, interests or community questions.</p>')}<div class="project-grid related-grid">{related}</div></div></section>'''
 return page(p['title'],p['intro'][:240],body,'explore',ogimage=img(p['slug']))

def poster_viewer(p):
 # Uses real PDF in browser PDF viewer and a zoomable source-rendered image with pan controls.
 body=f'''<section class="viewer-page"><div class="wrap"><div class="crumb"><a href="/">Home</a> / <a href="/explore/">Projects</a> / <a href="{pp(p)}">{E(p['shortTitle'])}</a> / Poster viewer</div><div class="viewer-heading"><div><span class="eyebrow">THE ORIGINAL POSTER / READING ROOM</span><h1>{E(p['title'])}</h1><p>Explore the original source at your own pace. Use the zoom controls or switch to the vector PDF for fine detail.</p></div><a href="{pp(p)}" class="button button-outline">← Project story</a></div><div class="reader" id="reader"><div class="reader-toolbar"><div class="reader-modes" role="tablist" aria-label="Poster reading mode"><button type="button" id="mode-image" aria-controls="image-reader" aria-selected="true" role="tab" class="reader-tab active">Zoomable poster</button><button type="button" id="mode-pdf" aria-controls="pdf-reader" aria-selected="false" role="tab" class="reader-tab">Original PDF</button></div><div class="reader-tools"><button type="button" id="zoom-out" aria-label="Zoom out" title="Zoom out">−</button><output id="zoom-value" aria-live="polite">100%</output><button type="button" id="zoom-in" aria-label="Zoom in" title="Zoom in">+</button><button type="button" id="zoom-fit" aria-label="Fit poster to width" title="Fit poster to width">Fit</button><button type="button" id="reader-fullscreen" aria-label="Toggle fullscreen" title="Fullscreen">⛶</button></div></div><div class="reader-stage" id="image-reader" role="tabpanel" aria-labelledby="mode-image"><div id="poster-scroller" class="poster-scroller">{poster_image(p,'previews',alt='Full source-derived preview of original poster. Use the project description for an accessible text alternative.',extra='id="zoom-image" loading="eager"')}</div></div><div class="pdf-stage" id="pdf-reader" role="tabpanel" aria-labelledby="mode-pdf" hidden><iframe title="Original PDF poster: {E(p['title'])}" data-src="/assets/posters/{E(p['slug'])}.pdf#toolbar=1" loading="lazy"></iframe><p>If your device does not display embedded PDFs, use the <a href="/assets/posters/{E(p['slug'])}.pdf" target="_blank">original PDF link</a>.</p></div><div class="reader-foot"><span>ORIGINAL FILE · 1 PAGE</span><div><a href="/assets/posters/{E(p['slug'])}.pdf" target="_blank" rel="noopener">Open PDF ↗</a><a href="/assets/posters/{E(p['slug'])}.pdf" download="{E(p['slug'])}.pdf">Download original ↓</a></div></div></div><div class="viewer-access"><div><h2>Prefer reading the research as text?</h2><p>Every project includes an accessible plain-language description of its question, methods, findings, team and impact. The poster image is not the only way to understand the research.</p></div><a href="{pp(p)}" class="button button-dark">Read the project story ↗</a></div></div></section>'''
 return page('Poster: '+p['title'], 'Read and zoom the original research poster: '+p['title'],body,'explore',ogimage=img(p['slug']))

def person_card(name,pr):
 initials=''.join(w[0] for w in re.sub(r'^Dr\. |^Md\. |^Md ','',name).split()[:2]).upper()
 return f'''<a class="researcher-card" href="{teamurl(name)}"><span class="researcher-initial">{E(initials)}</span><div><h3>{E(name)}</h3><p>{len(pr)} exhibition project{'' if len(pr)==1 else 's'}</p></div><span class="rc-arrow" aria-hidden="true">↗</span></a>'''

def people_page():
 cards=''.join(person_card(n,PEOPLE[n]) for n in sorted(PEOPLE,key=lambda k:k.lower().replace('dr. ','')))
 body=f'''<section class="page-intro page-intro-sage"><div class="wrap"><div class="crumb"><a href="/">Home</a> / People</div><span class="eyebrow">PEOPLE BEHIND THE RESEARCH</span><h1>Research is a <em>human story.</em></h1><p>Meet the people named on the supplied posters and see how their work connects across disciplines.</p></div></section><section class="section"><div class="wrap"><div class="people-toolbar"><div><span class="eyebrow">RESEARCH TEAM INDEX</span><h2>{len(PEOPLE)} named researchers</h2><p>Some projects list organizations or community contributors rather than individual authors.</p></div><label class="search-control people-search"><span class="search-symbol">⌕</span><span class="sr-only">Search researchers</span><input type="search" id="people-search" placeholder="Search by name…"></label></div><div class="researcher-grid" id="researcher-grid">{cards}</div><p class="no-results" id="empty-people" hidden>No matching people. Try another name.</p><p class="source-fineprint">Names are reproduced as printed on the source posters. The directory does not assert unverified affiliations, biographies or public email addresses. Different printed name variants have not been merged without confirmation.</p></div></section>'''
 return page('People and research teams','Discover people named on the research posters and the projects they contribute to.',body,'people')

def person_detail(name):
 ps=PEOPLE[name]
 cards=''.join(project_card(p,list(BY).index(p['slug'])) for p in ps)
 body=f'''<section class="page-intro page-intro-sage"><div class="wrap"><div class="crumb"><a href="/">Home</a> / <a href="/people/">People</a> / {E(name)}</div><span class="eyebrow">RESEARCH TEAM MEMBER / POSTER CREDITS</span><h1>{E(name)}</h1><p>Named as part of the research team on {len(ps)} supplied exhibition poster{'' if len(ps)==1 else 's'}.</p></div></section><section class="section"><div class="wrap">{section_head('FROM THE POSTERS','Their featured <em>projects.</em>','<a href="/people/" class="text-action">← All researchers</a>')}<div class="project-grid">{cards}</div><p class="source-fineprint">This entry is based on printed poster team credits. No biography, portrait, job title or contact details have been inferred.</p></div></section>'''
 return page(name,'Exhibition projects listing '+name+' in research poster team credits.',body,'people')

def tour_tiles():
 visual=['spruce-budworm-radar','water-quality-monitoring','adhd-workplace']
 return ''.join(f'''<a href="/tour/{t['slug']}/" class="journey-card"><div class="journey-number">0{i+1} / 03 <span aria-hidden="true">↗</span></div><span class="eyebrow">{E(t['eyebrow'])}</span><h3>{E(t['name'])}</h3><p>{E(t['intro'])}</p><div class="journey-bottom"><div class="journey-stack">{''.join(poster_image(BY[s]) for s in t['projects'][:3])}</div><span>{len(t['projects'])} stops</span></div></a>''' for i,t in enumerate(TOURS))

def tours_page():
 body=f'''<section class="page-intro page-intro-cream"><div class="wrap"><div class="crumb"><a href="/">Home</a> / Guided tours</div><span class="eyebrow">A FEW GOOD PLACES TO START</span><h1>Follow a thread. <em>Find a world.</em></h1><p>Short self-guided pathways introduce related projects. Take them in order, or jump straight to anything that catches your eye.</p></div></section><section class="section"><div class="wrap"><div class="journey-grid">{tour_tiles()}</div></div></section>'''
 return page('Guided discovery journeys','Three curated routes through the research exhibition.',body)

def tour_detail(t):
 steps=''.join(f'''<div class="tour-stop"><span class="stop-number">STOP {i+1:02d}</span><a href="{pp(BY[s])}" class="stop-picture">{poster_image(BY[s])}</a><div><span class="eyebrow">{E(CM[BY[s]['category']][1])}</span><h2>{E(BY[s]['shortTitle'])}</h2><p>{E(BY[s]['intro'])}</p><a href="{pp(BY[s])}" class="text-action">Explore this project ↗</a></div></div>''' for i,s in enumerate(t['projects']))
 body=f'''<section class="page-intro page-intro-sage"><div class="wrap"><div class="crumb"><a href="/">Home</a> / <a href="/tour/">Guided tours</a> / {E(t['name'])}</div><span class="eyebrow">SELF-GUIDED JOURNEY · {len(t['projects'])} STOPS</span><h1>{E(t['name'])}</h1><p>{E(t['intro'])}</p></div></section><section class="section"><div class="wrap"><div class="tour-contents"><strong>YOUR ROUTE</strong><div>{''.join(f'<a href="{pp(BY[s])}">{i+1:02d}. {E(BY[s]["shortTitle"])}</a>' for i,s in enumerate(t['projects']))}</div></div><div class="tour-list">{steps}</div><div class="browse-next"><p>Keep exploring beyond this trail.</p><a class="button button-dark" href="/explore/">See all 12 projects ↗</a></div></div></section>'''
 return page(t['name'],t['intro'],body)

def poster_wall():
 opening=BY['water-quality-monitoring']
 kicker=CM[opening['category']][1]
 findings=''.join(f'<li>{E(item)}</li>' for item in opening['findings'][:3])
 chips='<button class="filter-chip selected" type="button" data-hall-filter="all" aria-pressed="true">All rooms <span>12</span></button>'+''.join(f'<button class="filter-chip" type="button" data-hall-filter="{k}" aria-pressed="false">{E(name.split(" & ")[0])} <span>{sum(p["category"]==k for p in P)}</span></button>' for k,name,*_ in CATS)
 thumbs=''.join(f'<button type="button" class="hall-thumb" data-hall-slug="{E(p["slug"])}" data-cat="{E(p["category"])}" aria-current="{"true" if p["slug"]==opening["slug"] else "false"}"><img src="{img(p["slug"])}" alt="{E(p["shortTitle"])}"></button>' for p in P)
 slim=[{
  'slug':p['slug'],'title':p['title'],'shortTitle':p['shortTitle'],'subtitle':p['subtitle'],
  'question':p['question'],'category':p['category'],'categoryName':p['categoryName'],
  'status':p['status'],'sensitive':p['sensitive'],'findings':p['findings'][:3]
 } for p in P]
 items=''.join(f'''<a class="wall-item" href="{pp(p)}poster/" data-cat="{E(p['category'])}"><div class="wall-img">{poster_image(p)}<span class="wall-open">Open poster ↗</span></div><div class="wall-label"><span>{i+1:02d} / 12</span><h3>{E(p['shortTitle'])}</h3><small>{E(CM[p['category']][1])}</small></div></a>''' for i,p in enumerate(P))
 body=f'''<section class="page-intro page-intro-dark"><div class="wrap"><div class="crumb"><a href="/">Home</a> / Poster wall</div><span class="eyebrow light">THE DIGITAL EXHIBITION HALL</span><h1>Walk the <em>poster hall.</em></h1><p>The same twelve posters on the wall at the Annual Meeting. Move through them here by theme, read the question beside the sheet, then open any poster at full size.</p></div></section><section class="section wall-section"><div class="wrap"><div class="hall" id="exhibition-hall" tabindex="0" aria-label="Interactive poster hall"><div class="hall-layout"><div class="hall-stage"><div class="hall-toolbar"><button type="button" id="hall-prev">Previous</button><p id="hall-count" aria-live="polite">Poster {P.index(opening)+1} of {len(P)}</p><button type="button" id="hall-next">Next</button></div><a id="hall-frame-link" class="hall-frame" href="{pp(opening)}poster/"><img id="hall-image" src="{img(opening['slug'],'previews')}" alt="Original research poster for {E(opening['title'])}"></a></div><div class="hall-panel"><p class="eyebrow" id="hall-kicker">{E(kicker)}</p><h2 id="hall-heading">{E(opening['shortTitle'])}</h2><p id="hall-sub">{E(opening['subtitle'])}</p><blockquote id="hall-question">{E(opening['question'])}</blockquote><ul class="hall-findings" id="hall-findings">{findings}</ul><p class="hall-status" id="hall-status">{E(opening['status'])}</p><p class="hall-care" id="hall-care" hidden>This project concerns Residential School Survivors, families and community leadership. The summary is for the exhibition. It does not open protected records.</p><div class="hall-actions"><a id="hall-story" class="button button-dark" href="{pp(opening)}">Read the project</a><a id="hall-reader" class="button button-outline" href="{pp(opening)}poster/">Zoom the poster</a></div></div></div><div class="chip-row" id="hall-filters" role="group" aria-label="Filter the hall by theme">{chips}</div><div class="hall-strip" id="hall-strip" role="list" aria-label="Posters in this exhibition">{thumbs}</div><p class="hall-keys">Arrow keys move between posters while this hall is focused.</p><script type="application/json" id="hall-data">{json.dumps(slim,ensure_ascii=False)}</script></div><div class="wall-header"><span class="eyebrow">OR SCAN THE WHOLE WALL</span><p>Every poster also has its own reading room, with zoom and the original PDF. <a href="/explore/">Prefer project cards? ↗</a></p></div><div class="poster-wall" id="poster-wall">{items}</div></div></section>'''
 return page('The digital poster hall','Move through all 12 NORDIK research posters by theme, then open any poster at full size.',body,'explore')

def connections():
 # Each project receives fixed coordinates in a 1120×660 SVG; all edges correspond to factual topical connections.
 coords={'spruce-budworm-radar':(190,165),'data-north':(495,105),'water-quality-monitoring':(110,395),'canadian-financial-stress-index':(710,165),'volt-libraries':(910,390),'newcomer-skills':(525,410),'counting-every-voice':(715,330),'adhd-workplace':(750,560),'rural-physician-recruitment':(940,570),'csaa-ongoing-support':(280,535),'csaa-unmarked-burials':(145,570),'in-situ':(385,320)}
 lines=''.join(f'<line x1="{coords[a][0]}" y1="{coords[a][1]}" x2="{coords[b][0]}" y2="{coords[b][1]}" />' for a,b,why in LINKS)
 node=''.join(f'''<a href="{pp(p)}" class="graph-node" aria-label="Explore {E(p['title'])}"><circle cx="{coords[p['slug']][0]}" cy="{coords[p['slug']][1]}" r="{44 if p['category'] in ['ai','indigenous'] else 36}" class="node-{E(CM[p['category']][4])}"/><text x="{coords[p['slug']][0]}" y="{coords[p['slug']][1]+5}" text-anchor="middle">{E(p['shortTitle'].split(' ')[0][:12])}</text><title>{E(p['title'])}</title></a>''' for p in P)
 relation=''.join(f'''<article class="relation"><div><a href="{pp(BY[a])}">{E(BY[a]['shortTitle'])}</a><span aria-hidden="true"> ↔ </span><a href="{pp(BY[b])}">{E(BY[b]['shortTitle'])}</a></div><p>{E(why)}</p></article>''' for a,b,why in LINKS)
 body=f'''<section class="page-intro page-intro-sage"><div class="wrap"><div class="crumb"><a href="/">Home</a> / Connections</div><span class="eyebrow">THE RESEARCH CONSTELLATION</span><h1>Good questions <em>connect.</em></h1><p>Explore the threads between projects. Lines indicate shared themes, methods or a source-documented connection—not automatically a formal research partnership.</p></div></section><section class="section constellation-section"><div class="wrap"><div class="constellation-panel"><div class="constellation-top"><div><span class="eyebrow">A MAP OF THE EXHIBITION</span><h2>12 projects. Many intersections.</h2></div><a href="/explore/" class="text-action">View all projects ↗</a></div><div class="graph-scroll" tabindex="0" role="region" aria-label="Network of clickable research projects; a full text list of connections follows"><svg viewBox="0 0 1080 670" role="img" aria-label="Interactive research constellation connecting related exhibition projects"><g class="graph-links">{lines}</g><g class="graph-nodes">{node}</g></svg></div><p class="graph-caption">Select a labelled circle to open its project. The complete relationships are listed below for accessibility.</p></div><div class="section-heading connection-section-head"><div><span class="eyebrow">FOLLOW A CONNECTION</span><h2>Discover an <em>unexpected link.</em></h2></div></div><div class="relation-grid">{relation}</div></div></section>'''
 return page('Connections between projects','Discover meaningful topical connections among NORDIK research projects.',body,'connections')

def impact():
 body=f'''<section class="page-intro page-intro-dark"><div class="wrap"><div class="crumb"><a href="/">Home</a> / Research impact</div><span class="eyebrow light">THE 2025–2026 SNAPSHOT</span><h1>Making an impact, <em>together.</em></h1><p>Research takes shape through relationships, new opportunities and community participation. Here are two distinct views: the institute's annual-report snapshot and outcomes reported on the exhibited posters.</p></div></section><section class="section impact-section"><div class="wrap">{section_head('THE INSTITUTE / ANNUAL REPORT','A year of <em>collaboration.</em>','','<p>Figures below describe NORDIK Institute as a whole in its 2025–2026 executive summary. They are <b>not</b> numbers for the 12 exhibition posters alone.</p>')}<div class="impact-metric-grid"><div><strong>22</strong><span>Total projects</span></div><div><strong>40+</strong><span>Community collaborations</span></div><div><strong>26</strong><span>Employees, full-time & part-time</span></div><div><strong>18</strong><span>Student placement positions</span></div></div><div class="impact-report"><div><span class="eyebrow">ANNUAL REPORT / PAGE 11</span><h3>Four goals, one shared commitment.</h3><p>Across its goals, NORDIK reports work that advances Indigenous research sovereignty, evidence-based dialogue, researcher development, and social, economic and environmental sustainability.</p><p class="source-fineprint">Goal-associated project counts overlap; they should not be added together as unique projects.</p><a href="/assets/reports/annual-executive-summary.pdf" target="_blank" class="text-action">View the source executive summary ↗</a></div><img src="/assets/previews/annual-summary.webp" alt="Page 11 executive summary from NORDIK's 2025–2026 report, with organization-wide project, partnership and staffing figures" loading="lazy"></div></div></section><section class="section impact-stories"><div class="wrap">{section_head('FROM THE EXHIBITION','An impact story you can <em>trace.</em>','','<p>These achievements are reported on the Upper Great Lakes community-based water-monitoring poster for 2021–2026. They are not institute-wide annual totals.</p>')}<div class="water-metrics">{metric_pair('200+','people volunteering')}{metric_pair('46','monitoring sites')}{metric_pair('45,000+','data points')}{metric_pair('67','youth trained, mentored or hired')}</div><a class="button button-dark" href="/projects/water-quality-monitoring/">Explore the water project ↗</a></div></section>'''
 return page('Research impact','Explore NORDIK Institute 2025–2026 annual-report metrics and project-specific verified achievements.',body,'impact')

def about():
 body='''<section class="page-intro page-intro-sage"><div class="wrap"><div class="crumb"><a href="/">Home</a> / About</div><span class="eyebrow">ABOUT THIS EXHIBITION</span><h1>Research belongs in <em>conversation.</em></h1><p>A digital companion to the physical NORDIK research-poster exhibition, designed for anyone who wants to discover the work and the people behind it.</p></div></section><section class="section"><div class="wrap about-grid"><div class="about-main"><section><span class="eyebrow">WHY WE BUILT THIS</span><h2>The exhibition travels <em>with you.</em></h2><p>Whether you are in the room or joining from elsewhere, this site helps you browse authentic posters, read accessible summaries, connect with team credits and discover related work.</p><p>Each project's research claims come from the poster provided for the exhibition. The digital summaries are not substitutes for reading the original figures and methods.</p></section><section><span class="eyebrow">ABOUT NORDIK</span><h2>Knowledge built <em>with communities.</em></h2><p>NORDIK Institute is a community-based research organization affiliated with Algoma University. Its approach connects cultural vitality, social equity, environmental sustainability and economic diversity and growth.</p><a href="https://nordikinstitute.com/about/" target="_blank" rel="noopener" class="text-action">Learn about NORDIK Institute ↗</a></section><section><span class="eyebrow">ACCESSIBILITY & READING</span><h2>More than one way to <em>explore.</em></h2><p>Every project has a readable HTML overview in addition to its original PDF. The poster viewer supports zooming, source PDF access and keyboard controls. The exhibition can be navigated by keyboard and supports reduced-motion preferences.</p><p>If you encounter an accessibility barrier or an error, please contact <a href="mailto:info@nordikinstitute.com">info@nordikinstitute.com</a>.</p></section><section><span class="eyebrow">CONTENT AND CARE</span><h2>Trust begins with <em>care.</em></h2><p>The exhibition uses the original twelve supplied posters and the institute's 2025–2026 executive summary. Poster details may reflect work in progress, and planned projects are described as planned rather than completed.</p><p>Content about Residential Schools and Survivors requires community-specific approval before a public launch. Protected records, unverified personal contacts and unpublished research files are not provided beyond the original supplied posters.</p><p>The survey-methods poster includes an inconsistent percentage in the original source. A correction has not been assumed; the issue is identified in the local editorial review checklist.</p></section></div><aside class="about-aside"><div class="sidebar-panel"><span class="eyebrow">START EXPLORING</span><a class="resource-link" href="/explore/">12 research projects ↗</a><a class="resource-link" href="/wall/">Digital poster wall ↗</a><a class="resource-link" href="/tour/">Guided journeys ↗</a><a class="resource-link" href="/people/">Research teams ↗</a></div><div class="sidebar-panel"><span class="eyebrow">GET IN TOUCH</span><h3>Let's keep the dialogue going.</h3><p>For inquiries about a research project or exhibition accessibility:</p><a href="mailto:info@nordikinstitute.com" class="text-action">info@nordikinstitute.com ↗</a></div></aside></div></section>'''
 return page('About the exhibition','How NORDIK Research Atlas helps remote and in-person visitors access research.',body)

def qr_templates(base_url):
 # Generate print-ready QR cards only when user provides a real, canonical public HTTPS domain.
 import qrcode
 pdir=OUT/'qr';pdir.mkdir(exist_ok=True)
 rows=[]
 for p in P:
  if base_url:
   url=base_url.rstrip('/')+pp(p)
   q=qrcode.QRCode(box_size=9,border=3,error_correction=qrcode.constants.ERROR_CORRECT_M)
   q.add_data(url);q.make(fit=True)
   q.make_image(fill_color='#12313b',back_color='white').convert('RGB').save(pdir/(p['slug']+'.png'))
   qri=f'<img src="/qr/{p["slug"]}.png" alt="QR code linking to {E(p["title"])}">'
  else:
   qri='<div class="qr-placeholder">QR LINK<br>AVAILABLE<br>AFTER DOMAIN<br>CONFIGURATION</div>'
  rows.append(f'<article class="qr-card">{qri}<div><small>NORDIK RESEARCH ATLAS</small><h2>{E(p["shortTitle"])}</h2><p>{E(base_url.rstrip("/")+pp(p) if base_url else "Set --base-url to generate a printable QR code")}</p></div></article>')
 body=f'<section class="qr-screen-note wrap"><h1>Exhibition QR cards</h1><p>{"Print these cards to connect the physical exhibition with the website." if base_url else "QR codes are intentionally withheld until the live domain is configured. Run python tools/build.py --base-url https://YOUR-LIVE-SITE to generate working QR codes for print."}</p><button type="button" class="button button-dark" onclick="window.print()">Print cards</button></section><div class="qr-grid wrap">{"".join(rows)}</div>'
 return page('Poster QR cards','Printable cards for the physical exhibition.',body)

def save_data():
 (OUT/'static').mkdir(exist_ok=True)
 for name in ('styles.css','app.js'):
  shutil.copy2(ROOT/'src'/name,OUT/'static'/name)
 (OUT/'assets').mkdir(exist_ok=True)
 (OUT/'assets'/'favicon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#14343d"/><path d="M14 48V16h7l21 23V16h8v32h-7L22 25v23Z" fill="#f6f3e9"/><circle cx="52" cy="12" r="7" fill="#f3bd57"/></svg>''',encoding='utf-8')
 (OUT/'data').mkdir(exist_ok=True)
 (OUT/'data'/'projects.json').write_text(json.dumps(P,indent=2,ensure_ascii=False),encoding='utf-8')
 (OUT/'data'/'connections.json').write_text(json.dumps(LINKS,indent=2,ensure_ascii=False),encoding='utf-8')
 (OUT/'data'/'themes.json').write_text(json.dumps(CATS,indent=2,ensure_ascii=False),encoding='utf-8')
 (OUT/'robots.txt').write_text('User-agent: *\n'+('Allow: /\n' if args and args.release else 'Disallow: /\n'),encoding='utf-8')


def main():
 global args
 parser=argparse.ArgumentParser()
 parser.add_argument('--base-url',default='',help='Published canonical https:// domain for QR cards and sitemap; omit during preview')
 parser.add_argument('--base-path',default='',help='URL path prefix when published below a domain root, such as /AGM')
 parser.add_argument('--release',action='store_true',help='Generate public-indexable site after editorial and community approvals are recorded')
 args=parser.parse_args()
 if args.base_url and not args.base_url.startswith('https://'): parser.error('QR-card publishing requires an HTTPS URL')
 args.base_path=args.base_path.strip('/')
 if args.base_path and not re.fullmatch(r'[A-Za-z0-9._~-]+(?:/[A-Za-z0-9._~-]+)*',args.base_path): parser.error('Base path must contain URL path segments only')
 if args.release:
  if not args.base_url:parser.error('A production release requires a --base-url')
  approvals=json.loads((ROOT/'content'/'publication_approvals.json').read_text(encoding='utf-8'))
  missing=[p['slug'] for p in P if not approvals.get(p['slug'],{}).get('posterAndContentApproved') or (p['sensitive'] and not approvals.get(p['slug'],{}).get('communityPartnerApproved'))]
  if missing: parser.error('Public release blocked by missing editorial/community approvals: '+', '.join(missing))
 # Remove outdated generated routes while retaining original PDFs and previews.
 for prior in OUT.rglob('index.html'):prior.unlink()
 save_data()
 write(Path('.'),home());write(Path('explore'),explore());write(Path('themes'),theme_list())
 for k,*_ in CATS:write(Path('themes')/k,theme_detail(k))
 for p in P:
  write(Path('projects')/p['slug'],project_detail(p))
  write(Path('projects')/p['slug']/'poster',poster_viewer(p))
 write(Path('people'),people_page())
 for name in PEOPLE: write(Path('people')/slugify(name),person_detail(name))
 write(Path('tour'),tours_page())
 for t in TOURS:write(Path('tour')/t['slug'],tour_detail(t))
 write(Path('wall'),poster_wall());write(Path('connections'),connections());write(Path('impact'),impact());write(Path('about'),about());write(Path('qr-cards'),qr_templates(args.base_url))
 pages=list(OUT.rglob('index.html'))
 if args.base_url:
  urls=[args.base_url.rstrip('/')+'/'+str(f.parent.relative_to(OUT)).replace('.','').strip('/')+'/' for f in pages]
  # correct root URL
  urls=[args.base_url.rstrip('/')+'/' if f.parent==OUT else args.base_url.rstrip('/')+'/'+f.parent.relative_to(OUT).as_posix()+'/' for f in pages]
  (OUT/'sitemap.xml').write_text('<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+E(u)+'</loc></url>' for u in urls)+'</urlset>',encoding='utf-8')
 print(f'Built {len(pages)} pages; {len(P)} posters; {len(PEOPLE)} unique printed-name profiles; canonical base URL: {args.base_url or "not set"}')

if __name__=='__main__':main()
