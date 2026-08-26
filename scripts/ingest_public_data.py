#!/usr/bin/env python3
"""Fetch or parse an approved public-data fixture into a versioned envelope.

Phase 1 intentionally supports one dataset first: FRED series observations.
Live requests require FRED_API_KEY in the server environment. Public outputs
never contain the key, cookies, or the full credential-bearing request URL.
Use --raw-file for deterministic contract tests with a saved official fixture.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "research" / "source-registry.json"
CATALOG_PATH = ROOT / "research" / "datasets" / "catalog.json"
DEFAULT_OUTPUT_DIR = ROOT / "research" / "snapshots"
SCHEMA_VERSION = "1.0.0"
PARSER_VERSION = "fred-csv-1.0.0"
FRED_API_ENDPOINT = "https://api.stlouisfed.org/fred/series/observations"
FRED_GRAPH_ENDPOINT = "https://fred.stlouisfed.org/graph/fredgraph.csv"


class IngestionError(RuntimeError):
    def __init__(self, code: str, message: str, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.retryable = retryable


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def iso_z(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_bytes(raw: bytes) -> str:
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def load_catalog() -> tuple[dict, dict]:
    try:
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        raise IngestionError("LOCAL_CONTRACT_UNAVAILABLE", f"Cannot load local research contract: {exc}") from exc
    return registry, catalog


def dataset_record(dataset_id: str, registry: dict, catalog: dict) -> tuple[dict, dict]:
    datasets = {item.get("dataset_id"): item for item in catalog.get("datasets", [])}
    sources = {item.get("source_id"): item for item in registry.get("sources", [])}
    dataset = datasets.get(dataset_id)
    if dataset is None:
        raise IngestionError("UNKNOWN_DATASET", f"Dataset is not registered: {dataset_id}")
    source = sources.get(dataset.get("source_id"))
    if source is None:
        raise IngestionError("UNKNOWN_SOURCE", f"Source is not registered: {dataset.get('source_id')}")
    if dataset.get("source_id") != "fred" or dataset_id != "fred:DGS10":
        raise IngestionError("UNSUPPORTED_DATASET", "Phase 1 currently supports only the registered fred:DGS10 dataset")
    return source, dataset


def validate_date_arg(value: str) -> str:
    try:
        date.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"invalid ISO date: {value}") from exc
    return value


def safe_fred_url(series_id: str, start: str | None, end: str | None) -> str:
    query = {"series_id": series_id, "file_type": "json"}
    if start:
        query["observation_start"] = start
    if end:
        query["observation_end"] = end
    return FRED_API_ENDPOINT + "?" + urlencode(query)


def fetch_fred_json(series_id: str, start: str | None, end: str | None, attempts: int, timeout: int) -> tuple[bytes, str]:
    api_key = os.environ.get("FRED_API_KEY", "").strip()
    if not api_key:
        raise IngestionError("MISSING_SERVER_CREDENTIAL", "FRED_API_KEY is required for live ingestion; use --raw-file for a deterministic fixture test")
    query = {"series_id": series_id, "file_type": "json", "api_key": api_key}
    if start:
        query["observation_start"] = start
    if end:
        query["observation_end"] = end
    request_url = FRED_API_ENDPOINT + "?" + urlencode(query)
    safe_url = safe_fred_url(series_id, start, end)
    last_error: IngestionError | None = None
    for attempt in range(1, max(1, attempts) + 1):
        try:
            request = Request(request_url, headers={"User-Agent": "GugoPro-Research/1.0; server-side ingestion"})
            with urlopen(request, timeout=timeout) as response:
                raw = response.read()
                if not raw:
                    raise IngestionError("EMPTY_RESPONSE", "FRED returned an empty response", retryable=True)
                return raw, safe_url
        except HTTPError as exc:
            retryable = exc.code == 429 or exc.code >= 500
            code = f"HTTP_{exc.code}"
            last_error = IngestionError(code, f"FRED upstream returned HTTP {exc.code}; no values were synthesized", retryable=retryable)
        except (URLError, TimeoutError, OSError) as exc:
            last_error = IngestionError("UPSTREAM_UNAVAILABLE", f"FRED request failed: {exc}; no values were synthesized", retryable=True)
        if last_error and last_error.retryable and attempt < attempts:
            time.sleep(min(8, 2 ** (attempt - 1)))
        else:
            break
    assert last_error is not None
    raise last_error


def write_raw_snapshot(raw: bytes, snapshot_id: str, source_url: str, retrieved_at: datetime, dataset_id: str) -> Path:
    raw_dir = DEFAULT_OUTPUT_DIR / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    suffix = ".json" if raw.lstrip().startswith(b"{") else ".csv"
    raw_path = raw_dir / f"{snapshot_id.split(':', 1)[1]}{suffix}"
    if raw_path.exists() and raw_path.read_bytes() != raw:
        raise IngestionError("SNAPSHOT_HASH_COLLISION", "Existing snapshot path contains different bytes")
    if not raw_path.exists():
        raw_path.write_bytes(raw)
    manifest_path = raw_dir / f"{snapshot_id.split(':', 1)[1]}.manifest.json"
    manifest = {
        "snapshot_id": snapshot_id,
        "dataset_id": dataset_id,
        "source_url": source_url,
        "retrieved_at": iso_z(retrieved_at),
        "raw_bytes": len(raw),
        "parser_version": PARSER_VERSION,
        "schema_version": SCHEMA_VERSION,
        "immutable": True
    }
    if manifest_path.exists():
        try:
            existing = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise IngestionError("SNAPSHOT_MANIFEST_INVALID", "Existing snapshot manifest is not valid JSON") from exc
        immutable_keys = ("snapshot_id", "dataset_id", "source_url", "raw_bytes", "parser_version", "schema_version", "immutable")
        if any(existing.get(key) != manifest.get(key) for key in immutable_keys):
            raise IngestionError("SNAPSHOT_MANIFEST_MISMATCH", "Existing snapshot manifest does not match immutable metadata")
    else:
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return raw_path


def read_raw_file(path: Path) -> tuple[bytes, str]:
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise IngestionError("FIXTURE_UNREADABLE", f"Cannot read fixture: {exc}") from exc
    if not raw:
        raise IngestionError("EMPTY_FIXTURE", "Fixture is empty")
    manifest = path.with_suffix(".manifest.txt")
    safe_url = "fixture://" + path.name
    if manifest.exists():
        for line in manifest.read_text(encoding="utf-8").splitlines():
            if line.startswith("source_url="):
                safe_url = line.split("=", 1)[1].strip()
                break
    return raw, safe_url


def parse_fred_payload(raw: bytes, dataset_id: str, source: dict, dataset: dict, safe_url: str, retrieved_at: datetime) -> tuple[dict, list[dict]]:
    snapshot_id = sha256_bytes(raw)
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        payload = None
    rows: list[dict] = []
    if isinstance(payload, dict) and isinstance(payload.get("observations"), list):
        observations = payload["observations"]
        for item in observations:
            if not isinstance(item, dict) or "date" not in item or "value" not in item:
                raise IngestionError("SCHEMA_DRIFT", "FRED JSON observation is missing date or value", retryable=False)
            obs_date = item["date"]
            try:
                date.fromisoformat(obs_date)
            except (TypeError, ValueError) as exc:
                raise IngestionError("SCHEMA_DRIFT", f"FRED returned invalid observation date: {obs_date!r}") from exc
            raw_value = item.get("value")
            missing = raw_value in (None, "", ".")
            value = None if missing else float(raw_value)
            rows.append({
                "dataset_id": dataset_id,
                "source_id": source["source_id"],
                "entity": {"symbol": dataset_id.split(":", 1)[1], "exchange": None, "cik": None},
                "observation_time": obs_date + "T00:00:00Z",
                "as_of_date": obs_date,
                "retrieved_at": iso_z(retrieved_at),
                "frequency": dataset["frequency"],
                "timezone": dataset["timezone"],
                "currency": dataset["currency"],
                "adjustment": dataset["adjustment"],
                "value": value,
                "unit": "percent",
                "vintage": {"realtime_start": None, "realtime_end": None},
                "raw_snapshot_id": snapshot_id,
                "quality_flags": ["missing_source_value"] if missing else [],
                "license_ref": source["license_ref"],
                "schema_version": SCHEMA_VERSION,
            })
    else:
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise IngestionError("SCHEMA_DRIFT", "FRED response is neither UTF-8 JSON nor CSV") from exc
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames or "observation_date" not in reader.fieldnames:
            raise IngestionError("SCHEMA_DRIFT", "FRED CSV must contain observation_date and a series value column")
        value_columns = [field for field in reader.fieldnames if field != "observation_date"]
        if len(value_columns) != 1:
            raise IngestionError("SCHEMA_DRIFT", "FRED CSV fixture must contain exactly one series value column")
        value_column = value_columns[0]
        for item in reader:
            obs_date = item.get("observation_date", "")
            try:
                date.fromisoformat(obs_date)
            except (TypeError, ValueError) as exc:
                raise IngestionError("SCHEMA_DRIFT", f"FRED CSV returned invalid observation date: {obs_date!r}") from exc
            raw_value = item.get(value_column)
            missing = raw_value in (None, "", ".")
            value = None if missing else float(raw_value)
            rows.append({
                "dataset_id": dataset_id,
                "source_id": source["source_id"],
                "entity": {"symbol": value_column, "exchange": None, "cik": None},
                "observation_time": obs_date + "T00:00:00Z",
                "as_of_date": obs_date,
                "retrieved_at": iso_z(retrieved_at),
                "frequency": dataset["frequency"],
                "timezone": dataset["timezone"],
                "currency": dataset["currency"],
                "adjustment": dataset["adjustment"],
                "value": value,
                "unit": "percent",
                "vintage": {"realtime_start": None, "realtime_end": None},
                "raw_snapshot_id": snapshot_id,
                "quality_flags": ["missing_source_value"] if missing else [],
                "license_ref": source["license_ref"],
                "schema_version": SCHEMA_VERSION,
            })
    if not rows:
        raise IngestionError("NO_OBSERVATIONS", "FRED returned no observations; no values were synthesized")
    rows.sort(key=lambda row: row["observation_time"])
    for previous, current in zip(rows, rows[1:]):
        if current["observation_time"] <= previous["observation_time"]:
            current["quality_flags"].append("non_monotonic_time")
    missing_count = sum(row["value"] is None for row in rows)
    quality_status = "partial" if missing_count else "fresh"
    quality_flags = ["partial"] if missing_count else []
    as_of = rows[-1]["as_of_date"]
    provenance = {
        "source_id": source["source_id"],
        "official_url": source["official_url"],
        "retrieved_at": iso_z(retrieved_at),
        "as_of": as_of,
        "timezone": dataset["timezone"],
        "currency": dataset["currency"],
        "frequency": dataset["frequency"],
        "adjustment": dataset["adjustment"],
        "vintage": {"realtime_start": None, "realtime_end": None},
        "snapshot_id": snapshot_id,
        "raw_url": safe_url if safe_url.startswith("https://") else None,
        "parser_version": PARSER_VERSION,
        "schema_version": SCHEMA_VERSION,
        "license_ref": source["license_ref"],
        "quality_status": quality_status,
        "warnings": ["One or more source values were missing and preserved as null."] if missing_count else [],
    }
    envelope = {
        "status": "partial" if missing_count else "ok",
        "data": {"dataset_id": dataset_id, "rows": rows, "row_count": len(rows), "missing_count": missing_count, "quality_flags": quality_flags},
        "provenance": provenance,
        "warnings": provenance["warnings"],
        "errors": [],
        "schema_version": SCHEMA_VERSION,
    }
    return envelope, rows


def error_envelope(error: IngestionError, source: dict | None, dataset: dict | None, safe_url: str, retrieved_at: datetime, raw: bytes = b"") -> dict:
    source_id = source.get("source_id") if source else "unknown"
    official_url = source.get("official_url") if source else "https://gugopro.com/research"
    dataset_id = dataset.get("dataset_id") if dataset else "unknown"
    provenance = {
        "source_id": source_id,
        "official_url": official_url,
        "retrieved_at": iso_z(retrieved_at),
        "as_of": retrieved_at.date().isoformat(),
        "timezone": dataset.get("timezone", "UTC") if dataset else "UTC",
        "currency": dataset.get("currency") if dataset else None,
        "frequency": dataset.get("frequency") if dataset else None,
        "adjustment": dataset.get("adjustment", "not_applicable") if dataset else "not_applicable",
        "vintage": None,
        "snapshot_id": sha256_bytes(raw or error.code.encode("utf-8")),
        "raw_url": safe_url if safe_url.startswith("https://") else None,
        "parser_version": PARSER_VERSION,
        "schema_version": SCHEMA_VERSION,
        "license_ref": source.get("license_ref", "unknown") if source else "unknown",
        "quality_status": "unavailable",
        "warnings": ["No data value was synthesized after the ingestion failure."],
    }
    return {
        "status": "error",
        "data": None,
        "provenance": provenance,
        "warnings": provenance["warnings"],
        "errors": [{"code": error.code, "message": str(error), "retryable": error.retryable}],
        "schema_version": SCHEMA_VERSION,
    }


def write_output(envelope: dict, output: Path | None) -> None:
    encoded = json.dumps(envelope, ensure_ascii=False, indent=2) + "\n"
    if output is not None:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(encoded, encoding="utf-8")
    print(json.dumps({"status": envelope["status"], "dataset_id": envelope["data"].get("dataset_id") if isinstance(envelope.get("data"), dict) else None, "row_count": envelope["data"].get("row_count", 0) if isinstance(envelope.get("data"), dict) else 0, "quality_status": envelope["provenance"].get("quality_status"), "errors": envelope.get("errors", [])}, ensure_ascii=False))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", default="fred:DGS10", help="Registered dataset_id")
    parser.add_argument("--start", type=validate_date_arg, help="ISO observation start date")
    parser.add_argument("--end", type=validate_date_arg, help="ISO observation end date")
    parser.add_argument("--raw-file", type=Path, help="Saved official FRED JSON/CSV fixture; avoids network and credentials")
    parser.add_argument("--output", type=Path, help="Output envelope JSON; defaults to research/snapshots/<dataset>-<timestamp>.json")
    parser.add_argument("--attempts", type=int, default=3)
    parser.add_argument("--timeout", type=int, default=15)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    retrieved_at = utc_now()
    source = dataset = None
    safe_url = "https://api.stlouisfed.org/fred/series/observations"
    raw = b""
    try:
        registry, catalog = load_catalog()
        source, dataset = dataset_record(args.dataset, registry, catalog)
        series_id = args.dataset.split(":", 1)[1]
        if args.raw_file:
            raw, safe_url = read_raw_file(args.raw_file)
        else:
            raw, safe_url = fetch_fred_json(series_id, args.start, args.end, args.attempts, args.timeout)
        snapshot_id = sha256_bytes(raw)
        write_raw_snapshot(raw, snapshot_id, safe_url, retrieved_at, args.dataset)
        envelope, _ = parse_fred_payload(raw, args.dataset, source, dataset, safe_url, retrieved_at)
        output = args.output or (DEFAULT_OUTPUT_DIR / f"{args.dataset.replace(':', '-')}-{retrieved_at.strftime('%Y%m%dT%H%M%SZ')}.json")
        write_output(envelope, output)
        return 0
    except IngestionError as exc:
        envelope = error_envelope(exc, source, dataset, safe_url, retrieved_at, raw)
        output = args.output
        if output is not None:
            write_output(envelope, output)
        else:
            print(json.dumps(envelope, ensure_ascii=False, indent=2))
        return 2
    except Exception as exc:  # Keep an unexpected parser error visible and fail closed.
        error = IngestionError("UNEXPECTED_INGESTION_ERROR", f"Unexpected ingestion error: {exc}")
        envelope = error_envelope(error, source, dataset, safe_url, retrieved_at, raw)
        if args.output:
            write_output(envelope, args.output)
        else:
            print(json.dumps(envelope, ensure_ascii=False, indent=2))
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
