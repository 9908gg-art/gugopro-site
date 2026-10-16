#!/usr/bin/env python3
"""Deterministic long-only research backtest engine.

The engine is intentionally small and explicit for education and auditability.
Signals are computed at close t and executed at the next bar (t+1). Costs are
charged on position turnover in basis points. No order routing, live signal,
leverage, shorting, slippage model, or personalized recommendation is implied.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date
from typing import Sequence

BACKTEST_VERSION = "1.0.0"
TRADING_DAYS_PER_YEAR = 252


class BacktestContractError(ValueError):
    """Raised when a series or configuration violates the backtest contract."""


@dataclass(frozen=True)
class BacktestConfig:
    fast_window: int = 20
    slow_window: int = 60
    cost_bps: float = 10.0
    annualization: int = TRADING_DAYS_PER_YEAR

    def validate(self) -> None:
        if self.fast_window < 2 or self.slow_window <= self.fast_window:
            raise BacktestContractError("require 2 <= fast_window < slow_window")
        if self.cost_bps < 0 or self.cost_bps > 5000:
            raise BacktestContractError("cost_bps must be between 0 and 5000")
        if self.annualization < 1:
            raise BacktestContractError("annualization must be positive")


@dataclass(frozen=True)
class WalkForwardSplit:
    split_id: str
    train_start: int
    train_end: int
    test_start: int
    test_end: int
    censor_gap: int



def _finite_positive(value: float | None) -> bool:
    return value is not None and math.isfinite(value) and value > 0


def validate_close_rows(rows: Sequence[dict]) -> None:
    if len(rows) < 3:
        raise BacktestContractError("at least three rows are required")
    previous: str | None = None
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise BacktestContractError(f"row {index} is not an object")
        current = row.get("feature_as_of") or row.get("date") or row.get("observation_date")
        close = row.get("price", row.get("close"))
        if not isinstance(current, str):
            raise BacktestContractError(f"row {index} has no ISO date field")
        if previous is not None and current <= previous:
            raise BacktestContractError("dates must be strictly increasing")
        previous = current
        if close is not None and not _finite_positive(float(close)):
            raise BacktestContractError(f"close must be positive and finite at {current}")


def extract_dates_prices(rows: Sequence[dict]) -> tuple[list[str], list[float]]:
    validate_close_rows(rows)
    dates: list[str] = []
    prices: list[float] = []
    for row in rows:
        current = row.get("feature_as_of") or row.get("date") or row.get("observation_date")
        close = row.get("price", row.get("close"))
        if close is None:
            raise BacktestContractError(f"missing price cannot be silently filled at {current}")
        dates.append(current)
        prices.append(float(close))
    return dates, prices


def simple_moving_average(prices: Sequence[float], end_index: int, window: int) -> float | None:
    if window < 1 or end_index + 1 < window:
        return None
    sample = prices[end_index - window + 1 : end_index + 1]
    if len(sample) != window or any(not _finite_positive(value) for value in sample):
        return None
    return sum(sample) / window


def daily_returns(prices: Sequence[float]) -> list[float | None]:
    returns: list[float | None] = [None]
    for previous, current in zip(prices, prices[1:]):
        returns.append(current / previous - 1.0)
    return returns


def max_drawdown(equity: Sequence[float]) -> float:
    if not equity:
        return 0.0
    peak = equity[0]
    worst = 0.0
    for value in equity:
        peak = max(peak, value)
        if peak > 0:
            worst = min(worst, value / peak - 1.0)
    return worst


def _sample_std(values: Sequence[float]) -> float | None:
    if len(values) < 2:
        return None
    mean = sum(values) / len(values)
    return math.sqrt(max(sum((value - mean) ** 2 for value in values) / (len(values) - 1), 0.0))


def _annualized_return(total_return: float, periods: int, annualization: int) -> float | None:
    if periods < 1 or total_return <= -1:
        return None
    return (1.0 + total_return) ** (annualization / periods) - 1.0


def performance_metrics(strategy_returns: Sequence[float], strategy_equity: Sequence[float], benchmark_equity: Sequence[float], annualization: int = TRADING_DAYS_PER_YEAR) -> dict:
    returns = [float(value) for value in strategy_returns if value is not None and math.isfinite(float(value))]
    if not returns or not strategy_equity or not benchmark_equity:
        raise BacktestContractError("cannot calculate metrics without non-empty finite results")
    total_return = strategy_equity[-1] - 1.0
    benchmark_return = benchmark_equity[-1] - 1.0
    volatility = _sample_std(returns)
    sharpe = None if volatility in (None, 0.0) else sum(returns) / len(returns) / volatility * math.sqrt(annualization)
    return {
        "periods": len(returns),
        "total_return": total_return,
        "benchmark_total_return": benchmark_return,
        "annualized_return": _annualized_return(total_return, len(returns), annualization),
        "benchmark_annualized_return": _annualized_return(benchmark_return, len(returns), annualization),
        "annualized_volatility": None if volatility is None else volatility * math.sqrt(annualization),
        "sharpe": sharpe,
        "max_drawdown": max_drawdown(strategy_equity),
        "benchmark_max_drawdown": max_drawdown(benchmark_equity),
        "ending_equity": strategy_equity[-1],
        "benchmark_ending_equity": benchmark_equity[-1],
    }


def _round(value: float | None, digits: int = 10):
    return None if value is None else round(value, digits)


def run_ma_backtest(rows: Sequence[dict], config: BacktestConfig | None = None, evaluation_start: int = 0) -> dict:
    """Run a next-bar moving-average strategy and buy-and-hold benchmark.

    `evaluation_start` excludes the warm-up/training prefix from reported
    metrics, but that prefix remains available for moving-average context.
    """
    config = config or BacktestConfig()
    config.validate()
    dates, prices = extract_dates_prices(rows)
    if evaluation_start < 0 or evaluation_start >= len(prices) - 1:
        raise BacktestContractError("evaluation_start must leave at least one next-bar return")
    positions: list[int] = [0] * len(prices)
    fast_values: list[float | None] = [None] * len(prices)
    slow_values: list[float | None] = [None] * len(prices)
    for index in range(len(prices)):
        fast = simple_moving_average(prices, index, config.fast_window)
        slow = simple_moving_average(prices, index, config.slow_window)
        fast_values[index], slow_values[index] = fast, slow
        positions[index] = 1 if fast is not None and slow is not None and fast > slow else 0
    raw_returns = daily_returns(prices)
    daily_rows: list[dict] = []
    strategy_returns: list[float] = []
    strategy_equity: list[float] = []
    benchmark_equity: list[float] = []
    strategy_value = 1.0
    benchmark_value = 1.0
    evaluation_strategy_value = 1.0
    evaluation_benchmark_value = 1.0
    previous_position = 0
    entry_count = 0
    turnover_total = 0.0
    for index in range(len(prices) - 1):
        next_return = raw_returns[index + 1]
        assert next_return is not None
        position = positions[index]
        turnover = abs(position - previous_position)
        cost = turnover * config.cost_bps / 10000.0
        strategy_return = position * next_return - cost
        strategy_value *= 1.0 + strategy_return
        benchmark_value *= 1.0 + next_return
        in_evaluation = index >= evaluation_start
        if in_evaluation:
            evaluation_strategy_value *= 1.0 + strategy_return
            evaluation_benchmark_value *= 1.0 + next_return
            if position == 1 and previous_position == 0:
                entry_count += 1
            turnover_total += turnover
            strategy_returns.append(strategy_return)
            strategy_equity.append(evaluation_strategy_value)
            benchmark_equity.append(evaluation_benchmark_value)
        daily_rows.append({
            "date": dates[index + 1],
            "signal_date": dates[index],
            "signal_position": position,
            "close": prices[index + 1],
            "raw_asset_return": _round(next_return),
            "turnover": turnover,
            "cost": _round(cost),
            "strategy_return": _round(strategy_return),
            "strategy_equity": _round(strategy_value),
            "benchmark_equity": _round(benchmark_value),
            "evaluation_strategy_equity": _round(evaluation_strategy_value) if in_evaluation else None,
            "evaluation_benchmark_equity": _round(evaluation_benchmark_value) if in_evaluation else None,
            "fast_ma": _round(fast_values[index]),
            "slow_ma": _round(slow_values[index]),
            "execution": "next_bar",
        })
        previous_position = position
    metrics = performance_metrics(strategy_returns, strategy_equity, benchmark_equity, config.annualization)
    metrics.update({
        "entry_count": entry_count,
        "turnover_total": turnover_total,
        "cost_bps": config.cost_bps,
        "fast_window": config.fast_window,
        "slow_window": config.slow_window,
        "evaluation_start": evaluation_start,
        "evaluation_end": len(prices) - 1,
        "backtest_version": BACKTEST_VERSION,
    })
    return {
        "metrics": metrics,
        "rows": daily_rows,
        "contract": {
            "execution": "signal at close t, execute at next bar t+1",
            "position": "long-only 0/1",
            "transaction_cost": "turnover * cost_bps / 10000",
            "benchmark": "buy and hold from first evaluated next-bar return",
            "limitations": ["no slippage model", "no taxes", "no corporate actions beyond input price policy", "no leverage", "no shorting", "no survivorship correction"],
        },
    }


def make_walk_forward_splits(n_rows: int, train_size: int, test_size: int, censor_gap: int = 1, expanding: bool = True, max_splits: int = 20) -> list[WalkForwardSplit]:
    if min(n_rows, train_size, test_size) < 1:
        raise BacktestContractError("n_rows, train_size and test_size must be positive")
    if censor_gap < 0:
        raise BacktestContractError("censor_gap cannot be negative")
    if max_splits < 1:
        raise BacktestContractError("max_splits must be positive")
    splits: list[WalkForwardSplit] = []
    test_start = train_size + censor_gap
    split_number = 1
    while test_start < n_rows and len(splits) < max_splits:
        test_end = min(test_start + test_size, n_rows)
        if test_end <= test_start:
            break
        train_end = test_start - censor_gap
        train_start = 0 if expanding else max(0, train_end - train_size)
        splits.append(WalkForwardSplit(f"wf-{split_number:02d}", train_start, train_end, test_start, test_end, censor_gap))
        split_number += 1
        test_start = test_end
    if not splits:
        raise BacktestContractError("series is too short for the requested walk-forward layout")
    return splits


def evaluate_walk_forward(rows: Sequence[dict], config: BacktestConfig | None = None, train_size: int = 120, test_size: int = 40, censor_gap: int = 1, expanding: bool = True, max_splits: int = 20) -> dict:
    config = config or BacktestConfig()
    config.validate()
    dates, _ = extract_dates_prices(rows)
    splits = make_walk_forward_splits(len(rows), train_size, test_size, censor_gap, expanding, max_splits)
    evaluations: list[dict] = []
    for split in splits:
        # Keep the full prefix for MA warm-up; only report the held-out test slice.
        result = run_ma_backtest(rows[:split.test_end], config, evaluation_start=split.test_start)
        metrics = dict(result["metrics"])
        metrics.update({
            "split_id": split.split_id,
            "train_start": split.train_start,
            "train_end": split.train_end,
            "test_start": split.test_start,
            "test_end": split.test_end,
            "train_as_of_start": dates[split.train_start],
            "train_as_of_end": dates[split.train_end - 1],
            "test_as_of_start": dates[split.test_start],
            "test_as_of_end": dates[split.test_end - 1],
            "censor_gap": split.censor_gap,
        })
        evaluations.append(metrics)
    return {
        "backtest_version": BACKTEST_VERSION,
        "config": {"fast_window": config.fast_window, "slow_window": config.slow_window, "cost_bps": config.cost_bps, "annualization": config.annualization},
        "splits": evaluations,
        "contract": {
            "split": "expanding" if expanding else "rolling",
            "censor_gap": censor_gap,
            "test_is_held_out": True,
            "parameter_fitting": "none; fixed parameters supplied in config",
            "execution": "signal at close t, execute at next bar t+1",
            "position": "long-only 0/1",
            "transaction_cost": "turnover * cost_bps / 10000",
            "benchmark": "buy and hold from each evaluated next-bar return",
            "limitations": ["This is a deterministic educational benchmark, not a model selection result", "Do not tune on the held-out test windows", "Results depend on the input price adjustment and corporate-action policy"],
        },
    }
