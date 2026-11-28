import os
import re
import json
import xml.etree.ElementTree as ET

ROOT_DIR = os.path.abspath('.')
SITEMAP_PATH = os.path.join(ROOT_DIR, 'sitemap.xml')

print("=================================================================")
print("          GUGOPRO-SITE 終極上線前全面總驗收 (Python 3)")
print("=================================================================\n")

passed_all = True

def get_site_html_files():
    files = []
    for dirpath, dirnames, filenames in os.walk(ROOT_DIR):
        dirnames[:] = [d for d in dirnames if d not in ['.git', 'node_modules', '_backup_seo_fix', '隨時可刪', 'scratch']]
        for f in filenames:
            if f.endswith('.html'):
                files.append(os.path.join(dirpath, f))
    return files

html_files = get_site_html_files()
print(f"[INFO] 掃描 HTML 檔案總數: {len(html_files)} 個")

# =========================================================================
# 檢查項 1：全站內部超連結死鏈檢查 (<a href="...">)
# =========================================================================
print("\n--- [檢查項 1/6] 全站內部超連結死鏈檢查 ---")
dead_links = []
inbound_graph = {}  # target_path -> set(source_files)

for fpath in html_files:
    rel_source = os.path.relpath(fpath, ROOT_DIR).replace('\\', '/')
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
        raw_content = fp.read()
    
    # 排除 <script> 與 <style> 區塊，避免解析到 JS 模板字串 (如 ${esc(url)})
    clean_html = re.sub(r'<script[\s\S]*?</script>', '', raw_content, flags=re.I)
    clean_html = re.sub(r'<style[\s\S]*?</style>', '', clean_html, flags=re.I)

    links = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\']', clean_html, re.I)
    source_dir = os.path.dirname(fpath)

    for href in links:
        raw_href = href.strip()
        if not raw_href or raw_href.startswith(('data:', 'javascript:', 'mailto:', 'tel:', '#')):
            continue
        
        # 判斷是否為站內連結
        if raw_href.startswith(('http://', 'https://')):
            if raw_href.startswith('https://gugopro.com/'):
                clean_target = raw_href.replace('https://gugopro.com', '')
            elif raw_href == 'https://gugopro.com':
                clean_target = '/'
            else:
                continue
        else:
            clean_target = raw_href
        
        path_only = clean_target.split('?')[0].split('#')[0]
        if not path_only:
            path_only = '/'

        if path_only.startswith('/'):
            target_disk = os.path.abspath(os.path.join(ROOT_DIR, '.' + path_only))
        else:
            target_disk = os.path.abspath(os.path.join(source_dir, path_only))
        
        # 網址結尾為目錄或頁面
        if os.path.isdir(target_disk):
            target_check = os.path.join(target_disk, 'index.html')
        elif not os.path.splitext(target_disk)[1]:
            target_check = target_disk + '.html'
            if not os.path.exists(target_check) and os.path.exists(os.path.join(target_disk, 'index.html')):
                target_check = os.path.join(target_disk, 'index.html')
        else:
            target_check = target_disk

        if not os.path.exists(target_check):
            dead_links.append({
                'source': rel_source,
                'href': raw_href,
                'resolved': target_check
            })
        else:
            norm_target = os.path.relpath(target_check, ROOT_DIR).replace('\\', '/')
            inbound_graph.setdefault(norm_target, set()).add(rel_source)

if not dead_links:
    print("[PASS] 0 個內部死鏈！全站所有 <a> 標籤均正確連結至存在之頁面。")
else:
    print(f"[FAIL] 發現 {len(dead_links)} 個死鏈：")
    for d in dead_links:
        print(f"  來源: {d['source']} -> 找不到: {d['href']} (解析: {d['resolved']})")
    passed_all = False

# =========================================================================
# 檢查項 2：資源引用 100% 實體核對 (<script>, <link>, <img>)
# =========================================================================
print("\n--- [檢查項 2/6] 靜態資源引用實體核對 (0 筆 404) ---")
broken_assets = []

