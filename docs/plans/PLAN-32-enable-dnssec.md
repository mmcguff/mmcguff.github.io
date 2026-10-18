# Plan: #32 Enable DNSSEC for devguff.com

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/32 · Branch: `32-enable-dnssec`

## Problem Statement
The `devguff.com` zone is unsigned. Resolvers cannot validate its DNS answers, so a spoofed or poisoned response for the apex or `www` would be accepted. Turning on DNSSEC signs the zone and publishes a DS record in `.com`, which closes that gap. Today's state, checked 2026-10-18: whois `DNSSEC: unsigned`, registrar Cloudflare, Inc., and no DS or DNSKEY records returned by 1.1.1.1.

## Scope
**In scope:**
- Turning on DNSSEC signing for the `devguff.com` Cloudflare zone.
- Publishing the DS record in the `.com` parent zone. The registrar is Cloudflare Registrar, so this should happen automatically; confirm it.
- Checking afterwards that the chain of trust validates and that GitHub Pages still resolves and serves HTTPS on the apex and `www`.
- A repeatable way to check that DNSSEC stays on, so a later change that turns it off gets noticed.
- Rollback steps.

**Out of scope:**
- Changing any existing DNS record (the 10 GitHub Pages records from #24 stay exactly as they are).
- Proxying through Cloudflare (orange cloud), CAA records, email records (SPF/DMARC/MX), or any other DNS hardening.
- Site code or content changes.

## Acceptance Criteria
- [ ] AC1: Given the Cloudflare zone `devguff.com`, when its DNSSEC status is queried, then it is `active`.
- [ ] AC2: Given the `.com` parent zone, when a DS record is queried for `devguff.com`, then at least one DS record is returned, and it matches the key Cloudflare reports for the zone (key tag, algorithm, digest).
- [ ] AC3: Given a validating resolver (1.1.1.1 and 8.8.8.8), when `devguff.com` A and `www.devguff.com` CNAME are queried with DNSSEC on, then the answers carry the `ad` (authenticated data) flag and the response is not SERVFAIL.
- [ ] AC4: Given the zone, when DNSKEY is queried, then a DNSKEY RRset is returned with RRSIG signatures.
- [ ] AC5: Given https://dnsviz.net/d/devguff.com/dnssec/, when the analysis is run, then the chain from root → com → devguff.com is shown as secure, with no errors. Warnings are noted.
- [ ] AC6: Given DNSSEC is active, when `https://devguff.com/` and `https://www.devguff.com/` are requested, then the apex returns 200 with a valid certificate, `www` redirects to the apex, and GitHub's Pages settings still show the certificate approved and HTTPS enforced.
- [ ] AC7: Given the 10 DNS records tagged `GitHub Pages - issue #24`, when they are listed after the change, then they are unchanged in type, name, content and proxy status.
- [ ] AC8: Given the repo, when the non-blocking `@network` CI step runs, then a check against live DNS fails (as a warning, not blocking deploys) if devguff.com stops returning a DS record or validated answers. The same check is also written up as a manual test case with step-by-step validation instructions.
- [ ] AC9: Given a DNSSEC problem after the change, when the documented rollback is followed, then the DS record is removed before signing is turned off, so the domain never ends up with a DS record but an unsigned zone (which would make it fail to resolve).

## Open Questions
- None. Decided with the user on 2026-10-18:
  - **DS timing:** the DS record can take anywhere from about 5 minutes to 48 hours to appear. Cloudflare's docs say Registrar's CDS scanning "can take one to two days". The user owns the post-change validation (`dig DS devguff.com @a.gtld-servers.net +short`) and will back the change out if it fails or causes problems. AC2–AC5 are therefore manual checks done by the user after the PR, not merge blockers.
  - **AC8:** both a non-blocking `@network` CI test and a manual test case with validation instructions.

## Technical Design

This is mostly an infrastructure change. The only repo changes are a live-DNS check and docs.

**1. Zone change (Cloudflare API, done by Claude through the Cloudflare MCP plugin during the coder phase).** Approving this plan authorises that one API call.
- Before the change, list the 10 records commented `GitHub Pages - issue #24` and save a snapshot (type, name, content, proxied) to the scratchpad for AC7.
- Call `PATCH /zones/ca30d246182d4b750587c54e3bf2a853/dnssec` with `{"status":"active"}`. Record the response's `ds`, `key_tag`, `algorithm`, `digest_type` and `digest`; these are the values the user's `dig` output has to match (AC2). They are public data, so they go into the manual test file.
- Re-list the 10 records and compare them with the snapshot (AC7).
- Because the registrar is Cloudflare Registrar, Cloudflare submits the DS to the `.com` registry itself, via CDS/CDNSKEY scanning. There is no registrar step for us.
- Nothing else in the zone changes.

**2. Live-DNS check: `tests/e2e/dnssec.spec.ts` (new, every test tagged `@network`).**
- **Why Playwright and not vitest:** the existing `@network` mechanism lives in the Playwright suite. CI already runs `--grep @network` in a `continue-on-error` step that warns without blocking, and excludes those tests from the gating step. Reusing it adds no new CI plumbing and no dependency.
- **How it queries:** Playwright's `request` fixture (APIRequestContext) calls DNS-over-HTTPS JSON endpoints. Two validating resolvers are used: `https://cloudflare-dns.com/dns-query` with `accept: application/dns-json`, and `https://dns.google/resolve`. They return `Status`, `AD` and `Answer[].type`, as the Cloudflare docs show and as probed on 2026-10-18.
- **Why not `dig` or Node's `dns`:** `dig` isn't guaranteed on the runner. Node's `dns` module can't query DS or DNSKEY, and doesn't expose the AD flag. Querying `a.gtld-servers.net` directly would need a raw DNS client, so that check stays the user's manual one.
- Tests:
  - DS for `devguff.com` is returned (`Status` 0, at least one answer of type 43).
  - DNSKEY with `do=1` returns type-48 answers plus RRSIG (type 46).
  - For each resolver, the apex A answer has `AD: true`.
  - For each resolver, the `www` CNAME answer has `AD: true`.
- These go red today, because the zone is unsigned, and turn green once the DS is published.

**3. CI warning text (`.github/workflows/deploy.yml`).** The non-blocking step's warning currently names only Giscus. Change it to a generic third-party warning that mentions both Giscus and DNSSEC and says where to look. No step structure changes.

**4. Rollback (AC9), written into the manual test file.**
- Disable DNSSEC for devguff.com in Cloudflare (dashboard → Registrar → Manage Domains → devguff.com → Configuration → Disable DNSSEC, or the zone's DNSSEC setting). Registrar then withdraws the DS, and the zone keeps signing (`pending-disabled`) until the DS is gone.
- Confirm `dig DS devguff.com @a.gtld-servers.net +short` is empty.
- Then wait at least 1.5× the `.com` DS TTL (86400 s, so about 36 h) before anything deletes the DNSKEYs.
- Never call `DELETE /zones/{id}/dnssec` while a DS is still published. That would leave a DS pointing at an unsigned zone, and validating resolvers would SERVFAIL the whole domain.

## File Changes
| File | Change | Reason |
|------|--------|--------|
| `tests/e2e/dnssec.spec.ts` | New | AC8: live DNSSEC check, `@network`, non-blocking in CI. |
| `.github/workflows/deploy.yml` | Modify | Generalise the non-blocking warning so it covers DNSSEC as well as Giscus. |
| `tests/unit/workflow.test.ts` | Modify | Assert the warning mentions DNSSEC. |
| `docs/MANUAL_TEST_CASES-32-enable-dnssec.md` | New (test-builder) | AC2–AC7 and AC9: user validation steps, the expected DS values, and rollback. |
| `readme.MD` | Modify | One line under the domain/hosting notes saying DNSSEC is on and where the rollback steps are. |
| Cloudflare zone `devguff.com` | Config | DNSSEC set to active (not a repo file). |

## Test Strategy
| Acceptance Criteria | Test Type | Notes |
|----------------------|-----------|-------|
| AC1 | Manual + API | Claude reads `GET /zones/{id}/dnssec` after the PATCH. The status is `pending` until the DS is seen, then `active`. The user re-checks in the dashboard. |
| AC2 | Manual (user) + E2E `@network` | The user runs `dig DS devguff.com @a.gtld-servers.net +short` and compares it with the recorded DS. CI checks a DS exists through DoH. |
| AC3 | E2E `@network` + manual | `AD: true` from 1.1.1.1 and 8.8.8.8 for the apex A and the `www` CNAME. Manual: `dig +dnssec devguff.com @1.1.1.1` shows `flags: … ad`. |
| AC4 | E2E `@network` | The DNSKEY answer includes RRSIG. |
| AC5 | Manual (user) | DNSViz shows the chain as secure. |
| AC6 | Existing tests + manual | HTTPS on the apex and `www`, plus `gh api repos/mmcguff/mmcguff.github.io/pages` showing the certificate approved and HTTPS enforced. |
| AC7 | Manual (Claude) | Before/after snapshot of the 10 tagged records. |
| AC8 | Unit (workflow) + E2E `@network` | The workflow test asserts the warning covers DNSSEC. The spec runs in the existing non-blocking step. |
| AC9 | Manual (doc) | The rollback procedure is in the manual test file. |

## Blessed Path Check
- **Existing component considered:** the existing `@network` Playwright tag and its non-blocking CI step (from the Giscus check), and the Cloudflare MCP plugin already used for #24.
- **Verdict: Reuse.** No new dependencies, CI steps or tooling. Cloudflare Registrar's automatic DS submission avoids any manual registrar work.
