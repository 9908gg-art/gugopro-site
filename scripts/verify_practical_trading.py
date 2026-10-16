from __future__ import annotations

import json
import math
import re
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "articles" / "investment" / "17-practical-trading.html"
PLAYBOOK = ROOT / "articles" / "investment" / "18-trend-following-breakout-playbook.html"
ARTICLE_INDEX = ROOT / "articles" / "investment" / "index.html"
ACADEMY = ROOT / "academy" / "index.html"
REGISTRY = ROOT / "data" / "tools-list.json"
SITEMAP = ROOT / "sitemap.xml"
TOOL_NAMES = [
    "practical-trade-plan",
    "trade-journal-analyzer",
    "trade-rule-checklist",
]
errors: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


def close(actual: float, expected: float, tolerance: float = 1e-8) -> bool:
    return math.isclose(actual, expected, rel_tol=tolerance, abs_tol=tolerance)


for path in [
    ARTICLE,
    PLAYBOOK,
    ARTICLE_INDEX,
    ACADEMY,
    REGISTRY,
    SITEMAP,
    ROOT / "docs" / "practical-trading-source-notes.md",
    ROOT / "academy" / "tools" / "practical-trading.css",
    ROOT / "academy" / "tools" / "practical-trade-plan.html",
    ROOT / "academy" / "tools" / "practical-trade-plan.js",
    ROOT / "academy" / "tools" / "trade-journal-analyzer.html",
    ROOT / "academy" / "tools" / "trade-journal-analyzer.js",
    ROOT / "academy" / "tools" / "trade-rule-checklist.html",
    ROOT / "academy" / "tools" / "trade-rule-checklist.js",
]:
    require(path.exists(), f"missing required file: {path.relative_to(ROOT)}")

article = ARTICLE.read_text(encoding="utf-8")
require(len(article) > 12000, f"practical trading article is too short ({len(article)} chars)")
require('"@type":"Article"' in article, "practical trading Article schema missing")
require(article.count('class="jump"') == 1, "practical trading jump navigation missing or duplicated")
for anchor in ["market", "plan", "orders", "risk", "strategies", "backtest", "manage", "review", "roadmap"]:
    require(f'id="{anchor}"' in article, f"article missing chapter #{anchor}")
for href in [
    "../../academy/tools/practical-trade-plan.html",
    "../../academy/tools/trade-expectancy.html",
    "../../academy/tools/trade-journal-analyzer.html",
    "../../academy/tools/trade-rule-checklist.html",
    "../../academy/tools/risk-return-drawdown.html",
    "https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders",
    "https://www.finra.org/investors/investing/investment-products/stocks/order-types",
    "https://www.cmegroup.com/education/courses/things-to-know-before-trading-cme-futures/position-and-risk-management",
]:
    require(href in article, f"article missing link: {href}")
for phrase in ["損益兩平勝率", "可承擔損失", "停損單", "市價單", "限價單", "樣本外", "交易日誌", "不提供即時訊號"]:
    require(phrase in article, f"article missing teaching phrase: {phrase}")

article_index = ARTICLE_INDEX.read_text(encoding="utf-8")
require('id="practical-trading"' in article_index, "article index practical trading section missing")
require("2 篇總覽 · 4 個工具" in article_index, "article index practical trading count label missing")
for filename in ["17-practical-trading.html", "18-trend-following-breakout-playbook.html", *[f"../../academy/tools/{name}.html" for name in TOOL_NAMES]]:
    require(filename in article_index, f"article index missing practical link: {filename}")

academy = ACADEMY.read_text(encoding="utf-8")
require(len(re.findall(r'<div class="tool"><small>', academy)) == 19, "academy tool count is not 19")
require('id="practical-trading"' in academy, "academy practical trading section missing")
for path in [
    "../articles/investment/17-practical-trading.html",
    "../articles/investment/18-trend-following-breakout-playbook.html",
    "tools/practical-trade-plan.html",
    "tools/trade-journal-analyzer.html",
    "tools/trade-rule-checklist.html",
]:
    require(path in academy, f"academy missing practical trading link: {path}")

playbook = PLAYBOOK.read_text(encoding="utf-8")
require(len(playbook) >= 18000, f"trend breakout Playbook is too short ({len(playbook)} chars)")
require('"@type":"Article"' in playbook, "trend breakout Article schema missing")
require(playbook.count('class="jump"') == 1, "trend breakout jump navigation missing or duplicated")
for anchor in ["definition", "regime", "breakout", "execution", "sizing", "exit", "false-breakout", "backtest", "playbook"]:
    require(f'id="{anchor}"' in playbook, f"trend breakout missing chapter #{anchor}")
for href in [
    "../../academy/tools/practical-trade-plan.html",
    "../../academy/tools/trade-expectancy.html",
    "../../academy/tools/trade-journal-analyzer.html",
    "../../academy/tools/trade-rule-checklist.html",
    "../../academy/tools/risk-return-drawdown.html",
    "https://www.sciencedirect.com/science/article/pii/S0304405X11002613",
    "https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing",
    "https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders",
    "https://www.cmegroup.com/education/courses/things-to-know-before-trading-cme-futures/position-and-risk-management",
]:
    require(href in playbook, f"trend breakout missing link: {href}")
