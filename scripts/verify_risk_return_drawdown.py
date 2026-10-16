from __future__ import annotations

import math
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "articles/investment/06-sharpe-mdd-risk-control.html"
TOOL = ROOT / "academy/tools/risk-return-drawdown.html"
RUNTIME = ROOT / "academy/tools/risk-return-drawdown.js"
CSS = ROOT / "academy/tools/risk-return-drawdown.css"
ACADEMY = ROOT / "academy/index.html"
ARTICLE_INDEX = ROOT / "articles/investment/index.html"
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


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def read(path: Path) -> str:
    assert_true(path.exists(), f"missing file: {path}")
    return path.read_text(encoding="utf-8")


def sample_std(values: list[float]) -> float:
    mean = sum(values) / len(values)
    return math.sqrt(sum((value - mean) ** 2 for value in values) / (len(values) - 1))


def compute_from_prices(prices: list[float], initial: float = 100000.0, mar: float = 0.0, periods: int = 252) -> dict[str, float | int | str]:
    returns = [prices[i] / prices[i - 1] - 1 for i in range(1, len(prices))]
    excess = [value - mar for value in returns]
    equity = [initial]
    for value in returns:
        equity.append(equity[-1] * (1 + value))
    peaks: list[float] = []
    drawdowns: list[float] = []
    peak_index = 0
    running_peak = -math.inf
    mdd = 0.0
    mdd_peak_index = 0
    mdd_trough_index = 0
    for index, value in enumerate(equity):
        if value > running_peak:
            running_peak = value
            peak_index = index
        peaks.append(running_peak)
        drawdown = value / running_peak - 1
        drawdowns.append(drawdown)
        if drawdown < mdd:
            mdd = drawdown
            mdd_peak_index = peak_index
            mdd_trough_index = index
    sd = sample_std(excess)
    downside = [value * value if value < 0 else 0 for value in excess]
    downside_deviation = math.sqrt(sum(downside) / len(excess)) if any(value < 0 for value in excess) else math.nan
    annual_return = (equity[-1] / initial) ** (periods / len(returns)) - 1
    return {
        "returns": returns,
        "equity": equity,
        "peaks": peaks,
        "drawdowns": drawdowns,
        "mdd": mdd,
        "mdd_peak_index": mdd_peak_index,
        "mdd_trough_index": mdd_trough_index,
        "mdd_amount": peaks[mdd_trough_index] - equity[mdd_trough_index],
        "sharpe": sum(excess) / len(excess) / sd * math.sqrt(periods),
        "sortino": sum(excess) / len(excess) / downside_deviation * math.sqrt(periods),
        "annual_return": annual_return,
    }


def check_article() -> tuple[int, int]:
    raw = read(ARTICLE)
    parser = VisibleText()
    parser.feed(raw)
    text = parser.text
    for marker in [
        "#risk-reward", "#returns", "#drawdown", "#ratios", "#workflow", "#limits",
        "單筆 R:R", "Sharpe", "Sortino", "最大回撤", "恢復期", "Running peak",
        "Calmar", "恢復因子", "adjusted close", "資料契約", "This is research and analysis only, not personalized financial advice.",
        "Sharpe Ratio", "Sortino Ratio", "CFA Institute", "References",
    ]:
        assert_true(marker in raw or marker in text, f"article marker missing: {marker}")
    assert_true(len(text) >= 9000, f"article too short: {len(text)}")
    assert_true(text.count("最大回撤") >= 8, "article lacks MDD explanation")
    assert_true(text.count("風報比") >= 5, "article lacks R:R explanation")
    assert_true("../../academy/tools/trade-expectancy.html#inputs" in raw, "R:R CTA missing")
    assert_true("../../academy/tools/risk-return-drawdown.html#inputs" in raw, "history tool CTA missing")
    assert_true("google-analytics" not in raw.lower(), "unexpected analytics script in rewritten article")
    return len(text), len(re.findall(r"<table\b", raw, flags=re.I))


def check_tool() -> None:
    raw = read(TOOL)
    parser = VisibleText()
    parser.feed(raw)
    for marker in [
        'id="input-mode"', 'id="frequency"', 'id="custom-frequency"', 'id="series"',
        'id="mar"', 'id="initial-capital"', 'id="trade-input"', 'id="direction"',
        'id="entry"', 'id="stop"', 'id="target"', 'id="win-rate"',
        'id="cumulative-return"', 'id="annual-return"', 'id="annual-volatility"',
        'id="sharpe"', 'id="sortino"', 'id="mdd"', 'id="mdd-amount"',
        'id="recovery"', 'id="calmar"', 'id="recovery-factor"', 'id="observations"',
        'id="equity-chart"', 'id="path-rows"', 'id="download"', 'risk-return-drawdown.js',
        'risk-return-drawdown.css', '不抓即時行情', '資料契約', 'not personalized financial advice',
    ]:
        assert_true(marker in raw, f"tool marker missing: {marker}")
    assert_true("source" in raw.lower() and "sharpe" in raw.lower() and "mdd" in raw.lower(), "source or metric text missing")


