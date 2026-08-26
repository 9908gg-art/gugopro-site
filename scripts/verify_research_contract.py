#!/usr/bin/env python3
"""Validate the Phase 0/1 public research data contract.

The validator intentionally uses only the Python standard library so the same
checks run in a clean CI environment and on the static-site repository.
It validates a useful JSON-Schema subset plus research-specific invariants.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SCHEMAS = ROOT / "research" / "schemas"
FAILURES: list[str] = []
SEMVER = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
HEX64 = re.compile(r"^[a-f0-9]{64}$")
SECRET_KEY = re.compile(r"(?i)(api[_-]?key|access[_-]?token|secret|password|private[_-]?key|pat)")


def fail(message: str) -> None:
    FAILURES.append(message)


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"missing JSON: {path.relative_to(ROOT)}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON {path.relative_to(ROOT)}: {exc}")
    return None


def check_format(value, fmt: str) -> bool:
    if not isinstance(value, str):
        return False
    try:
        if fmt == "date":
            date.fromisoformat(value)
            return True
        if fmt == "date-time":
            datetime.fromisoformat(value.replace("Z", "+00:00"))
            return True
        if fmt == "uri":
            parsed = urlparse(value)
            return bool(parsed.scheme and parsed.netloc)
    except ValueError:
        return False
    return True


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


def schema_for_ref(ref: str):
    path = SCHEMAS / Path(ref).name
    return load_json(path)


def validate_schema(value, schema, path: str = "$", root_schema=None) -> None:
    if not isinstance(schema, dict):
        fail(f"{path}: schema is not an object")
        return
    if "$ref" in schema:
        referenced = schema_for_ref(schema["$ref"])
        if referenced is None:
            return
        validate_schema(value, referenced, path, referenced)
        return
    if "type" in schema and not type_matches(value, schema["type"]):
        fail(f"{path}: expected {schema['type']}, got {type(value).__name__}")
        return
    if "enum" in schema and value not in schema["enum"]:
        fail(f"{path}: value {value!r} is not in enum")
    if "const" in schema and value != schema["const"]:
        fail(f"{path}: value does not equal const")
    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            fail(f"{path}: string shorter than minLength")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            fail(f"{path}: string does not match pattern")
        if "format" in schema and not check_format(value, schema["format"]):
            fail(f"{path}: invalid {schema['format']} value")
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            fail(f"{path}: fewer than minItems")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            fail(f"{path}: more than maxItems")
        if "items" in schema:
            for index, item in enumerate(value):
                validate_schema(item, schema["items"], f"{path}[{index}]")
    if isinstance(value, dict):
        required = schema.get("required", [])
        for key in required:
            if key not in value:
                fail(f"{path}: missing required property {key!r}")
        properties = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for key in value:
                if key not in properties:
                    fail(f"{path}: unexpected property {key!r}")
        for key, child_schema in properties.items():
            if key in value:
                validate_schema(value[key], child_schema, f"{path}.{key}")
    for condition in schema.get("allOf", []):
        if_clause = condition.get("if", {})
        if_props = if_clause.get("properties", {})
        applies = all(
            key in value and isinstance(value, dict) and isinstance(rule, dict) and value[key] == rule.get("const")
            for key, rule in if_props.items()
        )
        if applies:
            validate_schema(value, condition.get("then", {}), path)


def scan_for_secret_like_keys(value, path: str = "$", allowlist: set[str] | None = None) -> None:
    allowlist = allowlist or set()
    if isinstance(value, dict):
        for key, child in value.items():
            if SECRET_KEY.search(key) and key not in allowlist:
                # Metadata may declare that a source requires a key, but must not carry its value.
                if key in {"requires_api_key", "api_key_required", "secret_policy"}:
                    pass
                elif isinstance(child, str) and child:
                    fail(f"{path}.{key}: secret-like value is present")
            scan_for_secret_like_keys(child, f"{path}.{key}", allowlist)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            scan_for_secret_like_keys(child, f"{path}[{index}]", allowlist)


def validate_registry(registry):
    if not isinstance(registry, dict):
        fail("source registry is not an object")
        return
    if not SEMVER.fullmatch(str(registry.get("registry_version", ""))):
        fail("source registry has invalid registry_version")
    policy = registry.get("policy", {})
    if policy.get("allow_browser_direct_requests") is not False:
        fail("source registry policy must disable browser direct requests")
    if "failure_policy" not in policy or "stale" not in policy["failure_policy"] or "error" not in policy["failure_policy"]:
        fail("source registry failure_policy must mention stale and error")
    sources = registry.get("sources", [])
    if not isinstance(sources, list) or not sources:
        fail("source registry must contain sources")
        return
    ids: set[str] = set()
    for index, source in enumerate(sources):
        prefix = f"source[{index}]"
        if not isinstance(source, dict):
            fail(f"{prefix} is not an object")
            continue
        source_id = source.get("source_id")
        if source_id in ids:
            fail(f"duplicate source_id: {source_id}")
        ids.add(source_id)
        for required in ("source_id", "official_url", "data_classes", "coverage", "frequencies", "adjustments", "timezone", "currency", "license_ref", "requires_api_key", "browser_direct_allowed", "freshness_sla", "rate_limit_policy", "error_codes", "owner", "enabled"):
            if required not in source:
                fail(f"{prefix} missing {required}")
        if not str(source.get("official_url", "")).startswith("https://"):
            fail(f"{prefix} official_url must be HTTPS")
        if source.get("requires_api_key") and source.get("browser_direct_allowed"):
            fail(f"{prefix} cannot require a key and allow browser direct requests")
        if source.get("browser_direct_allowed"):
            fail(f"{prefix} must not allow browser direct requests in Phase 0/1")
    return ids


def validate_catalog(catalog, source_ids: set[str]):
    if not isinstance(catalog, dict):
        fail("dataset catalog is not an object")
        return
    if not SEMVER.fullmatch(str(catalog.get("catalog_version", ""))):
        fail("dataset catalog has invalid catalog_version")
    datasets = catalog.get("datasets", [])
    if not isinstance(datasets, list) or not datasets:
        fail("dataset catalog must contain datasets")
        return
    ids: set[str] = set()
    for index, dataset in enumerate(datasets):
        prefix = f"dataset[{index}]"
        if not isinstance(dataset, dict):
            fail(f"{prefix} is not an object")
            continue
        dataset_id = dataset.get("dataset_id")
        if dataset_id in ids:
            fail(f"duplicate dataset_id: {dataset_id}")
        ids.add(dataset_id)
        if dataset.get("source_id") not in source_ids:
            fail(f"{prefix} references unknown source_id")
        if not str(dataset.get("official_url", "")).startswith("https://"):
            fail(f"{prefix} official_url must be HTTPS")
        if dataset.get("quality_status") not in {"fresh", "partial", "stale", "invalid", "unavailable"}:
            fail(f"{prefix} has invalid quality_status")
        if dataset.get("browser_direct_allowed") is not False:
            fail(f"{prefix} must not allow browser direct requests")
    return ids


def validate_observation_fixtures():
    schema = load_json(SCHEMAS / "observation.schema.json")
    if schema is None:
        return
    fixtures = sorted((ROOT / "research" / "fixtures").glob("observation*.json"))
    if not fixtures:
        fail("no observation fixture found")
        return
    for fixture in fixtures:
        value = load_json(fixture)
        before = len(FAILURES)
        validate_schema(value, schema, fixture.name)
        if len(FAILURES) > before:
            continue
        if isinstance(value, dict):
            if value.get("value") is None and "missing_source_value" not in value.get("quality_flags", []):
                fail(f"{fixture.name}: null value requires missing_source_value quality flag")
            if value.get("value") is not None and "missing_source_value" in value.get("quality_flags", []):
                fail(f"{fixture.name}: numeric value cannot carry missing_source_value")
            if not str(value.get("raw_snapshot_id", "")).startswith("sha256:"):
                fail(f"{fixture.name}: invalid raw_snapshot_id")


def validate_response_fixtures():
    schema = load_json(SCHEMAS / "response-envelope.schema.json")
    if schema is None:
        return
    fixtures = sorted((ROOT / "research" / "fixtures").glob("response*.json"))
    if not fixtures:
        fail("no response envelope fixture found")
        return
    for fixture in fixtures:
        value = load_json(fixture)
        before = len(FAILURES)
        validate_schema(value, schema, fixture.name)
        if len(FAILURES) > before:
            continue
        status = value.get("status") if isinstance(value, dict) else None
        errors = value.get("errors", []) if isinstance(value, dict) else []
        if status == "error" and not errors:
            fail(f"{fixture.name}: error envelope requires errors")
        if status != "error" and errors:
            fail(f"{fixture.name}: non-error envelope cannot carry errors")
        provenance = value.get("provenance", {}) if isinstance(value, dict) else {}
        if provenance.get("quality_status") == "stale" and status == "ok":
            fail(f"{fixture.name}: stale provenance cannot be returned as ok")


def validate_public_files_for_secrets():
    targets = [ROOT / "academy", ROOT / "research", ROOT / "data"]
    for base in targets:
        for path in base.rglob("*"):
            if not path.is_file() or path.suffix not in {".html", ".js", ".json"}:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            if re.search(r"(?i)(ghp_|github_pat_|sk-[a-z0-9]{12,}|AIza[0-9A-Za-z_-]{20,})", text):
                fail(f"possible credential pattern in {path.relative_to(ROOT)}")
            if "gugopro_gemini_api_key" in text or "requireGugoproGeminiApiKey" in text:
                fail(f"legacy AI key surface in {path.relative_to(ROOT)}")


def main() -> int:
    registry = load_json(ROOT / "research" / "source-registry.json")
    if registry is not None:
        registry_schema = load_json(SCHEMAS / "source-registry.schema.json")
        if registry_schema is not None:
            validate_schema(registry, registry_schema, "source-registry")
    source_ids = validate_registry(registry) if registry is not None else set()
    catalog = load_json(ROOT / "research" / "datasets" / "catalog.json")
    if catalog is not None:
        catalog_schema = load_json(SCHEMAS / "dataset-catalog.schema.json")
        if catalog_schema is not None:
            validate_schema(catalog, catalog_schema, "dataset-catalog")
        validate_catalog(catalog, source_ids or set())
    validate_observation_fixtures()
    validate_response_fixtures()
    validate_public_files_for_secrets()
    if FAILURES:
        print("research contract: FAIL")
        for item in FAILURES:
            print(f"- {item}")
        return 1
    print("research contract: PASS")
    print(f"sources={len(registry.get('sources', [])) if isinstance(registry, dict) else 0}")
    print(f"datasets={len(catalog.get('datasets', [])) if isinstance(catalog, dict) else 0}")
    print("observation_fixtures=ok")
    print("response_fixtures=ok")
    print("secret_scan=ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
