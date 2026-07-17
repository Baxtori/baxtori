from pathlib import Path

path = Path(".github/patches/repository-modes/apply.py")
text = path.read_text()
old = '''from pathlib import Path


def replace_once(path: str, before: str, after: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(before)
    if count != 1:
        raise SystemExit(f"Expected one match in {path}, found {count}: {before[:80]!r}")
    file.write_text(text.replace(before, after, 1))
'''
new = '''from pathlib import Path
import re


def flexible_pattern(value: str) -> str:
    lines = value.split("\\n")
    pattern = "\\n".join(
        (r"[ \\t]*" if line[:1] in " \\t" else "") + re.escape(line.lstrip(" \\t"))
        for line in lines
    )
    return pattern


def replace_once(path: str, before: str, after: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(before)
    if count == 1:
        file.write_text(text.replace(before, after, 1))
        return
    if count > 1:
        raise SystemExit(f"Expected one match in {path}, found {count}: {before[:80]!r}")
    matches = list(re.finditer(flexible_pattern(before), text, re.MULTILINE))
    if len(matches) != 1:
        raise SystemExit(f"Expected one flexible match in {path}, found {len(matches)}: {before[:80]!r}")
    match = matches[0]
    file.write_text(text[:match.start()] + after + text[match.end():])
'''
if old not in text:
    raise SystemExit("Could not replace the repository mode patch helper")
path.write_text(text.replace(old, new, 1))
