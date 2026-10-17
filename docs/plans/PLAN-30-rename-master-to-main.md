# Plan: #30 — Rename the default branch from master to main

## Problem Statement
The repository's default branch is `master`, while current Git and GitHub conventions default to `main`. The deploy workflow, its tests, the readme and a published blog post all name `master` explicitly, so the rename has to change those references together or GitHub Pages deploys will stop.

## Scope
**In scope:**
- Renaming the GitHub default branch from `master` to `main` (GitHub redirects old URLs and moves branch protection).
- Updating every live `master` reference: the deploy workflow's branch filters, the workflow unit tests (including the AC11 comment), `readme.MD`, and `src/content/blog/rebuilding-my-site-with-astro.mdx`.
- Checking the `github-pages` environment's deployment-branch rule and switching it to `main` if it is limited to `master`.
- Instructions for updating local clones.

**Out of scope:**
- Editing the historical #18 records (`docs/plans/PLAN-18-*.md`, `docs/MANUAL_TEST_CASES-18-*.md`). They describe the repo as it was and stay unchanged.
- Any other workflow, build or content changes.

## Acceptance Criteria
- [ ] AC1: Given the repository on GitHub, when its settings are queried, then the default branch is `main` and no `master` branch exists.
- [ ] AC2: Given the deploy workflow, when its triggers are parsed, then `push` and `pull_request` are filtered to `main` and not `master`.
- [ ] AC3: Given a push to `main`, when the workflow runs, then it builds, tests and deploys to GitHub Pages, and the `github-pages` environment accepts the deployment.
- [ ] AC4: Given a pull request targeting `main`, when the workflow runs, then it builds and tests without deploying.
- [ ] AC5: Given the workflow, tests, `readme.MD` and published blog content, when they are searched for the word `master` (excluding the historical #18 docs and lockfiles), then nothing is found.
- [ ] AC6: Given the existing unit test suite, when it runs after the change, then all tests pass, with the workflow trigger assertions checking `main`.

## Open Questions
- None. The prerequisite in the ticket (#27 merged, no open PRs targeting `master`) is satisfied as of 2026-10-17.

## Technical Design

**What recon found**
- `.github/workflows/deploy.yml` is the only workflow. `push` and `pull_request` are filtered to `[master]`, and there's also a `workflow_dispatch` trigger. The deploy job targets the `github-pages` environment.
- The `github-pages` environment has a **custom deployment-branch policy that allows only `master`** (`custom_branch_policies: true`, one policy named `master`). Renaming the branch moves branch protection rules, but it doesn't touch environment branch policies. Unless `main` is added, every deploy from `main` will be rejected. This is the ticket's step 3, and it does need doing.
- `master` has no branch protection or rulesets, so there's nothing to migrate there.
- Pages is set to `build_type: workflow`. Its `source.branch` doesn't matter for workflow-based deploys.
- No `WORKSPACE_MAP.md` or ADR exists, so there's no advisory input from either.

**Sequencing: rename first, then open the PR against `main`**

The order matters because of how a `pull_request` run gets triggered. It uses the workflow file from the PR's merge commit, and the branch filter is checked against the PR's base branch.
- If the code PR targets `master` and changes the filter to `main`, its CI never runs: the base is `master`, but the new filter says `main`. Merging it then pushes to `master`, which also doesn't match, so nothing deploys until the rename.
- If the rename happens first and the PR then targets `main`, both CI and the deploy work. The base and the filter are both `main`, so CI runs on the PR, and merging is a push to `main`, which deploys.

Steps:
1. **Environment policy (additive):** add a `main` deployment-branch policy to `github-pages` and leave `master` in place for now.
   `gh api -X POST repos/mmcguff/mmcguff.github.io/environments/github-pages/deployment-branch-policies -f name=main -f type=branch`
2. **Rename on GitHub:** `gh api -X POST repos/mmcguff/mmcguff.github.io/branches/master/rename -f new_name=main`. This changes the remote and needs explicit confirmation from the user when it's carried out.
3. **Local clone:** `git branch -m master main && git fetch origin && git branch -u origin/main main && git remote set-head origin -a`.
4. **Feature branch off `main`** (`30-rename-master-to-main`): make the file changes below, then open a PR to `main`. CI runs, and the deploy job is skipped because the event is a pull request.
5. **Merge** → push to `main` → build, test and deploy. This verifies AC3.
6. **Cleanup:** delete the `master` policy from the `github-pages` environment once the deploy from `main` succeeds.

Between steps 2 and 5, a push to `main` wouldn't deploy because the old filter still says `master`. Nobody else pushes to this repo and nothing else is in flight, so that window doesn't matter, and `workflow_dispatch` is there if a redeploy is needed.

**Rollback:** rename `main` back to `master` (GitHub supports renaming again), revert the merge commit, and keep or restore the `master` environment policy. Until step 6 the `master` policy is still there, so a rollback before then only needs the rename and the revert.

**Pattern:** this is configuration and text only. It adds no new code, dependencies or abstractions. The new test follows the existing style in `tests/unit/repo.test.ts`: plain `fs` reads relative to `ROOT`.

## File Changes
| File | Change | Reason |
|------|--------|--------|
| `.github/workflows/deploy.yml` | Modify | `push` and `pull_request` branch filters `[master]` → `[main]` (AC2) |
| `tests/unit/workflow.test.ts` | Modify | Trigger assertions and test names `master` → `main`, plus `not.toContain('master')`; update the AC11 comment (AC2, AC6) |
| `tests/unit/repo.test.ts` | Modify | New `describe` that scans the workflow, `readme.MD`, `src/` and `tests/` for `\bmaster\b`, excluding itself (AC5) |
| `readme.MD` | Modify | Lines 15 and 47: `master` → `main` (AC5) |
| `src/content/blog/rebuilding-my-site-with-astro.mdx` | Modify | Line 88: "Only pushes to `master` deploy" → `main` (AC5) |
| `docs/MANUAL_TEST_CASES-30-rename-master-to-main.md` | New | Manual verification steps for AC1, AC3 and AC4 (written by test-builder) |
| `docs/ROLLBACK-30-rename-master-to-main.md` | New | Stage-by-stage rollback runbook (Claude can run it; human steps marked), added at the user's request during test-builder |
| GitHub settings (not a file) | Modify | Rename the default branch, and add then remove the `github-pages` env branch policies (AC1, AC3) |

## Test Strategy
| Acceptance Criteria | Test Type | Notes |
|----------------------|-----------|-------|
| AC1 default branch is `main`, no `master` | Manual (gh API) | `gh api repos/mmcguff/mmcguff.github.io --jq .default_branch` → `main`; `gh api repos/.../branches/master` → 404 |
| AC2 workflow triggers on `main` | Unit | `workflow.test.ts`: `on.push.branches` and `on.pull_request.branches` contain `main` and not `master` |
| AC3 push to `main` deploys | Manual (CI observation) | After merge: the run on `main` succeeds, the deploy job succeeds (the env policy accepts `main`), and the site is live |
| AC4 PR to `main` builds without deploying | Manual (CI observation) + existing unit | The PR's CI run executes, the deploy job is skipped; already covered structurally by the existing "never deploys from a pull request" test |
| AC5 no `master` references remain | Unit | `repo.test.ts` scan; excludes `docs/` (historical #18 records), lockfiles and the scanning test file itself |
| AC6 suite passes | Unit (whole suite) | `npm run test:unit` green; CI also runs the integration and e2e suites |

## Blessed Path Check
- Existing component considered: GitHub's built-in branch rename API, which redirects URLs, retargets PRs and moves protection rules, plus the existing `deploy.yml` workflow and the vitest unit suite.
- Verdict: **Reuse.** Use the native rename and edit the configuration in place. Nothing custom is needed.
