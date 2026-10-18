#!/usr/bin/env python3
"""Build an Excel SEO and AdSense inventory for all remaining site HTML."""
from pathlib import Path
from urllib.parse import urljoin, urlparse, quote
from bs4 import BeautifulSoup
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://gugopro.com/'
EXCLUDE = {'.git','node_modules','backup','backups','archive','archives'}
LEGAL = {'privacy','terms','about','contact','disclaimer','privacy-policy','terms-of-service','cookies'}
CORE_SLUGS = {'ai-video-tracker.html','l-player-study.html','english-speaking-tutor.html','realtime-translator.html','tarot-master.html','ziwei-astrology.html','tdee-macros-calculator.html','weight-loss-planner.html','gemini-api-quota.html','amazon-product-research.html'}
PRACTICAL_TUTORIAL = 'tools/tutorials/how-to-get-gemini-api-key.html'
NO_AD_COMPLIANCE = {'404.html','tools/pdf/pdf-suite.html','tools/tw-market/taiwan-pair-trading.html'}
NON_PAGE_ASSETS = {'googled0dfad57039c64f6.html'}

def category(p):
    rel=p.relative_to(ROOT).as_posix()
    parts=[x.lower() for x in p.parts]
    stem=p.stem.lower()
    if rel == PRACTICAL_TUTORIAL: return '實用教學'
    if stem.startswith('index') and (len(parts)==1 or stem in {'index','index_en','index_ja'}): return '首頁'
    if any(x in LEGAL for x in (stem,)): return '法律條款'
    if any(x in {'articles','article','blog','blogs','research'} for x in parts[:-1]): return '專欄文章'
    if any(x in {'tools','tool'} for x in parts[:-1]):
        return '核心工具' if p.name in CORE_SLUGS else '歷史工具'
    return '其他'

def h1_status(soup,h1):
    if h1 is None: return '可見'  # Absence is reported separately in the H1 content column.
    attrs=' '.join([str(h1.get('style','')),str(h1.get('class','')),str(h1.get('id',''))]).lower()
    if re.search(r'display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|sr-only|visually-hidden|\bhidden\b',attrs): return '疑似隱藏'
    css='\n'.join(x.get_text(' ',strip=False) for x in soup.find_all('style'))
    selectors=(['#'+h1['id']] if h1.get('id') else []) + ['.'+c for c in h1.get('class',[])]
    for sel in selectors:
        for m in re.finditer(re.escape(sel)+r'[^{}]*\{([^{}]*)\}',css,re.I):
            if re.search(r'display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0',m.group(1),re.I): return '疑似隱藏'
    return '可見'

def text(n): return re.sub(r'\s+',' ',n.get_text(' ',strip=True)) if n else ''

def count_tool_links(soup, relpath):
    # Count distinct same-site links targeting a /tools/ URL, resolving both relative and absolute URLs.
    base=urljoin(BASE,relpath)
    found=set()
    for a in soup.find_all('a',href=True):
        href=a['href'].strip()
        abs_url=urljoin(base,href)
        u=urlparse(abs_url)
        if u.netloc.lower() not in {'gugopro.com','www.gugopro.com'}: continue
        path=u.path.lower()
        if '/tools/' in path or path.startswith('/tools/'):
            found.add((u.path,u.query,u.fragment))
    return len(found)

def scan(p):
    rel=p.relative_to(ROOT).as_posix()
    raw=p.read_text(encoding='utf-8',errors='replace')
    soup=BeautifulSoup(raw,'html.parser')
    h1=soup.find('h1')
    is_non_page_asset=rel in NON_PAGE_ASSETS
    h1_text='—（非網頁驗證資產）' if is_non_page_asset else (text(h1) if h1 else '❌ 缺失')
    h1_display='不適用' if is_non_page_asset else h1_status(soup,h1)
    d=soup.find('meta',attrs={'name':re.compile('^description$',re.I)})
    description=d.get('content','').strip() if d else ''
    ads=('pagead2.googlesyndication.com' in raw.lower() or 'ca-pub-' in raw.lower())
    ads_status='❌ 未配置（合規）' if rel in NO_AD_COMPLIANCE and not ads else ('✅ 已配置' if ads else '❌ 缺失')
    return [category(p),rel,BASE+quote(rel, safe='/'),soup.html.get('lang','') if soup.html else '',text(soup.title),h1_text,h1_display,ads_status,len(description),count_tool_links(soup,rel)]

