#!/usr/bin/env python3
"""Turn bundle.html (from artifacts-builder's bundle-artifact.sh) into
artifact.html, ready to hand to the Artifact tool's `file_path`.

The Artifact tool wraps published HTML in its own
<!doctype html>...<head>...</head><body> skeleton (with charset/viewport
meta), so this strips the equivalent tags Parcel/html-inline produced and
moves <title> + the Google Fonts links to the very front of the file —
the platform only scans the first 8KB for <title>, and Parcel puts it
after the ~48KB inlined stylesheet.

Run after `bash .agents/skills/artifacts-builder/scripts/bundle-artifact.sh`
from the repo root: `python3 scripts/prepare-artifact.py`
"""
import re

TITLE = "Task Tracker"
FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700'
    "&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap\" rel=\"stylesheet\">"
)


def main() -> None:
    content = open("bundle.html", encoding="utf-8").read()

    content = content.replace("<!DOCTYPE html><html lang=en>", "", 1)
    content = re.sub(r"<meta charset=UTF-8>", "", content, count=1)
    content = re.sub(
        r'<meta name=viewport content="width=device-width, initial-scale=1\.0">', "", content, count=1
    )
    content = content.replace("<body>", "", 1)
    content = content.replace(f"<title>{TITLE}</title>", "", 1)

    content = f"<title>{TITLE}</title>{FONTS}" + content

    open("artifact.html", "w", encoding="utf-8").write(content)
    print(f"wrote artifact.html ({len(content):,} bytes)")


if __name__ == "__main__":
    main()
