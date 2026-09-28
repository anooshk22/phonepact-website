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
APP_STORE_URL = "https://apps.apple.com/us/app/phonepact/id6786930042"
PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.getphonepact.phonepact"
APP_ID = "XW52RJLNPL.com.getphonepact.phonepact"
ANDROID_PACKAGE = "com.getphonepact.phonepact"
ANDROID_APP_SIGNING_SHA256 = (
    "C2:4F:7D:1C:65:67:C4:B0:77:F0:15:75:2D:33:05:D2:31:93:7D:7D:"
    "9F:39:C8:4E:C8:8F:8E:B6:A6:B2:89:4D"
)
ANDROID_APP_LINK_RELATION = "delegate_permission/common.handle_all_urls"


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.references = []
        self.ids = set()
        self.json_ld = []
        self.forms = []
        self.tags = {}
        self._json_chunks = None

    def handle_starttag(self, tag, attrs):
        self.tags[tag] = self.tags.get(tag, 0) + 1
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
        if parser.tags.get("main", 0) != 1:
            failures.append(
                f"{source.relative_to(REPO)}: expected exactly one main landmark"
            )
        for index, payload in enumerate(parser.json_ld, start=1):
            try:
                json.loads(payload)
            except json.JSONDecodeError as error:
                failures.append(f"{source.relative_to(REPO)} JSON-LD #{index}: {error}")

        for _tag, _attr, raw in parser.references:
            if raw == "/blog/blog.css":
                failures.append(
                    f"{source.relative_to(REPO)}: unversioned blog stylesheet reference"
                )
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
        "feedback backup": "feedback-backup" in app_js,
    }
    index_parser = pages[(REPO / "index.html").resolve()]
    form_ids = {form.get("id"): form for form in index_parser.forms}
    for form_id in ("feedback-form",):
        form = form_ids.get(form_id)
        form_contracts[f"{form_id} fallback action"] = bool(
            form and form.get("method", "").lower() == "post" and form.get("action")
        )
    for label, passed in form_contracts.items():
        if not passed:
            failures.append(f"form contract failed: {label}")

    # The public launch state and invitation fallback are easy to regress: a
    # generic store redirect would lose the invitation code, while a generic
    # Smart App Banner on /join would open the app without that code. Keep both
    # store listings discoverable and the invitation page code-first.
    index_text = (REPO / "index.html").read_text(encoding="utf-8", errors="replace")
    join_text = (REPO / "join.html").read_text(encoding="utf-8", errors="replace")
    join_normalized = " ".join(join_text.lower().split())
    llms_text = (REPO / "llms.txt").read_text(encoding="utf-8", errors="replace")
    launch_contracts = {
        "homepage App Store listing": APP_STORE_URL in index_text,
        "homepage official App Store badge": (
            "toolbox.marketingtools.apple.com/api/badges/download-on-the-app-store/"
            in index_text
        ),
        "homepage Google Play listing": PLAY_STORE_URL in index_text,
        "homepage official Google Play badge": (
            "play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
            in index_text
        ),
        "homepage Smart App Banner": (
            'name="apple-itunes-app" content="app-id=6786930042"' in index_text
        ),
        "retired Android test form removed": 'id="waitlist-form"' not in index_text,
        "invite page App Store fallback": APP_STORE_URL in join_text,
        "invite page Google Play fallback": PLAY_STORE_URL in join_text,
        "invite page fragment custom-scheme fallback": "phonepact://join#c=" in join_text,
        "invite page copy control": 'id="join-copy"' in join_text,
        "invite page does not leak invite referrer": (
            'name="referrer" content="no-referrer"' in join_text
        ),
        "invite page scrubs fragment and legacy query from history": (
            "window.history.replaceState(window.history.state, '', '/join')" in join_text
            and "catch (_error)" in join_text
            and 0
            <= join_text.find("const raw =")
            < join_text.find("window.history.replaceState")
            < join_text.find("const separatedCode =")
        ),
        "invite page has no code-dropping Smart App Banner": (
            'name="apple-itunes-app"' not in join_text
        ),
        "invite codes use production alphabet": (
            "^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$" in join_text
        ),
        "invite page prefers fragment and gives c deterministic priority": (
            "const canonical = firstQueryValue(parameters, 'c')" in join_text
            and "canonical.found ? canonical : firstQueryValue(parameters, 'code')" in join_text
            and "const fragmentInvite = inviteValue(fragmentParameters)" in join_text
            and "fragmentInvite.found" in join_text
            and ": inviteValue(legacyQueryParameters)" in join_text
        ),
        "invite page matches native raw-parameter decoding": (
            "decodeURIComponent(encodedName).toLowerCase()" in join_text
            and "decodeURIComponent(encodedValue)" in join_text
            and "new URLSearchParams" not in join_text
        ),
        "invite page rejects Unicode expansion before casing": (
            "^[A-Za-z2-9]+$" in join_text
            and "raw.replace(/[ -]/g, '')" in join_text
        ),
        "invite page accurately describes shared check-in context": all(
            token in join_normalized
            for token in (
                "identifies the member and phone",
                "duration and event time",
                "optional note",
                "profile, circle membership, phone label, pact activity",
                "never includes which apps or websites",
            )
        ),
        "invite page explains fragment, legacy query, and history limits": all(
            token in join_normalized
            for token in (
                "does not send the fragment in its initial request to github pages",
                "older <code>?c=</code> links still work",
                "browser history/ sync",
                "clearing them does not revoke the code",
                "no code-rotation or revocation control",
            )
        ),
        "machine-readable launch status": (
            APP_STORE_URL in llms_text
            and PLAY_STORE_URL in llms_text
            and "PhonePact is listed on the App Store" in llms_text
            and "Feature availability varies by installed version, platform, account, and staged store rollout" in llms_text
        ),
    }
    for label, passed in launch_contracts.items():
        if not passed:
            failures.append(f"launch contract failed: {label}")

    aasa_path = REPO / ".well-known" / "apple-app-site-association"
    try:
        aasa_bytes = aasa_path.read_bytes()
        aasa = json.loads(aasa_bytes)
        details = aasa["applinks"]["details"]
        components = next(
            item["components"] for item in details if APP_ID in item.get("appIDs", [])
        )
        query_contracts = {
            tuple(sorted(component.get("?", {}).items()))
            for component in components
            if component.get("/") == "/join"
        }
        if (("c", "??????"),) not in query_contracts:
            failures.append("AASA missing exact /join?c=<six characters> route")
        if (("code", "??????"),) not in query_contracts:
            failures.append("AASA missing exact /join?code=<six characters> route")
        fragment_contracts = {
            component.get("#")
            for component in components
            if component.get("/") == "/join" and isinstance(component.get("#"), str)
        }
        if "c=??????" not in fragment_contracts:
            failures.append("AASA missing exact /join#c=<six characters> route")
        if "code=??????" not in fragment_contracts:
            failures.append("AASA missing exact /join#code=<six characters> route")
        if any(component.get("/") != "/join" for component in components):
            failures.append("AASA contains an app-link route outside canonical /join")
        if len(aasa_bytes) >= 128 * 1024:
            failures.append("AASA exceeds Apple's 128 KB uncompressed limit")
    except (FileNotFoundError, json.JSONDecodeError, KeyError, StopIteration) as error:
        failures.append(f"AASA contract failed: {error}")

    assetlinks_path = REPO / ".well-known" / "assetlinks.json"
    expected_assetlinks = [
        {
            "relation": [ANDROID_APP_LINK_RELATION],
            "target": {
                "namespace": "android_app",
                "package_name": ANDROID_PACKAGE,
                "sha256_cert_fingerprints": [ANDROID_APP_SIGNING_SHA256],
            },
        }
    ]
    try:
        assetlinks = json.loads(assetlinks_path.read_bytes())
        if assetlinks != expected_assetlinks:
            failures.append(
                "assetlinks.json does not exactly match the Play App Signing contract"
            )
    except (FileNotFoundError, json.JSONDecodeError) as error:
        failures.append(f"Android asset links contract failed: {error}")

    if not (REPO / ".nojekyll").is_file():
        failures.append(".nojekyll missing; GitHub Pages may omit .well-known")

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
        "stale launch waitlist CTA": "join the waitlist",
        "stale interface status": "interface in development",
        "stale public-listing status": "not yet publicly listed",
        "stale dual-platform test status": "closed testing on iPhone and Android",
        "stale Android closed-testing status": "closed testing on Android",
        "stale Android closed-testing reversal": "Android remains in closed testing",
        "retired Android testing CTA": "Join Android testing",
        "stale launch pricing": "free for now during launch",
        "stale planned insights": "planned supporter insights",
        "stale planned-insights anchor": "planned-insights",
        "stale Android availability advice": "need Android right now",
        "stale five-app private breakdown": "up to five selected apps",
        "stale top-five private breakdown": "top-five &ldquo;Where it went&rdquo;",
        "stale hypothetical subscriptions": "If subscriptions are introduced",
        "false iPhone domain display claim": "website domains when supplied by Apple are displayed",
        "retired generic private-prompt term": "private prompt before your pact",
        "stale seven-check-in cap": "as many as seven shared check-ins",
        "stale six-later shared cap": "up to six more times",
        "stale six-milestone shared cap": "up to six later milestones",
        "false no-message-processing claim": "messages are never analyzed",
        "false blanket message-analysis claim": "no ai or message analysis",
        "unsupported signed OTA claim": "deliver signed updates",
        "unsupported signed app-update claim": "signed app-update",
        "anonymous safety-record overclaim": "anonymized safety records",
        "synchronous deletion overclaim": "immediately deletes your private",
        "unconfirmed RevenueCat deletion promise": "support handles a verified revenuecat deletion request",
        "evergreen core-free promise": "core service is free",
        "evergreen core-remains-free promise": "core service remains free",
        "stale launch-age wording": "launch version is for people 13 and older",
    }
    for label, phrase in banned.items():
        matched = (
            re.search(r"\bpaywall\b", public_text, re.IGNORECASE) is not None
            if label == "retired paywall copy"
            else phrase.lower() in public_text.lower()
        )
        if matched:
            failures.append(f"source-truth regression: {label}")

    stale_shared_cap = re.compile(
        r"up to six later(?:\s+[a-z-]+){0,3}\s+milestones",
        re.IGNORECASE,
    )
    if stale_shared_cap.search(public_text):
        failures.append("source-truth regression: stale six-later shared-cap variant")

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

    # The September supporter build changes several legally material boundaries.
    # Pin the public source to executable claims so a later copy pass cannot
    # silently restore the pre-RevenueCat or pre-Live-Activity story.
    compact = lambda value: re.sub(r"\s+", " ", value.lower())
    privacy_text = compact((REPO / "privacy.html").read_text(encoding="utf-8", errors="replace"))
    terms_text = compact((REPO / "terms.html").read_text(encoding="utf-8", errors="replace"))
    support_text = compact((REPO / "support.html").read_text(encoding="utf-8", errors="replace"))
    article_text = compact((REPO / "blog" / "phonepact-privacy-architecture.html").read_text(
        encoding="utf-8", errors="replace"
    ))
    current_release_contracts = {
        "ten-app privacy disclosure": "up to ten selected apps" in privacy_text,
        "ten-app product disclosure": "up to ten selected apps" in (
            REPO / "what-is-phonepact.html"
        ).read_text(encoding="utf-8", errors="replace").lower(),
        "RevenueCat signed-in account disclosure": all(
            token in privacy_text
            for token in ("raw firebase account id", "even if that user has not purchased")
        ),
        "RevenueCat purchase analytics disclosure": all(
            token in privacy_text
            for token in ("purchase/subscription analytics", "cross-app advertising or tracking")
        ),
        "RevenueCat asynchronous account-deletion disclosure": all(
            token in privacy_text
            for token in (
                "our backend requests deletion of the matching revenuecat customer",
                "retries requests that fail",
                "deletion is not immediate",
                "does not delete an app store",
                "cancel a subscription",
            )
        ),
        "verified production logging retention": all(
            token in privacy_text for token in ("30 days", "400 days", "since 27 september 2026", "one-way lookup code")
        ),
        "local iPhone change-history disclosure": all(
            token in privacy_text for token in (
                "approving member", "account identifier and name", "opaque before-and-after selection tokens",
                "not synchronized between phones", "not sent to our servers or other members",
                "28 recent days and 300 entries", "latest 20 completed selection changes plus one pending change",
                "clears at sign-out or account teardown",
            )
        ),
        "public policy excludes internal rollout gates": all(
            token not in privacy_text + support_text + article_text
            for token in ("stop-ship", "not considered live until", "source-prepared", "remain a release gate")
        ),
        "Live Activity support distinguishes floor and card lifetime": all(
            token in support_text for token in ("confirmed minimum", "eight hours", "does not reset", "iphone 13", "lock screen")
        ),
        "iPhone domain non-enumeration": all(
            token in privacy_text
            for token in ("selected category or", "does not list, export, or", "visited domain names")
        ),
        "Android post-expiry collection disclosure": all(
            token in privacy_text
            for token in (
                "can continue",
                "after paid access expires",
                "private insights data",
                "without unlocking paid reports",
                "relevant permission",
            )
        ),
        "iPhone Live Activity relay disclosure": all(
            token in privacy_text
            for token in ("activitykit and push routing tokens", "whole-minute aggregate elapsed-time floors")
        ),
        "account-linked Crashlytics disclosure": all(
            token in privacy_text
            for token in ("firebase crashlytics", "linked to the firebase account id", "stack traces")
        ),
        "Expo update disclosure": "expo/eas update" in privacy_text,
        "compatible OTA wording": all(
            token in privacy_text for token in ("compatible over-the-air update", "expo provides compatible")
        ),
        "shared ladder maximum disclosure": all(
            token in privacy_text
            for token in (
                "1,410 minutes",
                "47 potential shared check-ins",
                "prompt limit does not limit the shared check-in ladder",
            )
        ),
        "deterministic message safety disclosure": all(
            token in privacy_text
            for token in (
                "deterministic safety screening",
                "profile or display names",
                "circle names",
                "phone labels",
                "room/private messages",
                "not ai",
                "optional notes or reasons can be omitted",
            )
        ),
        "iPhone relay outbox disclosure": all(
            token in privacy_text
            for token in ("pending iphone relay outbox", "protected app group file", "more than 14 days old")
        ),
        "RevenueCat manual fallback and provider limitations": all(
            token in privacy_text
            for token in (
                "contact us for a manual provider request",
                "processes deletion asynchronously",
                "unambiguous record matching",
                "provider availability",
                "required retention",
                "and law",
            )
        ),
        "linked authentication disclosure": all(
            token in privacy_text for token in ("google or apple", "linked sign-in methods", "verification-grace")
        ),
        "localized-price terms": all(
            token in terms_text for token in ("authoritative localized", "store displays at confirmation")
        ),
        "qualified one-time access": all(
            token in terms_text for token in ("one-time purchase grants continuing access", "not a promise")
        ),
        "Apple subscription management support": "https://apps.apple.com/account/subscriptions" in support_text,
        "Google subscription management support": "https://play.google.com/store/account/subscriptions" in support_text,
        "privacy article current boundary": all(
            token in article_text
            for token in ("top-ten", "revenuecat handles access, not insights", "whole-minute aggregate")
        ),
        "collapsed mobile navigation is noninteractive": all(
            token in (REPO / "styles.css").read_text(encoding="utf-8", errors="replace")
            for token in ("visibility: hidden", "pointer-events: none", ".nav__links.open")
        ),
        "no loaded Plausible analytics": "plausible.io" not in public_text.lower(),
        "no dormant Plausible analytics hooks": "window.plausible" not in public_text.lower(),
    }
    for label, passed in current_release_contracts.items():
        if not passed:
            failures.append(f"current supporter-release contract failed: {label}")

    retired_annual_price = re.compile(
        r"(?:PhonePact[^\r\n]*\$9\.99|\$9\.99[^\r\n]*PhonePact|"
        r"\$9\.99\s+(?:a|per)\s+year|\$9\.99\s+for\s+the\s+year|"
        r'\"price\"\s*:\s*\"9\.99\")',
        re.IGNORECASE,
    )
    if retired_annual_price.search(public_text):
        failures.append("source-truth regression: retired $9.99 price")

    retired_single_event_claims = (
        "one fact per person per day",
        "one honest number each",
        "one plain message when you cross",
        "only ever sees how long you were on your phone",
        "the number you crossed and nothing else",
    )
    for claim in retired_single_event_claims:
        if claim.lower() in public_text.lower():
            failures.append(f"source-truth regression: retired shared-check-in claim: {claim}")

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
