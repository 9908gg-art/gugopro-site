#!/usr/bin/env python3
"""Static and arithmetic contract checks for the retirement cash-flow feature."""
from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "academy/lessons/15-retirement-cashflow.html"
TOOL = ROOT / "academy/tools/retirement-cashflow.html"
RUNTIME = ROOT / "academy/tools/retirement-cashflow.js"
TOOL_CSS = ROOT / "academy/tools/retirement-cashflow.css"
ARTICLE_CSS = ROOT / "academy/lessons/retirement-cashflow.css"


def fail(message: str) -> None:
    raise AssertionError(message)


class ContractParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.hrefs: list[str] = []
        self.headings: list[tuple[int, str]] = []
        self.text: list[str] = []
        self.tables = 0
        self.scripts: list[str] = []
        self._in_script = False
        self._script_buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = dict(attrs)
        if data.get("id"):
            self.ids.add(str(data["id"]))
        if tag == "a" and data.get("href"):
            self.hrefs.append(str(data["href"]))
        if tag == "table":
            self.tables += 1
        if tag == "script":
            self._in_script = True
            self._script_buffer = []

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._in_script:
            self.scripts.append("".join(self._script_buffer))
            self._in_script = False

    def handle_data(self, data: str) -> None:
        self.text.append(data)
        if self._in_script:
            self._script_buffer.append(data)


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def simulate(asset: float, withdrawal: float, nominal: float, inflation: float, years: int, reserve: float, mode: str, percentage: float, cut: float, trigger: float, sequence: str) -> dict[str, float | int | None]:
    balance = asset
    previous_return: float | None = None
    depletion: int | None = None
    for year in range(1, years + 1):
        annual = -0.15 if ((sequence == "early" and year in (1, 2)) or (sequence == "late" and year in (10, 11))) else nominal
        base = withdrawal * ((1 + inflation) ** (year - 1))
        draw = balance * percentage if mode == "percentage" else base
        if mode == "flexible" and year > 1 and previous_return is not None and previous_return < trigger:
            draw = base * (1 - cut)
        end_before_floor = balance * (1 + annual) - draw
        balance = max(0.0, end_before_floor)
        if depletion is None and end_before_floor < 0:
            depletion = year
        previous_return = annual
    first_draw = (asset * percentage) if mode == "percentage" else withdrawal
    return {"final": balance, "depletion": depletion, "initial_rate": first_draw / asset, "reserve_months": reserve / (first_draw / 12) if first_draw > 0 else None}


def main() -> int:
    article = read(ARTICLE)
    tool = read(TOOL)
    runtime = read(RUNTIME)
    tool_css = read(TOOL_CSS)
    article_css = read(ARTICLE_CSS)

    article_parser = ContractParser()
    article_parser.feed(article)
    tool_parser = ContractParser()
    tool_parser.feed(tool)
    article_text = "".join(article_parser.text)
    tool_text = "".join(tool_parser.text)

    required_article_ids = {"cash-flow", "withdrawal-rate", "sequence-risk", "stress-test", "checklist", "tool"}
    missing_article_ids = required_article_ids - article_parser.ids
    if missing_article_ids:
        fail(f"article missing ids: {sorted(missing_article_ids)}")
    if article_parser.tables < 2:
        fail("article must include comparison and worked-example tables")
    if len(re.sub(r"\s+", "", article_text)) < 5000:
        fail("article body is not sufficiently deep")
    for marker in ["提領率", "實質報酬率", "序列報酬風險", "準備金", "壓力測試", "示範數字", "References"]:
        if marker not in article:
            fail(f"article missing marker: {marker}")
    for href in ["../tools/retirement-cashflow.html", "../tools/retirement-cashflow.html#tool-title", "../tools/portfolio-rebalancer.html", "../tools/position-sizing.html"]:
        if href not in article_parser.hrefs:
            fail(f"article missing internal tool link: {href}")

    required_tool_ids = {
        "asset", "withdrawal", "nominal-return", "inflation", "years", "reserve",
        "withdrawal-mode", "percentage-rate", "flexible-cut", "trigger", "sequence",
        "run", "reset", "download", "status", "status-detail", "error", "results",
        "rate", "real-return", "end", "deplete", "reserve-months", "cashflow-chart",
        "rows", "scenario-rows", "selected-rule", "table-basis"
    }
    missing_tool_ids = required_tool_ids - tool_parser.ids
    if missing_tool_ids:
        fail(f"tool missing ids: {sorted(missing_tool_ids)}")
    for href in ["../lessons/15-retirement-cashflow.html#tool", "../lessons/15-retirement-cashflow.html#cash-flow", "../lessons/15-retirement-cashflow.html#sequence-risk", "../lessons/15-retirement-cashflow.html#withdrawal-rate"]:
        if href not in tool_parser.hrefs:
            fail(f"tool missing article link: {href}")
    for marker in ["FINRA", "Investor.gov", "Schwab", "不是 Monte Carlo", "只留在本機頁面"]:
        if marker not in tool:
            fail(f"tool missing disclosure/source marker: {marker}")
    if "fetch(" in runtime or "XMLHttpRequest" in runtime or "WebSocket" in runtime:
        fail("retirement tool must not fetch live market data")
    if "innerHTML" in runtime:
        fail("retirement runtime must render user-dependent output without innerHTML")
    for marker in ["max(0", "returnForYear", "reserveMonths", "percentage", "flexible", "clearResults", "Number.isFinite", "created_at"]:
        if marker not in runtime and marker != "max(0":
            fail(f"runtime missing contract marker: {marker}")
    if "Math.max(0, endBeforeFloor)" not in runtime:
        fail("runtime must floor depleted balances at zero")
    if "font-size:14px" not in tool_css and "font-size:13px" not in tool_css:
        fail("tool CSS missing readable input sizing")
    if "@media(max-width:560px)" not in tool_css or "@media(max-width:560px)" not in article_css:
        fail("mobile RWD contract missing")

    base = simulate(10000000, 400000, 0.05, 0.02, 40, 1200000, "fixed", 0.04, 0.20, 0.0, "none")
    if abs(float(base["final"]) - 5973899.807782558) > 0.01:
        fail(f"default scenario arithmetic drift: {base['final']}")
    if base["depletion"] is not None:
        fail("default scenario should not deplete")
    if round(float(base["initial_rate"]), 4) != 0.04:
        fail("default initial withdrawal rate drift")
    if round(float(base["reserve_months"]), 1) != 36.0:
        fail("default reserve runway drift")

    early = simulate(10000000, 400000, 0.05, 0.02, 40, 1200000, "fixed", 0.04, 0.20, 0.0, "early")
    late = simulate(10000000, 400000, 0.05, 0.02, 40, 1200000, "fixed", 0.04, 0.20, 0.0, "late")
    if early["depletion"] is None or late["depletion"] is None:
        fail("stress paths must expose depletion under the documented default")
    if float(early["final"]) != 0.0 or float(late["final"]) != 0.0:
        fail("stress paths must floor final balance at zero")
    print("retirement cashflow: PASS")
    print(f"article_chars={len(re.sub(r'\\s+', '', article_text))}")
    print(f"article_tables={article_parser.tables}")
    print(f"base_final={base['final']:.2f}")
    print(f"early_depletion_year={early['depletion']}")
    print(f"late_depletion_year={late['depletion']}")
    print("live_fetch=none")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print(f"retirement cashflow: FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)
