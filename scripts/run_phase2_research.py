#!/usr/bin/env python3
"""Run the Phase 2 deterministic feature + backtest research pipeline."""
from __future__ import annotations

import argparse
import hashlib
import json
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from research.backtest.backtest_engine import BacktestConfig, evaluate_walk_forward
from research.features.feature_engineering import drop_missing_source_observations, feature_manifest, load_close_csv, make_features
from research.features.labels import apply_regime_cutoffs, join_features_and_labels, learn_regime_cutoffs, make_future_vol_labels

DEFAULT_CSV = ROOT / "research" / "fixtures" / "fred-SP500.csv"
RUN_VERSION = "1.0.0"


def sha256_id(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def run_pipeline(csv_path: Path, train_size: int, test_size: int, censor_gap: int, horizon: int, fast_window: int, slow_window: int, cost_bps: float, created_at: str | None = None) -> dict:
    raw_snapshot_id = sha256_id(csv_path)
    source_observations = load_close_csv(csv_path, "fred:SP500", "fred", snapshot_id=raw_snapshot_id, timezone_name="source_defined", currency="USD", adjustment="source_defined")
    observations, dropped_missing_rows = drop_missing_source_observations(source_observations)
    features = make_features(observations)
    labels = make_future_vol_labels(features, horizon=horizon, annualization=252)
    cutoffs = learn_regime_cutoffs(labels, 0, train_size, horizon)
    labeled = join_features_and_labels(features, apply_regime_cutoffs(labels, cutoffs))
    backtest = evaluate_walk_forward(
        features,
        config=BacktestConfig(fast_window=fast_window, slow_window=slow_window, cost_bps=cost_bps),
        train_size=train_size,
        test_size=test_size,
        censor_gap=censor_gap,
        expanding=True,
        max_splits=20,
    )
    splits = backtest["splits"]
    deltas = [split["total_return"] - split["benchmark_total_return"] for split in splits]
    summary = {
        "split_count": len(splits),
        "mean_strategy_return": statistics.fmean(split["total_return"] for split in splits),
        "mean_benchmark_return": statistics.fmean(split["benchmark_total_return"] for split in splits),
        "mean_excess_return": statistics.fmean(deltas),
        "windows_beating_benchmark": sum(delta > 0 for delta in deltas),
        "worst_excess_return": min(deltas),
        "best_excess_return": max(deltas),
        "model_status": "baseline_only",
    }
    return {
        "research_run_id": f"phase2-ma-{raw_snapshot_id.split(':', 1)[1][:12]}",
        "run_version": RUN_VERSION,
        "created_at": created_at or iso_now(),
        "input": {
            "dataset_id": "fred:SP500",
            "source_id": "fred",
            "raw_snapshot_id": raw_snapshot_id,
            "raw_file": csv_path.name,
            "point_in_time": True,
            "personal_data": False,
            "source_observation_count": len(source_observations),
            "complete_observation_count": len(observations),
            "missing_source_rows_excluded_without_imputation": dropped_missing_rows,
        },
        "feature_manifest": feature_manifest(features),
        "label_contract": {
            "label_version": labels[0]["label_version"],
            "horizon": horizon,
            "annualization": 252,
            "future_window_starts_after_feature_as_of": True,
            "cutoffs_learned_on_train_only": True,
            "regime_cutoffs": cutoffs.as_dict(),
            "incomplete_future_rows_excluded_from_training": True,
        },
        "backtest": backtest,
        "summary": summary,
        "sample_rows": {
            "source_observation_count": len(source_observations),
            "complete_observation_count": len(observations),
            "missing_source_rows_excluded_without_imputation": dropped_missing_rows,
            "feature_rows": len(features),
            "labeled_rows": len(labeled),
            "trainable_labels": sum(row["label_trainable"] for row in labeled),
            "feature_as_of_start": features[0]["feature_as_of"],
            "feature_as_of_end": features[-1]["feature_as_of"],
        },
        "limitations": [
            "This is an educational deterministic benchmark, not a live trading system.",
            "The moving-average parameters are fixed and not tuned on held-out windows.",
            "Input prices retain the source adjustment policy; taxes, slippage, market impact, delisting and corporate-action edge cases are not modeled beyond that policy.",
            "The volatility label is for historical regime research and must not be interpreted as a buy, sell, target-price, or return forecast.",
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--train-size", type=int, default=120)
    parser.add_argument("--test-size", type=int, default=40)
    parser.add_argument("--censor-gap", type=int, default=1)
    parser.add_argument("--horizon", type=int, default=20)
    parser.add_argument("--fast-window", type=int, default=20)
    parser.add_argument("--slow-window", type=int, default=60)
    parser.add_argument("--cost-bps", type=float, default=10.0)
    parser.add_argument("--created-at", type=str)
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        result = run_pipeline(args.csv, args.train_size, args.test_size, args.censor_gap, args.horizon, args.fast_window, args.slow_window, args.cost_bps, args.created_at)
    except Exception as exc:
        print(json.dumps({"status": "error", "code": "PHASE2_RUN_FAILED", "message": str(exc), "data": None}, ensure_ascii=False))
        return 2
    encoded = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded, encoding="utf-8")
    print(json.dumps({"status": "ok", "research_run_id": result["research_run_id"], "snapshot_id": result["input"]["raw_snapshot_id"], "feature_rows": result["sample_rows"]["feature_rows"], "trainable_labels": result["sample_rows"]["trainable_labels"], "splits": result["summary"]["split_count"], "mean_excess_return": result["summary"]["mean_excess_return"], "windows_beating_benchmark": result["summary"]["windows_beating_benchmark"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
