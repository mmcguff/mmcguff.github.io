# Plan: #24 — Custom domain for the site

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/24

## Problem Statement
The portfolio and blog are served from `mmcguff.github.io`, which ties the site's identity, canonical URLs and RSS feed to GitHub's hostname. The owner has registered `devguff.com` through Cloudflare and wants the site served from it. Every absolute URL the site emits (canonical links, sitemap, RSS) has to move with it so search engines and future feed subscribers see one consistent origin. Old `mmcguff.github.io` links must keep working by redirecting.

## Scope
**In scope:**
- `https://devguff.com` (apex) becomes the canonical origin. `www.devguff.com` redirects to it.
- Cloudflare DNS records for GitHub Pages (apex + `www`) plus the GitHub verification TXT record, set to **DNS only (grey cloud)**. Claude creates them through the Cloudflare API (Cloudflare MCP plugin, signed in as the owner).
- GitHub Pages custom domain set to `devguff.com` with **Enforce HTTPS** on (GitHub-issued certificate), configured via the `gh` API.
- Verifying `devguff.com` in the GitHub account's Pages settings, which protects against domain takeover.
- Astro `site` URL and everything derived from it (canonical links, sitemap, RSS `<link>`/item URLs, RSS alternate link), plus test fixtures that hard-code the origin.
- `mmcguff.github.io` → `devguff.com` redirect, path preserved.
- Confirming Giscus comments still load and map to the same discussions on the new origin.

**Out of scope:**
- DEV.to / Hashnode / Medium syndication. It isn't set up yet, so it will use the new feed URL when it is.
- Cloudflare proxying, CDN, WAF, page rules or email routing for the domain.
- Renaming the repo or changing the Giscus repo/category (comments stay backed by `mmcguff/mmcguff.github.io` Discussions).
- Content changes to the portfolio or blog posts.

## Acceptance Criteria
- [ ] AC1: Given the production build, when `dist/` is inspected, then every canonical link, sitemap `<loc>` and RSS item/channel link uses `https://devguff.com`, and no file contains `mmcguff.github.io` except GitHub repo references (Giscus `data-repo`, links to the GitHub repo/profile).
- [ ] AC2: Given `dist/rss.xml`, when parsed, then it is valid RSS 2.0 with absolute `https://devguff.com/blog/<slug>/` item links, and blog pages advertise it through `<link rel="alternate" type="application/rss+xml">` with a `devguff.com` href.
- [ ] AC3: Given the Cloudflare zone, when `dig devguff.com A` / `AAAA` and `dig www.devguff.com CNAME` are run, then they return GitHub Pages' published IPs and `mmcguff.github.io.` respectively, from Cloudflare's nameservers rather than Cloudflare proxy IPs.
- [ ] AC4: Given the repo's Pages settings (`gh api repos/mmcguff/mmcguff.github.io/pages`), when queried after deploy, then `cname` is `devguff.com`, `https_enforced` is `true`, and the certificate state is approved/issued.
- [ ] AC5: Given a browser or `curl -I`, when `http://devguff.com/` is requested, then it 301s to `https://devguff.com/`. `https://devguff.com/` returns 200 with a valid TLS certificate for `devguff.com`.
- [ ] AC6: Given `curl -I https://www.devguff.com/blog/` (any path), then it redirects to `https://devguff.com/blog/`.
- [ ] AC7: Given `curl -I https://mmcguff.github.io/blog/<slug>/`, then it 301s to `https://devguff.com/blog/<slug>/` with the path preserved.
- [ ] AC8: Given a published post on `https://devguff.com`, when it loads, then the Giscus iframe renders and shows the same discussion thread the post had before (pathname mapping unchanged).
- [ ] AC9: Given the GitHub account's Pages settings, when checked, then `devguff.com` is listed as a verified domain.
- [ ] AC10: Given the CI pipeline on the PR, when it runs, then unit, integration and E2E suites pass against the new origin.

## Open Questions
- Other Pages sites (checked 2026-10-18, all owned repos, public and private): only `mmcguff/hello-world-git` publishes, at `https://mmcguff.github.io/hello-world-git/`. It is a one-file "Hello World" `index.html` (legacy branch build from `main`, no custom domain, last pushed 2025-04-26). Once this ticket ships it will be served at `devguff.com/hello-world-git/` automatically. No path collision with this site's routes (`/`, `/blog/`, `/rss.xml`). **Resolved:** owner chose to turn off its Pages. Done 2026-10-18 (`DELETE repos/mmcguff/hello-world-git/pages`). The repo itself is untouched.
- Order of operations: resolved. DNS → domain verification → Pages custom domain → merge. The owner accepts a short outage during the cutover.

## Technical Design

