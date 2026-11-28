import os
import sys
import json
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SITEMAP_PATH = os.path.join(ROOT_DIR, 'sitemap.xml')
KEY_FILE = os.path.join(ROOT_DIR, 'e99a883e8df74b00ab65c05fae3cd8f8.txt')

print("=================================================================")
print("          GUGOPRO.COM INDEXNOW 全站批次廣播腳本")
print("=================================================================\n")

# 1. 讀取驗證金鑰
if not os.path.exists(KEY_FILE):
    print(f"[ERROR] 找不到金鑰檔案: {KEY_FILE}")
    sys.exit(1)

with open(KEY_FILE, 'r', encoding='utf-8') as f:
    key_value = f.read().strip()

print(f"[INFO] 驗證金鑰: {key_value}")

# 2. 讀取 sitemap.xml 中的所有網址
if not os.path.exists(SITEMAP_PATH):
    print(f"[ERROR] 找不到 sitemap.xml: {SITEMAP_PATH}")
    sys.exit(1)

tree = ET.parse(SITEMAP_PATH)
sitemap_root = tree.getroot()
urls = [elem.text.strip() for elem in sitemap_root.findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]

url_count = len(urls)
print(f"[INFO] 從 sitemap.xml 成功解析 {url_count} 筆網址")
if url_count == 0:
    print("[ERROR] sitemap.xml 內無任何網址！")
    sys.exit(1)

# 3. 建構 IndexNow Payload
payload = {
    "host": "gugopro.com",
    "key": key_value,
    "keyLocation": f"https://gugopro.com/{key_value}.txt",
    "urlList": urls
}

json_data = json.dumps(payload, ensure_ascii=False, indent=2).encode('utf-8')

# 4. 目標 API 端點
endpoints = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow"
]

results = {}

for ep in endpoints:
    print(f"\n[廣播發送中] -> {ep}")
    req = urllib.request.Request(
        ep,
        data=json_data,
        headers={
            'Content-Type': 'application/json; charset=utf-8',
            'User-Agent': 'GugoPro-IndexNow-Broadcaster/1.0'
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            body = resp.read().decode('utf-8', errors='ignore')
            results[ep] = {
                'status': status,
                'message': 'OK (200)' if status == 200 else ('Accepted (202)' if status == 202 else f'HTTP {status}'),
                'body': body
            }
            print(f"  [SUCCESS] HTTP 狀態碼: {status} ({results[ep]['message']})")
            if body:
                print(f"  [回應內文]: {body}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8', errors='ignore') if e.fp else ''
        results[ep] = {
            'status': e.code,
            'message': f'HTTP Error: {e.reason}',
            'body': err_body
        }
        print(f"  [HTTP ERROR] {e.code} - {e.reason}")
        if err_body:
            print(f"  [錯誤詳情]: {err_body}")
    except Exception as e:
        results[ep] = {
            'status': 'EXCEPTION',
            'message': str(e),
            'body': ''
        }
        print(f"  [連線異常]: {str(e)}")

print("\n=================================================================")
print("                      廣播執行結果摘要")
print("=================================================================")
print(f"發送主機 (host):        gugopro.com")
print(f"驗證金鑰 (key):         {key_value}")
print(f"金鑰位置 (keyLocation): https://gugopro.com/{key_value}.txt")
print(f"發送網址總數:           {url_count} 筆")
for ep, res in results.items():
    print(f"端點 {ep}: 狀態碼 [{res['status']}] - {res['message']}")
print("=================================================================")
