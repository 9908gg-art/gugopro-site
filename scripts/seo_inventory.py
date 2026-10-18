#!/usr/bin/env python3
"""Inventory SEO fields and internal tool links across repository HTML files."""
from pathlib import Path
from bs4 import BeautifulSoup
import csv, re, html
try:
    from update_seo_titles_h1 import SEO_MAPPING as TITLE_H1_MAPPING
except ImportError:
    TITLE_H1_MAPPING = {}

ROOT = Path(__file__).resolve().parents[1]
EXCLUDE_DIRS = {'.git', 'node_modules', 'backup', 'backups', 'archive', 'archives'}
DEAD_ANCHORS = ('查看工具詳情', '查看詳情', 'read more', '點此進入')
LEGAL_NAMES = {'privacy', 'terms', 'about', 'contact', 'disclaimer', 'privacy-policy', 'terms-of-service'}
NON_PAGE_ASSETS = {'googled0dfad57039c64f6.html'}

def classify(path):
    parts = [p.lower() for p in path.parts]
    stem = path.stem.lower()
    if stem.startswith('index') and (len(parts) == 1 or stem in {'index', 'index_en', 'index_ja', 'index_zh'}): return '首頁'
    if any(x in stem for x in LEGAL_NAMES): return '法規'
    if any(p in {'articles','article','blog','blogs','news','research'} for p in parts[:-1]): return '專欄'
    if any(p in {'tools','tool'} for p in parts[:-1]): return '工具'
    if stem in LEGAL_NAMES: return '法規'
    return '其他'

def hidden_h1(soup, h1):
    if h1 is None: return '缺失'
    attrs = ' '.join([str(h1.get('style','')), str(h1.get('class','')), str(h1.get('id',''))]).lower()
    if re.search(r'display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|sr-only|visually-hidden|hidden', attrs): return '疑似隱藏'
    # Inspect simple ID/class selectors in embedded CSS for commonly used hiding declarations.
    selectors = []
    if h1.get('id'): selectors.append('#'+h1['id'])
    selectors += ['.'+c for c in h1.get('class', [])]
    css = '\n'.join(tag.get_text(' ', strip=False) for tag in soup.find_all('style'))
    for sel in selectors:
        for m in re.finditer(re.escape(sel)+r'[^{}]*\{([^{}]*)\}', css, re.I):
            if re.search(r'display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0', m.group(1), re.I): return '疑似隱藏'
    return '可見（靜態檢查）'

def clean_text(node):
    return re.sub(r'\s+', ' ', node.get_text(' ', strip=True)) if node else ''

def scan(path):
    rel = path.relative_to(ROOT).as_posix()
    raw = path.read_text(encoding='utf-8', errors='replace')
    soup = BeautifulSoup(raw, 'html.parser')
    title = clean_text(soup.title)
    h1 = soup.find('h1')
    is_non_page_asset = rel in NON_PAGE_ASSETS
    h2s = [clean_text(x) for x in soup.find_all('h2')[:3]]
    desc_tag = soup.find('meta', attrs={'name': re.compile(r'^description$', re.I)})
    kw_tag = soup.find('meta', attrs={'name': re.compile(r'^keywords$', re.I)})
    desc = desc_tag.get('content','').strip() if desc_tag else ''
    keywords = kw_tag.get('content','').strip() if kw_tag else ''
    lang = soup.html.get('lang','') if soup.html else ''
    links, dead = [], []
    for a in soup.find_all('a', href=True):
        href = a['href'].strip()
        anchor = clean_text(a)
        if href.startswith(('http://','https://','mailto:','tel:','#','javascript:')): continue
        links.append((href,anchor))
        if any(term.casefold() in anchor.casefold() for term in DEAD_ANCHORS): dead.append((href,anchor))
    tool_links = [(h,a) for h,a in links if re.search(r'(^|/)(tools?|toolbox)(/|$)', h, re.I) or '/tools/' in h.lower()]
    return {'category':classify(path),'filepath':rel,'lang':lang,'title':title,'h1':'—（非網頁驗證資產）' if is_non_page_asset else clean_text(h1),'h1_status':'不適用' if is_non_page_asset else hidden_h1(soup,h1),
            'h2':' | '.join(h2s),'description_chars':len(desc),'description':desc,'keywords':keywords,
            'internal_link_count':len(links),'dead_anchors':dead,'article_tool_links':tool_links,'is_article':classify(path)=='專欄'}

def md_cell(s): return str(s).replace('|','\\|').replace('\n',' ')

