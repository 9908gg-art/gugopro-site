#!/usr/bin/env python3
"""Taiwan market pair-trading scanner.

The scanner is deliberately batch-oriented: it discovers the current TAIFEX
single-stock-futures universe, discovers every currently listed TWSE ordinary-share issuer, applies an explicit
liquidity and price-movement screen before pair analysis, fetches daily histories
with a local cache, and writes a compact static feed for the browser workstation.

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
from statistics import NormalDist
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
CACHE_DIR = ROOT / "data" / "tw-market" / ".cache"
TAIPEI = timezone(timedelta(hours=8))
USER_AGENT = "GugoProTaiwanPairScanner/1.0 (+https://gugopro.com/tools/tw-market/taiwan-pair-trading.html)"
TWSE_COMPANY_URL = "https://openapi.twse.com.tw/v1/opendata/t187ap03_L"
TWSE_ALL_URL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
TAIFEX_STOCK_LIST_URL = "https://www.taifex.com.tw/enl/eng5/stockMargining"
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"

CORE_FUTURES = [
    {"symbol": "TX", "name": "臺指期", "proxy": "^TWII", "proxy_name": "TAIEX proxy", "exchange": "TAIFEX"},
    {"symbol": "MTX", "name": "小型臺指", "proxy": "^TWII", "proxy_name": "TAIEX proxy", "exchange": "TAIFEX"},
    {"symbol": "TE", "name": "電子期", "proxy": "0050.TW", "proxy_name": "Taiwan 50 ETF proxy", "exchange": "TAIFEX"},
    {"symbol": "TF", "name": "金融期", "proxy": "0051.TW", "proxy_name": "Taiwan Mid-Cap ETF proxy", "exchange": "TAIFEX"},
    {"symbol": "TWN", "name": "富台期", "proxy": "TWN=F", "proxy_name": "SGX FTSE Taiwan Index Futures", "exchange": "SGX"},
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


def fetch_twse_universe(client: HttpClient) -> tuple[list[dict[str, Any]], str]:
    """Discover every currently listed TWSE ordinary-share issuer.

    The company master is the authoritative universe definition. STOCK_DAY_ALL is
    joined only for the latest close/volume snapshot used by the later liquidity
    screen; it is never used to rank or truncate the universe.
    """
    companies = client.get(TWSE_COMPANY_URL).json()
    daily = client.get(TWSE_ALL_URL).json()
    if not isinstance(companies, list) or not isinstance(daily, list):
        raise RuntimeError("TWSE official OpenAPI did not return list payloads")
    daily_by_code = {
        str(item.get("Code", "")).strip(): item
        for item in daily
        if isinstance(item, dict)
    }
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    snapshot_date = ""
    for item in companies:
        if not isinstance(item, dict):
            continue
        code = str(item.get("公司代號", "")).strip()
        if not re.fullmatch(r"[1-9]\d{3}", code) or code in seen:
            continue
        seen.add(code)
        quote = daily_by_code.get(code, {})
        close = number(quote.get("ClosingPrice"))
        volume = number(quote.get("TradeVolume")) or 0.0
        traded_value = number(quote.get("TradeValue")) or 0.0
        snapshot_date = snapshot_date or str(quote.get("Date", ""))
        rows.append({
            "code": code,
            "name": clean_text(str(item.get("公司簡稱") or item.get("公司名稱") or code)),
            "close": close,
            "traded_value": traded_value,
            "volume": volume,
            "market_date_roc": str(quote.get("Date", "")),
            "listed_date": str(item.get("上市日期", "")),
            "industry_code": str(item.get("產業別", "")),
        })
    if len(rows) < 1000:
        raise RuntimeError(f"TWSE ordinary-share universe unexpectedly small: {len(rows)}")
    log(f"TWSE universe: {len(rows)} listed ordinary-share issuers from official company master (ROC date {snapshot_date})")
    return rows, snapshot_date

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


def fetch_yahoo_ohlcv(client: HttpClient, symbol: str, period_days: int = 360) -> dict[str, dict[str, float]]:
    """Fetch adjusted daily OHLCV with a short-lived local cache."""
    import hashlib
    cache_path = CACHE_DIR / "yahoo" / f"{hashlib.sha256(symbol.encode()).hexdigest()}.json"
    if cache_path.exists() and datetime.now(timezone.utc).timestamp() - cache_path.stat().st_mtime < 18 * 3600:
        try:
            cached = json.loads(cache_path.read_text(encoding="utf-8"))
            if isinstance(cached, dict) and len(cached) >= 80 and all(isinstance(value, dict) for value in cached.values()):
                return cached
        except (OSError, ValueError, TypeError):
            pass
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
    quote = (indicators.get("quote") or [{}])[0]
    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    closes = quote.get("close") or []
    volumes = quote.get("volume") or []
    history: dict[str, dict[str, float]] = {}
    for i, timestamp in enumerate(timestamps):
        close = number(adjusted[i] if i < len(adjusted) and adjusted[i] is not None else (closes[i] if i < len(closes) else None))
        high = number(highs[i] if i < len(highs) else None)
        low = number(lows[i] if i < len(lows) else None)
        open_price = number(opens[i] if i < len(opens) else None)
        volume = number(volumes[i] if i < len(volumes) else None)
        if close is None or close <= 0 or high is None or low is None or open_price is None:
            continue
        date = datetime.fromtimestamp(int(timestamp), timezone.utc).astimezone(TAIPEI).date().isoformat()
        history[date] = {"close": close, "open": open_price, "high": high, "low": low, "volume": volume or 0.0}
    if len(history) < 80:
        raise RuntimeError(f"Yahoo {symbol}: only {len(history)} usable daily rows")
    try:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(history, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass
    return history


def fetch_yahoo_history(client: HttpClient, symbol: str, period_days: int = 360) -> dict[str, float]:
    return {date: row["close"] for date, row in fetch_yahoo_ohlcv(client, symbol, period_days).items()}


def fetch_histories(client: HttpClient, symbols: Iterable[str], workers: int = 8) -> tuple[dict[str, dict[str, float]], dict[str, dict[str, dict[str, float]]]]:
    symbols = list(dict.fromkeys(symbols))
    result: dict[str, dict[str, float]] = {}
    ohlcv: dict[str, dict[str, dict[str, float]]] = {}
    failures: list[str] = []

    def task(symbol: str) -> tuple[str, dict[str, dict[str, float]]]:
        return symbol, fetch_yahoo_ohlcv(client, symbol)

    with ThreadPoolExecutor(max_workers=min(workers, max(1, len(symbols)))) as pool:
        futures = {pool.submit(task, symbol): symbol for symbol in symbols}
        for future in as_completed(futures):
            symbol = futures[future]
            try:
                key, raw = future.result()
                ohlcv[key] = raw
                result[key] = {date: row["close"] for date, row in raw.items()}
            except Exception as exc:  # continue with a transparent skip
                failures.append(f"{symbol}: {exc}")
    log(f"Yahoo histories: {len(result)}/{len(symbols)} usable; skipped {len(failures)}")
    for failure in failures[:8]:
        log(f"skip {failure}")
    return result, ohlcv


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


def rolling_atr_pct(raw: dict[str, dict[str, float]], window: int = 14) -> float:
    rows = [raw[d] for d in sorted(raw)][-window:]
    if not rows:
        return 0.0
    return float(np.mean([(r["high"] - r["low"]) / r["close"] for r in rows]) * 100.0)


def mean_volume_shares(raw: dict[str, dict[str, float]], window: int = 20) -> float:
    rows = [raw[d] for d in sorted(raw)][-window:]
    return float(np.mean([r.get("volume", 0.0) for r in rows])) if rows else 0.0


def residual_half_life(spread: np.ndarray) -> float | None:
    if len(spread) < 20:
        return None
    lag = spread[:-1]
    delta = np.diff(spread)
    denom = float(np.dot(lag, lag))
    if denom <= 1e-12:
        return None
    phi = float(np.dot(lag, delta) / denom)
    if phi >= 0:
        return None
    return finite_round(float(-math.log(2.0) / phi), 4)


def approximate_adf_pvalue(spread: np.ndarray) -> float | None:
    """ADF-style residual test p-value approximation using the no-intercept t statistic.

    The scanner uses the conservative 5% MacKinnon critical region (t <= -2.86)
    as the gate and reports a calibrated monotone approximation for the UI.
    """
    if len(spread) < 30:
        return None
    y = spread[:-1]
    dy = np.diff(spread)
    denom = float(np.dot(y, y))
    if denom <= 1e-12:
        return None
    beta = float(np.dot(y, dy) / denom)
    resid = dy - beta * y
    se = math.sqrt(float(np.dot(resid, resid) / max(1, len(y) - 1)) / denom)
    t_stat = beta / se if se > 0 else 0.0
    if t_stat <= -2.86:
        return finite_round(max(0.001, min(0.049, 0.05 * math.exp(t_stat + 2.86))), 4)
    return finite_round(min(0.99, 0.05 + 0.15 * math.exp(max(-2.86, t_stat + 2.86))), 4)


def next_day_open_close_backtest(dates: list[str], raw_a: dict[str, dict[str, float]], raw_b: dict[str, dict[str, float]], beta: float, z_scores: np.ndarray, entry: float = 2.0, cost_rate: float = 0.00375) -> dict[str, Any]:
    """Use T close Z to enter at T+1 open and flatten at T+1 close; no overnight."""
    common = [d for d in dates if d in raw_a and d in raw_b]
    trades: list[float] = []
    records: list[dict[str, Any]] = []
    for i in range(min(len(common) - 1, len(z_scores) - 1)):
        z = float(z_scores[i])
        if abs(z) < entry:
            continue
        signal_date = common[i]
        next_day = common[i + 1]
        a = raw_a[next_day]; b = raw_b[next_day]
        if not all(float(x.get("open", 0)) > 0 and float(x.get("close", 0)) > 0 for x in (a, b)):
            continue
        direction = -1.0 if z > 0 else 1.0
        direction_text = "放空 A／做多 B" if direction < 0 else "做多 A／放空 B"
        gross = direction * ((a["close"] - a["open"]) - beta * (b["close"] - b["open"]))
        gross_return = gross / max(1e-9, a["open"] + abs(beta) * b["open"])
        net = float(gross_return - cost_rate)
        trades.append(net)
        records.append({"訊號日": signal_date, "進場日": next_day, "進場時間": "次日開盤", "出場時間": "次日收盤", "方向": direction_text, "Z分數": finite_round(z, 4), "A進場": finite_round(a["open"], 4), "A出場": finite_round(a["close"], 4), "B進場": finite_round(b["open"], 4), "B出場": finite_round(b["close"], 4), "淨報酬率": finite_round(net * 100.0, 4), "結果": "獲利" if net > 0 else "虧損"})
    cumulative = float(np.prod([1.0 + r for r in trades]) - 1.0) if trades else 0.0
    wins = sum(r > 0 for r in trades)
    return {"lookback_days": len(common), "entry_z": entry, "cost_rate_round_trip": cost_rate, "trades": len(trades), "wins": wins, "losses": len(trades) - wins, "win_rate": finite_round(wins / len(trades) * 100.0, 2) if trades else None, "net_return": finite_round(cumulative * 100.0, 2), "trade_returns": [finite_round(r * 100.0, 4) for r in trades[-60:]], "trade_records": records}


def build_instruments(stocks: list[dict[str, Any]], contracts: list[dict[str, str]], ohlcv: dict[str, dict[str, dict[str, float]]]) -> tuple[list[dict[str, Any]], list[str], dict[str, int]]:
    volume_floor_shares = 150000
    traded_value_floor = 50_000_000
    atr_floor_pct = 1.0
    volume_ok = [stock for stock in stocks if float(stock.get("volume") or 0) >= 10000]
    eligible_stocks: list[dict[str, Any]] = []
    for stock in volume_ok:
        raw = ohlcv.get(yahoo_symbol(stock["code"]), {})
        avg_volume = mean_volume_shares(raw)
        avg_value = avg_volume * float(stock.get("close") or 0)
        atr_pct = rolling_atr_pct(raw)
        if avg_volume >= volume_floor_shares and avg_value >= traded_value_floor and atr_pct >= atr_floor_pct:
            item = dict(stock); item.update({"avg_volume_20": avg_volume, "avg_value_20": avg_value, "atr_pct_14": atr_pct}); eligible_stocks.append(item)
    log(f"Liquidity/volatility screen: {len(eligible_stocks)}/{len(stocks)} pass 20D volume >= {volume_floor_shares:,} shares, value >= {traded_value_floor:,}, ATR14% >= {atr_floor_pct:.1f}%")
    contract_by_underlying: dict[str, dict[str, str]] = {}
    for contract in contracts:
        contract_by_underlying.setdefault(contract["underlying_code"], contract)
    instruments: list[dict[str, Any]] = []
    yahoo_symbols: list[str] = []
    for stock in eligible_stocks:
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
            "exchange": item.get("exchange", "TAIFEX"),
            "source": f"{item.get('exchange', 'TAIFEX')} core future + {item['proxy_name']}",
        })
    return instruments, yahoo_symbols, {"universe": len(stocks), "latest_volume_pass": len(volume_ok), "eligible": len(eligible_stocks)}


def compute_pairs(instruments: list[dict[str, Any]], histories: dict[str, dict[str, float]], ohlcv: dict[str, dict[str, dict[str, float]]], max_pairs: int = 80) -> list[dict[str, Any]]:
    active: list[dict[str, Any]] = []
    for instrument in instruments:
        history = histories.get(instrument["yahoo_symbol"])
        if history and len(history) >= 80:
            values = np.asarray(list(history.values())[-120:], dtype=float)
            changes = np.diff(values)
            if len(np.unique(np.round(values, 8))) < 6 or np.count_nonzero(np.abs(changes) > 1e-10) < 5:
                continue
            item = dict(instrument)
            item["history"] = history
            item["ohlcv"] = ohlcv.get(instrument["yahoo_symbol"], {})
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
            if not math.isfinite(correlation) or correlation < 0.85:
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
            adf_p = approximate_adf_pvalue(spread)
            half_life = residual_half_life(spread)
            if adf_p is None or adf_p >= 0.05:
                continue
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
                "adf_p_value": adf_p,
                "residual_half_life_days": half_life,
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
                    "open_a": [round(float(active[i]["ohlcv"].get(date, {}).get("open", matrix[i, k])), 6) for k, date in enumerate(common_dates[-60:])],
                    "open_b": [round(float(active[j]["ohlcv"].get(date, {}).get("open", matrix[j, k])), 6) for k, date in enumerate(common_dates[-60:])],
                    "spread": [round(float(value), 6) for value in spread[-60:]],
                    "z_score": [round(float((value - mean20) / std20), 6) for value in spread[-60:]],
                },
            }
            bt = next_day_open_close_backtest(common_dates[-60:], left["ohlcv"], right["ohlcv"], beta, np.asarray([(value - mean20) / std20 for value in spread]), cost_rate=0.00375)
            candidate["next_day_backtest"] = bt
            pair_key = tuple(sorted((str(left.get("id")), str(right.get("id")))))
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
            "spot_universe_definition": "All TWSE-listed ordinary-share issuers from t187ap03_L; no ranking truncation",
            "spot_analysis_eligible": common_meta.get("analysis_spot_stocks", 0),
            "liquidity_filter": {"volume_20d_min_shares": 150000, "value_20d_min_twd": 50000000, "atr14_min_pct": 1.0},
            "filter_counts": common_meta.get("filter_counts", {}),
            "taifex_stock_futures_discovered": len(contracts),
            "taifex_stock_futures_in_analysis": futures_for_selected,
            "core_index_futures": [item["symbol"] for item in CORE_FUTURES],
            "core_index_futures_exchanges": {item["symbol"]: item.get("exchange", "TAIFEX") for item in CORE_FUTURES},
            "analysis_instruments": common_meta.get("analysis_instruments", 0),
            "common_history_days": common_meta.get("common_history_days", 0),
            "歷史資料起日": common_meta.get("history_start"),
            "歷史資料迄日": common_meta.get("history_end"),
        },
        "parameters": {
            "history_days_requested": 120,
            "correlation_window_days": 60,
            "correlation_threshold": 0.85,
            "adf_p_value_threshold": 0.05,
            "backtest": {"entry_signal": "T close |Z| >= 2.0", "entry_timing": "T+1 open", "exit_timing": "T+1 close", "cost_rate_round_trip": 0.00375, "lookahead_safe": True},
            "mean_window_days": 20,
            "long_mean_window_days": 60,
            "max_pairs": 120,
            "z_score_signal_threshold": 2.0,
            "更新排程": "每個交易日台北時間 15:00（GitHub Actions，實際啟動可能有數分鐘延遲）",
            "資料更新說明": "TWSE／TAIFEX 清單與公開日 K 資料於排程執行時重新抓取；週末與休市日不會產生新交易日資料。",
        },
        "data_sources": [
            {"name": "TWSE listed-company master t187ap03_L", "url": TWSE_COMPANY_URL, "role": "authoritative all-listed ordinary-share universe"},
            {"name": "TWSE STOCK_DAY_ALL", "url": TWSE_ALL_URL, "role": "latest close and liquidity snapshot for the full universe"},
            {"name": "TAIFEX single stock futures margining", "url": TAIFEX_STOCK_LIST_URL, "role": "official futures contract discovery"},
            {"name": "Yahoo Finance chart endpoint", "url": "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}", "role": "daily adjusted-close history fallback"},
        ],
        "quality_notes": [
            "個股期貨連續歷史價在免費公開端點覆蓋不一致；本 feed 以對應現貨調整收盤價作為方向性代理，並在 pair 上標示 proxy_warning。",
            "富台期是 SGX 的 FTSE Taiwan Index Futures，不是 TAIFEX 商品；若公開歷史代號不可用，會透明跳過其歷史序列，不以現貨假裝成期貨。",
            "相關係數與 Beta 為最近 60 個共同交易日的估計；僅保留近似 ADF 殘差 p-value < 0.05 的均值回歸候選，並報告殘差半衰期。",
            "隔日沖回測以 T 日收盤訊號、T+1 開盤建立兩腿、T+1 收盤平倉，預設雙邊總摩擦成本 0.375%；結果為研究估計，不代表可實現報酬。",
            "這是研究與教育用途的統計篩選，不包含下單、滑價、借券、交易稅、除權息調整或保證金即時報價。",
        ],
        "pairs": pairs,
    }


def run(args: argparse.Namespace) -> int:
    client = HttpClient(timeout=args.timeout, retries=args.retries)
    stocks, twse_date = fetch_twse_universe(client)
    contracts = fetch_taifex_contracts(client)
    # Fetch OHLCV once, then screen the complete universe before matrix operations.
    histories, ohlcv = fetch_histories(client, [yahoo_symbol(stock["code"]) for stock in stocks] + [item["proxy"] for item in CORE_FUTURES], workers=args.workers)
    instruments, symbols, filter_counts = build_instruments(stocks, contracts, ohlcv)
    pairs = compute_pairs(instruments, histories, ohlcv, max_pairs=args.max_pairs)
    if not pairs:
        raise RuntimeError("no pairs passed the correlation and variance filters")
    common_dates = sorted(set.intersection(*(set(histories[item["yahoo_symbol"]]) for item in instruments if item["yahoo_symbol"] in histories)))
    feed = build_feed(stocks, contracts, pairs, {"analysis_instruments": len(instruments), "analysis_spot_stocks": sum(1 for item in instruments if item.get("type") == "spot"), "filter_counts": filter_counts, "common_history_days": min(120, len(common_dates)), "history_start": common_dates[-60] if len(common_dates) >= 60 else common_dates[0], "history_end": common_dates[-1]})
    feed["twse_snapshot_roc_date"] = twse_date
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(feed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log(f"wrote {OUTPUT.relative_to(ROOT)} with {len(pairs)} pairs")
    log(f"top pair: {pairs[0]['symbol_a']} / {pairs[0]['symbol_b']} r={pairs[0]['correlation']} z={pairs[0]['z_score']}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-pairs", type=int, default=120)
    parser.add_argument("--workers", type=int, default=16)
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