def check_runtime() -> None:
    raw = read(RUNTIME)
    for marker in [
        "function parseNumbers", "function sampleStd", "function calculateHistory", "function updateTradeResult",
        "function downloadCsv", "runningPeak", "mddPeakIndex", "mddTroughIndex", "downsideDeviation",
        "annualVolatility", "recoveryFactor", "createSvgElement", "replaceChildren", "textContent",
        "MAX_POINTS", "input-mode", "custom-frequency", "URL.createObjectURL",
    ]:
        assert_true(marker in raw, f"runtime marker missing: {marker}")
    assert_true("fetch(" not in raw and "XMLHttpRequest" not in raw and "WebSocket" not in raw, "runtime must not call market APIs")
    assert_true("innerHTML" not in raw and "outerHTML" not in raw, "runtime must render with safe DOM APIs")
    assert_true("console." not in raw, "runtime should keep errors visible in UI")
    assert_true("value <= 0" in raw and "value <= -100" in raw, "positive price / > -100% return guards missing")
    assert_true("Number.isInteger(custom)" in raw and "tokens.length > MAX_POINTS" in raw, "frequency / point-limit guards missing")


def check_css() -> None:
    raw = read(CSS)
    for marker in [".rr-tool-layout", ".rr-metrics", ".equity-chart", ".drawdown-area", ".result-table", "@media(max-width:700px)", "@media(max-width:430px)"]:
        assert_true(marker in raw, f"CSS marker missing: {marker}")


def check_index() -> None:
    academy = read(ACADEMY)
    index = read(ARTICLE_INDEX)
    assert_true("<b>19</b><span>互動決策工具" in academy, "academy tool count not updated")
    assert_true('tools/risk-return-drawdown.html' in academy, "new tool missing from academy hub")
    assert_true("風險報酬與最大回撤分析" in index, "article index title not updated")
    assert_true("../articles/investment/06-sharpe-mdd-risk-control.html" in academy, "academy article card link missing")
    sitemap = read(SITEMAP)
    assert_true(sitemap.count("https://gugopro.com/articles/investment/06-sharpe-mdd-risk-control.html") == 1, "article missing or duplicated in sitemap")
    assert_true(sitemap.count("https://gugopro.com/academy/tools/risk-return-drawdown.html") == 1, "tool missing or duplicated in sitemap")


def check_math() -> None:
    result = compute_from_prices([100, 110, 104, 88, 98, 112])
    assert_true(math.isclose(float(result["mdd"]), -0.2, abs_tol=1e-12), "MDD should be -20% from 110 to 88")
    assert_true(result["mdd_peak_index"] == 1 and result["mdd_trough_index"] == 3, "MDD peak/trough order drifted")
    assert_true(math.isclose(float(result["mdd_amount"]), 22000.0, abs_tol=1e-9), "MDD money amount drifted")
    assert_true(math.isclose(float(result["equity"][-1]), 112000.0, abs_tol=1e-9), "price-to-equity conversion drifted")
    assert_true(math.isclose(float(result["sharpe"]), (sum(result["returns"]) / len(result["returns"]) / sample_std(result["returns"]) * math.sqrt(252)), abs_tol=1e-12), "Sharpe sample std arithmetic drifted")
    assert_true(math.isfinite(float(result["sortino"])), "Sortino should be finite with negative observations")
    long_risk = 100 - 95
    long_reward = 115 - 100
    assert_true(math.isclose(long_reward / long_risk, 3.0), "long R:R drifted")
    assert_true(math.isclose(0.25 * 3 - 0.75, 0.0), "R:R expectancy example drifted")
    short_risk = 105 - 100
    short_reward = 100 - 85
    assert_true(math.isclose(short_reward / short_risk, 3.0), "short R:R drifted")


def main() -> None:
    article_chars, article_tables = check_article()
    check_tool()
    check_runtime()
    check_css()
    check_index()
    check_math()
    print("risk return drawdown: PASS")
    print(f"article_chars={article_chars}")
    print(f"article_tables={article_tables}")
    print("mdd_example=-20%")
    print("mdd_peak_to_trough=1->3")
    print("rr_example=3.00R")
    print("external_fetch=none")


if __name__ == "__main__":
    main()
