#!/usr/bin/env python3
"""Regenerate sitemap.xml from the HTML files in this repo.

The sitemap lists only pages that are actually published. A post is published
when it has no `<meta name="robots" content="noindex">` -- the same signal that
gates it from the blog index -- so publishing a post is:

    1. delete its robots noindex meta
    2. link it from blog/index.html
    3. run this script

Run from anywhere:  python tools/generate-sitemap.py

Note for whoever edits this next: an earlier generator lived outside version
control and ran replace(" ", "") over its output, which collapsed
`<urlset xmlns=` into `<urlsetxmlns=` and made the whole file invalid XML --
crawlers reject the file entirely, they don't skip the bad line. Nothing here
rewrites whitespace, and check_wellformed() below will catch it if that ever
creeps back in.
"""

import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from datetime import date

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://getphonepact.com"

# Everything not listed here is 0.8.
PRIORITY = {
    "/": "1.0",
    "/what-is-phonepact": "0.9",
    "/adhd-screens": "0.9",
    "/beyond-blockers": "0.9",
    "/blog/": "0.9",
    "/family-phone-peace": "0.9",
    "/privacy": "0.3",
    "/terms": "0.3",
}

NOINDEX = re.compile(
    r"""<meta\s[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex""",
    re.IGNORECASE,
)


def url_for(relpath):
    """index.html -> /, blog/index.html -> /blog/, foo.html -> /foo (extensionless)."""
    parts = relpath.replace(os.sep, "/")
    if parts == "index.html":
        return "/"
    if parts.endswith("/index.html"):
        return "/" + parts[: -len("index.html")]
    return "/" + parts[: -len(".html")]


def lastmod(relpath):
    """Last commit date for the file, falling back to mtime for new files."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", relpath],
            cwd=REPO, capture_output=True, text=True, check=True,
        ).stdout.strip()
        if out:
            return out
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    return date.fromtimestamp(os.path.getmtime(os.path.join(REPO, relpath))).isoformat()


def html_files():
    for root, dirs, files in os.walk(REPO):
        dirs[:] = [d for d in dirs if d not in (".git", "tools", "assets")]
        for name in sorted(files):
            if name.endswith(".html"):
                yield os.path.relpath(os.path.join(root, name), REPO)


def check_wellformed(path):
    ET.parse(path)


def main():
    published, skipped = [], []
    for relpath in html_files():
        with open(os.path.join(REPO, relpath), encoding="utf-8", errors="ignore") as fh:
            if NOINDEX.search(fh.read()):
                skipped.append(relpath)
                continue
        url = url_for(relpath)
        published.append((PRIORITY.get(url, "0.8"), url, lastmod(relpath)))

    published.sort(key=lambda row: (-float(row[0]), row[1]))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for priority, url, mod in published:
        lines.append(
            f"  <url><loc>{BASE}{url}</loc><lastmod>{mod}</lastmod>"
            f"<priority>{priority}</priority></url>"
        )
    lines.append("</urlset>")

    out = os.path.join(REPO, "sitemap.xml")
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")

    check_wellformed(out)

    print(f"sitemap.xml: {len(published)} published URLs")
    print(f"skipped {len(skipped)} noindex page(s) -- they join the sitemap when published:")
    for relpath in skipped:
        print(f"  {relpath}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
