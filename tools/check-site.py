#!/usr/bin/env python3
"""Check static-site links, structured data, and source-truth regressions."""

import json
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


REPO = Path(__file__).resolve().parent.parent
EXTERNAL_SCHEMES = {"http", "https", "mailto", "tel", "sms", "data", "phonepact"}
PUBLIC_SKIP_PARTS = {"research", "share", ".git"}


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.references = []
        self.ids = set()
        self.json_ld = []
        self.forms = []
        self._json_chunks = None

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get("id"):
            self.ids.add(values["id"])
        if tag == "a" and values.get("name"):
            self.ids.add(values["name"])
        for attr in ("href", "src", "action"):
            if values.get(attr):
                self.references.append((tag, attr, values[attr]))
        if tag == "form":
            self.forms.append(values)
        if tag == "script" and values.get("type", "").lower() == "application/ld+json":
            self._json_chunks = []

    def handle_data(self, data):
        if self._json_chunks is not None:
            self._json_chunks.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self._json_chunks is not None:
            self.json_ld.append("".join(self._json_chunks))
            self._json_chunks = None


def page_files():
    return sorted(
        path for path in REPO.rglob("*.html")
        if ".git" not in path.parts
    )


def parse_pages():
    pages = {}
    for path in page_files():
        parser = PageParser()
        parser.feed(path.read_text(encoding="utf-8", errors="replace"))
        pages[path.resolve()] = parser
    return pages


def local_target(source, raw):
    if not raw or raw == "#" or raw.startswith("//"):
        return None
    parsed = urlsplit(raw)
    if parsed.scheme.lower() in EXTERNAL_SCHEMES:
        return None
    clean = unquote(parsed.path).replace("/", os.sep)
    if not clean:
        return source.resolve(), parsed.fragment
    if parsed.path.startswith("/"):
        target = REPO / clean.lstrip(os.sep)
    else:
        target = source.parent / clean
    return target.resolve(), parsed.fragment


def resolve_file(path):
    candidates = [path]
    if not path.suffix:
        candidates.extend([path.with_suffix(".html"), path / "index.html"])
    if path.is_dir():
        candidates.append(path / "index.html")
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    return None


def public_files(pattern):
    for path in REPO.rglob(pattern):
        relative = path.relative_to(REPO)
        if not any(part in PUBLIC_SKIP_PARTS for part in relative.parts):
            yield path


