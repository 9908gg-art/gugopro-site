from pathlib import Path
from bs4 import BeautifulSoup
import re

ROOT = Path(__file__).resolve().parents[1]
AI_RE = re.compile(r"/tools/ai(?:/|-)|/tools/ai-media/|/tools/health/(?:tdee-macros-calculator|weight-loss-planner)(?:\.html)?", re.I)
BASELINE = {"zh-TW", "en", "ja"}
LANG_RE = re.compile(r"(?:lang|locale|language)", re.I)
NORMALIZE = {
    "en-US": "en", "en-GB": "en", "ja-JP": "ja", "ko-KR": "ko",
    "zh-CN": "zh-CN", "zh-TW": "zh-TW", "fr-FR": "fr", "de-DE": "de",
    "es-ES": "es", "pt-BR": "pt",
}

def normalize(value: str) -> str:
    return NORMALIZE.get(value, value)

def is_ai(path: Path) -> bool:
    return bool(AI_RE.search("/" + path.as_posix()))

def control_values(node) -> list[str]:
    values = []
    for option in node.find_all("option"):
        value = option.get("value") or option.get_text(" ", strip=True)
        if value and value not in values:
            values.append(value)
    return values

def fmt(values: list[str]) -> str:
    return ", ".join(values) if values else "—"

def audit(path: Path) -> dict:
    source = path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(source, "html.parser")
    interface_values = []
    functional_values = []
    controls = []
    for select in soup.find_all("select"):
        sid = select.get("id", "")
        classes = " ".join(select.get("class", []))
        values = control_values(select)
        if not LANG_RE.search(sid + " " + classes):
            continue
        kind = "interface" if re.search(r"interface|ui[-_]?lang|locale-select", sid + " " + classes, re.I) else "functional"
        target = interface_values if kind == "interface" else functional_values
        for value in values:
            value = normalize(value)
            if value not in target:
                target.append(value)
        controls.append(f"{kind}:{sid or classes or 'select'}={','.join(values) or 'dynamic'}")
    if re.search(r"btn-lang-toggle", source):
        if not any(item.startswith("functional:") for item in controls):
            controls.append("functional:btn-lang-toggle")
    dynamic_locale_values = []
    for value in re.findall(r"['\"]((?:zh-(?:TW|CN)|en(?:-US)?|ja(?:-JP)?|ko(?:-KR)?|de|fr|es|pt)(?:-[A-Z]{2})?)['\"]", source):
        value = normalize(value)
        if value not in dynamic_locale_values:
            dynamic_locale_values.append(value)
    if dynamic_locale_values:
        for value in dynamic_locale_values:
            if value not in interface_values and any(x in value for x in ("zh", "en", "ja", "de", "fr", "es", "pt")):
                # Dynamic values are catalog evidence; keep them in the interface column only when an interface selector exists.
                if interface_values and value not in interface_values:
                    interface_values.append(value)
    supported_match = re.search(r"SUPPORTED_LOCALES\s*=\s*\[([^\]]+)\]", source)
    if not interface_values and supported_match and re.search(r"locale-select|interface-lang|ui-lang-toggle", source, re.I):
        for value in re.findall(r"['\"]([^'\"]+)['\"]", supported_match.group(1)):
            value = normalize(value)
            if value not in interface_values:
                interface_values.append(value)
    missing = sorted(BASELINE - set(interface_values)) if interface_values else []
    if interface_values:
        status = "catalog declared"
    elif functional_values:
        status = "functional language controls only; UI locale catalog not declared"
    else:
        status = "no language selector/catalog detected"
    return {
        "page": str(path.relative_to(ROOT)),
        "interface": fmt(interface_values),
        "functional": fmt(functional_values),
        "missing": fmt(missing),
        "status": status,
        "controls": "; ".join(controls) or "—",
    }

rows = [audit(path) for path in sorted(ROOT.rglob("*.html")) if ".git" not in path.parts and is_ai(path)]
out = ROOT / "docs" / "ai-language-audit.md"
with out.open("w", encoding="utf-8") as fh:
    fh.write("# AI tool language audit\n\n")
    fh.write("This inventory is generated from the current HTML source. **Interface locales** are the languages an AI tool declares for its UI selector; **functional locales** are tool settings such as speech pair, translation target, lookup, or study language. `Missing from baseline` compares a declared UI catalog with the site baseline of Traditional Chinese (`zh-TW`), English (`en`), and Japanese (`ja`); it does not claim that a tool must support languages it does not advertise.\n\n")
    fh.write(f"- AI HTML pages audited: **{len(rows)}**\n")
    fh.write("- AI pages with a declared UI catalog: **%d**\n" % sum(bool(r["interface"] != "—") for r in rows))
    fh.write("- AI pages with only functional language controls or no UI catalog: **%d**\n\n" % sum(bool(r["interface"] == "—") for r in rows))
    fh.write("## Tool matrix\n\n")
    fh.write("| AI tool page | Interface locales | Functional locales | Missing from baseline UI catalog | Status |\n|---|---|---|---|---|\n")
    for row in rows:
        fh.write("| {page} | {interface} | {functional} | {missing} | {status} |\n".format(**row))
    fh.write("\n## Control details\n\n")
    fh.write("| AI tool page | Declared controls |\n|---|---|\n")
    for row in rows:
        fh.write("| {page} | `{controls}` |\n".format(**row))

print(f"AI pages audited: {len(rows)}")
print(f"UI catalogs declared: {sum(bool(r['interface'] != '—') for r in rows)}")
print(f"wrote {out}")
