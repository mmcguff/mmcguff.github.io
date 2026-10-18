# Manual Test Cases — #32 Enable DNSSEC for devguff.com

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/32 · Plan: [PLAN-32-enable-dnssec.md](plans/PLAN-32-enable-dnssec.md)

DNSSEC was turned on for the Cloudflare zone on **2026-10-18 22:27 UTC**. Cloudflare Registrar sends the DS record to the `.com` registry on its own. That usually takes minutes, but it can take up to 48 hours. Run case 1 until it passes, then run the rest. If anything fails or the site stops resolving, follow [Rollback](#rollback).

**Expected DS record** (from Cloudflare when DNSSEC was enabled):

```
devguff.com. 3600 IN DS 2371 13 2 196779E7BAD8A1708C6C620F3D87604EEC8960FE34298090AF061C72FFB5BEA0
```

`dig` may print the digest with a space in it (`…F3D87604 EEC8960F…`), which still counts as a match. Cloudflare uses key tag 2371 on every zone it signs, so the **digest** is what identifies devguff.com.

Key tag `2371` · algorithm `13` (ECDSAP256SHA256) · digest type `2` (SHA-256) · digest `196779E7BAD8A1708C6C620F3D87604EEC8960FE34298090AF061C72FFB5BEA0`

> On the work laptop, the corporate proxy can block or intercept DNS-over-HTTPS and port 53. If `dig` times out or the results look odd, run these from a phone hotspot, or use the web tools in cases 5 and 6.

| # | AC | Steps | Expected Result | Environment |
|---|----|-------|------------------|-------------|
| 1 | AC2 | `dig DS devguff.com @a.gtld-servers.net +short` | One line exactly matching the expected DS record above (`2371 13 2 196779E7BAD8A1708C6C620F3D87604EEC8960FE34298090AF061C72FFB5BEA0`). Empty output means it isn't published yet: wait and re-run (up to 48 h). | Production DNS |
| 2 | AC1 | Cloudflare dashboard → devguff.com → DNS → Settings → DNSSEC. Or ask Claude to read `GET /zones/{zone_id}/dnssec`. | Status **Active**. It shows *Pending* until the DS from case 1 is seen. | Cloudflare |
| 3 | AC3 | `dig +dnssec devguff.com A @1.1.1.1` and `dig +dnssec devguff.com A @8.8.8.8` | `status: NOERROR`, the `flags:` line includes `ad`, the 4 `185.199.10x.153` addresses, plus an `RRSIG A` record. | Production DNS |
| 4 | AC3 | `dig +dnssec www.devguff.com CNAME @1.1.1.1` | `status: NOERROR`, the `flags:` line includes `ad`, `www.devguff.com. … CNAME mmcguff.github.io.` | Production DNS |
| 5 | AC4 | `dig +dnssec devguff.com DNSKEY @1.1.1.1 +multi` | DNSKEY records (one with flags 257, the KSK, whose key tag matches `2371`) and an `RRSIG DNSKEY`. | Production DNS |
| 6 | AC5 | Open https://dnsviz.net/d/devguff.com/dnssec/ → **Update now**. | The chain `.` → `com` → `devguff.com` is drawn with all-secure (blue/green) arrows and no red errors. Note any warnings. | Web |
| 7 | AC5 | Alternative to 6: https://dnssec-analyzer.verisignlabs.com/devguff.com | Every row is a green check. | Web |
| 8 | AC6 | Open https://devguff.com/ and https://www.devguff.com/ in a browser. | The apex loads with a valid padlock, and `www` redirects to `https://devguff.com/`. | Production |
| 9 | AC6 | `gh api repos/mmcguff/mmcguff.github.io/pages --jq '{cname, https_enforced, cert: .https_certificate.state}'` | `cname: devguff.com`, `https_enforced: true`, `cert: approved`. | GitHub |
| 10 | AC8 | GitHub → Actions → the latest *Deploy to GitHub Pages* run → *E2E tests (third-party, non-blocking)*. | The `dnssec.spec.ts` tests pass, with no "Third-party check failed" warning. Before the DS is published they fail as a warning only, and the deploy still succeeds. | CI |

## Rollback

Use this only if validation fails or DNS breaks. **Order matters:** the DS record must leave `.com` before the zone stops signing. A DS pointing at an unsigned zone makes validating resolvers return SERVFAIL for the whole domain.

1. Turn off DNSSEC: Cloudflare dashboard → devguff.com → DNS → Settings → DNSSEC → **Disable DNSSEC**. Because the domain uses Cloudflare Registrar, this withdraws the DS from `.com`. The zone keeps signing (status *Pending disabled*) until the DS is gone.
2. Check that the DS is gone: `dig DS devguff.com @a.gtld-servers.net +short` returns nothing.
3. Leave the zone alone for at least 1.5× the `.com` DS TTL (86400 s, so about **36 hours**), so cached DS records expire everywhere. Cloudflare then finishes disabling by itself.
4. **Never** delete DNSSEC through the API (`DELETE /zones/{zone_id}/dnssec`) or remove DNSKEYs while step 2 still returns a DS.
5. To silence CI warnings after a rollback, revert the PR that added `tests/e2e/dnssec.spec.ts`. The tests only warn and never block deploys, so this isn't urgent.

If the site is unreachable right now because of a DNSSEC failure (resolvers SERVFAIL, but `dig +cd devguff.com @1.1.1.1` works), do step 1 straight away. Recovery depends on the DS TTL in resolver caches, up to 24 h.
