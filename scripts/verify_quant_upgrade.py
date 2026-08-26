from __future__ import annotations

import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []

def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)

required = [
    ROOT / "academy" / "index.html",
    ROOT / "academy" / "academy.css",
    ROOT / "academy" / "tools" / "volatility-zscore.html",
    ROOT / "academy" / "tools" / "futures-basis-pairs.html",
    ROOT / "academy" / "tools" / "kelly-risk-budget.html",
    ROOT / "articles" / "investment" / "15-quant-research-workflow.html",
    ROOT / "articles" / "investment" / "16-futures-pairs-basis.html",
    ROOT / "docs" / "quant-upgrade-research.md",
]
for path in required:
    require(path.exists(), f"missing required file: {path.relative_to(ROOT)}")

academy = (ROOT / "academy" / "index.html").read_text(encoding="utf-8")
require(len(re.findall(r'data-lesson="', academy)) == 22, "academy lesson count is not 22")
require(len(re.findall(r'<div class="tool"><small>', academy)) == 16, "academy tool count is not 16")
require(academy.count('id="quant-lab"') == 1, "quant-lab section missing or duplicated")
require(academy.count('href="../articles/investment/15-quant-research-workflow.html"') >= 1, "academy missing article 15 link")
require(academy.count('href="../articles/investment/16-futures-pairs-basis.html"') >= 1, "academy missing article 16 link")
require('"@type":"CollectionPage"' in academy, "academy CollectionPage schema missing")

for filename, ids, expected_tools in [
    ("15-quant-research-workflow.html", ["question", "ma", "vol", "backtest", "checklist"], 4),
    ("16-futures-pairs-basis.html", ["contract", "basis", "hedge", "risk", "checklist"], 1),
]:
    path = ROOT / "articles" / "investment" / filename
    text = path.read_text(encoding="utf-8")
    for anchor in ids:
        require(f'id="{anchor}"' in text, f"{filename} missing chapter #{anchor}")
    require(text.count('class="jump"') == 1, f"{filename} jump navigation missing or duplicated")
    require('"@type":"Article"' in text, f"{filename} Article schema missing")
    require(text.count('href="../../academy/tools/') >= expected_tools, f"{filename} expected tool links missing")
    require(len(text) > 6000, f"{filename} is unexpectedly short ({len(text)} chars)")

for filename in ["volatility-zscore.html", "futures-basis-pairs.html", "kelly-risk-budget.html"]:
    text = (ROOT / "academy" / "tools" / filename).read_text(encoding="utf-8")
    require('class="quant-page"' in text, f"{filename} shared quant class missing")
    require('class="status"' in text and 'aria-live="polite"' in text, f"{filename} status live region missing")
    require('class="formula-note"' in text and 'class="source-box"' in text, f"{filename} formula/source disclosure missing")
    require('class="result-big"' in text and 'class="metric-grid"' in text, f"{filename} result HUD missing")
    require('class="calc"' in text and 'addEventListener' in text, f"{filename} calculation action missing")
    require('localStorage' not in text, f"{filename} unexpectedly stores user finance data")

registry = json.loads((ROOT / "data" / "tools-list.json").read_text(encoding="utf-8"))
registry_ids = {item.get("id") for item in registry}
for item_id in ["academy-volatility-zscore", "academy-futures-basis-pairs", "academy-kelly-risk-budget"]:
    require(item_id in registry_ids, f"registry missing {item_id}")

try:
    ET.parse(ROOT / "sitemap.xml")
except ET.ParseError as exc:
    errors.append(f"sitemap XML parse failure: {exc}")
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
for url in [
    "https://gugopro.com/articles/investment/15-quant-research-workflow.html",
    "https://gugopro.com/articles/investment/16-futures-pairs-basis.html",
    "https://academy.gugopro.com/tools/volatility-zscore.html",
    "https://academy.gugopro.com/tools/futures-basis-pairs.html",
    "https://academy.gugopro.com/tools/kelly-risk-budget.html",
]:
    require(sitemap.count(url) == 1, f"sitemap missing or duplicating {url}")
require("kelly-criterion-calculator.html" not in sitemap, "stale Kelly sitemap route remains")

for path in sorted(list((ROOT / "academy").rglob("*.html")) + list((ROOT / "articles" / "investment").glob("*.html"))):
    text = path.read_text(encoding="utf-8")
    require("/tools/finance/kelly-criterion-calculator.html" not in text, f"stale Kelly link in {path.relative_to(ROOT)}")
    for href in re.findall(r'href=["\']([^"\']+)["\']', text):
        if href.startswith(("http", "mailto:", "javascript:", "#")):
            continue
        target = href.split("#", 1)[0].split("?", 1)[0]
        if not target:
            continue
        candidate = (ROOT / target.lstrip('/')).resolve() if href.startswith('/') else (path.parent / target).resolve()
        require(candidate.exists(), f"broken site link {path.relative_to(ROOT)} -> {href}")

print(f"academy_lessons={academy.count('data-lesson=\"')}")
print(f"academy_tools={academy.count('<div class=\"tool\"><small>')}")
print("new_tools=3")
print("new_articles=2")
print("schema=ok")
print("sitemap=ok")
print(f"errors={len(errors)}")
for error in errors:
    print("ERROR:", error)
if errors:
    raise SystemExit(1)
