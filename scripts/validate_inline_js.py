from pathlib import Path
from bs4 import BeautifulSoup
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
checked = 0
failures = []
for html in sorted(ROOT.rglob("*.html")):
    if ".git" in html.parts:
        continue
    soup = BeautifulSoup(html.read_text(encoding="utf-8", errors="ignore"), "html.parser")
    for index, script in enumerate(soup.find_all("script")):
        script_type = script.get("type", "").lower()
        executable_types = {"", "text/javascript", "application/javascript", "application/ecmascript", "text/ecmascript", "module"}
        if script.get("src") or script_type not in executable_types:
            continue
        code = script.string or script.get_text()
        if not code.strip():
            continue
        checked += 1
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as handle:
            handle.write(code)
            temp = handle.name
        result = subprocess.run(["node", "--check", temp], capture_output=True, text=True)
        Path(temp).unlink(missing_ok=True)
        if result.returncode:
            failures.append((html.relative_to(ROOT), index, result.stderr.strip().splitlines()[-1] if result.stderr.strip() else "unknown syntax error"))

runtime = ROOT / "i18n" / "gugopro-i18n.js"
result = subprocess.run(["node", "--check", str(runtime)], capture_output=True, text=True)
if result.returncode:
    failures.append((runtime.relative_to(ROOT), -1, result.stderr.strip().splitlines()[-1] if result.stderr.strip() else "runtime syntax error"))

print(f"inline scripts checked: {checked}")
print(f"syntax failures: {len(failures)}")
for path, index, message in failures[:25]:
    print(f"FAIL {path} script={index}: {message}")
raise SystemExit(1 if failures else 0)
