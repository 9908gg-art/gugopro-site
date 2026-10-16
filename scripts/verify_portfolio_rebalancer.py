#!/usr/bin/env python3
"""Static and arithmetic checks for the allocation/rebalancing round."""
from __future__ import annotations

import html.parser
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "articles/investment/03-asset-allocation-rebalancing.html"
TOOL = ROOT / "academy/tools/portfolio-rebalancer.html"
RUNTIME = ROOT / "academy/tools/portfolio-rebalancer.js"
CSS = ROOT / "academy/tools/portfolio-rebalancer.css"


class VisibleText(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.links: list[str] = []
        self.ids: set[str] = set()

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        mapping = dict(attrs)
        if mapping.get("href"):
            self.links.append(mapping["href"] or "")
        if mapping.get("id"):
            self.ids.add(mapping["id"] or "")

    @property
    def text(self) -> str:
        return " ".join(" ".join(self.parts).split())


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load(path: Path) -> str:
    assert_true(path.exists(), f"missing: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def check_article() -> tuple[int, int]:
    raw = load(ARTICLE)
    parser = VisibleText()
    parser.feed(raw)
    text = parser.text
    for marker in [
        "#allocation", "#diversification", "#drift", "#dynamic", "#friction", "#checklist",
        "目前權重", "目標市值", "理論調整額", "偏離百分點", "新資金優先", "交易摩擦",
        "Investor.gov", "FINRA", "This is research and analysis only, not personalized financial advice.",
    ]:
        assert_true(marker in raw or marker in text, f"article marker missing: {marker}")
    assert_true(len(text) >= 6500, f"article too short: {len(text)}")
    assert_true(text.count("資產配置") >= 8, "article lacks repeated concept explanation")
    assert_true("80/20" in text and "60/40" in text, "concept examples missing")
    assert_true("../../academy/tools/portfolio-rebalancer.html" in raw, "article-to-tool link missing")
    for fragment in ["#inputs", "#rules", "#results"]:
        assert_true(f"portfolio-rebalancer.html{fragment}" in raw, f"article tool fragment missing: {fragment}")
    assert_true("google-analytics" not in raw.lower(), "unexpected analytics script in new article")
    return len(text), len(re.findall(r"<table\b", raw, flags=re.I))


def check_tool() -> None:
    raw = load(TOOL)
    parser = VisibleText()
    parser.feed(raw)
    for marker in [
        'id="asset-rows"', 'id="add-asset"', 'id="contribution"', 'id="rebalance-mode"',
        'id="threshold"', 'id="fee-rate"', 'id="minimum-fee"', 'id="tax-rate"',
        'id="summary"', 'id="allocation-rows"', 'id="allocation-chart"', 'id="cost-summary"',
        'id="limits"', 'portfolio-rebalancer.js', 'portfolio-rebalancer.css',
        "不抓即時行情", "只留在目前瀏覽器頁面", "not personalized financial advice",
    ]:
        assert_true(marker in raw, f"tool marker missing: {marker}")
    assert_true('id="calculate"' in raw and 'id="download"' in raw, "tool actions missing")
    assert_true("target=" in raw and "investor.gov" in raw.lower() and "finra.org" in raw.lower(), "source links missing")


def check_runtime() -> None:
    raw = load(RUNTIME)
    for marker in [
        "function validate", "function compute", "function clearResults", "function download",
        "targetTotal - 100", "contributionAllocation", "unallocatedContribution", "totalFee", "totalTax",
        "URL.createObjectURL", "replaceChildren", "textContent", "catch (error)",
        "targetValue", "cash-first", "threshold",
    ]:
        assert_true(marker in raw, f"runtime marker missing: {marker}")
    assert_true("fetch(" not in raw and "XMLHttpRequest" not in raw, "runtime must not fetch external data")
    assert_true("innerHTML" not in raw, "runtime should render with DOM nodes, not innerHTML")
    assert_true("console." not in raw, "handled errors should remain UI-visible without console noise")
    assert_true("asset.current < 0" in raw, "negative market value guard missing")
    assert_true("input.contribution < 0" in raw, "negative contribution guard missing")
    assert_true("input.feeRate > 10" in raw and "input.taxRate > 10" in raw, "cost upper bounds missing")


def check_css() -> None:
    raw = load(CSS)
    for marker in ["@media (max-width: 700px)", ".table-wrap", ".result-table", ".article-jump", ".chart-target"]:
        assert_true(marker in raw, f"CSS marker missing: {marker}")


def check_math() -> None:
    assets = [("股票", 620000, 60), ("債券", 280000, 30), ("現金", 100000, 10)]
    current_total = sum(v for _, v, _ in assets)
    contribution = 0
    future_total = current_total + contribution
    deltas = [future_total * target / 100 - value for _, value, target in assets]
    assert_true(current_total == 1_000_000, "default current total drifted")
    assert_true(max(abs(value) for value in deltas) == 20_000, "default delta arithmetic drifted")
    assert_true(abs(sum(deltas)) < 1e-9, "default rebalancing deltas do not net to zero")

    contribution = 25000
    future_total = current_total + contribution
    deficits = [max(future_total * target / 100 - value, 0) for _, value, target in assets]
    deficit_total = sum(deficits)
    applied = min(contribution, deficit_total)
    allocations = [applied * deficit / deficit_total for deficit in deficits]
    assert_true(abs(sum(allocations) - contribution) < 1e-9, "cash-first allocation does not use available contribution")
    assert_true(allocations[1] > 0 and allocations[2] > 0, "cash-first failed to allocate to low-weight assets")
    assert_true(math.isclose(sum(deficits), 30000), "cash-first example deficit drifted")
    assert_true(math.isclose(sum(allocations), 25000), "cash-first did not cap allocation at available contribution")


def main() -> None:
    article_chars, article_tables = check_article()
    check_tool()
    check_runtime()
    check_css()
    check_math()
    print("portfolio rebalancer: PASS")
    print(f"article_chars={article_chars}")
    print(f"article_tables={article_tables}")
    print("default_delta=20000")
    print("cash_first_contribution=25000")
    print("external_fetch=none")


if __name__ == "__main__":
    main()
