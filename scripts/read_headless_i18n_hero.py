from __future__ import annotations
import subprocess
from bs4 import BeautifulSoup

locales = ['zh-TW','zh-CN','en','ja','de','fr','es','pt']
for locale in locales:
    r = subprocess.run(['/usr/bin/chromium','--headless=new','--no-sandbox','--disable-gpu','--virtual-time-budget=3500','--dump-dom',f'http://127.0.0.1:8127/academy/index.html?lang={locale}&qa=hero'],capture_output=True,text=True,timeout=30)
    soup=BeautifulSoup(r.stdout,'html.parser')
    h1=soup.find('h1')
    print(locale, '::', soup.title.get_text(' ',strip=True) if soup.title else '', '::', h1.get_text(' ',strip=True) if h1 else '')
