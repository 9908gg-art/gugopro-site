#!/usr/bin/env python3
"""Point-in-time future-volatility labels for research-only classification."""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

LABEL_VERSION = "1.0.0"


class LabelContractError(ValueError):
    """Raised when labels cannot be created without future-window ambiguity."""


@dataclass(frozen=True)
class RegimeCutoffs:
    low_high: float
    middle_high: float
    train_start: int
    train_end: int
    horizon: int
    label_version: str = LABEL_VERSION

    def as_dict(self) -> dict:
        return {
            "low_high": self.low_high,
            "middle_high": self.middle_high,
            "train_start": self.train_start,
            "train_end": self.train_end,
            "horizon": self.horizon,
            "label_version": self.label_version,
        }


def sample_std(values: Sequence[float]) -> float | None:
    if len(values) < 2:
        return None
    mean = sum(values) / len(values)
    return math.sqrt(max(sum((value - mean) ** 2 for value in values) / (len(values) - 1), 0.0))


def _quantile(values: Sequence[float], probability: float) -> float:
    if not values:
        raise LabelContractError("cannot estimate cutoff from empty labels")
    ordered = sorted(values)
    position = (len(ordered) - 1) * probability
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] * (1.0 - weight) + ordered[upper] * weight


def _prices_from_rows(rows: Sequence[dict]) -> list[float | None]:
    prices: list[float | None] = []
    for index, row in enumerate(rows):
        value = row.get("price", row.get("close"))
        if value is None:
            prices.append(None)
            continue
        try:
            value = float(value)
        except (TypeError, ValueError) as exc:
            raise LabelContractError(f"invalid price at row {index}") from exc
        if not math.isfinite(value) or value <= 0:
            raise LabelContractError(f"price must be positive and finite at row {index}")
        prices.append(value)
    return prices


def make_future_vol_labels(rows: Sequence[dict], horizon: int = 20, annualization: int = 252) -> list[dict]:
    """Create labels; future window is strictly after each feature_as_of date."""
    if horizon < 2:
        raise LabelContractError("horizon must be at least 2")
    if annualization < 1:
        raise LabelContractError("annualization must be positive")
    prices = _prices_from_rows(rows)
    labels: list[dict] = []
    for index, row in enumerate(rows):
        feature_date = row.get("feature_as_of") or row.get("date") or row.get("observation_date")
        label_end_index = index + horizon
        label_end_date = None if label_end_index >= len(rows) else (rows[label_end_index].get("feature_as_of") or rows[label_end_index].get("date") or rows[label_end_index].get("observation_date"))
        future_values = prices[index + 1 : index + horizon + 1]
        flags: list[str] = []
        future_vol: float | None = None
        if len(future_values) != horizon or any(value is None for value in future_values) or prices[index] is None:
            flags.append("incomplete_future_window")
        else:
            future_returns: list[float] = []
            previous = prices[index]
            assert previous is not None
            for current in future_values:
                assert current is not None
                future_returns.append(current / previous - 1.0)
                previous = current
            deviation = sample_std(future_returns)
            if deviation is None:
                flags.append("insufficient_future_returns")
            else:
                future_vol = deviation * math.sqrt(annualization)
        labels.append({
            "feature_as_of": feature_date,
            "label_end": label_end_date,
            "horizon": horizon,
            "annualization": annualization,
            "future_realized_vol": future_vol,
            "regime": None,
            "label_version": LABEL_VERSION,
            "quality_flags": flags,
            "trainable": future_vol is not None and not flags,
        })
    return labels


def learn_regime_cutoffs(labels: Sequence[dict], train_start: int, train_end: int, horizon: int) -> RegimeCutoffs:
    if train_start < 0 or train_end <= train_start or train_end > len(labels):
        raise LabelContractError("invalid training label range")
    values = [row["future_realized_vol"] for row in labels[train_start:train_end] if row.get("trainable") and row.get("future_realized_vol") is not None]
    if len(values) < 6:
        raise LabelContractError("at least six complete training labels are required for regime cutoffs")
    low_high = _quantile(values, 1.0 / 3.0)
    middle_high = _quantile(values, 2.0 / 3.0)
    if not math.isfinite(low_high) or not math.isfinite(middle_high) or low_high > middle_high:
        raise LabelContractError("learned regime cutoffs are invalid")
    return RegimeCutoffs(low_high, middle_high, train_start, train_end, horizon)


def apply_regime_cutoffs(labels: Sequence[dict], cutoffs: RegimeCutoffs) -> list[dict]:
    labeled: list[dict] = []
    for row in labels:
        current = dict(row)
        value = current.get("future_realized_vol")
        if current.get("trainable") and value is not None:
            current["regime"] = "low" if value <= cutoffs.low_high else "middle" if value <= cutoffs.middle_high else "high"
        current["cutoff_source"] = cutoffs.as_dict()
        labeled.append(current)
    return labeled


def join_features_and_labels(features: Sequence[dict], labels: Sequence[dict]) -> list[dict]:
    if len(features) != len(labels):
        raise LabelContractError("features and labels must have the same length")
    joined: list[dict] = []
    for feature, label in zip(features, labels):
        if feature.get("feature_as_of") != label.get("feature_as_of"):
            raise LabelContractError("feature_as_of and label date mismatch")
        row = dict(feature)
        row["label_end"] = label.get("label_end")
        row["future_realized_vol"] = label.get("future_realized_vol")
        row["regime"] = label.get("regime")
        row["label_horizon"] = label.get("horizon")
        row["label_version"] = label.get("label_version")
        row["label_quality_flags"] = label.get("quality_flags", [])
        row["label_trainable"] = label.get("trainable", False)
        row["cutoff_source"] = label.get("cutoff_source")
        joined.append(row)
    return joined
