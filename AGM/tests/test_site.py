"""Offline site-integrity checks for supplied source assets and generated pages."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from collections import Counter
import unittest,json,re,sys
import io
import tempfile
from contextlib import redirect_stderr
from unittest.mock import patch
import fitz

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
PROJECTS=json.loads((ROOT/'content'/'projects.json').read_text(encoding='utf-8'))
THEMES=json.loads((SITE/'data'/'themes.json').read_text(encoding='utf-8'))

class Links(HTMLParser):
 def __init__(self):super().__init__();self.urls=[];self.h1=[];self.imgs=[];self._h1=False
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag in ('a','link') and 'href' in d:self.urls.append(d['href'])
  if tag in ('script','img','iframe') and 'src' in d:self.urls.append(d['src'])
  if tag=='img':self.imgs.append(d)
  if tag=='h1':self._h1=True
 def handle_endtag(self,tag):
  if tag=='h1':self._h1=False
 def handle_data(self,text):
  if self._h1:self.h1.append(text)

class SiteTests(unittest.TestCase):
 def test_base_path_prefixes_root_links(self):
  sys.path.insert(0,str(ROOT/'tools'));import build
  html='<a href="/">Home</a><img src="/assets/a.webp"><iframe data-src="/assets/a.pdf"></iframe><a href="https://example.org/">External</a>'
  self.assertEqual(build.prefix_root_links(html,'/AGM'),'<a href="/AGM/">Home</a><img src="/AGM/assets/a.webp"><iframe data-src="/AGM/assets/a.pdf"></iframe><a href="https://example.org/">External</a>')

 def test_release_approvals_are_confirmed(self):
  approvals=json.loads((ROOT/'content'/'publication_approvals.json').read_text(encoding='utf-8'))
  for p in PROJECTS:
   with self.subTest(project=p['slug']):
    self.assertTrue(approvals[p['slug']]['posterAndContentApproved'])
    if p['sensitive']:self.assertTrue(approvals[p['slug']]['communityPartnerApproved'])

 def test_projects_and_unique_routes(self):
  self.assertEqual(len(PROJECTS),12)
  self.assertEqual(len({x['slug'] for x in PROJECTS}),12)
  for p in PROJECTS:
   with self.subTest(project=p['slug']):
    self.assertTrue((SITE/'projects'/p['slug']/'index.html').is_file())
    self.assertTrue((SITE/'projects'/p['slug']/'poster'/'index.html').is_file())
    self.assertTrue((SITE/'assets/posters'/f"{p['slug']}.pdf").is_file())
    self.assertTrue((SITE/'assets/thumbs'/f"{p['slug']}.webp").is_file())
    self.assertTrue((SITE/'assets/previews'/f"{p['slug']}.webp").is_file())
    self.assertEqual(fitz.open(SITE/'assets/posters'/f"{p['slug']}.pdf").page_count,1)

 def test_eight_themes(self):
  self.assertEqual(len(THEMES),8)
  self.assertEqual(next(p['category'] for p in PROJECTS if p['slug']=='canadian-financial-stress-index'),'finance')
  self.assertEqual(next(p['category'] for p in PROJECTS if p['slug']=='volt-libraries'),'economics')
  finance=' '.join(next(p['methods'] for p in PROJECTS if p['slug']=='canadian-financial-stress-index'))
  self.assertIn('649,804',finance)
  self.assertIn('42.27%',finance)
  insitu=(SITE/'projects'/'in-situ'/'index.html').read_text(encoding='utf-8')
  self.assertIn('IN SITU \u2014 Place-based',insitu)
  self.assertNotIn('IN SITU \u00e2',insitu)
  self.assertEqual(set(p['category'] for p in PROJECTS),set(x[0] for x in THEMES))
  for k,*_ in THEMES:self.assertTrue((SITE/'themes'/k/'index.html').exists())

 def test_unique_researcher_paths(self):
  sys.path.insert(0,str(ROOT/'tools'));import build
  self.assertEqual(len(build.PEOPLE),23)
  slugs=[build.slugify(x) for x in build.PEOPLE]
  self.assertEqual(len(set(slugs)),len(slugs))
  for s in slugs:self.assertTrue((SITE/'people'/s/'index.html').exists())

 def test_all_local_links(self):
  htmls=list(SITE.rglob('index.html'))
  self.assertEqual(len(htmls),68)
  hall=(SITE/'wall'/'index.html').read_text(encoding='utf-8')
  self.assertIn('id="exhibition-hall"',hall)
  self.assertIn('id="hall-data"',hall)
  for html in htmls:
   with self.subTest(html=str(html.relative_to(SITE))):
    parser=Links();parser.feed(html.read_text(encoding='utf-8'))
    self.assertTrue(''.join(parser.h1).strip())
    for url in parser.urls:
     if not url.startswith('/'):continue
     clean=unquote(urlsplit(url).path)
     self.assertTrue(clean.startswith('/AGM/'),f'{html.relative_to(SITE)} points outside /AGM/: {clean}')
     clean=clean[len('/AGM'):]
     resolved=SITE/clean.lstrip('/')
     if clean.endswith('/'):resolved=resolved/'index.html'
     self.assertTrue(resolved.is_file(),f'{html.relative_to(SITE)} points to missing {clean}')
    for im in parser.imgs:self.assertTrue(im.get('alt','').strip(),f'{html}: image without meaningful alt attribute')

 def test_factual_safeguards(self):
  count=next(x for x in PROJECTS if x['slug']=='counting-every-voice')
  self.assertIn('39/64',count['sourceNote'])
  self.assertNotIn('58%',count['findings'][2])
  water=next(x for x in PROJECTS if x['slug']=='water-quality-monitoring')
  self.assertEqual(water['team'],[])
  care=[p for p in PROJECTS if p['sensitive']]
  self.assertEqual({p['slug'] for p in care},{'csaa-ongoing-support','csaa-unmarked-burials'})
  home=(SITE/'index.html').read_text(encoding='utf-8')
  if 'name="robots" content="index,follow"' in home:
   self.assertIn('Allow: /',(SITE/'robots.txt').read_text())
  else:
   self.assertIn('name="robots" content="noindex,nofollow"',home)
   self.assertIn('Disallow: /',(SITE/'robots.txt').read_text())
  self.assertTrue((SITE/'assets/reports/annual-report-2025-2026.pdf').exists())

 def test_approved_links_only(self):
  for p in PROJECTS:
   for l in p['externalLinks']:
    self.assertRegex(l['url'],r'^https://')
  self.assertEqual(sum(len(p['externalLinks']) for p in PROJECTS),3)

 def test_release_guard_rejects_missing_approvals(self):
  sys.path.insert(0,str(ROOT/'tools'));import build
  with tempfile.TemporaryDirectory() as tmp:
   approval_dir=Path(tmp)/'content';approval_dir.mkdir()
   approvals={p['slug']:{'posterAndContentApproved':False,'communityPartnerApproved':False} for p in PROJECTS}
   (approval_dir/'publication_approvals.json').write_text(json.dumps(approvals))
   argv=[str(ROOT/'tools'/'build.py'),'--release','--base-url','https://example.org']
   error=io.StringIO()
   with patch.object(build,'ROOT',Path(tmp)),patch.object(sys,'argv',argv),redirect_stderr(error):
    with self.assertRaises(SystemExit) as raised:build.main()
   self.assertEqual(raised.exception.code,2)
   self.assertIn('release blocked',error.getvalue().lower())

if __name__=='__main__':unittest.main()
