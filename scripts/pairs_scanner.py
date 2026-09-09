#!/usr/bin/env python3
"""Taiwan market pair-trading scanner.

The scanner is deliberately batch-oriented: it discovers the current TAIFEX
single-stock-futures universe, selects the 150 most actively traded TWSE
stocks for the spot universe, fetches daily histories, and writes a compact
static feed for the browser workstation.

Data-source note:
* TAIFEX is the authority for contract discovery and the core futures report.
* Yahoo Finance's public chart endpoint is used for a reproducible, no-key
  historical OHLCV fallback. A single-stock-futures instrument is labelled as
  a spot-price proxy because public continuous-history coverage is not
  consistently available for every TAIFEX contract.

This is research tooling, not an execution system or investment advice.
"""

from __future__ import annotations

import argparse
import html
import json
import math
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import requests

try:
    import pandas as pd  # noqa: F401 - documented workflow dependency and future extension point
except ImportError:  # pragma: no cover - the workflow installs pandas
    pd = None

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "tw-market" / "pairs-scan-results.json"
TAIPEI = timezone(timedelta(hours=8))
USER_AGENT = "GugoProTaiwanPairScanner/1.0 (+https://gugopro.com/tools/tw-market/taiwan-pair-trading.html)"
TWSE_ALL_URL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
TAIFEX_STOCK_LIST_URL = "https://www.taifex.com.tw/enl/eng5/stockMargining"
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"

CORE_FUTURES = [
    {"symbol": "TX", "name": "臺指期", "proxy": "^TWII", "proxy_name": "TAIEX proxy"},
    {"symbol": "MTX", "name": "小型臺指", "proxy": "^TWII", "proxy_name": "TAIEX proxy"},
    {"symbol": "TE", "name": "電子期", "proxy": "0050.TW", "proxy_name": "Taiwan 50 ETF proxy"},
    {"symbol": "TF", "name": "金融期", "proxy": "0051.TW", "proxy_name": "Taiwan Mid-Cap ETF proxy"},
]


def log(message: str) -> None:
    print(f"[pairs-scanner] {message}", flush=True)


