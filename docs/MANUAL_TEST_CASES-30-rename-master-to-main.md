# Manual Test Cases — #30 Rename the default branch from master to main

The automated unit tests check AC2, AC5 and AC6. The cases below cover the GitHub-side checks (AC1, AC3, AC4) and the order of the switch. Run them in order: each one is a checkpoint, and the runbook in `docs/ROLLBACK-30-rename-master-to-main.md` uses them to tell how far the switch got.

| # | Steps | Expected Result | Environment |
|---|-------|------------------|-------------|
| 1 | Before the switch, record the baseline: `gh api repos/mmcguff/mmcguff.github.io --jq .default_branch`, `git rev-parse origin/master`, and the `github-pages` branch policies (`gh api repos/mmcguff/mmcguff.github.io/environments/github-pages/deployment-branch-policies --jq '.branch_policies[] \| {id,name}'`) | `master`; `17a50fdc3fd5c4e028e41fa8af6a14613d4afded`; one policy `master` (id `63390092`) | GitHub settings |
| 2 | Add the `main` policy: `gh api -X POST repos/mmcguff/mmcguff.github.io/environments/github-pages/deployment-branch-policies -f name=main -f type=branch`, then list the policies again | Two policies: `master` and `main` | GitHub settings |
| 3 | Rename: `gh api -X POST repos/mmcguff/mmcguff.github.io/branches/master/rename -f new_name=main` | Response `name` is `main` | GitHub |
| 4 | **AC1:** `gh api repos/mmcguff/mmcguff.github.io --jq .default_branch`, then `gh api repos/mmcguff/mmcguff.github.io/branches/master` | `main`; the second command returns 404 or a redirect to `main` (GitHub may redirect the old name, but there's no separate `master` branch: `gh api repos/mmcguff/mmcguff.github.io/branches --jq '.[].name'` lists no `master`) | GitHub |
| 5 | Update the local clone: `git branch -m master main && git fetch origin && git branch -u origin/main main && git remote set-head origin -a`, then `git rev-parse --abbrev-ref origin/HEAD` | `origin/main`; the local `main` tracks `origin/main` | Local |
| 6 | Rebase the feature branch onto `origin/main`, push it, and open a PR targeting `main` | The PR's base is `main` | GitHub |
| 7 | **AC4:** watch the PR's checks (`gh pr checks <n> --watch`) | The "Deploy to GitHub Pages" workflow runs; the `build` job passes; the `deploy` job is **skipped** | GitHub Actions (PR) |
| 8 | **AC3:** merge the PR, then `gh run list --branch main --limit 1` and `gh run watch <id>` | A `push` run on `main`; `build` and `deploy` both succeed; no "Branch main is not allowed to deploy to github-pages" error | GitHub Actions (prod Pages) |
| 9 | **AC3:** open https://mmcguff.github.io/blog/rebuilding-my-site-with-astro/ | The page loads, and the deploy note now says "Only pushes to `main` deploy" | prod (Pages) |
| 10 | Clean up: delete the old policy with `gh api -X DELETE repos/mmcguff/mmcguff.github.io/environments/github-pages/deployment-branch-policies/63390092`, then list the policies | Only `main` remains | GitHub settings |
| 11 | Repeat step 5 on any **other** machine that has a clone of this repo | That clone tracks `origin/main` | Other machines (human step) |