**Pattern: configuration change and a platform cutover. No new code paths.** All absolute URLs already derive from one setting. `BaseLayout.astro` builds the canonical and RSS alternate links from `Astro.site`. `@astrojs/rss` and `@astrojs/sitemap` read `site` from `astro.config.mjs`. A build today emits exactly five distinct `mmcguff.github.io` URLs (canonical, RSS, sitemap), all derived from that setting. Changing `site` moves all of them, so the repo change is one line plus test fixtures and a regression guard.

**Recon findings (in place of @kirk; small repo, read directly):**
- Hard-coded origin only in `astro.config.mjs:7` and `tests/helpers.ts:9` (used by `rss.test.ts` and `blog.test.ts`).
- `src/consts.ts` `GISCUS.repo` is the GitHub repo name, not the site origin. It stays. Giscus maps by `pathname`, and paths don't change, so existing threads stay attached (AC8). The repo has no `giscus.json` origin allowlist, so the new origin is accepted.
- Pages config (`gh api repos/mmcguff/mmcguff.github.io/pages`): `build_type: workflow`, `cname: null`, `https_enforced: true`. The stale `source.branch: master` value is ignored for workflow builds.
- **No `CNAME` file needed.** Per GitHub docs (via Context7), with a custom Actions workflow "no `CNAME` file is created, and any existing `CNAME` file is ignored". The domain lives only in the Pages setting, set through the API.
- E2E runs against `localhost:4321`, so it is unaffected by the origin.

**External configuration (exact values):**

