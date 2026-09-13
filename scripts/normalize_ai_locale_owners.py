from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
AI_HEALTH_NAMES = {"tdee-macros-calculator.html", "weight-loss-planner.html"}
SCRIPT_RE = re.compile(r"\s*<script\b[^>]*src=[\"'][^\"']*gugopro-i18n\.js[^\"']*[\"'][^>]*>\s*</script>", re.I)
BOOT_STYLE_RE = re.compile(r"\s*<style\s+id=[\"']gugo-i18n-boot-style[\"'][^>]*>.*?</style>", re.I | re.S)
BOOT_SCRIPT_RE = re.compile(r"\s*<script\s+id=[\"']gugo-i18n-boot[\"'][^>]*>.*?</script>", re.I | re.S)

changed = 0
for path in sorted(ROOT.rglob("*.html")):
    if path.name not in AI_HEALTH_NAMES or "tools" not in path.parts or "health" not in path.parts:
        continue
    source = path.read_text(encoding="utf-8", errors="ignore")
    updated = BOOT_SCRIPT_RE.sub("", BOOT_STYLE_RE.sub("", SCRIPT_RE.sub("", source)))
    if updated != source:
        path.write_text(updated, encoding="utf-8")
        changed += 1
print(f"AI health pages detached from generic runtime: {changed}")
