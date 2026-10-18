# Manual Test Cases — #29 astro check in CI

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/29 · Plan: [PLAN-29-astro-check-in-ci.md](plans/PLAN-29-astro-check-in-ci.md)

| # | AC | Steps | Expected Result | Environment |
|---|----|-------|------------------|-------------|
| 1 | AC2 | `npm ci && npm run check` | Exit 0. The summary reads `0 errors`, `0 warnings` (the Calendly `onclick` hint may remain). | Local |
| 2 | AC4 | In `src/pages/blog/[...slug].astro`, add a nonexistent prop to the `<BlogPostLayout …>` call (e.g. `bogus={1}`), then `npm run check; echo $?` | A `ts(2322)` error pointing at that line, and exit code `1`. | Local |
| 3 | AC4 | In `src/consts.ts`, change `mapping: 'pathname'` to `mapping: 42`, then `npm run check; echo $?` | A type error, and exit code `1`. | Local |
| 4 | — | Revert #2 and #3 (`git checkout -- src`), then `npm run check` | Back to `0 errors`. | Local |
| 5 | AC7 | Open the PR's CI run → `build` job | A **Type check** step runs after "Install dependencies" and before "Unit tests", and passes. | GitHub Actions |
| 6 | AC5 | After deploy, open https://devguff.com, open the recruiter popup, play the Loom video and click fullscreen. | The video plays with no visible border, and fullscreen works. | Production (browser) |
