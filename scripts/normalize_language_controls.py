from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
AI_RE = re.compile(r"/tools/ai(?:/|-)|/tools/ai-media/", re.I)
SCRIPT_RE = re.compile(r"\s*<script\b[^>]*src=[\"'][^\"']*static-locale-runtime[^\"']*[\"'][^>]*>\s*</script>", re.I)
LINK_RE = re.compile(r"\s*<a\b(?=[^>]*\bclass=[\"'][^\"']*\bconverter-language-link\b[^\"']*[\"'])[^>]*>.*?</a>", re.I | re.S)
DIV_TOKEN_RE = re.compile(r"<(?P<close>/)?div\b[^>]*>", re.I)
CLASS_RE = re.compile(r"\bclass\s*=\s*([\"'])(?P<value>.*?)\1", re.I | re.S)


def has_class(tag: str, name: str) -> bool:
    match = CLASS_RE.search(tag)
    return bool(match and name in match.group("value").split())


def remove_class_divs(source: str, class_name: str) -> tuple[str, int]:
    removed = 0
    cursor = 0
    output = []
    open_re = re.compile(r"<div\b[^>]*>", re.I)
    while True:
        match = open_re.search(source, cursor)
        if not match:
            output.append(source[cursor:])
            break
        output.append(source[cursor:match.start()])
        if not has_class(match.group(0), class_name):
            output.append(match.group(0))
            cursor = match.end()
            continue
        depth = 1
        end = match.end()
        for token in DIV_TOKEN_RE.finditer(source, end):
            if token.group("close"):
                depth -= 1
            else:
                depth += 1
            if depth == 0:
                end = token.end()
                break
        else:
            output.append(match.group(0))
            cursor = match.end()
            continue
        removed += 1
        cursor = end
    return "".join(output), removed


changed = 0
links = 0
legacy = 0
runtimes = 0
for path in sorted(ROOT.rglob("*.html")):
    if ".git" in path.parts or AI_RE.search("/" + path.as_posix()):
        continue
    source = path.read_text(encoding="utf-8", errors="ignore")
    updated = SCRIPT_RE.sub("", source)
    updated, link_count = LINK_RE.subn("", updated)
    updated, legacy_count = remove_class_divs(updated, "lang-selector")
    if updated != source:
        path.write_text(updated, encoding="utf-8")
        changed += 1
    links += link_count
    legacy += legacy_count
    runtimes += len(SCRIPT_RE.findall(source))

print(f"changed HTML pages: {changed}")
print(f"removed standalone language links: {links}")
print(f"removed legacy language-selector hosts: {legacy}")
print(f"removed static locale runtime tags: {runtimes}")
