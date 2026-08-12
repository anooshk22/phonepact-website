# CLAUDE.md — phonepact-website

Static marketing site + blog, served by GitHub Pages at getphonepact.com.
Workspace-wide rules — in particular the **copy vocabulary** (pact point /
private notice / shared check-in) and the privacy invariant the site describes —
live in the root `CLAUDE.md` and load alongside this.

## Shape

Plain HTML/CSS/JS. **No framework, no build step** — the HTML is served as-is.
Top-level pages are extensionless URLs (`about-hank.html` → `/about-hank`);
`blog/` holds the posts.

## Publishing a blog post — a three-step convention

Documented in `tools/generate-sitemap.py`. A post is published when it has **no**
`<meta name="robots" content="noindex">`. So:

1. delete the post's `robots noindex` meta tag
2. link it from `blog/index.html`
3. run `python tools/generate-sitemap.py`

The same `noindex` signal gates the post from the blog index and from
`sitemap.xml` — one switch, three effects.

## The sitemap generator

```bash
python tools/generate-sitemap.py
python tools/generate-sitemap.py --check
```

The generator deliberately does **not** rewrite whitespace. An earlier
out-of-tree generator ran `replace(" ", "")` over its output, collapsing
`<urlset xmlns=` into `<urlsetxmlns=` and invalidating the whole file — crawlers
reject such a file entirely, they do not skip the bad line. `check_wellformed()`
guards against a recurrence.

It uses today's date for a dirty page so `--check` catches a content edit before
commit, then that file's latest Git commit date once clean. It falls back to
mtime only for a file Git has never committed. OneDrive can rewrite mtimes, so
a brand-new uncommitted page can still churn until its first commit. Unknown
arguments fail instead of silently generating.

## Accuracy

Site and blog copy has repeatedly gone wrong by describing intent instead of
behaviour. Check any claim about mechanics — cadences, the grace period,
milestones, pricing, what the circle sees — against the shipped app or the
backend, not against the design doc, which is stale.

Run `python tools/check-site.py` after copy or form changes. It checks internal
references, JSON-LD, acknowledged form success/fallbacks, and the public claims
that have previously drifted from the shipped product.
