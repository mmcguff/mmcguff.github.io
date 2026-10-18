# Plan: #29 — Add astro check type checking to CI

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/29

## Problem Statement
`astro build` transpiles with esbuild and never type-checks. `tsconfig.json` extends `astro/tsconfigs/strict`, yet nothing enforces it, so type errors in `.astro` and `.ts` files (for example wrong `BlogPostLayout` props or a bad content-collection field) ship silently. A probe run of `astro check` on `main` (2026-10-18) found 1 error and 2 hints:
- error ts(2322): `webkitallowfullscreen`/`mozallowfullscreen` on the Loom iframe in `src/pages/index.astro:871` aren't valid `IframeHTMLAttributes`.
- hint ts(6385): `frameborder` is deprecated (same iframe).
- hint ts(7027): "Unreachable code detected" on the Calendly `onclick="…;return false;"` (`index.astro:888`). This is a false positive from inline-handler analysis.

## Scope
**In scope:**
- `@astrojs/check` and `typescript` as devDependencies, plus an `npm run check` script running `astro check`.
- A CI step in the `build` job of `.github/workflows/deploy.yml` that runs the check **before** `npm run build` and fails the job on type **errors** (astro check's exit code 1). Warnings and hints are printed but don't block.
- Unit-test assertions in `tests/unit/workflow.test.ts` that the check step exists and runs before the build.
- Fix the current error, and the `frameborder` hint on the same iframe, without changing how the popup looks or behaves.
- A readme line documenting `npm run check`.

**Out of scope:**
- Failing CI on warnings or hints.
- Running the check inside `npm run build` (local builds stay as they are).
- The Calendly `onclick` hint (false positive; left as-is).
- Broader TypeScript refactors, stricter tsconfig flags, or type-checking the test files beyond what `astro check` already covers.

## Acceptance Criteria
- [ ] AC1: Given `package.json`, when inspected, then `@astrojs/check` and `typescript` are in `devDependencies` (not `dependencies`), and `scripts.check` is `astro check`.
- [ ] AC2: Given a clean checkout after `npm ci`, when `npm run check` runs, then it exits 0 and reports **0 errors** and **0 warnings**.
- [ ] AC3: Given the workflow, when parsed, then the `build` job has a step running `npm run check`, placed after `npm ci` and before `npm run build`.
- [ ] AC4: Given a deliberate type error is introduced in a `.astro` or `.ts` file, when `npm run check` runs, then it exits non-zero. (Manual, plus proof in the PR, since CI has to stay green on main.)
- [ ] AC5: Given the built homepage, when the recruiter popup's Loom iframe is inspected, then it has `allowfullscreen`, no `webkitallowfullscreen`, `mozallowfullscreen` or `frameborder` attributes, and its inline style includes `border: 0`, with the same `src` as before.
- [ ] AC6: Given the readme, when read, then it lists `npm run check` with the other local commands.
- [ ] AC7: Given the PR's CI run, when it completes, then the check step ran and passed, and unit, integration and E2E suites pass.

## Open Questions
- None.

## Technical Design

**Pattern: Astro's documented CI type check.** Per the Astro docs (Context7 `/withastro/docs`, CLI reference and TypeScript guide): since Astro 3, `astro check` lives in the separate `@astrojs/check` package and needs `typescript` installed. It runs `astro sync` first, so content-collection types are generated, then type-checks `.astro` and `.ts` files, and "if any errors are found the process will exit with a code of 1". It is "intended to be used in CI workflows". Exiting only on errors is exactly the "errors block, warnings/hints don't" policy, so no wrapper or `--minimumSeverity` flag is needed.

**Versions:** `@astrojs/check@^0.9.10` (latest, 2026-07-27) declares `peerDependencies: { typescript: '^5.0.0 || ^6.0.0' }`. The latest `typescript` is 7.0.2, which is outside that range, so a bare `npm i -D typescript` would pull a peer-incompatible 7.x. Pin **`typescript@^6.0.3`**. The probe run already resolved 6.0.3 and worked.

**CI placement:** a new `Type check` step (`npm run check`) in the `build` job, right after `Install dependencies` and before `Unit tests`. Type errors are the cheapest failure to detect, so they fail fast before the slower build and E2E steps. This still satisfies "before `npm run build`".

**Iframe fix (`src/pages/index.astro:871`):** remove `webkitallowfullscreen`, `mozallowfullscreen` and `frameborder="0"`, keep `allowfullscreen`, and append `border: 0;` to the existing inline style. `src` and layout are unchanged. Vendor-prefixed fullscreen attributes are obsolete in every supported browser, so the popup looks and behaves the same.

**Not changed:** the Calendly `onclick` (a false-positive hint), `tsconfig.json` (already `strict`), and the `build` script.

## File Changes
| File | Change | Reason |
|------|--------|--------|
| `package.json` | Modify | devDependencies `@astrojs/check@^0.9.10`, `typescript@^6.0.3`; script `"check": "astro check"` (AC1) |
| `package-lock.json` | Modify | Lockfile for the two new devDependencies |
| `.github/workflows/deploy.yml` | Modify | `Type check` step running `npm run check` after `npm ci`, before unit tests and build (AC3) |
| `tests/unit/workflow.test.ts` | Modify | Assert the check step exists and is ordered after `npm ci` and before `npm run build` (AC3) |
| `tests/unit/package.test.ts` | New | Assert devDependency placement, the peer-compatible TypeScript major, and the `check` script (AC1) |
| `src/pages/index.astro` | Modify | Loom iframe attributes (AC2, AC5) |
| `tests/integration/homepage.test.ts` | Modify | Built iframe: `allowfullscreen`, no prefixed or `frameborder` attributes, `border: 0`, same `src` (AC5) |
| `tests/unit/repo.test.ts` | Modify | Readme mentions `npm run check` (AC6) |
| `readme.MD` | Modify | Add `npm run check` to the local commands block (AC6) |
| `docs/MANUAL_TEST_CASES-29-astro-check-in-ci.md` | New (by test-builder) | Deliberate-error check and CI verification (AC2, AC4, AC7) |

## Test Strategy
| Acceptance Criteria | Test Type | Notes |
|----------------------|-----------|-------|
| AC1 deps + script | Unit | Parse `package.json`: both packages in `devDependencies` only, `typescript` range starts `^6`, `scripts.check === 'astro check'` |
| AC2 zero errors/warnings | CI + manual | The CI step itself is the test (it exits 1 on errors). Manually confirm the summary shows `0 errors, 0 warnings`. |
| AC3 CI order | Unit | Extend the existing order assertion in `workflow.test.ts`: `npm ci` < `npm run check` < `npm run build` |
| AC4 catches errors | Manual | Add a bad prop to a `BlogPostLayout` call locally; `npm run check` exits 1. Revert. Paste the output into the PR. |
| AC5 iframe | Integration | Cheerio on `dist/index.html` iframe `[src*="loom.com/embed"]` |
| AC6 readme | Unit | `repo.test.ts` |
| AC7 CI | CI | PR run green with the check step visible |

## Blessed Path Check
- Existing component considered: Astro's own `astro check` (`@astrojs/check`), the documented CI type-check tool.
- Verdict: **Reuse**, configured exactly as documented. There's no custom `tsc` invocation, because `tsc` alone can't type-check `.astro` files. Walmart @blessedpath/@mando don't apply.