for phrase in ["趨勢追蹤", "突破", "Donchian", "ATR", "假突破", "樣本外", "walk-forward", "滑價", "停損", "回測", "損益兩平", "可重算的教育假設"]:
    require(phrase in playbook, f"trend breakout missing teaching phrase: {phrase}")

for name in TOOL_NAMES:
    html = (ROOT / "academy" / "tools" / f"{name}.html").read_text(encoding="utf-8")
    js = (ROOT / "academy" / "tools" / f"{name}.js").read_text(encoding="utf-8")
    require('class="quant-page practical-page"' in html, f"{name} shared practical class missing")
    require('aria-live="polite"' in html, f"{name} live status missing")
    require('class="practical-formula"' in html, f"{name} formula disclosure missing")
    require('class="practical-note"' in html and "模型限制" in html, f"{name} limitation disclosure missing")
    require("localStorage" not in html + js, f"{name} unexpectedly stores finance data")
    require("fetch" not in html + js, f"{name} unexpectedly fetches remote data")
    require("XMLHttpRequest" not in html + js, f"{name} unexpectedly uses XHR")
    require("WebSocket" not in html + js, f"{name} unexpectedly uses WebSocket")
    require("innerHTML" not in js and "outerHTML" not in js and "insertAdjacentHTML" not in js, f"{name} unsafe HTML mutation found")
    require("addEventListener" in js and "replaceChildren" in js, f"{name} safe DOM/event implementation missing")

registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
registry_ids = {entry.get("id") for entry in registry}
for name in TOOL_NAMES:
    require(f"academy-{name}" in registry_ids, f"registry missing academy-{name}")
    entry = next((item for item in registry if item.get("id") == f"academy-{name}"), None)
    require(entry is not None and entry.get("status") == "online", f"registry academy-{name} not online")

ET.parse(SITEMAP)
sitemap = SITEMAP.read_text(encoding="utf-8")
for url in [
    "https://gugopro.com/articles/investment/17-practical-trading.html",
    "https://gugopro.com/articles/investment/18-trend-following-breakout-playbook.html",
    "https://gugopro.com/academy/tools/practical-trade-plan.html",
    "https://gugopro.com/academy/tools/trade-journal-analyzer.html",
    "https://gugopro.com/academy/tools/trade-rule-checklist.html",
]:
    require(sitemap.count(url) == 1, f"sitemap missing or duplicating {url}")

# Position-plan case: the same transparent assumptions as the trade expectancy example.
entry, stop, target = 100.0, 95.0, 115.0
account, risk_percent, multiplier = 100000.0, 1.0, 1.0
entry_fee, exit_fee, entry_slip, exit_slip = 0.10, 0.10, 0.05, 0.05
actual_entry = entry * (1 + entry_slip / 100)
actual_stop = stop * (1 - exit_slip / 100)
actual_target = target * (1 - exit_slip / 100)
price_risk = abs(actual_entry - actual_stop) * multiplier
variable_cost = actual_entry * entry_fee / 100 + actual_stop * exit_fee / 100
unit_risk = price_risk + variable_cost
budget = account * risk_percent / 100
units = math.floor(budget / unit_risk)
net_reward = abs(actual_target - actual_entry) * multiplier - (actual_entry * entry_fee / 100 + actual_target * exit_fee / 100)
require(close(actual_entry, 100.05), "position model entry slippage arithmetic changed")
require(close(actual_stop, 94.9525), "position model stop slippage arithmetic changed")
require(close(unit_risk, 5.2925025), "position model unit risk arithmetic changed")
require(units == 188, f"position model expected 188 units, found {units}")
require(close(net_reward / unit_risk, 2.77326416), "position model net R:R arithmetic changed")

# Journal case: [3, -1, 0.5, -1, 2].
results = [3.0, -1.0, 0.5, -1.0, 2.0]
wins = [value for value in results if value > 0]
losses = [value for value in results if value < 0]
expectancy = sum(results) / len(results)
profit_factor = sum(wins) / abs(sum(losses))
current_streak = 0
max_streak = 0
running = peak = max_drawdown = 0.0
for value in results:
    running += value
    peak = max(peak, running)
    max_drawdown = min(max_drawdown, running - peak)
    current_streak = current_streak + 1 if value < 0 else 0
    max_streak = max(max_streak, current_streak)
require(close(expectancy, 0.7), "journal expectancy arithmetic changed")
require(close(profit_factor, 2.75), "journal profit factor arithmetic changed")
require(max_streak == 1, "journal max loss streak arithmetic changed")
require(close(max_drawdown, -1.5), "journal R drawdown arithmetic changed")

print(f"article_chars={len(article)}")
print(f"playbook_chars={len(playbook)}")
print("article_chapters=9")
print("playbook_chapters=9")
print("practical_tools=3")
print("position_case=188_units_net_rr=2.77326416")
print("journal_case=expectancy_0.70_pf_2.75_streak_1_mdd_-1.50R")
print("registry=synchronized")
print("sitemap=ok")
print(f"errors={len(errors)}")
for error in errors:
    print("ERROR:", error)
if errors:
    raise SystemExit(1)
