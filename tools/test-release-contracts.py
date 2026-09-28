"""Negative controls: mutate public copy in memory; never change release files."""
import contextlib
import importlib.util
import io
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("site_check", Path(__file__).with_name("check-site.py"))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
original_read = Path.read_text

cases = [
    ("privacy.html", "account identifier and name", "unspecified details", "local iPhone change-history disclosure"),
    ("privacy.html", "not synchronized between phones", "synchronized between phones", "local iPhone change-history disclosure"),
    ("privacy.html", "latest 20 completed selection changes plus one pending change", "every change forever", "local iPhone change-history disclosure"),
    ("privacy.html", "opaque before-and-after selection tokens", "private information", "local iPhone change-history disclosure"),
    ("privacy.html", "our backend requests deletion of the matching RevenueCat customer", "contact us to discuss provider data", "RevenueCat asynchronous account-deletion disclosure"),
    ("privacy.html", "retries requests that fail", "does not retry failures", "RevenueCat asynchronous account-deletion disclosure"),
    ("privacy.html", "deletion is not immediate", "deletion is immediate", "RevenueCat asynchronous account-deletion disclosure"),
    ("privacy.html", "400 days", "40 days", "verified production logging retention"),
    ("privacy.html", "Last updated:", "stop-ship Last updated:", "public policy excludes internal rollout gates"),
    ("support.html", "does not reset", "resets", "Live Activity support distinguishes floor and card lifetime"),
    ("support.html", "confirmed minimum", "exact live stopwatch", "Live Activity support distinguishes floor and card lifetime"),
]
for filename, before, after, expected in cases:
    target = checker.REPO / filename
    real = original_read(target, encoding="utf-8")
    assert before in real, (filename, before)
    mutated = real.replace(before, after)
    def read(candidate, *args, **kwargs):
        return mutated if candidate.resolve() == target.resolve() else original_read(candidate, *args, **kwargs)
    errors = io.StringIO()
    with patch.object(Path, "read_text", read), contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(errors):
        status = checker.main()
    assert status == 1 and expected in errors.getvalue(), (filename, before, errors.getvalue())
    print("negative control caught:", expected, "[", before, "]")
assert checker.main() == 0
print(f"{len(cases)} negative controls passed; unmodified candidate passed.")