def number(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip().replace(",", "")
    if not text or text in {"-", "--", "N/A", "null"}:
        return None
    try:
        parsed = float(text)
        return parsed if math.isfinite(parsed) else None
    except ValueError:
        return None


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


class TableRowParser(HTMLParser):
    """Collect table cells without requiring BeautifulSoup/lxml in Actions."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None
        self._in_cell = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag == "tr":
            self._row = []
        elif tag in {"td", "th"} and self._row is not None:
            self._cell = []
            self._in_cell = True

    def handle_data(self, data: str) -> None:
        if self._in_cell and self._cell is not None:
            self._cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"td", "th"} and self._in_cell and self._row is not None:
            self._row.append(clean_text("".join(self._cell or [])))
            self._cell = None
            self._in_cell = False
        elif tag == "tr" and self._row is not None:
            if self._row:
                self.rows.append(self._row)
            self._row = None


class RateLimiter:
    def __init__(self, minimum_interval: float = 0.18) -> None:
        self.minimum_interval = minimum_interval
        self._lock = threading.Lock()
        self._last = 0.0

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            pause = self.minimum_interval - (now - self._last)
            if pause > 0:
                time.sleep(pause)
            self._last = time.monotonic()


class HttpClient:
    def __init__(self, timeout: int = 25, retries: int = 3) -> None:
        self.timeout = timeout
        self.retries = retries
        self.limiter = RateLimiter()
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json,text/html;q=0.9,*/*;q=0.8"})

    def get(self, url: str, **kwargs: Any) -> requests.Response:
        last_error: Exception | None = None
        for attempt in range(self.retries):
            try:
                self.limiter.wait()
                response = self.session.get(url, timeout=self.timeout, **kwargs)
                response.raise_for_status()
                return response
            except (requests.RequestException, ValueError) as exc:
                last_error = exc
                if attempt < self.retries - 1:
                    time.sleep(1.2 * (attempt + 1))
        raise RuntimeError(f"request failed after {self.retries} attempts: {url}") from last_error

    def post(self, url: str, **kwargs: Any) -> requests.Response:
        last_error: Exception | None = None
        for attempt in range(self.retries):
            try:
                self.limiter.wait()
                response = self.session.post(url, timeout=self.timeout, **kwargs)
                response.raise_for_status()
                return response
            except (requests.RequestException, ValueError) as exc:
                last_error = exc
                if attempt < self.retries - 1:
                    time.sleep(1.2 * (attempt + 1))
        raise RuntimeError(f"request failed after {self.retries} attempts: {url}") from last_error


def fetch_twse_universe(client: HttpClient, limit: int = 150) -> tuple[list[dict[str, Any]], str]:
    """Select the current top-150 stock universe by latest traded value.

    STOCK_DAY_ALL is an official TWSE daily snapshot. In the absence of a
    stable public market-cap endpoint, traded value is used as the transparent
    liquidity ranking and is recorded in the output metadata.
    """
    response = client.get(TWSE_ALL_URL)
    payload = response.json()
    if not isinstance(payload, list):
        raise RuntimeError("TWSE STOCK_DAY_ALL did not return a list")
    rows: list[dict[str, Any]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        code = str(item.get("Code", "")).strip()
        if not re.fullmatch(r"[1-9]\d{3}", code):
            continue
        close = number(item.get("ClosingPrice"))
        traded_value = number(item.get("TradeValue")) or 0.0
        volume = number(item.get("TradeVolume")) or 0.0
        if close is None or close <= 0:
            continue
        rows.append({
            "code": code,
            "name": clean_text(str(item.get("Name", code))),
            "close": close,
            "traded_value": traded_value,
            "volume": volume,
            "market_date_roc": str(item.get("Date", "")),
        })
    rows.sort(key=lambda row: (row["traded_value"], row["volume"]), reverse=True)
    selected = rows[:limit]
    if len(selected) < 30:
        raise RuntimeError(f"TWSE universe unexpectedly small: {len(selected)}")
    latest = selected[0].get("market_date_roc", "")
    log(f"TWSE universe: {len(selected)} stocks ranked by latest traded value (ROC date {latest})")
    return selected, latest


def fetch_taifex_contracts(client: HttpClient) -> list[dict[str, str]]:
    """Parse the official TAIFEX stock-futures margining list."""
    response = client.get(TAIFEX_STOCK_LIST_URL)
    parser = TableRowParser()
    parser.feed(response.text)
    contracts: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for row in parser.rows:
        if len(row) < 4 or not row[0].isdigit():
            continue
        ticker = row[1].strip().upper()
        underlying = row[2].strip().upper()
        name = row[3].strip()
        if not re.fullmatch(r"[A-Z]{2,4}", ticker) or not re.fullmatch(r"\d{4,6}[A-Z]?", underlying):
            continue
        key = (ticker, underlying)
        if key in seen:
            continue
        seen.add(key)
        contracts.append({"ticker": ticker, "underlying_code": underlying, "name": name})
    if len(contracts) < 200:
        raise RuntimeError(f"TAIFEX stock-futures list unexpectedly small: {len(contracts)}")
    log(f"TAIFEX contracts: {len(contracts)} stock/ETF futures discovered")
    return contracts


def yahoo_symbol(code: str) -> str:
    return f"{code}.TW"


def fetch_yahoo_history(client: HttpClient, symbol: str, period_days: int = 540) -> dict[str, float]:
    now = datetime.now(timezone.utc)
    period2 = int(now.timestamp())
    period1 = int((now - timedelta(days=period_days)).timestamp())
    url = YAHOO_CHART_URL.format(symbol=symbol)
    response = client.get(url, params={"period1": period1, "period2": period2, "interval": "1d", "events": "div,splits"})
    payload = response.json()
    result = ((payload.get("chart") or {}).get("result") or [None])[0]
    if not result:
        error = ((payload.get("chart") or {}).get("error") or {}).get("description", "no result")
        raise RuntimeError(f"Yahoo {symbol}: {error}")
    timestamps = result.get("timestamp") or []
    indicators = result.get("indicators") or {}
    adjusted = ((indicators.get("adjclose") or [{}])[0].get("adjclose") or [])
    closes = ((indicators.get("quote") or [{}])[0].get("close") or [])
    values = adjusted if len(adjusted) == len(timestamps) else closes
    history: dict[str, float] = {}
    for timestamp, value in zip(timestamps, values):
        parsed = number(value)
        if parsed is None or parsed <= 0:
            continue
        date = datetime.fromtimestamp(int(timestamp), timezone.utc).astimezone(TAIPEI).date().isoformat()
        history[date] = parsed
    if len(history) < 80:
        raise RuntimeError(f"Yahoo {symbol}: only {len(history)} usable daily rows")
    return history


def fetch_histories(client: HttpClient, symbols: Iterable[str], workers: int = 8) -> dict[str, dict[str, float]]:
    symbols = list(dict.fromkeys(symbols))
    result: dict[str, dict[str, float]] = {}
    failures: list[str] = []

    def task(symbol: str) -> tuple[str, dict[str, float]]:
        return symbol, fetch_yahoo_history(client, symbol)

    with ThreadPoolExecutor(max_workers=min(workers, max(1, len(symbols)))) as pool:
        futures = {pool.submit(task, symbol): symbol for symbol in symbols}
        for future in as_completed(futures):
            symbol = futures[future]
            try:
                key, history = future.result()
                result[key] = history
            except Exception as exc:  # continue with a transparent skip
                failures.append(f"{symbol}: {exc}")
    log(f"Yahoo histories: {len(result)}/{len(symbols)} usable; skipped {len(failures)}")
    for failure in failures[:8]:
        log(f"skip {failure}")
    return result


def normalized(values: np.ndarray) -> list[float]:
    base = float(values[0]) if len(values) else 1.0
    return [round(float(value / base * 100.0), 6) for value in values]


def finite_round(value: float, digits: int = 6) -> float | None:
    return round(float(value), digits) if math.isfinite(float(value)) else None


def classify_signal(z_score: float) -> tuple[str, str]:
    if z_score >= 2.0:
        return "overbought", "正向超買偏離"
    if z_score <= -2.0:
        return "oversold", "負向超賣偏離"
    if abs(z_score) >= 0.8:
        return "reverting", "均值回歸中"
    return "watch", "觀望"


def build_instruments(stocks: list[dict[str, Any]], contracts: list[dict[str, str]]) -> tuple[list[dict[str, Any]], list[str]]:
    contract_by_underlying: dict[str, dict[str, str]] = {}
    for contract in contracts:
        contract_by_underlying.setdefault(contract["underlying_code"], contract)
    instruments: list[dict[str, Any]] = []
    yahoo_symbols: list[str] = []
    for stock in stocks:
        code = stock["code"]
        spot_symbol = yahoo_symbol(code)
        yahoo_symbols.append(spot_symbol)
        instruments.append({
            "id": f"TWSE:{code}",
            "symbol": code,
            "name": stock["name"],
            "type": "spot",
            "underlying_code": code,
            "yahoo_symbol": spot_symbol,
            "source": "TWSE STOCK_DAY_ALL + Yahoo chart history",
        })
        contract = contract_by_underlying.get(code)
        if contract:
            instruments.append({
                "id": f"TAIFEX:{contract['ticker']}",
                "symbol": contract["ticker"],
                "name": f"{stock['name']} 期貨",
                "type": "futures",
                "underlying_code": code,
                "contract_symbol": contract["ticker"],
                "yahoo_symbol": spot_symbol,
                "proxy": True,
                "source": "TAIFEX contract discovery + Yahoo/TWSE spot proxy",
            })
    for item in CORE_FUTURES:
        yahoo_symbols.append(item["proxy"])
        instruments.append({
            "id": f"TAIFEX:{item['symbol']}",
            "symbol": item["symbol"],
            "name": item["name"],
            "type": "futures",
            "underlying_code": item["symbol"],
            "yahoo_symbol": item["proxy"],
            "proxy": True,
            "source": f"TAIFEX core future + {item['proxy_name']}",
        })
    return instruments, yahoo_symbols


def compute_pairs(instruments: list[dict[str, Any]], histories: dict[str, dict[str, float]], max_pairs: int = 80) -> list[dict[str, Any]]:
    active: list[dict[str, Any]] = []
    for instrument in instruments:
        history = histories.get(instrument["yahoo_symbol"])
        if history and len(history) >= 80:
            item = dict(instrument)
            item["history"] = history
            active.append(item)
    if len(active) < 10:
        raise RuntimeError(f"not enough instruments with history: {len(active)}")
    common_dates = sorted(set.intersection(*(set(item["history"]) for item in active)))
    common_dates = common_dates[-120:]
    if len(common_dates) < 60:
        raise RuntimeError(f"only {len(common_dates)} common dates available; need at least 60")
    matrix = np.asarray([[item["history"][date] for date in common_dates] for item in active], dtype=float)
    window = matrix[:, -60:]
    correlations = np.corrcoef(window)
    pairs_by_key: dict[tuple[Any, ...], dict[str, Any]] = {}
    for i in range(len(active)):
        for j in range(i + 1, len(active)):
            left = active[i]
            right = active[j]
            # Do not report the trivial spot-vs-its-own-future proxy as an opportunity.
            if left.get("underlying_code") == right.get("underlying_code"):
                continue
            correlation = float(correlations[i, j])
            if not math.isfinite(correlation) or correlation < 0.82:
                continue
            a = window[i]
            b = window[j]
            variance_b = float(np.var(b))
            if variance_b <= 1e-12:
                continue
            beta = float(np.cov(a, b, ddof=0)[0, 1] / variance_b)
            if not math.isfinite(beta) or beta <= 0:
                continue
            spread = a - beta * b
            mean20 = float(np.mean(spread[-20:]))
            std20 = float(np.std(spread[-20:]))
            mean60 = float(np.mean(spread))
            std60 = float(np.std(spread))
            if std20 <= 1e-10:
                continue
            z_score = float((spread[-1] - mean20) / std20)
            signal_key, signal_label = classify_signal(z_score)
            candidate = {
                "pair_id": f"{left['id']}__{right['id']}",
                "symbol_a": left["symbol"],
                "name_a": left["name"],
                "type_a": left["type"],
                "symbol_b": right["symbol"],
                "name_b": right["name"],
                "type_b": right["type"],
                "underlying_a": left.get("underlying_code"),
                "underlying_b": right.get("underlying_code"),
                "correlation": finite_round(correlation, 5),
                "beta": finite_round(beta, 5),
                "current_spread": finite_round(float(spread[-1]), 4),
                "mean_spread": finite_round(mean20, 4),
                "std_dev": finite_round(std20, 4),
                "mean_spread_20": finite_round(mean20, 4),
                "std_dev_20": finite_round(std20, 4),
                "mean_spread_60": finite_round(mean60, 4),
                "std_dev_60": finite_round(std60, 4),
                "z_score": finite_round(z_score, 4),
                "signal_status": signal_label,
                "signal_status_key": signal_key,
                "proxy_warning": bool(left.get("proxy") or right.get("proxy")),
                "history": {
                    "dates": common_dates[-60:],
                    "price_a": normalized(matrix[i, -60:]),
                    "price_b": normalized(matrix[j, -60:]),
                    "spread": [round(float(value), 6) for value in spread[-60:]],
                    "z_score": [round(float((value - mean20) / std20), 6) for value in spread[-60:]],
                },
            }
            pair_key = tuple(sorted((str(left.get("underlying_code")), str(right.get("underlying_code")))))
            existing = pairs_by_key.get(pair_key)
            if existing is None or abs(float(candidate["z_score"])) > abs(float(existing["z_score"])):
                pairs_by_key[pair_key] = candidate
    pairs = list(pairs_by_key.values())
    pairs.sort(key=lambda pair: (abs(float(pair["z_score"])), float(pair["correlation"])), reverse=True)
    return pairs[:max_pairs]


def build_feed(stocks: list[dict[str, Any]], contracts: list[dict[str, str]], pairs: list[dict[str, Any]], common_meta: dict[str, Any]) -> dict[str, Any]:
    now = datetime.now(TAIPEI)
    futures_for_selected = sum(1 for stock in stocks if any(c["underlying_code"] == stock["code"] for c in contracts))
    return {
        "schema_version": 1,
        "generated_at": now.isoformat(timespec="seconds"),
        "reference_date": now.date().isoformat(),
        "universe": {
            "spot_selected": len(stocks),
            "spot_selection_rule": "TWSE listed 4-digit stocks ranked by latest traded value",
            "taifex_stock_futures_discovered": len(contracts),
            "taifex_stock_futures_in_analysis": futures_for_selected,
            "core_index_futures": [item["symbol"] for item in CORE_FUTURES],
            "analysis_instruments": common_meta.get("analysis_instruments", 0),
            "common_history_days": common_meta.get("common_history_days", 0),
        },
        "parameters": {
            "history_days_requested": 120,
            "correlation_window_days": 60,
            "correlation_threshold": 0.82,
            "mean_window_days": 20,
            "long_mean_window_days": 60,
            "max_pairs": 80,
            "z_score_signal_threshold": 2.0,
        },
        "data_sources": [
            {"name": "TWSE STOCK_DAY_ALL", "url": TWSE_ALL_URL, "role": "spot universe and latest liquidity snapshot"},
            {"name": "TAIFEX single stock futures margining", "url": TAIFEX_STOCK_LIST_URL, "role": "official futures contract discovery"},
            {"name": "Yahoo Finance chart endpoint", "url": "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}", "role": "daily adjusted-close history fallback"},
        ],
        "quality_notes": [
            "個股期貨連續歷史價在免費公開端點覆蓋不一致；本 feed 以對應現貨調整收盤價作為方向性代理，並在 pair 上標示 proxy_warning。",
            "相關係數與 Beta 為最近 60 個共同交易日的估計；市場 regime 改變時，過去統計關係可能失效。",
            "這是研究與教育用途的統計篩選，不包含下單、滑價、借券、交易稅、除權息調整或保證金即時報價。",
        ],
        "pairs": pairs,
    }


def run(args: argparse.Namespace) -> int:
    client = HttpClient(timeout=args.timeout, retries=args.retries)
    stocks, twse_date = fetch_twse_universe(client, limit=args.stock_limit)
    contracts = fetch_taifex_contracts(client)
    instruments, symbols = build_instruments(stocks, contracts)
    histories = fetch_histories(client, symbols, workers=args.workers)
    pairs = compute_pairs(instruments, histories, max_pairs=args.max_pairs)
    if not pairs:
        raise RuntimeError("no pairs passed the correlation and variance filters")
    common_dates = sorted(set.intersection(*(set(histories[item["yahoo_symbol"]]) for item in instruments if item["yahoo_symbol"] in histories)))
    feed = build_feed(stocks, contracts, pairs, {"analysis_instruments": len(instruments), "common_history_days": min(120, len(common_dates))})
    feed["twse_snapshot_roc_date"] = twse_date
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(feed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log(f"wrote {OUTPUT.relative_to(ROOT)} with {len(pairs)} pairs")
    log(f"top pair: {pairs[0]['symbol_a']} / {pairs[0]['symbol_b']} r={pairs[0]['correlation']} z={pairs[0]['z_score']}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stock-limit", type=int, default=150)
    parser.add_argument("--max-pairs", type=int, default=80)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--timeout", type=int, default=25)
    parser.add_argument("--retries", type=int, default=3)
    return parser.parse_args()


if __name__ == "__main__":
    try:
        raise SystemExit(run(parse_args()))
    except KeyboardInterrupt:
        log("interrupted")
        raise SystemExit(130)
    except Exception as exc:
        log(f"ERROR: {exc}")
        raise SystemExit(1)
