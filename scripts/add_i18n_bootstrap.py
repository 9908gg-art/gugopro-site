from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
BOOT='''<style id="gugo-i18n-boot-style">html[data-gugo-i18n-pending] body{visibility:hidden}html[data-gugo-i18n-pending]::before{content:"";position:fixed;inset:0;background:#080b12;z-index:2147483647}</style>
<script id="gugo-i18n-boot">(()=>{try{const ai=/\\/tools\\/ai(?:\\/|-)|\\/tools\\/ai-media\\//i.test(location.pathname);if(ai)return;const p=new URLSearchParams(location.search).get('lang'),ok=['zh-TW','en','ja'];let l=ok.includes(p)?p:null;if(!l)try{const s=localStorage.getItem('gugopro_locale');if(ok.includes(s))l=s}catch(e){}if(!l){const n=(navigator.language||'').toLowerCase();l=n.startsWith('ja')?'ja':n.startsWith('zh')?'zh-TW':'en'}document.documentElement.dataset.gugoI18nPending='true';document.documentElement.dataset.gugoI18nInitial=l}catch(e){}})();</script>'''
count=0
for p in ROOT.rglob('*.html'):
 if '.git' in p.parts or 'tools/ai/' in p.as_posix() or 'tools/ai-media/' in p.as_posix(): continue
 s=p.read_text(encoding='utf-8',errors='ignore')
 if 'id="gugo-i18n-boot"' in s: continue
 if '</head>' not in s: continue
 s=s.replace('</head>',BOOT+'\n</head>',1)
 p.write_text(s,encoding='utf-8');count+=1
print('bootstrapped',count)
