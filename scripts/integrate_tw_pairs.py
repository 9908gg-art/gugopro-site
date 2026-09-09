#!/usr/bin/env python3
"""Integrate the Taiwan pair-trading workstation into the existing static site."""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SITEMAP = ROOT / "sitemap.xml"
REGISTRY = ROOT / "data" / "tools-list.json"
TOOL_ID = "taiwan-pair-trading-workbench"
URL = "https://gugopro.com/tools/tw-market/taiwan-pair-trading.html"

CARD = '''<article class="converter-tool-card" data-article-url="" data-category="finance-pro" id="pro-taiwan-pair-trading">
<div class="converter-card-icon"><i class="fa-solid fa-arrows-left-right-to-line"></i></div>
<h3>🇹🇼 台灣市場／交易工具：配對交易掃描工作站</h3>
<p>串接 TWSE、TAIFEX 與公開日線資料，掃描高相關股票／期貨配對，檢視 Beta、價差、Z-Score、部位配置與自訂分 K 回測。</p>
<div class="converter-card-tags"><span>TWSE / TAIFEX</span><span>Pairs Trading</span><span>Z-Score</span></div>
<a class="converter-link-button" href="/tools/tw-market/taiwan-pair-trading.html">開啟台灣配對交易工作站<i class="fa-solid fa-arrow-right"></i></a>
</article>
'''


def update_index() -> None:
    text = INDEX.read_text(encoding="utf-8")
    if 'id="pro-taiwan-pair-trading"' not in text:
        start_marker = '<section class="dashboard-category-section finance-tier-section" data-dashboard-category="finance-pro"'
        start = text.index(start_marker)
        end_marker = '<section class="dashboard-category-section" data-dashboard-category="images"'
        end = text.index(end_marker, start)
        block = text[start:end]
        block = block.replace('data-count-fixed="3"', 'data-count-fixed="4"', 1)
        block = block.replace('data-dashboard-section-count="finance-pro">3<', 'data-dashboard-section-count="finance-pro">4<', 1)
        close = block.rfind('</div>')
        if close < 0:
            raise RuntimeError("finance-pro card grid marker not found")
        block = block[:close] + CARD + block[close:]
        text = text[:start] + block + text[end:]
        INDEX.write_text(text, encoding="utf-8")


def update_registry() -> None:
    items = json.loads(REGISTRY.read_text(encoding="utf-8"))
    if not any(item.get("id") == TOOL_ID for item in items):
        items.append({
            "id": TOOL_ID,
            "name": "🇹🇼 台灣股票與期貨配對交易掃描工作站",
            "name_en": "Taiwan Market Pair Trading Scanner & Quant Workbench",
            "category": "finance-pro",
            "description": "以 TWSE、TAIFEX 與公開日線資料計算相關係數、Beta、Spread、Z-Score，支援部位配置估算與自訂分 K 回測。",
            "icon": "fa-solid fa-arrows-left-right-to-line",
            "url": "/tools/tw-market/taiwan-pair-trading.html",
            "live_url": URL,
            "status": "online",
            "tags": ["台灣市場", "TWSE", "TAIFEX", "Pairs Trading", "Beta", "Z-Score", "回測"],
            "color": "cyan",
            "created_at": date.today().isoformat(),
        })
        REGISTRY.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_sitemap() -> None:
    text = SITEMAP.read_text(encoding="utf-8")
    if URL not in text:
        entry = f'<url><loc>{URL}</loc><lastmod>{date.today().isoformat()}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>'
        marker = '</urlset>'
        if marker not in text:
            raise RuntimeError("sitemap closing marker not found")
        text = text.replace(marker, entry + marker, 1)
        SITEMAP.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    update_index()
    update_registry()
    update_sitemap()
    print("Integrated Taiwan pair-trading workstation into index, registry, and sitemap.")