Cloudflare zone `devguff.com` (id `ca30d246182d4b750587c54e3bf2a853`, Free plan, status `active`, nameservers `ivan`/`zita.ns.cloudflare.com`, publicly delegated). Checked 2026-10-18 through the Cloudflare MCP plugin, signed in as the owner with `dns_records:edit`. The zone has **no DNS records** (so no CAA records that could block Let's Encrypt) and DNSSEC is disabled. **Claude creates these records through the Cloudflare API** (`POST /zones/{zone_id}/dns_records`), each with `proxied: false` (DNS only / grey cloud) and `ttl: 1` (auto):

| Type | Name | Content |
|------|------|---------|
| A | `devguff.com` | `185.199.108.153` |
| A | `devguff.com` | `185.199.109.153` |
| A | `devguff.com` | `185.199.110.153` |
| A | `devguff.com` | `185.199.111.153` |
| AAAA | `devguff.com` | `2606:50c0:8000::153` |
| AAAA | `devguff.com` | `2606:50c0:8001::153` |
| AAAA | `devguff.com` | `2606:50c0:8002::153` |
| AAAA | `devguff.com` | `2606:50c0:8003::153` |
| CNAME | `www.devguff.com` | `mmcguff.github.io` |
| TXT | `_github-pages-challenge-mmcguff.devguff.com` | *(value GitHub shows when the owner adds the domain under Account Settings → Pages)* |

Each record gets the comment `GitHub Pages - issue #24`, so they can be found and removed as a set.

**Who does what:**

| Step | Owner | Claude | Tool |
|------|:-----:|:------:|------|
| Start GitHub domain verification and get the TXT challenge value | ✅ | | GitHub UI (no public REST API for account-level Pages domain verification) |
| Create the TXT challenge record | | ✅ | Cloudflare API |
| Create the A / AAAA / `www` CNAME records (DNS only) | | ✅ | Cloudflare API |
| Confirm records via Cloudflare API and public `dig` | | ✅ | Cloudflare API, `dig @1.1.1.1` |
| Click **Verify** in GitHub | ✅ | | GitHub UI |
| Set the Pages custom domain, wait for the cert, enforce HTTPS | | ✅ | `gh api` |
| Approve and merge the PR (`site` URL change) | ✅ approves | ✅ merges after approval | `gh pr merge` |
| Run live checks (AC3–AC8) | | ✅ | `dig`, `curl`, `gh`, browser |
| Confirm comments render on the live post (AC8 visual) | ✅ | | Browser |

**Cutover sequence (owner accepts a short outage):**
1. **Owner:** GitHub **Settings (account) → Pages → Add a domain** → `devguff.com`. Paste the TXT value to Claude. Don't click Verify yet.
2. **Claude:** create the TXT record, then the 4 A + 4 AAAA records and the `www` CNAME, all `proxied: false`. Read them back from the API (AC3).
3. **Claude:** wait until public resolvers (`dig @1.1.1.1`, `@8.8.8.8`) return the TXT and A/AAAA/CNAME values. On a fresh Cloudflare zone this usually takes seconds to minutes.
4. **Owner:** click **Verify** in GitHub (AC9). The TXT record can stay; GitHub re-checks it periodically.
5. **Claude:** `gh api -X PUT repos/mmcguff/mmcguff.github.io/pages -f cname=devguff.com`. GitHub runs its DNS check and starts issuing the Let's Encrypt certificate, and `mmcguff.github.io` starts redirecting to `devguff.com`. The outage window begins here and lasts until the cert is issued.
6. **Claude:** poll `gh api .../pages` until `https_certificate.state` is `approved`, then `gh api -X PUT .../pages -F https_enforced=true` (AC4, AC5).
7. **Owner approves, Claude merges** the PR (the `site` URL change). The deploy workflow rebuilds with `devguff.com` canonicals. Between steps 5 and 7 the live pages still carry `mmcguff.github.io` canonicals; that is harmless for a few minutes.
8. **Claude:** run the live checks (AC3–AC8) from the manual test doc. **Owner** eyeballs comments on the live post.

The PR can be opened and CI-green before step 1. Only the merge waits for step 6.

**Rollback:**
- Pages: `gh api -X PUT .../pages -f cname=` clears the custom domain, so `mmcguff.github.io` serves directly again.
- Code: revert the merge commit to restore the old `site`.
- DNS: harmless to leave, since the records do nothing without the Pages setting. For a clean slate, Claude deletes them via the Cloudflare API by filtering on the `GitHub Pages - issue #24` comment.

**Not changed in Cloudflare:** SSL/TLS mode (currently `full`) has no effect on unproxied records. Proxy, page rules, redirect rules and DNSSEC are left alone. DNSSEC is tracked separately in #32.

## File Changes
| File | Change | Reason |
|------|--------|--------|
| `astro.config.mjs` | Modify | `site: 'https://devguff.com'`. This drives canonical, RSS and sitemap URLs (AC1, AC2). |
| `tests/helpers.ts` | Modify | `SITE = 'https://devguff.com'`, so the existing RSS and canonical assertions check the new origin (AC1, AC2). |
| `tests/integration/domain.test.ts` | New | Regression guard: no built file in `dist/` contains a `mmcguff.github.io` site URL. GitHub repo links on `github.com` are still allowed. Sitemap `<loc>`s use `https://devguff.com` (AC1). |
| `readme.MD` | Modify | Document that the site is served at `https://devguff.com`, that the domain lives in Pages settings (not a `CNAME` file), and that DNS is in Cloudflare (DNS only). |
| `docs/MANUAL_TEST_CASES-24-custom-domain.md` | New (by test-builder) | Cutover runbook and live checks for AC3–AC9 with exact `dig`/`curl`/`gh` commands. |

`src/consts.ts`, `BaseLayout.astro`, the blog post, the workflow and the E2E config are unchanged.

## Test Strategy
| Acceptance Criteria | Test Type | Notes |
|----------------------|-----------|-------|
| AC1 dist URLs | Integration | New `domain.test.ts` scans every `.html`/`.xml` file in `dist/` for `https?://mmcguff\.github\.io` (none allowed) and checks sitemap `<loc>` origins. The existing `blog.test.ts` canonical assertion uses the updated `SITE`. |
| AC2 RSS | Integration | Existing `rss.test.ts` with the updated `SITE`. Add an assertion that the blog page's `application/rss+xml` href is `https://devguff.com/rss.xml`. |
| AC3 DNS | Manual (scripted) | Cloudflare API: `GET /zones/{id}/dns_records` shows all 10 records with `proxied: false`. Public: `dig +short devguff.com A/AAAA @1.1.1.1`, `dig +short www.devguff.com CNAME`. Results must be GitHub IPs, not Cloudflare proxy IPs. |
| AC4 Pages config | Manual (scripted `gh`) | `gh api repos/mmcguff/mmcguff.github.io/pages -q '{cname,https_enforced,https_certificate}'`. |
| AC5 HTTPS | Manual | `curl -sI http://devguff.com/` → 301 to https; `curl -sI https://devguff.com/` → 200. Check the cert subject with `openssl s_client`. |
| AC6 www redirect | Manual | `curl -sI https://www.devguff.com/blog/` → `Location: https://devguff.com/blog/`. |
| AC7 old domain | Manual | `curl -sI https://mmcguff.github.io/blog/rebuilding-my-site-with-astro/` → 301 with the path preserved. |
| AC8 Giscus | Manual (browser) | Open the post on `devguff.com`; the comments iframe loads the same thread. The existing `@network` E2E covers loading against localhost. |
| AC9 verified domain | Manual | Account Settings → Pages shows `devguff.com` as verified. |
| AC10 CI | CI | The deploy workflow's PR run passes unit, integration and E2E. |

Live checks (AC3–AC9) can only run after the external cutover, so they live in the manual test doc instead of CI. Adding them to CI would make every PR depend on live DNS.

## Blessed Path Check
- Existing component considered: Astro's `site` setting, plus GitHub Pages' native custom-domain support (built-in HTTPS via Let's Encrypt and automatic `github.io` → custom-domain and `www` → apex redirects). Walmart @blessedpath/@mando don't apply; this is a personal repo.
- Verdict: **Reuse.** No custom redirect pages, no `CNAME` file, no Cloudflare redirect rules. Everything in AC5–AC7 is built-in Pages behavior once the custom domain is set.