def main():
    failures = []
    pages = parse_pages()
    reference_count = 0

    for source, parser in pages.items():
        for index, payload in enumerate(parser.json_ld, start=1):
            try:
                json.loads(payload)
            except json.JSONDecodeError as error:
                failures.append(f"{source.relative_to(REPO)} JSON-LD #{index}: {error}")

        for _tag, _attr, raw in parser.references:
            local = local_target(source, raw)
            if local is None:
                continue
            reference_count += 1
            target_path, fragment = local
            resolved = resolve_file(target_path)
            if resolved is None:
                failures.append(f"{source.relative_to(REPO)} -> missing {raw}")
                continue
            if fragment and resolved.suffix.lower() == ".html":
                target_page = pages.get(resolved)
                if target_page is not None and fragment not in target_page.ids:
                    failures.append(
                        f"{source.relative_to(REPO)} -> missing fragment {raw}"
                    )

    app_js = (REPO / "app.js").read_text(encoding="utf-8")
    form_contracts = {
        "opaque form fallback": re.search(
            r"mode\s*:\s*['\"]no-cors['\"]", app_js
        ) is None,
        "readable success check": "return response.ok;" in app_js,
        "bounded primary request": all(
            token in app_js
            for token in (
                "FORM_REQUEST_TIMEOUT_MS",
                "new AbortController()",
                "signal: controller.signal",
                "clearTimeout(timeout)",
            )
        ),
        "waitlist backup": "waitlist-backup" in app_js,
        "feedback backup": "feedback-backup" in app_js,
    }
    index_parser = pages[(REPO / "index.html").resolve()]
    form_ids = {form.get("id"): form for form in index_parser.forms}
    for form_id in ("waitlist-form", "feedback-form"):
        form = form_ids.get(form_id)
        form_contracts[f"{form_id} fallback action"] = bool(
            form and form.get("method", "").lower() == "post" and form.get("action")
        )
    for label, passed in form_contracts.items():
        if not passed:
            failures.append(f"form contract failed: {label}")

    public_text = "\n".join(
        path.read_text(encoding="utf-8", errors="replace")
        for pattern in ("*.html", "*.txt")
        for path in public_files(pattern)
    )
    banned = {
        "opaque success fallback": "no-cors",
        "15-minute pact demo": 'data-intention-delta="15"',
        "negative 15-minute pact demo": 'data-intention-delta="-15"',
        "three-circle limit": "up to three circles",
        "stale private-notice cadence": "every 10, 15, 20, or 30 minutes",
        "false Firestore TTL claim": "time-to-live deletion at the database level",
        "unsupported launch timing": "we&rsquo;re days away",
        "unsupported automatic check-ins": "PhonePact automate the measuring and check-ins",
        "unsupported automatic circle delivery": "every circle automatically receives",
        "unsupported automatic product delivery": "PhonePact to automate",
        "stale post-deletion room persistence": "authored room rows can remain",
        "retired structured-data offer": '"offers":',
        "retired preorder availability": "schema.org/PreOrder",
        "retired $0.99 price": "$0.99",
        "retired 30-day free trial": "30-day free trial",
        "retired 30-free-days price": "30 free days",
        "retired launch trial": "free for 30 days after launch",
        "retired paywall copy": "paywall",
        "retired post-beta pricing": "post-beta",
        "retired Android no-picker claim": "has no app picker",
        "retired Android no-picker policy claim": "does not offer an app picker",
        "retired Android no-picker current claim": "does not currently offer an app picker",
        "retired Android whole-device-only claim": "currently counts whole-device usage",
    }
    for label, phrase in banned.items():
        if phrase.lower() in public_text.lower():
            failures.append(f"source-truth regression: {label}")

    for relative in ("privacy.html", "terms.html"):
        policy_text = (REPO / relative).read_text(encoding="utf-8", errors="replace").lower()
        if "current circle member" not in policy_text or "30 days" not in policy_text:
            failures.append(f"retention disclosure missing from {relative}")

    android_picker_pages = (
        "privacy.html",
        "terms.html",
        "ethos.html",
        "what-is-phonepact.html",
        "llms.txt",
    )
    for relative in android_picker_pages:
        text = (REPO / relative).read_text(encoding="utf-8", errors="replace").lower()
        if "individual launchable apps" not in text:
            failures.append(f"Android picker disclosure missing from {relative}")

    private_breakdown_pages = (
        "privacy.html",
        "support.html",
        "ethos.html",
        "what-is-phonepact.html",
        "llms.txt",
        "blog/phonepact-privacy-architecture.html",
    )
    for relative in private_breakdown_pages:
        text = (REPO / relative).read_text(encoding="utf-8", errors="replace").lower()
        if "where it went" not in text or (
            "stay" not in text and "private" not in text
        ):
            failures.append(f"private breakdown disclosure missing from {relative}")

    retired_annual_price = re.compile(
        r"(?:PhonePact[^\r\n]*\$9\.99|\$9\.99[^\r\n]*PhonePact|"
        r"\$9\.99\s+(?:a|per)\s+year|\$9\.99\s+for\s+the\s+year|"
        r'\"price\"\s*:\s*\"9\.99\")',
        re.IGNORECASE,
    )
    if retired_annual_price.search(public_text):
        failures.append("source-truth regression: retired $9.99 price")

    if failures:
        print(f"site check failed with {len(failures)} issue(s):", file=sys.stderr)
        for failure in failures:
            print(f"  {failure}", file=sys.stderr)
        return 1

    print(f"site check passed: {len(pages)} HTML files, {reference_count} internal references")
    print("JSON-LD, form fallbacks, and source-truth guards passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
