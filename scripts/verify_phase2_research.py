#!/usr/bin/env python3
"""CI-style checks for the Phase 2 feature and backtest research layer."""
from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from research.backtest.backtest_engine import BacktestConfig, evaluate_walk_forward, extract_dates_prices, make_walk_forward_splits, run_ma_backtest
from research.features.feature_engineering import drop_missing_source_observations, feature_manifest, load_close_csv, make_features
from research.features.labels import apply_regime_cutoffs, join_features_and_labels, learn_regime_cutoffs, make_future_vol_labels

SCHEMAS = ROOT / "research" / "schemas"
FIXTURE = ROOT / "research" / "fixtures" / "fred-SP500.csv"
FAILURES: list[str] = []


def fail(message: str) -> None:
    FAILURES.append(message)


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"invalid JSON {path.relative_to(ROOT)}: {exc}")
        return None


def type_matches(value, expected) -> bool:
    expected_types = expected if isinstance(expected, list) else [expected]
    for kind in expected_types:
        if kind == "null" and value is None:
            return True
        if kind == "object" and isinstance(value, dict):
            return True
        if kind == "array" and isinstance(value, list):
            return True
        if kind == "string" and isinstance(value, str):
            return True
        if kind == "boolean" and isinstance(value, bool):
            return True
        if kind == "number" and isinstance(value, (int, float)) and not isinstance(value, bool):
            return True
        if kind == "integer" and isinstance(value, int) and not isinstance(value, bool):
            return True
    return False


def format_ok(value, fmt: str) -> bool:
    from datetime import date, datetime
    try:
        if fmt == "date":
            date.fromisoformat(value)
        elif fmt == "date-time":
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        else:
            return True
        return True
    except (TypeError, ValueError):
        return False


def validate_schema(value, schema, path="$", condition_root=True) -> None:
    if not isinstance(schema, dict):
        fail(f"{path}: schema is not an object")
        return
    if "type" in schema and not type_matches(value, schema["type"]):
        fail(f"{path}: expected {schema['type']}")
        return
    if "enum" in schema and value not in schema["enum"]:
        fail(f"{path}: enum violation")
    if "const" in schema and value != schema["const"]:
        fail(f"{path}: const violation")
    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            fail(f"{path}: minLength violation")
        if "pattern" in schema:
            import re
            if not re.search(schema["pattern"], value):
                fail(f"{path}: pattern violation")
        if "format" in schema and not format_ok(value, schema["format"]):
            fail(f"{path}: format violation")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if not math.isfinite(float(value)):
            fail(f"{path}: non-finite number")
        if "minimum" in schema and value < schema["minimum"]:
            fail(f"{path}: minimum violation")
        if "maximum" in schema and value > schema["maximum"]:
            fail(f"{path}: maximum violation")
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            fail(f"{path}: minItems violation")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            fail(f"{path}: maxItems violation")
        if "items" in schema:
            for index, child in enumerate(value):
                validate_schema(child, schema["items"], f"{path}[{index}]")
    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                fail(f"{path}: missing {key}")
        properties = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for key in value:
                if key not in properties:
                    fail(f"{path}: unexpected {key}")
        for key, child_schema in properties.items():
            if key in value:
                validate_schema(value[key], child_schema, f"{path}.{key}")
    for condition in schema.get("allOf", []):
        if_props = condition.get("if", {}).get("properties", {})
        applies = isinstance(value, dict) and all(value.get(key) == rule.get("const") for key, rule in if_props.items())
        if applies:
            validate_schema(value, condition.get("then", {}), path)


def canonical_hash(value) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def assert_close(a, b, message: str, tolerance: float = 1e-12) -> None:
    if a is None or b is None:
        if a != b:
            fail(f"{message}: {a!r} != {b!r}")
    elif abs(float(a) - float(b)) > tolerance:
        fail(f"{message}: {a!r} != {b!r}")


def verify_public_surface() -> None:
    page = ROOT / "academy" / "research" / "quant-lab.html"
    runtime = ROOT / "academy" / "research" / "quant-lab.js"
    research_index = ROOT / "academy" / "research" / "index.html"
    academy_index = ROOT / "academy" / "index.html"
    sitemap = ROOT / "sitemap.xml"
    for path in (page, runtime, research_index, academy_index, sitemap):
        if not path.exists():
            fail(f"missing public Phase 2 surface: {path.relative_to(ROOT)}")
    if not page.exists() or not runtime.exists():
        return
    page_text = page.read_text(encoding="utf-8")
    runtime_text = runtime.read_text(encoding="utf-8")
    required_page_markers = ("id=\"run-quant\"", "id=\"local-csv\"", "id=\"equity-chart\"", "FRED SP500（版本化 fixture）", "不會上傳")
    for marker in required_page_markers:
        if marker not in page_text:
            fail(f"Phase 2 page missing marker: {marker}")
    required_runtime_markers = ("../../research/fixtures/fred-SP500.csv", "baseline_only", "futureLabels", "walkForward", "raw_snapshot_id", "window.crypto.subtle")
    for marker in required_runtime_markers:
        if marker not in runtime_text:
            fail(f"Phase 2 runtime missing marker: {marker}")
    if research_index.exists():
        research_text = research_index.read_text(encoding="utf-8")
        if research_text.count('id="phase2-quant-lab"') != 1 or research_text.count('href="./quant-lab.html"') != 1:
            fail("research index Phase 2 entry is not unique")
    if academy_index.exists():
        academy_text = academy_index.read_text(encoding="utf-8")
        if academy_text.count('href="research/quant-lab.html"') != 1:
            fail("Academy home Phase 2 link is not unique")
    if sitemap.exists() and sitemap.read_text(encoding="utf-8").count("https://gugopro.com/academy/research/quant-lab.html") != 1:
        fail("sitemap Phase 2 URL is not unique")
    import re
    for path in (page, runtime):
        if re.search(r"(?:8647735403:AA|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})", path.read_text(encoding="utf-8")):
            fail(f"credential-like token found in {path.relative_to(ROOT)}")


