#!/usr/bin/env python3
"""Build route-scoped dictionaries for the shared three-locale i18n runtime."""
from __future__ import annotations

import json
import re
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from urllib.parse import quote

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "i18n" / "page-maps"
LOCALES = ("en", "ja")
AI_ROUTE = re.compile(
    r"(^|/)tools/ai(?:/|-)|(^|/)tools/ai-media/|"
    r"(^|/)tools/health/(?:tdee-macros-calculator|weight-loss-planner)(?:\.html)?$",
    re.I,
)


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def norm(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


def route_path(page: Path) -> str:
    rel = page.relative_to(ROOT).as_posix()
    if page.name.lower() in ("index.html", "index.htm"):
        parent = page.parent.relative_to(ROOT).as_posix()
        return "/" if parent == "." else "/" + parent.strip("/") + "/"
    return "/" + rel


def route_key(path: str) -> str:
    path = path.split("?", 1)[0].split("#", 1)[0]
    path = re.sub(r"/index\.html?$", "/", path, flags=re.I)
    path = re.sub(r"\.html?$", "", path, flags=re.I)
    parts = [part for part in path.strip("/").split("/") if part]
    return "__".join(quote(part, safe="-_.~!*'()") for part in parts) or "index"


def local_script_text(page: Path, html: str) -> str:
    chunks = [html]
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.find_all("script", src=True):
        src = tag.get("src", "").split("?", 1)[0].split("#", 1)[0]
        if not src or src.startswith(("//", "http:", "https:", "data:")):
            continue
        candidate = (ROOT / src.lstrip("/")) if src.startswith("/") else (page.parent / src)
        try:
            candidate = candidate.resolve()
            if candidate.is_file() and ROOT in candidate.parents:
                chunks.append(candidate.read_text(encoding="utf-8", errors="ignore"))
        except OSError:
            continue
    return "\n".join(chunks)


def main() -> None:
    catalog = read_json(ROOT / "i18n" / "catalog.json")
    rows = catalog.get("strings", catalog.get("sourceStrings", []))
    locale_maps = {
        locale: read_json(ROOT / "i18n" / f"{locale}.json").get("translations", {})
        for locale in LOCALES
    }
    nonai = read_json(ROOT / "i18n" / "nonai-visible-translations.json")
    phrases = read_json(ROOT / "i18n" / "phrases.json").get("phrases", {})
    legal = read_json(ROOT / "i18n" / "legal-page-translations.json").get("translations", {})
    dynamic = {
        locale: read_json(ROOT / "i18n" / f"{locale}.dynamic.json").get("templates", {})
        for locale in LOCALES
    }
    overrides = read_json(ROOT / "i18n" / "page-overrides.json").get("translations", {}) if (ROOT / "i18n" / "page-overrides.json").exists() else {}

    pages = []
    for page in ROOT.rglob("*.html"):
        if ".git" in page.parts:
            continue
        try:
            html = page.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if "gugopro-i18n.js" not in html:
            continue
        rel = page.relative_to(ROOT).as_posix()
        if AI_ROUTE.search(rel):
            continue
        path = route_path(page)
        key = route_key(path)
        material = local_script_text(page, html)
        soup = BeautifulSoup(html, "html.parser")
        visible = set()
        for text in soup.stripped_strings:
            if norm(text):
                visible.add(norm(text))
        for tag in soup.find_all(True):
            for attr in ("placeholder", "title", "aria-label", "alt", "data-label", "content"):
                if tag.has_attr(attr) and norm(tag.get(attr)):
                    visible.add(norm(tag.get(attr)))
        pages.append((rel, path, key, material, visible))

    keys = [item[2] for item in pages]
    if len(keys) != len(set(keys)):
        duplicates = sorted({key for key in keys if keys.count(key) > 1})
        raise SystemExit(f"route-key collision: {duplicates}")

    OUT.mkdir(parents=True, exist_ok=True)
    generated = []
    total_bytes = 0
    for rel, path, key, material, visible in pages:
        locale_data = {}
        for locale in LOCALES:
            strings: dict[str, str] = {}
            page_rows = []
            for row in rows:
                source = norm(row.get("text", ""))
                if not source:
                    continue
                refs = {norm(ref).strip("/") for ref in row.get("pages", []) if isinstance(ref, str)}
                page_refs = {norm(rel).strip("/"), norm(path).strip("/")}
                if refs & page_refs or source in visible or source in material:
                    page_rows.append(row)
                    target = locale_maps[locale].get(str(row.get("id")), source)
                    if target and target != source:
                        strings[source] = target

            for source, target in nonai.get(locale, {}).items():
                source_key = norm(source)
                if source_key and (source_key in material or source_key in visible):
                    strings[source_key] = target
            for source, by_locale in phrases.items():
                source_key = norm(source)
                target = by_locale.get(locale)
                if source_key and target and target != source_key and (source_key in material or source_key in visible):
                    strings[source_key] = target
            for source, target in legal.get(locale, {}).items():
                source_key = norm(source)
                if source_key and (source_key in material or source_key in visible):
                    strings[source_key] = target
            for source, target in overrides.get(locale, {}).items():
                source_key = norm(source)
                if source_key and source_key in visible:
                    strings[source_key] = target

            dynamic_rows = []
            for row in page_rows:
                target = dynamic[locale].get(str(row.get("id")))
                source = str(row.get("text", ""))
                if target and source:
                    dynamic_rows.append({"source": source, "target": target})
            locale_data[locale] = {"strings": strings, "dynamic": dynamic_rows}

        bundle = {"version": 1, "route": path, "source": "zh-TW", "locales": locale_data}
        payload = json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + "\n"
        dest = OUT / f"{key}.json"
        dest.write_text(payload, encoding="utf-8")
        size = len(payload.encode("utf-8"))
        total_bytes += size
        generated.append({"route": path, "source": rel, "file": dest.relative_to(ROOT).as_posix(), "bytes": size,
                          "en_keys": len(locale_data["en"]["strings"]), "ja_keys": len(locale_data["ja"]["strings"])})

    manifest = {"version": 1, "source": "zh-TW", "locales": list(LOCALES), "pageCount": len(generated),
                "totalBytes": total_bytes, "routes": generated}
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"pageCount": len(generated), "totalBytes": total_bytes,
                      "meanBytes": round(total_bytes / max(1, len(generated))),
                      "largest": sorted(generated, key=lambda item: item["bytes"], reverse=True)[:10],
                      "output": str(OUT)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
