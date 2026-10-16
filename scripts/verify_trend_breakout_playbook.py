from __future__ import annotations

import html
import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "articles" / "investment" / "18-trend-following-breakout-playbook.html"
ARTICLE_INDEX = ROOT / "articles" / "investment" / "index.html"
ACADEMY = ROOT / "academy" / "index.html"
INVESTMENT_REGISTRY = ROOT / "data" / "investment-list.json"
SITEMAP = ROOT / "sitemap.xml"

errors: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


def visible_text(raw: str) -> str:
    cleaned = re.sub(r"<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>", " ", raw, flags=re.I | re.S)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    return html.unescape(re.sub(r"\s+", " ", cleaned)).strip()


for path in [ARTICLE, ARTICLE_INDEX, ACADEMY, INVESTMENT_REGISTRY, SITEMAP, ROOT / "docs" / "practical-trading-source-notes.md"]:
    require(path.exists(), f"missing required file: {path.relative_to(ROOT)}")

article = ARTICLE.read_text(encoding="utf-8")
text = visible_text(article)
require(len(article) >= 18000, f"Playbook article too short: {len(article)} chars")
require('"@type":"Article"' in article, "Article schema missing")
require(article.count('class="jump"') == 1, "jump navigation missing or duplicated")
require(article.count("<table") >= 4, "Playbook needs at least four substantive tables")

for anchor in ["definition", "regime", "breakout", "execution", "sizing", "exit", "false-breakout", "backtest", "playbook"]:
    require(f'id="{anchor}"' in article, f"article missing chapter #{anchor}")

for phrase in [
    "趨勢追蹤", "突破", "Donchian", "ATR", "假突破", "樣本外", "walk-forward",
    "滑價", "停損", "回測", "交易日誌", "不提供即時訊號", "可重算的教育假設",
    "Upper_N", "Lower_N", "ATR_N", "TR_t", "淨期望值", "floor", "損益兩平",
]:
    require(phrase in text or phrase in article, f"article missing teaching phrase: {phrase}")

for href in [
    "../../academy/tools/trade-rule-checklist.html",
    "../../academy/tools/trade-expectancy.html",
    "../../academy/tools/trade-journal-analyzer.html",
    "../../academy/tools/practical-trade-plan.html",
    "../../academy/tools/risk-return-drawdown.html",
    "../../academy/research/quant-lab.html",
    "https://www.sciencedirect.com/science/article/pii/S0304405X11002613",
    "https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing",
    "https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders",
    "https://www.cmegroup.com/education/courses/things-to-know-before-trading-cme-futures/position-and-risk-management",
]:
    require(href in article, f"article missing link: {href}")

article_index = ARTICLE_INDEX.read_text(encoding="utf-8")
require('id="practical-trading"' in article_index, "article index practical trading section missing")
require("2 篇總覽 · 4 個工具" in article_index, "article index practical trading count not updated")
require("18-trend-following-breakout-playbook.html" in article_index, "article index missing Playbook card")

academy = ACADEMY.read_text(encoding="utf-8")
require('id="practical-trading"' in academy, "Academy practical trading section missing")
require("../articles/investment/18-trend-following-breakout-playbook.html" in academy, "Academy missing Playbook link")
require(len(re.findall(r'<div class="tool"><small>', academy)) == 19, "Academy tool count changed unexpectedly")

registry = json.loads(INVESTMENT_REGISTRY.read_text(encoding="utf-8"))
category = next((entry for entry in registry if entry.get("level") == "第 13 類：實戰交易"), None)
require(category is not None, "investment registry practical trading category missing")
articles = category.get("articles", []) if category else []
playbook = next((entry for entry in articles if entry.get("id") == "trend-following-breakout-playbook"), None)
require(playbook is not None, "investment registry missing Playbook")
require(playbook and playbook.get("url") == "/articles/investment/18-trend-following-breakout-playbook.html", "Playbook registry URL mismatch")

try:
    ET.parse(SITEMAP)
except ET.ParseError as exc:
    errors.append(f"sitemap XML parse failure: {exc}")
sitemap = SITEMAP.read_text(encoding="utf-8")
playbook_url = "https://gugopro.com/articles/investment/18-trend-following-breakout-playbook.html"
require(sitemap.count(playbook_url) == 1, "Playbook missing or duplicated in sitemap")

require("fetch" not in article and "XMLHttpRequest" not in article and "WebSocket" not in article, "article contains unexpected remote data logic")
require("google-analytics" not in article.lower(), "unexpected analytics script in Playbook article")

print(f"article_chars={len(article)}")
print(f"visible_chars={len(text)}")
print("chapters=9")
print(f"tables={article.count('<table')}")
print("registry=synchronized")
print("sitemap=ok")
print("external_data_logic=none")
print(f"errors={len(errors)}")
for error in errors:
    print("ERROR:", error)
if errors:
    raise SystemExit(1)
