"""One-off repair for double-encoded UTF-8 (mojibake) in source files.

Uses ftfy.fix_encoding, which ONLY repairs encoding artefacts (e.g. "Ã¼" -> "ü",
"â€“" -> "–") and leaves already-correct text untouched. Run with --write to
apply; default is a dry run that lists affected files and sample changes.
"""
import sys
import os
from ftfy import fix_encoding

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCLUDE_DIRS = {".git", "node_modules", ".next", "dist", "build", "coverage",
                "playwright-report", "test-results", ".turbo", ".vercel"}
EXTS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".sql",
        ".md", ".css", ".html", ".txt", ".yml", ".yaml"}

write = "--write" in sys.argv
changed = []

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for name in filenames:
        ext = os.path.splitext(name)[1].lower()
        if ext not in EXTS:
            continue
        path = os.path.join(dirpath, name)
        try:
            with open(path, "rb") as f:
                raw = f.read()
            text = raw.decode("utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        fixed = fix_encoding(text)
        if fixed != text:
            rel = os.path.relpath(path, ROOT)
            # count differing lines
            diffs = [(i + 1, a, b) for i, (a, b) in enumerate(
                zip(text.splitlines(), fixed.splitlines())) if a != b]
            changed.append((rel, len(diffs)))
            if write:
                with open(path, "wb") as f:
                    f.write(fixed.encode("utf-8"))
            else:
                print(f"\n=== {rel}  ({len(diffs)} lines) ===")
                for ln, a, b in diffs[:3]:
                    print(f"  L{ln}- {a.strip()[:100]}")
                    print(f"  L{ln}+ {b.strip()[:100]}")

print("\n" + ("WROTE" if write else "WOULD FIX") + f" {len(changed)} files:")
for rel, n in sorted(changed):
    print(f"  {rel}  ({n} lines)")
