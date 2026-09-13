from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
configs = {
    "converter-pdf-merge.html": "pdf-merge",
    "converter-pdf-split.html": "pdf-split",
    "converter-pdf-to-images.html": "pdf-images",
    "converter-pdf-to-text.html": "pdf-text",
}

for name, key in configs.items():
    path = ROOT / "tools" / name
    source = path.read_text(encoding="utf-8", errors="ignore")
    old = source
    if key == "pdf-merge":
        source = re.sub(
            r"<script>\s*\(function\(\)\{\s*const requested=.*?</script>",
            """<script>\n(function(){\n const requested=new URLSearchParams(location.search).get('lang');\n const saved=localStorage.getItem('gugopro_locale') || localStorage.getItem('gugopro-pdf-merge-locale');\n const browser=(navigator.language||'').toLowerCase();\n const locale=['zh-TW','en','ja'].includes(requested)?requested:(['zh-TW','en','ja'].includes(saved)?saved:(browser.startsWith('zh')?'zh-TW':browser.startsWith('ja')?'ja':'en'));\n document.documentElement.lang=locale;\n window.PdfMergeI18n={locale:locale,text:function(zh,en,ja){return locale==='zh-TW'?zh:locale==='ja'?(ja||en):en;}};\n})();\n</script>""",
            source,
            count=1,
            flags=re.S,
        )
    else:
        source = re.sub(
            rf"<script>\s*\(function\(\)\{{const s=localStorage\.getItem\('gugopro-{re.escape(key)}-locale'\),n=\(navigator\.language\|\|''\)\.toLowerCase\(\);document\.documentElement\.lang=.*?</script>",
            """<script>(function(){const p=new URLSearchParams(location.search).get('lang'),s=localStorage.getItem('gugopro_locale')||localStorage.getItem('gugopro-%s-locale'),n=(navigator.language||'').toLowerCase();document.documentElement.lang=['zh-TW','en','ja'].includes(p)?p:(['zh-TW','en','ja'].includes(s)?s:(n.startsWith('zh')?'zh-TW':n.startsWith('ja')?'ja':'en'));})();</script>""" % key,
            source,
            count=1,
            flags=re.S,
        )
    source = re.sub(r'<label class="locale-control">.*?</label>', '', source, count=1, flags=re.S)
    source = re.sub(
        rf"document\.getElementById\('{re.escape(key)}-language'\)\.value=locale;document\.getElementById\('{re.escape(key)}-language'\)\.addEventListener\('change',e=>\{{.*?\}}\);",
        "",
        source,
        count=1,
        flags=re.S,
    )
    source = re.sub(
        rf"const lang=document\.getElementById\('{re.escape(key)}-language'\);lang\.value=locale;lang\.addEventListener\('change',e=>\{{.*?\}}\);",
        "",
        source,
        count=1,
        flags=re.S,
    )
    if source != old:
        path.write_text(source, encoding="utf-8")
        print(f"updated {path}")
    else:
        print(f"unchanged {path}")