def main():
    paths = sorted(p for p in ROOT.rglob('*.html') if not any(part.lower() in EXCLUDE_DIRS for part in p.relative_to(ROOT).parts[:-1]) and p.is_file())
    rows = [scan(p) for p in paths]
    fields = ['category','filepath','lang','title','h1','h1_status','h2','description_chars','description','keywords','internal_link_count','dead_anchors','article_tool_links']
    with (ROOT/'seo_inventory_report.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore'); w.writeheader()
        for r in rows:
            x=r.copy(); x['dead_anchors']='; '.join(f'{a} [{h}]' for h,a in r['dead_anchors']); x['article_tool_links']='; '.join(f'{a} [{h}]' for h,a in r['article_tool_links'])
            w.writerow(x)
    counts={c:sum(r['category']==c for r in rows) for c in ['首頁','工具','專欄','法規','其他']}
    missing_h1=[r for r in rows if r['h1_status']=='缺失']
    hidden=[r for r in rows if r['h1_status']=='疑似隱藏']
    articles=[r for r in rows if r['is_article']]
    no_tool=[r for r in articles if not r['article_tool_links']]
    dead=[(r,h,a) for r in rows for h,a in r['dead_anchors']]
    title_mismatch=[r for r in rows if r['filepath'] not in TITLE_H1_MAPPING and r['title'] and r['h1'] and r['title'].casefold() not in r['h1'].casefold() and r['h1'].casefold() not in r['title'].casefold()]
    out=['# 全站 SEO 版位盤點報告','',f'- 掃描範圍：`{ROOT}` 下所有 HTML（排除 `.git`、備份目錄與 `node_modules`）',f'- 掃描時間：本次執行','- HTML 總數：'+str(len(rows)),'- 分類統計：'+ '；'.join(f'{k} {v}' for k,v in counts.items()),'', '> 「疑似隱藏」依 HTML inline style、class/id 名稱及簡單內嵌 CSS 規則判斷；不會完整解析外部 CSS、媒體查詢或執行 JavaScript。錨點與工具頁關聯亦為路徑規則啟發式檢查，需人工確認語意對應。','', '## 重大異常摘要','',f'- 缺少 H1：{len(missing_h1)} 頁',f'- H1 疑似隱藏：{len(hidden)} 頁',f'- 專欄沒有偵測到指向工具目錄的站內連結：{len(no_tool)} / {len(articles)} 篇',f'- 命中指定弱錨點詞：{len(dead)} 處',f'- Title 與 H1 文字未互相包含：{len(title_mismatch)} 頁','']
    def listing(label, rs):
        out.extend([f'### {label}'])
        if not rs: out.append('- 無'); return
        for r in rs: out.append(f"- `{r['filepath']}`"+(f" — Title: {r['title']}；H1: {r['h1']}" if label.startswith('Title') else ''))
        out.append('')
    listing('缺少 H1',missing_h1); listing('H1 疑似隱藏',hidden); listing('專欄文章未連向工具頁',no_tool)
    out.append('### 弱錨點文字命中')
    if dead:
        for r,h,a in dead: out.append(f"- `{r['filepath']}`：`{a}` → `{h}`")
    else: out.append('- 無')
    out.extend(['','### Title / H1 可能不一致'])
    if title_mismatch:
        for r in title_mismatch: out.append(f"- `{r['filepath']}`：Title=`{r['title']}`；H1=`{r['h1']}`")
    else: out.append('- 無')
    out.extend(['','## 各頁 SEO 欄位清單','', '| 分類 | 檔案 | 語系 | Title | H1（狀態） | 前三個 H2 | Description 字數 | 站內連結數 |','|---|---|---|---|---|---|---:|---:|'])
    for r in rows: out.append('| '+' | '.join(md_cell(x) for x in [r['category'],f"`{r['filepath']}`",r['lang'],r['title'],r['h1']+'（'+r['h1_status']+'）',r['h2'],r['description_chars'],r['internal_link_count']])+' |')
    out.extend(['','## 完整欄位檔案','', '- CSV：`seo_inventory_report.csv`（UTF-8-SIG；含描述、關鍵字、錨點及文章→工具連結明細）',''])
    (ROOT/'seo_inventory_report.md').write_text('\n'.join(out),encoding='utf-8')
    print(f'TOTAL={len(rows)}; counts={counts}')
    print(f'MISSING_H1={len(missing_h1)}; HIDDEN_H1={len(hidden)}; ARTICLES_NO_TOOL_LINK={len(no_tool)}/{len(articles)}; DEAD_ANCHORS={len(dead)}; TITLE_H1_MISMATCH={len(title_mismatch)}')
    for label, rs in [('MISSING_H1',missing_h1),('HIDDEN_H1',hidden),('ARTICLES_NO_TOOL',no_tool)]:
        print(label+':')
        for r in rs: print('  '+r['filepath'])
    print('DEAD_ANCHOR_HITS:')
    for r,h,a in dead: print(f'  {r["filepath"]}: {a!r} -> {h}')
    print('REPORTS: seo_inventory_report.md; seo_inventory_report.csv')
if __name__=='__main__': main()