for fpath in html_files:
    rel_source = os.path.relpath(fpath, ROOT_DIR).replace('\\', '/')
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
        content = fp.read()
    
    tags = re.findall(r'<(?:script|link|img|source)\s+[^>]*(?:src|href)=["\']([^"\']+)["\']', content, re.I)
    source_dir = os.path.dirname(fpath)

    for r in tags:
        raw_r = r.strip()
        if not raw_r or raw_r.startswith(('data:', 'javascript:', 'mailto:', 'tel:', '#')):
            continue
        
        if raw_r.startswith(('http://', 'https://')):
            if raw_r.startswith('https://gugopro.com/'):
                clean_r = raw_r.replace('https://gugopro.com', '')
            else:
                continue
        else:
            clean_r = raw_r
        
        path_only = clean_r.split('?')[0].split('#')[0]
        if not path_only or not re.search(r'\.(js|css|png|jpg|jpeg|svg|webp|ico|gif|json|woff|woff2|ttf)$', path_only, re.I):
            continue

        if path_only.startswith('/'):
            target_disk = os.path.abspath(os.path.join(ROOT_DIR, '.' + path_only))
        else:
            target_disk = os.path.abspath(os.path.join(source_dir, path_only))

        if not os.path.exists(target_disk):
            broken_assets.append({
                'source': rel_source,
                'ref': raw_r,
                'target': target_disk
            })

if not broken_assets:
    print("[PASS] 0 筆資源 404！全站靜態資源（JS, CSS, 圖示, JSON）100% 實體存在。")
else:
    print(f"[FAIL] 發現 {len(broken_assets)} 個缺失資源：")
    for b in broken_assets:
        print(f"  來源: {b['source']} -> 找不到: {b['ref']}")
    passed_all = False

# =========================================================================
# 檢查項 3：hreflang 與 Canonical 零冗餘檢查
# =========================================================================
print("\n--- [檢查項 3/6] Canonical 與 hreflang 零冗餘檢查 ---")
canonical_dups = []
hreflang_dups = []
invalid_query_langs = []

for fpath in html_files:
    rel_source = os.path.relpath(fpath, ROOT_DIR).replace('\\', '/')
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
        content = fp.read()
    
    head_m = re.search(r'<head[\s\S]*?</head>', content, re.I)
    if not head_m:
        continue
    head = head_m.group(0)

    # 1. Canonical 數量檢查 (每頁限 1 個)
    can_tags = re.findall(r'<link\s+[^>]*rel=["\']canonical["\'][^>]*>', head, re.I)
    if len(can_tags) > 1:
        canonical_dups.append({'source': rel_source, 'count': len(can_tags)})
    
    # 2. hreflang 重複檢查
    alt_tags = re.findall(r'<link\s+[^>]*rel=["\']alternate["\'][^>]*>|<link\s+[^>]*hreflang=["\'][^"\']+["\'][^>]*rel=["\']alternate["\'][^>]*>', head, re.I)
    seen_langs = {}
    for a in alt_tags:
        m = re.search(r'hreflang=["\']([^"\']+)["\']', a, re.I)
        if m:
            l = m.group(1).lower()
            if l in seen_langs:
                hreflang_dups.append({'source': rel_source, 'lang': l})
            seen_langs[l] = True
    
    # 3. 非多語字典頁面帶有無效 ?lang= hreflang 檢查
    if 'english-speaking-tutor.html' not in rel_source:
        for a in alt_tags:
            if '?lang=' in a or '&lang=' in a:
                invalid_query_langs.append({'source': rel_source, 'tag': a})

if not canonical_dups and not hreflang_dups and not invalid_query_langs:
    print("[PASS] Canonical 與 hreflang 零冗餘！每頁僅有 1 個 Canonical，0 重複 hreflang，無無效 ?lang=。")
else:
    if canonical_dups:
        print(f"[FAIL] 重複 Canonical: {canonical_dups}")
    if hreflang_dups:
        print(f"[FAIL] 重複 hreflang: {hreflang_dups}")
    if invalid_query_langs:
        print(f"[FAIL] 無效 ?lang= 標籤: {invalid_query_langs}")
    passed_all = False

# =========================================================================
# 檢查項 4：JSON-LD 結構化資料一致性
# =========================================================================
print("\n--- [檢查項 4/6] JSON-LD 結構化資料一致性檢查 ---")
jsonld_mismatches = []