def main():
    files=sorted(p for p in ROOT.rglob('*.html') if p.is_file() and not any(x.lower() in EXCLUDE for x in p.relative_to(ROOT).parts[:-1]))
    headers=['編號','頁面分類','檔案相對路徑','線上網頁連結','頁面語系','Title 標題','H1 標籤內容','H1 顯示狀態','AdSense 廣告代碼狀態','Description 字數','站內工具連結數']
    wb=Workbook(); ws=wb.active; ws.title='SEO AdSense 盤點'
    ws.append(headers)
    for i,p in enumerate(files,1):
        row=scan(p); ws.append([i]+row)
        c=ws.cell(ws.max_row,4); c.hyperlink=row[2]; c.style='Hyperlink'
    ws.freeze_panes='A2'; ws.auto_filter.ref=ws.dimensions
    ws.row_dimensions[1].height=32
    for c in ws[1]:
        c.font=Font(bold=True,color='FFFFFF'); c.fill=PatternFill('solid',fgColor='17365D'); c.alignment=Alignment(horizontal='center',vertical='center',wrap_text=True)
    widths=[9,16,42,66,14,55,45,18,24,18,21]
    for idx,width in enumerate(widths,1): ws.column_dimensions[get_column_letter(idx)].width=width
    for row in ws.iter_rows(min_row=2):
        for c in row: c.alignment=Alignment(vertical='top',wrap_text=(c.column not in {4}))
        row[3].alignment=Alignment(vertical='top')
    if ws.max_row>1:
        tab=Table(displayName='SEOInventory',ref=ws.dimensions); tab.tableStyleInfo=TableStyleInfo(name='TableStyleMedium2',showRowStripes=True,showColumnStripes=False); ws.add_table(tab)
    summary=wb.create_sheet('摘要')
    summary.append(['項目','數量'])
    counts={}
    for r in range(2,ws.max_row+1): counts[ws.cell(r,2).value]=counts.get(ws.cell(r,2).value,0)+1
    summary.append(['HTML 總數',len(files)])
    for key in ['首頁','核心工具','歷史工具','實用教學','專欄文章','法律條款','其他']: summary.append([key,counts.get(key,0)])
    missing=sum(1 for r in range(2,ws.max_row+1) if ws.cell(r,9).value=='❌ 缺失')
    summary.append(['缺少 AdSense 頁面',missing])
    summary.append(['H1 缺失頁面',sum(1 for r in range(2,ws.max_row+1) if ws.cell(r,7).value=='❌ 缺失')])
    summary.append(['H1 疑似隱藏頁面',sum(1 for r in range(2,ws.max_row+1) if ws.cell(r,8).value=='疑似隱藏')])
    summary.append(['工具目標連結數（每頁去重）',sum(ws.cell(r,11).value for r in range(2,ws.max_row+1))])
    summary.column_dimensions['A'].width=44; summary.column_dimensions['B'].width=18
    for c in summary[1]: c.font=Font(bold=True,color='FFFFFF'); c.fill=PatternFill('solid',fgColor='17365D')
    for r in range(2,summary.max_row+1): summary.cell(r,2).number_format='0'
    out=ROOT/'seo_inventory_report.xlsx'; wb.save(out)
    # Reopen to verify row count, required headers, and native hyperlinks.
    check=load_workbook(out,read_only=False,data_only=False)
    cws=check['SEO AdSense 盤點']
    hyperlinks=sum(1 for r in range(2,cws.max_row+1) if cws.cell(r,4).hyperlink and cws.cell(r,4).hyperlink.target.startswith(BASE))
    assert cws.max_row-1==len(files), 'Row count mismatch'
    assert hyperlinks==len(files), f'Hyperlink mismatch: {hyperlinks}/{len(files)}'
    print(f'HTML_TOTAL={len(files)}')
    print('CATEGORY_COUNTS='+repr(counts))
    print(f'ADSENSE_MISSING={missing}')
    print(f'H1_MISSING={sum(1 for r in range(2,ws.max_row+1) if ws.cell(r,7).value=="❌ 缺失")}')
    print(f'H1_HIDDEN={sum(1 for r in range(2,ws.max_row+1) if ws.cell(r,8).value=="疑似隱藏")}')
    print(f'NATIVE_HYPERLINKS_VERIFIED={hyperlinks}')
    print(f'OUTPUT={out} SIZE={out.stat().st_size}')
if __name__=='__main__': main()
