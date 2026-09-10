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
TRADE_RECORDS_OUTPUT = ROOT / "data" / "tw-market" / "pair-trade-records.json"
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


def correlation_clusters(active: list[dict[str, Any]], correlations: np.ndarray, threshold: float = 0.85, min_size: int = 3, max_size: int = 8) -> list[list[int]]:
    """Greedy high-correlation groups; every member must average >= threshold to the group."""
    remaining = set(range(len(active)))
    clusters: list[list[int]] = []
    while remaining:
        seed = max(remaining, key=lambda i: sum(max(0.0, float(correlations[i, j])) for j in remaining))
        group = [seed]; remaining.remove(seed)
        while len(group) < max_size:
            candidates = [(float(np.mean([correlations[c, g] for g in group])), c) for c in remaining]
            candidates = [(score, c) for score, c in candidates if math.isfinite(score) and score >= threshold]
            if not candidates: break
            _, chosen = max(candidates)
            group.append(chosen); remaining.remove(chosen)
        if len(group) >= min_size:
            clusters.append(group)
        else:
            # A small leftover cannot form a multivariate model; it is intentionally excluded.
            remaining.update(group)
            break
    return clusters


def multivariate_fair_value(target: np.ndarray, peers: np.ndarray) -> tuple[float, np.ndarray, np.ndarray]:
    """OLS target = alpha + peers @ beta; return fair price, beta, residual."""
    design = np.column_stack([np.ones(len(target)), peers])
    coeff, *_ = np.linalg.lstsq(design, target, rcond=None)
    fair = design @ coeff
    return float(coeff[0]), np.asarray(coeff[1:], dtype=float), target - fair


def next_day_target_fair_backtest(dates: list[str], target_raw: dict[str, dict[str, float]], fair_raw: dict[str, dict[str, float]], z_scores: np.ndarray, entry: float = 2.0, cost_rate: float = 0.00375) -> dict[str, Any]:
    """T close signal, T+1 open target-vs-fair position, T+1 close exit."""
    common = [d for d in dates if d in target_raw and d in fair_raw]
    returns=[]; records=[]
    for i in range(min(len(common)-1, len(z_scores)-1)):
        z=float(z_scores[i])
        if abs(z)<entry: continue
        signal_date,next_day=common[i],common[i+1]; a,b=target_raw[next_day],fair_raw[next_day]
        if not all(float(x.get('open',0))>0 and float(x.get('close',0))>0 for x in (a,b)): continue
        direction=-1.0 if z>0 else 1.0
        gross=direction*((a['close']-a['open'])-(b['close']-b['open']))
        net=float(gross/max(1e-9,a['open']+b['open'])-cost_rate)
        returns.append(net)
        records.append({'訊號日':signal_date,'進場日':next_day,'進場時間':'次日開盤','出場時間':'次日收盤','方向':'放空目標／做多理論價' if direction<0 else '做多目標／放空理論價','Z分數':finite_round(z,4),'目標進場':finite_round(a['open'],4),'目標出場':finite_round(a['close'],4),'理論價進場':finite_round(b['open'],4),'理論價出場':finite_round(b['close'],4),'淨報酬率':finite_round(net*100,4),'結果':'獲利' if net>0 else '虧損'})
    wins=sum(x>0 for x in returns); gross_win=sum(x for x in returns if x>0); gross_loss=sum(-x for x in returns if x<0)
    cumulative=float(np.prod([1+x for x in returns])-1) if returns else 0.0
    return {'lookback_days':len(common),'entry_z':entry,'cost_rate_round_trip':cost_rate,'trades':len(returns),'wins':wins,'losses':len(returns)-wins,'win_rate':finite_round(wins/len(returns)*100,2) if returns else None,'average_risk_reward':finite_round(gross_win/gross_loss,3) if gross_loss else None,'net_return':finite_round(cumulative*100,2),'trade_returns':[finite_round(x*100,4) for x in returns[-60:]],'trade_records':records}


