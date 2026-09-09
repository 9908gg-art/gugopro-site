#!/usr/bin/env python3
"""Static checks for the Taiwan pair-trading workstation."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []

def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)

feed_path = ROOT / "data/tw-market/pairs-scan-results.json"
page_path = ROOT / "tools/tw-market/taiwan-pair-trading.html"
feed = json.loads(feed_path.read_text(encoding="utf-8"))
page = page_path.read_text(encoding="utf-8")
index = (ROOT / "index.html").read_text(encoding="utf-8")
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
registry = json.loads((ROOT / "data/tools-list.json").read_text(encoding="utf-8"))

require(feed.get("schema_version") == 1, "feed schema_version missing")
require(len(feed.get("pairs", [])) == 80, "feed does not contain 80 pairs")
require(feed.get("universe", {}).get("taifex_stock_futures_discovered", 0) >= 200, "TAIFEX discovery count is below 200")
require(feed.get("universe", {}).get("spot_selected") == 150, "spot selected count is not 150")
required_pair_fields = {"pair_id", "symbol_a", "name_a", "type_a", "symbol_b", "name_b", "type_b", "correlation", "beta", "current_spread", "mean_spread", "std_dev", "z_score", "signal_status", "history"}
for index_no, pair in enumerate(feed.get("pairs", []), start=1):
    require(required_pair_fields <= set(pair), f"pair {index_no} missing required field")
    history = pair.get("history", {})
    require(len(history.get("dates", [])) == 60, f"pair {index_no} history dates is not 60")
    require(len(history.get("spread", [])) == 60, f"pair {index_no} history spread is not 60")
    require(len(history.get("z_score", [])) == 60, f"pair {index_no} history z-score is not 60")
    require(float(pair["correlation"]) >= 0.82, f"pair {index_no} below correlation threshold")

underlying_keys = [tuple(sorted((str(pair.get("underlying_a")), str(pair.get("underlying_b"))))) for pair in feed.get("pairs", [])]
require(len(underlying_keys) == len(set(underlying_keys)), "feed contains duplicate underlying pairs")

for marker in [
    "<title>", "applicationCategory", '"@type":"FAQPage"',
    "language-switch", "type-filter", "corr-filter", "signal-filter",
    "price-chart", "spread-chart", "z-chart", "equity-chart",
    "dropzone", "run-backtest", "localStorage", "TAIFEX", "TWSE",
]:
    require(marker in page, f"workstation missing marker: {marker}")
require(page.count('"@type":"Question"') == 3, "FAQ schema does not contain 3 questions")
require(page.count("<details>") == 3, "FAQ body does not contain 3 questions")
require('id="pro-taiwan-pair-trading"' in index, "homepage Taiwan card missing")
require('data-dashboard-section-count="finance-pro">4<' in index, "homepage finance-pro count not updated")
require(any(item.get("id") == "taiwan-pair-trading-workbench" for item in registry), "tool registry entry missing")
require(sitemap.count("https://gugopro.com/tools/tw-market/taiwan-pair-trading.html") == 1, "sitemap URL missing or duplicated")
try:
    ElementTree.parse(ROOT / "sitemap.xml")
except ElementTree.ParseError as exc:
    errors.append(f"sitemap XML parse failure: {exc}")

print(f"pairs={len(feed.get('pairs', []))}")
print(f"taifex_contracts={feed.get('universe', {}).get('taifex_stock_futures_discovered')}")
print(f"spot_selected={feed.get('universe', {}).get('spot_selected')}")
print(f"page_bytes={len(page.encode('utf-8'))}")
print(f"errors={len(errors)}")
for error in errors:
    print("ERROR:", error)
if errors:
    raise SystemExit(1)
