#!/usr/bin/env python3
"""Deterministic, point-in-time feature engineering for public price series.

The module accepts a dated close series and emits features that use only
observations available on or before each feature_as_of date. It does not
fetch data, infer missing values, or generate market observations.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import math
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path

FEATURE_VERSION = "1.0.0"
SCHEMA_VERSION = "1.0.0"
TRADING_DAYS_PER_YEAR = 252


class FeatureContractError(ValueError):
    """Raised when input data cannot satisfy the feature contract."""


@dataclass(frozen=True)
class CloseObservation:
    observation_date: date
    close: float | None
    source_id: str
    dataset_id: str
    snapshot_id: str
    timezone: str
    currency: str
    adjustment: str


def sha256_bytes(raw: bytes) -> str:
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise FeatureContractError(f"invalid observation date: {value!r}") from exc


def parse_close_csv(raw: bytes, dataset_id: str, source_id: str, snapshot_id: str | None = None, timezone_name: str = "source_defined", currency: str = "not_applicable", adjustment: str = "source_defined") -> list[CloseObservation]:
    """Parse a one-series FRED-style CSV without filling missing values."""
    if not raw:
        raise FeatureContractError("price CSV is empty")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise FeatureContractError("price CSV must be UTF-8") from exc
    reader = csv.DictReader(io.StringIO(text))
    fields = reader.fieldnames or []
    if "observation_date" not in fields:
        raise FeatureContractError("price CSV must contain observation_date")
    value_fields = [field for field in fields if field != "observation_date"]
    if len(value_fields) != 1:
        raise FeatureContractError("price CSV must contain exactly one value column")
    value_field = value_fields[0]
    snapshot_id = snapshot_id or sha256_bytes(raw)
    rows: list[CloseObservation] = []
    seen: set[date] = set()
    previous: date | None = None
    for record in reader:
        current_date = parse_date(record.get("observation_date", ""))
        if current_date in seen:
            raise FeatureContractError(f"duplicate observation date: {current_date.isoformat()}")
        if previous is not None and current_date <= previous:
            raise FeatureContractError("observation dates must be strictly increasing")
        seen.add(current_date)
        previous = current_date
        raw_value = record.get(value_field)
        if raw_value in (None, "", "."):
            close = None
        else:
            try:
                close = float(raw_value)
            except (TypeError, ValueError) as exc:
                raise FeatureContractError(f"non-numeric close at {current_date.isoformat()}: {raw_value!r}") from exc
            if not math.isfinite(close) or close <= 0:
                raise FeatureContractError(f"close must be positive and finite at {current_date.isoformat()}")
        rows.append(CloseObservation(current_date, close, source_id, dataset_id, snapshot_id, timezone_name, currency, adjustment))
    if len(rows) < 3:
        raise FeatureContractError("at least three dated observations are required")
    return rows


def load_close_csv(path: Path, dataset_id: str, source_id: str, **metadata) -> list[CloseObservation]:
    return parse_close_csv(path.read_bytes(), dataset_id, source_id, **metadata)


def drop_missing_source_observations(observations: list[CloseObservation]) -> tuple[list[CloseObservation], int]:
    """Prepare a complete-price view without imputing or relabeling source gaps.

    Calendar gaps such as weekends may be represented by null rows in a daily
    public series. Backtesting must not silently fill them; this function
    explicitly returns the dropped count so the run manifest can disclose it.
    """
    if not observations:
        raise FeatureContractError("observations are empty")
    complete = [row for row in observations if row.close is not None]
    dropped = len(observations) - len(complete)
    if len(complete) < 3:
        raise FeatureContractError("fewer than three complete observations remain after preserving source gaps")
    return complete, dropped


def sample_std(values: list[float]) -> float | None:
    if len(values) < 2:
        return None
    mean = sum(values) / len(values)
    variance = sum((value - mean) ** 2 for value in values) / (len(values) - 1)
    return math.sqrt(max(variance, 0.0))


def rolling_mean(values: list[float | None], end_index: int, window: int) -> float | None:
    if window < 1 or end_index + 1 < window:
        return None
    sample = values[end_index - window + 1 : end_index + 1]
    if any(value is None for value in sample):
        return None
    return sum(value for value in sample if value is not None) / window


def rolling_std(values: list[float | None], end_index: int, window: int) -> float | None:
    if window < 2 or end_index + 1 < window:
        return None
    sample = values[end_index - window + 1 : end_index + 1]
    if any(value is None for value in sample):
        return None
    return sample_std([value for value in sample if value is not None])


def make_features(observations: list[CloseObservation], vol_window: int = 20, zscore_window: int = 60, missing_window: int = 20) -> list[dict]:
    """Create point-in-time deterministic features from close observations."""
    if not observations:
        raise FeatureContractError("observations are empty")
    if min(vol_window, zscore_window, missing_window) < 2:
        raise FeatureContractError("feature windows must be at least 2")
    closes = [row.close for row in observations]
    returns: list[float | None] = [None]
    for index in range(1, len(closes)):
        previous, current = closes[index - 1], closes[index]
        returns.append(None if previous is None or current is None else current / previous - 1.0)
    rolling_vols: list[float | None] = [rolling_std(returns, index, vol_window) for index in range(len(observations))]
    rows: list[dict] = []
    running_peak: float | None = None
    for index, observation in enumerate(observations):
        if observation.close is not None:
            running_peak = observation.close if running_peak is None else max(running_peak, observation.close)
        current_vol = rolling_vols[index]
        vol_history = rolling_vols[max(0, index - zscore_window + 1) : index + 1]
        valid_vol_history = [value for value in vol_history if value is not None]
        vol_mean = sum(valid_vol_history) / len(valid_vol_history) if len(valid_vol_history) >= 2 else None
        vol_std = sample_std(valid_vol_history) if len(valid_vol_history) >= 2 else None
        vol_zscore = None if current_vol is None or vol_mean is None or vol_std in (None, 0.0) else (current_vol - vol_mean) / vol_std
        missing_sample = closes[max(0, index - missing_window + 1) : index + 1]
        missing_rate = sum(value is None for value in missing_sample) / len(missing_sample)
        drawdown = None if observation.close is None or running_peak in (None, 0.0) else observation.close / running_peak - 1.0
        quality_flags: list[str] = []
        if observation.close is None:
            quality_flags.append("missing_source_value")
        if missing_rate > 0:
            quality_flags.append("partial")
        rows.append({
            "dataset_id": observation.dataset_id,
            "source_id": observation.source_id,
            "feature_as_of": observation.observation_date.isoformat(),
            "available_at": observation.observation_date.isoformat(),
            "timezone": observation.timezone,
            "currency": observation.currency,
            "adjustment": observation.adjustment,
            "snapshot_id": observation.snapshot_id,
            "feature_version": FEATURE_VERSION,
            "schema_version": SCHEMA_VERSION,
            "price": observation.close,
            "return_1d": returns[index],
            "abs_return_1d": None if returns[index] is None else abs(returns[index]),
            "realized_vol_20": current_vol,
            "vol_zscore_60": vol_zscore,
            "drawdown": drawdown,
            "missing_rate_20": missing_rate,
            "quality_flags": quality_flags,
        })
    return rows


def feature_manifest(features: list[dict], parameters: dict | None = None) -> dict:
    if not features:
        raise FeatureContractError("cannot create manifest from empty feature set")
    first, last = features[0], features[-1]
    canonical = json.dumps(features, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    content_hash = "sha256:" + hashlib.sha256(canonical).hexdigest()
    return {
        "feature_set_id": f"{first['dataset_id']}:price-risk-v1",
        "dataset_id": first["dataset_id"],
        "source_id": first["source_id"],
        "snapshot_id": first["snapshot_id"],
        "feature_content_hash": content_hash,
        "feature_version": first["feature_version"],
        "schema_version": first["schema_version"],
        "feature_as_of_start": first["feature_as_of"],
        "feature_as_of_end": last["feature_as_of"],
        "features": ["return_1d", "abs_return_1d", "realized_vol_20", "vol_zscore_60", "drawdown", "missing_rate_20"],
        "parameters": parameters or {"vol_window": 20, "zscore_window": 60, "missing_window": 20, "annualization": TRADING_DAYS_PER_YEAR},
        "lineage": "Each row uses only close observations dated on or before feature_as_of.",
        "created_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    }


def dump_json(value, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