def main() -> int:
    verify_public_surface()
    if not FIXTURE.exists():
        fail("missing real FRED SP500 fixture")
        return finish()
    observations_all = load_close_csv(FIXTURE, "fred:SP500", "fred", timezone_name="source_defined", currency="USD", adjustment="source_defined")
    observations, dropped = drop_missing_source_observations(observations_all)
    features = make_features(observations)
    labels = make_future_vol_labels(features, horizon=20, annualization=252)
    cutoffs = learn_regime_cutoffs(labels, 0, 120, 20)
    labeled = join_features_and_labels(features, apply_regime_cutoffs(labels, cutoffs))

    if len(observations_all) != 261 or len(observations) != 251 or dropped != 10:
        fail(f"unexpected source/complete/missing counts: {len(observations_all)}/{len(observations)}/{dropped}")
    if len(features) != len(observations) or len(labels) != len(features):
        fail("feature and label lengths do not match complete observations")
    if labels[-1]["trainable"] or "incomplete_future_window" not in labels[-1]["quality_flags"] or labels[-1]["future_realized_vol"] is not None:
        fail("incomplete future window was not excluded from training")
    if sum(row["label_trainable"] for row in labeled) != 231:
        fail("unexpected trainable label count")

    # Point-in-time feature invariant: recomputing each row on its prefix must match.
    for index in range(1, len(observations), 17):
        prefix = make_features(observations[: index + 1])[-1]
        current = features[index]
        for key in ("price", "return_1d", "abs_return_1d", "realized_vol_20", "vol_zscore_60", "drawdown", "missing_rate_20"):
            assert_close(prefix[key], current[key], f"future leakage in {key} at {index}")
    # Cutoffs must not change if only post-training labels are changed.
    altered = [dict(row) for row in labels]
    for row in altered[120:]:
        if row.get("future_realized_vol") is not None:
            row["future_realized_vol"] = float(row["future_realized_vol"]) * 100.0
    altered_cutoffs = learn_regime_cutoffs(altered, 0, 120, 20)
    assert_close(cutoffs.low_high, altered_cutoffs.low_high, "regime low cutoff uses future labels")
    assert_close(cutoffs.middle_high, altered_cutoffs.middle_high, "regime middle cutoff uses future labels")
    for row in labels:
        if row.get("label_end") is not None and not row["label_end"] > row["feature_as_of"]:
            fail("label_end is not after feature_as_of")

    splits = make_walk_forward_splits(len(features), 120, 40, 1, True, 20)
    for left, right in zip(splits, splits[1:]):
        if left.test_end > right.test_start:
            fail("walk-forward test windows overlap")
    for split in splits:
        if split.train_end + split.censor_gap > split.test_start or split.test_start >= split.test_end:
            fail(f"invalid censor gap in {split.split_id}")

    config = BacktestConfig(fast_window=20, slow_window=60, cost_bps=10.0)
    single = run_ma_backtest(features, config, evaluation_start=120)
    walk = evaluate_walk_forward(features, config, 120, 40, 1, True, 20)
    if single["rows"][0]["execution"] != "next_bar" or single["rows"][0]["signal_date"] >= single["rows"][0]["date"]:
        fail("backtest does not enforce next-bar execution")
    if any(row["cost"] is None or row["cost"] < 0 for row in single["rows"]):
        fail("backtest emitted invalid transaction cost")
    if len(walk["splits"]) != 4 or walk["contract"]["test_is_held_out"] is not True:
        fail("unexpected walk-forward result")
    if walk["contract"]["execution"] != "signal at close t, execute at next bar t+1":
        fail("walk-forward execution contract missing")

    feature_schema = load_json(SCHEMAS / "feature.schema.json")
    label_schema = load_json(SCHEMAS / "label.schema.json")
    manifest_schema = load_json(SCHEMAS / "feature-manifest.schema.json")
    backtest_schema = load_json(SCHEMAS / "backtest-result.schema.json")
    if feature_schema:
        validate_schema(features[80], feature_schema, "feature[80]")
    if label_schema:
        validate_schema(labels[80], label_schema, "label[80]")
        validate_schema(labels[-1], label_schema, "label[last]")
    if manifest_schema:
        validate_schema(feature_manifest(features), manifest_schema, "feature_manifest")
    if backtest_schema:
        validate_schema(walk, backtest_schema, "backtest")

    # Same input and code produce identical feature rows and backtest output.
    features_again = make_features(observations)
    walk_again = evaluate_walk_forward(features_again, config, 120, 40, 1, True, 20)
    if canonical_hash(features) != canonical_hash(features_again):
        fail("feature output is not deterministic")
    if canonical_hash(walk) != canonical_hash(walk_again):
        fail("backtest output is not deterministic")
    if feature_manifest(features)["snapshot_id"] != feature_manifest(features_again)["snapshot_id"]:
        fail("feature manifest snapshot lineage changed")

    return finish(observations_all=len(observations_all), complete=len(observations), dropped=dropped, features=len(features), trainable=sum(row["label_trainable"] for row in labeled), splits=len(walk["splits"]), snapshot=observations[0].snapshot_id)


def finish(**summary) -> int:
    if FAILURES:
        print("phase2 research: FAIL")
        for item in FAILURES:
            print(f"- {item}")
        return 1
    print("phase2 research: PASS")
    for key, value in summary.items():
        print(f"{key}={value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
