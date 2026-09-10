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
trade_records_path = ROOT / "data/tw-market/pair-trade-records.json"
page_path = ROOT / "tools/tw-market/taiwan-pair-trading.html"
feed = json.loads(feed_path.read_text(encoding="utf-8"))
trade_records = json.loads(trade_records_path.read_text(encoding="utf-8"))
page = page_path.read_text(encoding="utf-8")
index = (ROOT / "index.html").read_text(encoding="utf-8")
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
registry = json.loads((ROOT / "data/tools-list.json").read_text(encoding="utf-8"))

require(feed.get("schema_version") == 1, "feed schema_version missing")
require(100 <= len(feed.get("pairs", [])) <= 150, "feed does not contain 100-150 pairs")
require(feed.get("universe", {}).get("taifex_stock_futures_discovered", 0) >= 200, "TAIFEX discovery count is below 200")
require(feed.get("universe", {}).get("spot_selected", 0) >= 1000, "TWSE universe is not the full listed ordinary-share set")
require(feed.get("universe", {}).get("spot_analysis_eligible", 0) > 0, "liquidity/volatility filter produced no eligible stocks")
require(feed.get("universe", {}).get("liquidity_filter", {}).get("value_20d_min_twd") == 50000000, "liquidity value floor is missing")
require(feed.get("parameters", {}).get("adf_p_value_threshold") == 0.05, "ADF threshold is missing")
require(feed.get("parameters", {}).get("backtest", {}).get("lookahead_safe") is True, "backtest lookahead flag is missing")
require(isinstance(trade_records.get("records"), dict) and sum(len(rows) for rows in trade_records["records"].values()) > 0, "trade record file is empty")
require(feed.get("parameters", {}).get("更新排程"), "update schedule metadata is missing")
require(feed.get("universe", {}).get("歷史資料起日") and feed.get("universe", {}).get("歷史資料迄日"), "history date range is missing")
required_pair_fields = {"pair_id", "symbol_a", "name_a", "type_a", "symbol_b", "name_b", "type_b", "correlation", "beta", "adf_p_value", "residual_half_life_days", "current_spread", "mean_spread", "std_dev", "z_score", "next_day_backtest", "signal_status", "history"}
for index_no, pair in enumerate(feed.get("pairs", []), start=1):
    require(required_pair_fields <= set(pair), f"pair {index_no} missing required field")
    history = pair.get("history", {})
    require(len(history.get("dates", [])) == 60, f"pair {index_no} history dates is not 60")
    require(len(history.get("spread", [])) == 60, f"pair {index_no} history spread is not 60")
    require(len(history.get("z_score", [])) == 60, f"pair {index_no} history z-score is not 60")
    require(float(pair["correlation"]) >= 0.85, f"pair {index_no} below correlation threshold")
    require(float(pair["adf_p_value"]) < 0.05, f"pair {index_no} fails ADF threshold")
    require("win_rate" in pair["next_day_backtest"] and "net_return" in pair["next_day_backtest"], f"pair {index_no} missing next-day backtest fields")

instrument_keys = [tuple(sorted((str(pair.get("pair_id")), str(pair.get("type_a")), str(pair.get("type_b"))))) for pair in feed.get("pairs", [])]
require(len(instrument_keys) == len(set(instrument_keys)), "feed contains duplicate instrument pairs")
require(any(pair.get("type_a") == "futures" and pair.get("type_b") == "futures" for pair in feed.get("pairs", [])), "feed contains no futures-to-futures pair")

for marker in [
    "<title>", "applicationCategory", '"@type":"FAQPage"',
    "language-switch", "type-filter", "corr-filter", "signal-filter",
    "price-chart", "spread-chart", "z-chart", "equity-chart", "metric-adf", "metric-half-life", "metric-bt-win", "metric-bt-return",
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
print(f"spot_universe={feed.get('universe', {}).get('spot_selected')}")
print(f"spot_analysis_eligible={feed.get('universe', {}).get('spot_analysis_eligible')}")
print(f"page_bytes={len(page.encode('utf-8'))}")
print(f"trade_records={sum(len(rows) for rows in trade_records.get('records', {}).values())}")
print(f"errors={len(errors)}")
for error in errors:
    print("ERROR:", error)
if errors:
    raise SystemExit(1)
