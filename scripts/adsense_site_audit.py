#!/usr/bin/env python3
from __future__ import annotations
import json, os, re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parents[1]
SKIP = {'.git', 'node_modules'}
LANGS = {'en': 'en', 'ja': 'ja', 'de': 'de', 'es': 'es', 'fr': 'fr', 'pt': 'pt', 'zh-CN': 'zh-CN'}

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags=[]; self.attrs_by_tag=[]; self.links=[]; self.text=[]; self.in_script=0
        self.lang=None; self.title=''; self.meta={}; self.has_footer=False; self.footer_links=[]
        self.in_title=False; self.in_footer=0
    def handle_starttag(self, tag, attrs):
        d=dict(attrs); self.tags.append(tag); self.attrs_by_tag.append((tag,d))
        if tag == 'html': self.lang=d.get('lang')
        if tag == 'title': self.in_title=True
        if tag == 'meta' and d.get('name'): self.meta[d['name'].lower()] = d.get('content','')
        if tag == 'a' and d.get('href') is not None:
            self.links.append((d.get('href',''), self.in_footer>0))
            if self.in_footer>0: self.footer_links.append(d.get('href',''))
        if tag == 'footer': self.in_footer += 1; self.has_footer=True
        if tag == 'script': self.in_script += 1
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title=False
        if tag == 'footer' and self.in_footer: self.in_footer -= 1
        if tag == 'script' and self.in_script: self.in_script -= 1
        if self.tags:
            self.tags.pop(); self.attrs_by_tag.pop()
    def handle_data(self, data):
        if self.in_title: self.title += data.strip()
        if not self.in_script: self.text.append(data)


def html_files():
    return sorted(p for p in ROOT.rglob('*.html') if not any(x in SKIP for x in p.parts))

def resolve_local(src: Path, href: str):
    href=unquote(href.split('#',1)[0].split('?',1)[0].strip())
    if not href or href.startswith(('#','mailto:','tel:','javascript:','data:')): return None
    u=urlparse(href)
    if u.scheme or u.netloc: return None
    target=((ROOT / u.path.lstrip('/')) if u.path.startswith('/') else (src.parent / u.path)).resolve()
    if href.endswith('/'):
        target=target/'index.html'
    elif target.is_dir():
        target=target/'index.html'
    return target

def lang_root(p):
    rel=p.relative_to(ROOT).parts
    return rel[0] if rel and rel[0] in LANGS else 'zh-TW'

rows=[]; missing=[]; external=[]; lang_stats={}
for p in html_files():
    raw=p.read_text(encoding='utf-8', errors='replace')
    q=Parser(); q.feed(raw)
    local_bad=[]
    for href,in_footer in q.links:
        t=resolve_local(p, href)
        if t is not None and not t.exists(): local_bad.append(href)
    rel=str(p.relative_to(ROOT))
    lang=lang_root(p)
    lang_stats.setdefault(lang, {'pages':0,'missing_footer':0,'missing_lang':0,'missing_meta':0,'bad_links':0})['pages'] += 1
    if not q.has_footer: lang_stats[lang]['missing_footer'] += 1
    if not q.lang: lang_stats[lang]['missing_lang'] += 1
    if not q.meta.get('description'): lang_stats[lang]['missing_meta'] += 1
    if local_bad: lang_stats[lang]['bad_links'] += len(local_bad)
    row={
      'file':rel,'lang':q.lang,'inferred_lang':lang,'title':q.title.strip(),
      'description':bool(q.meta.get('description')),'canonical':bool(re.search(r'<link[^>]+rel=["\']canonical',raw,re.I)),
      'footer':q.has_footer,'footer_links':q.footer_links,'local_bad_links':sorted(set(local_bad)),
      'word_count':len(re.findall(r'\w+', ' '.join(q.text))),
      'has_contact':('contact@gugopro.com' in raw.lower()),
      'has_privacy_term':bool(re.search(r'privacy|隱私權|privacy policy', raw, re.I)),
      'has_adsense_placeholder':bool(re.search(r'adsense|adsbygoogle|google_ad_client|ad-slot', raw, re.I)),
      'has_analytics':bool(re.search(r'googletagmanager|google-analytics|gtag\(', raw, re.I)),
    }
    rows.append(row)
    if local_bad: missing.append({'file':rel,'links':sorted(set(local_bad))})

# Detect language legal-page coverage by expected path convention.
legal = ['privacy.html','terms.html','contact.html','about.html','disclaimer.html']
coverage={}
for lang in ['zh-TW']+list(LANGS):
    base=ROOT if lang=='zh-TW' else ROOT/lang/'legal'
    coverage[lang]={x:((base/x).exists() or (lang != 'zh-TW' and (ROOT/lang/x).exists())) for x in legal}

summary={
 'root':str(ROOT),'html_count':len(rows),'languages':lang_stats,
 'legal_coverage':coverage,'broken_local_links':missing,
 'pages_missing_head_lang':[r['file'] for r in rows if not r['lang']],
 'pages_missing_description':[r['file'] for r in rows if not r['description']],
 'pages_missing_footer':[r['file'] for r in rows if not r['footer']],
 'pages_with_contact':[r['file'] for r in rows if r['has_contact']],
 'pages_with_analytics':[r['file'] for r in rows if r['has_analytics']],
 'pages_with_adsense_marker':[r['file'] for r in rows if r['has_adsense_placeholder']],
 'pages':rows,
}
print(json.dumps(summary, ensure_ascii=False, indent=2))
