# Manual Test Cases — #24 Custom domain (devguff.com)

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/24 · Plan: [PLAN-24-custom-domain.md](plans/PLAN-24-custom-domain.md)

These cover the parts CI can't: DNS, the GitHub Pages setting, TLS and redirects on the live domain. Run them in order during and after the cutover described in the plan. "Claude" steps use the Cloudflare MCP plugin and `gh`. "Owner" steps need the GitHub UI or a human eye.

Zone: `devguff.com`, Cloudflare zone id `ca30d246182d4b750587c54e3bf2a853`. Repo: `mmcguff/mmcguff.github.io`.

## Cutover

| # | Who | Steps | Expected Result |
|---|-----|-------|------------------|
| C1 | Owner | GitHub → avatar → **Settings → Pages → Add a domain** → `devguff.com` → **Add domain**. Copy the TXT value. Don't click Verify. | GitHub shows a TXT record name `_github-pages-challenge-mmcguff.devguff.com` and a value. |
| C2 | Claude | Cloudflare API: create the TXT record from C1, plus 4 A, 4 AAAA and the `www` CNAME from the plan, all `proxied: false`, comment `GitHub Pages - issue #24`. | All 10 creates return `success: true`. |
| C3 | Claude | `dig +short TXT _github-pages-challenge-mmcguff.devguff.com @1.1.1.1` and `@8.8.8.8` | Both return the C1 value. |
| C4 | Owner | Back on GitHub Settings → Pages, click **Verify** for `devguff.com`. | Status shows **Verified**. |
| C5 | Claude | `gh api -X PUT repos/mmcguff/mmcguff.github.io/pages -f cname=devguff.com` | 204. `gh api repos/mmcguff/mmcguff.github.io/pages -q .cname` prints `devguff.com`. |
| C6 | Claude | Poll `gh api repos/mmcguff/mmcguff.github.io/pages -q .https_certificate.state` every minute or so. | Ends at `approved`. Usually within 15 minutes; GitHub allows up to 24 h. |
| C7 | Claude | `gh api -X PUT repos/mmcguff/mmcguff.github.io/pages -F https_enforced=true` | 204. |
| C8 | Owner → Claude | Owner approves the PR. Claude merges it and waits for the `Deploy to GitHub Pages` run on `main`. | Run succeeds. |

## Live checks

| # | AC | Steps | Expected Result | Environment |
|---|----|-------|------------------|-------------|
| 1 | AC3 | Cloudflare API `GET /zones/ca30d246182d4b750587c54e3bf2a853/dns_records` | The 10 records from C2, each `proxied: false`. No other A/AAAA/CNAME on `devguff.com` or `www`. | Cloudflare |
| 2 | AC3 | `dig +short devguff.com A @1.1.1.1` | Exactly `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (any order). No Cloudflare `104.x`/`172.x` addresses. | Public DNS |
| 3 | AC3 | `dig +short devguff.com AAAA @1.1.1.1` | Exactly `2606:50c0:8000::153` … `2606:50c0:8003::153`. | Public DNS |
| 4 | AC3 | `dig +short www.devguff.com CNAME @1.1.1.1` | `mmcguff.github.io.` | Public DNS |
| 5 | AC4 | `gh api repos/mmcguff/mmcguff.github.io/pages -q '{cname, https_enforced, cert: .https_certificate.state, domains: .https_certificate.domains}'` | `cname: devguff.com`, `https_enforced: true`, `cert: approved`, domains include `devguff.com` and `www.devguff.com`. | GitHub |
| 6 | AC5 | `curl -sI http://devguff.com/ \| grep -iE '^(HTTP\|location)'` | `301` with `location: https://devguff.com/`. | Production |
| 7 | AC5 | `curl -sI https://devguff.com/ \| head -1` | `HTTP/2 200`. | Production |
| 8 | AC5 | `echo \| openssl s_client -connect devguff.com:443 -servername devguff.com 2>/dev/null \| openssl x509 -noout -subject -issuer -ext subjectAltName` | SAN includes `DNS:devguff.com`. Issuer is Let's Encrypt. | Production |
| 9 | AC6 | `curl -sI https://www.devguff.com/blog/ \| grep -iE '^(HTTP\|location)'` | `301` with `location: https://devguff.com/blog/`. | Production |
| 10 | AC7 | `curl -sI https://mmcguff.github.io/blog/rebuilding-my-site-with-astro/ \| grep -iE '^(HTTP\|location)'` | `301` with `location: https://devguff.com/blog/rebuilding-my-site-with-astro/`. | Production |
| 11 | AC7 | `curl -sI https://mmcguff.github.io/ \| grep -iE '^(HTTP\|location)'` | `301` with `location: https://devguff.com/`. | Production |
| 12 | AC1 | `curl -s https://devguff.com/blog/rebuilding-my-site-with-astro/ \| grep -o '<link rel="canonical"[^>]*>'` | `href="https://devguff.com/blog/rebuilding-my-site-with-astro/"`. Confirms the merged build is live. | Production |
| 13 | AC2 | `curl -s https://devguff.com/rss.xml \| grep -o '<link>[^<]*</link>'` | Every link starts with `https://devguff.com/`. | Production |
| 14 | AC8 | Owner opens https://devguff.com/blog/rebuilding-my-site-with-astro/ and scrolls to the comments. | The Giscus widget loads and shows the same thread (and reaction count) as before the move. There's no "not installed on this origin" error. | Production (browser) |
| 15 | AC9 | Owner: GitHub Settings → Pages → Verified domains | `devguff.com` listed as verified. | GitHub |
| 16 | — | `curl -sI https://mmcguff.github.io/hello-world-git/ \| head -1` | 404 / redirect to a `devguff.com` 404. Pages was disabled for that repo, so nothing is published there. | Production |

## Rollback checks (only if rolling back)

| # | Steps | Expected Result |
|---|-------|------------------|
| R1 | `gh api -X PUT repos/mmcguff/mmcguff.github.io/pages -f cname=` | `.cname` is `null`; `https://mmcguff.github.io/` returns 200 with no redirect. |
| R2 | Revert the merge commit on `main` and let the deploy run. | Canonicals on `mmcguff.github.io` again (`curl` as in #12). |
| R3 | Optional: delete Cloudflare records whose comment is `GitHub Pages - issue #24`. | Live check #1 returns no Pages records. |