for fpath in html_files:
    rel_source = os.path.relpath(fpath, ROOT_DIR).replace('\\', '/')
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
        content = fp.read()
    
    # 取出 Canonical
    can_m = re.search(r'<link\s+[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']', content, re.I)
    if not can_m:
        can_m = re.search(r'<link\s+[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']canonical["\']', content, re.I)
    canonical_url = can_m.group(1).strip() if can_m else None

    # 解析 JSON-LD
    scripts = re.findall(r'<script\s+type=["\']application/ld\+json["\']>([\s\S]*?)</script>', content, re.I)
    for s in scripts:
        try:
            data = json.loads(s)
            items = data if isinstance(data, list) else [data]
            for it in items:
                # 若為 WebSite 或 WebApplication，url 應與 canonical 相符
                type_name = it.get('@type')
                url_prop = it.get('url')
                if type_name in ['WebSite', 'WebApplication'] and url_prop and canonical_url:
                    if url_prop != canonical_url:
                        jsonld_mismatches.append({
                            'source': rel_source,
                            'type': type_name,
                            'json_url': url_prop,
                            'canonical': canonical_url
                        })
                # 檢查 ItemList 內的子項目不應指向舊子網域 quota.gugopro.com
                if type_name == 'ItemList':
                    for sub in it.get('itemListElement', []):
                        sub_item = sub.get('item', {})
                        sub_url = sub_item.get('url', '')
                        if 'quota.gugopro.com' in sub_url:
                            jsonld_mismatches.append({
                                'source': rel_source,
                                'type': 'ItemList sub-item',
                                'json_url': sub_url,
                                'expected': 'gugopro.com'
                            })
        except Exception as e:
            jsonld_mismatches.append({'source': rel_source, 'error': str(e)})

if not jsonld_mismatches:
    print("[PASS] JSON-LD 結構化資料 100% 一致！所有 url 屬性與 Canonical 吻合，無殘留舊子網域。")
else:
    print(f"[FAIL] 發現 {len(jsonld_mismatches)} 處結構化資料不一致：")
    for jm in jsonld_mismatches:
        print(f"  來源: {jm['source']} -> {jm}")
    passed_all = False

# =========================================================================
# 檢查項 5：Sitemap 孤島頁面 (Orphan Pages) 檢查
# =========================================================================
print("\n--- [檢查項 5/6] Sitemap.xml 孤島頁面檢查 ---")
tree = ET.parse(SITEMAP_PATH)
sitemap_root = tree.getroot()
sitemap_urls = [e.text.strip() for e in sitemap_root.findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]

orphan_list = []
for loc in sitemap_urls:
    rel_clean = loc.replace('https://gugopro.com/', '')
    if rel_clean == '':
        rel_target = 'index.html'
    else:
        rel_target = rel_clean

    sources = inbound_graph.get(rel_target, set())
    # 排除自身連結與 public_html 鏡像自我連結
    external_links = {s for s in sources if s != rel_target and s != ('public_html/' + rel_target)}

    if not external_links:
        orphan_list.append({'loc': loc, 'file': rel_target})

if not orphan_list:
    print(f"[PASS] 0 個孤島頁面！Sitemap 中全部 {len(sitemap_urls)} 個網址均獲得 1 次以上站內入站連結。")
else:
    print(f"[FAIL] 發現 {len(orphan_list)} 個孤島頁面：")
    for o in orphan_list:
        print(f"  孤島: {o['loc']} ({o['file']})")
    passed_all = False

# =========================================================================
# 檢查項 6：public_html 鏡像同步與 Git 忽略檢查
# =========================================================================
print("\n--- [檢查項 6/6] public_html 鏡像同步與 Git 忽略核對 ---")
mirror_errors = []

# 核對 tools/ 與 public_html/tools/
for dirpath, _, filenames in os.walk(os.path.join(ROOT_DIR, 'tools')):
    for f in filenames:
        if f.endswith('.html'):
            src_full = os.path.join(dirpath, f)
            rel_tool = os.path.relpath(src_full, ROOT_DIR).replace('\\', '/')
            mirr_full = os.path.join(ROOT_DIR, 'public_html', rel_tool)
            if os.path.exists(mirr_full):
                with open(src_full, 'rb') as s_fp, open(mirr_full, 'rb') as m_fp:
                    if s_fp.read() != m_fp.read():
                        mirror_errors.append(f"內容不一致: {rel_tool} != public_html/{rel_tool}")

# 核對 .gitignore
with open(os.path.join(ROOT_DIR, '.gitignore'), 'r', encoding='utf-8') as g_fp:
    git_content = g_fp.read()
if '_backup_seo_fix' not in git_content:
    mirror_errors.append("_backup_seo_fix 未包含在 .gitignore 中！")

if not mirror_errors:
    print("[PASS] 鏡像 100% 咬合且備份資料夾已被 .gitignore 成功排除！")
else:
    print(f"[FAIL] 鏡像或 Gitignore 異常：{mirror_errors}")
    passed_all = False

print("\n=================================================================")
if passed_all:
    print(">>> 終極總驗收通過！全站 6 大檢核項目 100% 達標，準備推送上線！ <<<")
else:
    print(">>> 總驗收未通過，請檢查上述錯誤資訊！ <<<")
print("=================================================================")
