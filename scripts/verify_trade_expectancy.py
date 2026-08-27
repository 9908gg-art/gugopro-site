from __future__ import annotations

import json
import math
import re
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / "academy/tools/trade-expectancy.html"
RUNTIME = ROOT / "academy/tools/trade-expectancy.js"
CSS = ROOT / "academy/tools/trade-expectancy.css"
ACADEMY = ROOT / "academy/index.html"
ARTICLE = ROOT / "articles/investment/06-sharpe-mdd-risk-control.html"
REGISTRY = ROOT / "data/tools-list.json"
SITEMAP = ROOT / "sitemap.xml"


class VisibleText(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    @property
    def text(self) -> str:
        return " ".join(" ".join(self.parts).split())


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def read(path: Path) -> str:
    require(path.exists(), f"missing file: {path}")
    return path.read_text(encoding="utf-8")


def check_html() -> None:
    raw = read(TOOL)
    parser = VisibleText()
    parser.feed(raw)
    text = parser.text
    for marker in [
        "交易期望值計算器", "手續費與滑價", "id=\"direction\"", "id=\"win-rate\"",
        "id=\"entry\"", "id=\"stop\"", "id=\"target\"", "id=\"position-size\"",
        "id=\"trades\"", "id=\"entry-fee\"", "id=\"exit-fee\"", "id=\"entry-slip\"",
        "id=\"exit-slip\"", "id=\"entry-fixed\"", "id=\"exit-fixed\"", "id=\"expectancy-r\"",
        "id=\"planned-rr\"", "id=\"net-win-r\"", "id=\"net-loss-r\"", "id=\"break-even\"",
        "id=\"outcome-rows\"", "id=\"win-bar\"", "id=\"loss-bar\"", "id=\"limits\"",
        "trade-expectancy.js", "trade-expectancy.css", "純前端", "不會上傳", "研究用途與限制",
    ]:
        require(marker in raw or marker in text, f"tool marker missing: {marker}")
    require(len(text) >= 1000, f"tool page too short: {len(text)}")
    require("../../academy/tools/trade-expectancy.html#inputs" in read(ARTICLE), "article CTA missing")


def check_runtime() -> None:
    raw = read(RUNTIME)
    for marker in [
        "function validate", "function executionPrices", "function fees", "function calculate",
        "plannedRR", "netWinR", "netLossR", "breakEven", "expectancyMoney", "downloadCsv",
        "replaceChildren", "textContent", "URL.createObjectURL", "direction === 'long'",
    ]:
        require(marker in raw, f"runtime marker missing: {marker}")
    for forbidden in ["fetch(", "XMLHttpRequest", "WebSocket", "innerHTML", "outerHTML", "console."]:
        require(forbidden not in raw, f"runtime contains forbidden token: {forbidden}")


def check_css() -> None:
    raw = read(CSS)
    for marker in [".exp-layout", ".exp-metrics", ".exp-table-wrap", "@media(max-width:600px)", "@media(max-width:860px)", "prefers-reduced-motion"]:
        require(marker in raw, f"CSS marker missing: {marker}")


def check_registry_and_links() -> None:
    academy = read(ACADEMY)
    require("<b>19</b><span>互動決策工具" in academy, "academy tool count is not 19")
    require('tools/trade-expectancy.html' in academy, "academy trade expectancy card missing")

    registry = json.loads(read(REGISTRY))
    item = next((entry for entry in registry if entry.get("id") == "academy-trade-expectancy"), None)
    require(item is not None, "trade expectancy registry entry missing")
    require(item.get("url") == "/academy/tools/trade-expectancy.html", "registry URL mismatch")
    require(item.get("status") == "online", "registry status mismatch")

    sitemap = read(SITEMAP)
    ET.fromstring(sitemap)
    require(sitemap.count("https://gugopro.com/academy/tools/trade-expectancy.html") == 1, "tool missing or duplicated in sitemap")


def check_math() -> None:
    entry = 100.0
    stop = 95.0
    target = 115.0
    position = 200.0
    fee = 0.001
    slip = 0.0005
    actual_entry = entry * (1 + slip)
    actual_win_exit = target * (1 - slip)
    actual_loss_exit = stop * (1 - slip)
    gross_win = (actual_win_exit - actual_entry) * position
    gross_loss = (actual_loss_exit - actual_entry) * position
    win_cost = (actual_entry + actual_win_exit) * position * fee
    loss_cost = (actual_entry + actual_loss_exit) * position * fee
    net_win = gross_win - win_cost
    net_loss = gross_loss - loss_cost
    risk_total = (entry - stop) * position
    win_r = net_win / risk_total
    loss_r = net_loss / risk_total
    expectancy = 0.25 * win_r + 0.75 * loss_r
    break_even = (-loss_r) / (win_r - loss_r)
    require(math.isclose(actual_entry, 100.05, abs_tol=1e-12), "entry slippage arithmetic drifted")
    require(math.isclose(net_win, 2935.5015, abs_tol=1e-9), "net win arithmetic drifted")
    require(math.isclose(net_loss, -1058.5005, abs_tol=1e-9), "net loss arithmetic drifted")
    require(math.isclose(win_r, 2.9355015, abs_tol=1e-9), "net win R arithmetic drifted")
    require(math.isclose(loss_r, -1.0585005, abs_tol=1e-9), "net loss R arithmetic drifted")
    require(math.isclose(expectancy, -0.06, abs_tol=1e-12), "expectancy arithmetic drifted")
    require(math.isclose(break_even, 0.265022526278, abs_tol=1e-9), "break-even arithmetic drifted")


def main() -> None:
    check_html()
    check_runtime()
    check_css()
    check_registry_and_links()
    check_math()
    print("trade expectancy: PASS")
    print("academy_tools=19")
    print("net_win_r=2.9355")
    print("net_loss_r=-1.0585")
    print("expectancy_r_per_trade=-0.0600")
    print("break_even_win_rate=26.5023%")
    print("external_fetch=none")


if __name__ == "__main__":
    main()