def compute_pairs(instruments: list[dict[str, Any]], histories: dict[str, dict[str, float]], ohlcv: dict[str, dict[str, dict[str, float]]], max_pairs: int = 120) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    active=[]
    seen_history_symbols=set()
    for instrument in instruments:
        history=histories.get(instrument['yahoo_symbol'])
        if history and len(history)>=80:
            values=np.asarray(list(history.values())[-120:],dtype=float)
            if len(np.unique(np.round(values,8)))<6 or np.count_nonzero(np.abs(np.diff(values))>1e-10)<5: continue
            if instrument['yahoo_symbol'] in seen_history_symbols:
                continue
            seen_history_symbols.add(instrument['yahoo_symbol'])
            item=dict(instrument); item['history']=history; item['ohlcv']=ohlcv.get(instrument['yahoo_symbol'],{}); active.append(item)
    if len(active)<10: raise RuntimeError(f'not enough instruments with history: {len(active)}')
    common_dates=sorted(set.intersection(*(set(item['history']) for item in active)))[-120:]
    if len(common_dates)<60: raise RuntimeError(f'only {len(common_dates)} common dates available; need at least 60')
    matrix=np.asarray([[item['history'][d] for d in common_dates] for item in active],dtype=float)
    window=matrix[:,-60:]; correlations=np.corrcoef(window)
    clusters=correlation_clusters(active,correlations,threshold=0.85,min_size=3,max_size=8)
    candidates=[]
    for group_no, members in enumerate(clusters,1):
        group_corr=float(np.mean([correlations[i,j] for pos,i in enumerate(members) for j in members[pos+1:]]))
        group_id=f'G{group_no:03d}'
        for target_pos,target_idx in enumerate(members):
            peer_idxs=[x for x in members if x!=target_idx]
            target=window[target_idx]; peers=window[peer_idxs].T
            alpha,betas,residual=multivariate_fair_value(target,peers)
            if not np.all(np.isfinite(residual)): continue
            mean20=float(np.mean(residual[-20:])); std20=float(np.std(residual[-20:])); mean60=float(np.mean(residual)); std60=float(np.std(residual))
            if std20<=1e-10: continue
            adf=approximate_adf_pvalue(residual); half=residual_half_life(residual)
            if adf is None or adf>=0.05: continue
            z=float((residual[-1]-mean20)/std20); key,label_text=classify_signal(z)
            fair_series=alpha+peers@betas
            peer_raw=[active[x]['ohlcv'] for x in peer_idxs]
            target_raw=active[target_idx]['ohlcv']; fair_raw={}
            for d in common_dates[-60:]:
                vals=[raw.get(d,{}) for raw in peer_raw]
                if not all(v.get('open',0)>0 and v.get('close',0)>0 for v in vals): continue
                fair_raw[d]={'open':alpha+sum(float(b)*float(v['open']) for b,v in zip(betas,vals)),'close':alpha+sum(float(b)*float(v['close']) for b,v in zip(betas,vals))}
            bt=next_day_target_fair_backtest(common_dates[-60:],target_raw,fair_raw,np.asarray([(x-mean20)/std20 for x in residual]),cost_rate=0.00375)
            target_item=active[target_idx]
            candidate={'pair_id':f'{group_id}::{target_item["id"]}','group_id':group_id,'group_label':f'同盟群組 {group_no}','group_size':len(members),'group_average_correlation':finite_round(group_corr,5),'symbol_a':target_item['symbol'],'name_a':target_item['name'],'type_a':target_item['type'],'symbol_b':'／'.join(active[x]['symbol'] for x in peer_idxs),'name_b':f'{len(peer_idxs)} 檔群組合成理論價','type_b':'basket','underlying_a':target_item.get('underlying_code'),'underlying_b':'MULTI_BETA','correlation':finite_round(group_corr,5),'beta':finite_round(float(np.linalg.norm(betas)),5),'multivariate_beta':{active[x]['symbol']:finite_round(float(b),6) for x,b in zip(peer_idxs,betas)},'alpha':finite_round(alpha,6),'fair_value_current':finite_round(float(fair_series[-1]),4),'actual_price_current':finite_round(float(target[-1]),4),'fair_value_deviation_pct':finite_round(float((target[-1]/fair_series[-1]-1)*100) if fair_series[-1] else 0,4),'adf_p_value':adf,'residual_half_life_days':half,'current_spread':finite_round(float(residual[-1]),4),'mean_spread':finite_round(mean20,4),'std_dev':finite_round(std20,4),'mean_spread_20':finite_round(mean20,4),'std_dev_20':finite_round(std20,4),'mean_spread_60':finite_round(mean60,4),'std_dev_60':finite_round(std60,4),'z_score':finite_round(z,4),'signal_status':label_text,'signal_status_key':key,'proxy_warning':bool(target_item.get('proxy') or any(active[x].get('proxy') for x in peer_idxs)),'history':{'dates':common_dates[-60:],'price_a':normalized(target[-60:]),'price_b':normalized(fair_series[-60:]),'fair_value':[round(float(x),6) for x in fair_series[-60:]],'actual_price':[round(float(x),6) for x in target[-60:]],'spread':[round(float(x),6) for x in residual[-60:]],'z_score':[round(float((x-mean20)/std20),6) for x in residual[-60:]]},'next_day_backtest':bt}
            candidates.append(candidate)
    candidates.sort(key=lambda p:(abs(float(p['z_score'])),float(p['group_average_correlation'])),reverse=True)
    return candidates[:max_pairs],{'clusters':len(clusters),'cluster_sizes':[len(x) for x in clusters],'active_instruments':len(active),'clustered_instruments':sum(len(x) for x in clusters),'common_dates':common_dates}


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
            "clustered_instruments": common_meta.get("clustered_instruments", 0),
            "correlation_clusters": common_meta.get("clusters", 0),
            "cluster_sizes": common_meta.get("cluster_sizes", []),
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
            "model": "高相關群組聚類 + 多元 OLS Beta 理論價",
            "cluster_threshold": 0.85,
            "cluster_size_range": [3, 8],
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
    pairs, cluster_meta = compute_pairs(instruments, histories, ohlcv, max_pairs=args.max_pairs)
    if not pairs:
        raise RuntimeError("no pairs passed the correlation and variance filters")
    common_dates = sorted(set.intersection(*(set(histories[item["yahoo_symbol"]]) for item in instruments if item["yahoo_symbol"] in histories)))
    feed = build_feed(stocks, contracts, pairs, {"analysis_instruments": len(instruments), "analysis_spot_stocks": sum(1 for item in instruments if item.get("type") == "spot"), "filter_counts": filter_counts, "common_history_days": min(120, len(common_dates)), "clusters": cluster_meta.get("clusters", 0), "cluster_sizes": cluster_meta.get("cluster_sizes", []), "clustered_instruments": cluster_meta.get("clustered_instruments", 0), "history_start": common_dates[-60] if len(common_dates) >= 60 else common_dates[0], "history_end": common_dates[-1]})
    feed["twse_snapshot_roc_date"] = twse_date
    trade_records = {pair["pair_id"]: pair.get("next_day_backtest", {}).pop("trade_records", []) for pair in feed["pairs"]}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(feed, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    TRADE_RECORDS_OUTPUT.write_text(json.dumps({"generated_at": feed["generated_at"], "records": trade_records}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    log(f"wrote {OUTPUT.relative_to(ROOT)} with {len(pairs)} pairs")
    log(f"wrote {TRADE_RECORDS_OUTPUT.relative_to(ROOT)} with {sum(len(rows) for rows in trade_records.values())} trade records")
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
