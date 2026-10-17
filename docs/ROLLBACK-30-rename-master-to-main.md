# Rollback Runbook — #30 master → main

Use this runbook if the switch to `main` goes wrong. Each section is a set of shell commands that Claude can run if you ask it to ("roll back #30"). The steps that need a person are marked **👤 HUMAN**.

**How urgent is a rollback?** Not very. GitHub Pages keeps serving the last successful deployment, so a failed or blocked deploy never takes the site down. The worst case is that new posts don't publish until the problem is fixed. Fixing forward is usually quicker than a full rollback, so each stage lists a fix-forward option first.

## Baseline (recorded 2026-10-17, before the switch)

| Item | Value |
|------|-------|
| Repo | `mmcguff/mmcguff.github.io` |
| Default branch | `master` |
| `master` HEAD | `17a50fdc3fd5c4e028e41fa8af6a14613d4afded` (merge of PR #27) |
| `github-pages` env branch policies | `master` (id `63390092`); `custom_branch_policies: true`, `protected_branches: false` |
| Branch protection / rulesets | None |
| Pages | `build_type: workflow` |
| Last good deploy | Actions run `39049015082` (push, success) |
| `gh` auth | Account `mmcguff`, admin on the repo, scopes `repo` and `workflow`, which is enough for every command below |

## Prerequisites and human-only steps

- **👤 HUMAN: approve the risky commands.** Claude asks before renaming the branch, pushing to the default branch, or deleting a branch policy. Approve each prompt in the session. Nothing else is needed.
- **👤 HUMAN: only if `gh` auth fails.** If a command returns `401`, or `403` with "Resource not accessible", run `! gh auth refresh -h github.com -s repo,workflow` in the Claude Code prompt and finish the browser login. Claude can't do this step for you.
- **👤 HUMAN: other machines.** Claude can only fix the clone on this machine. On any other machine, run the commands under "Fix a local clone" yourself.
- **👤 HUMAN: only if the API is refused.** If GitHub rejects a rename through the API, do it in the web UI: **Settings → Branches → Default branch → ✎ (rename)**, then tell Claude to continue.

## Step 0: find out how far the switch got (read-only, Claude)

```sh
R=repos/mmcguff/mmcguff.github.io
gh api $R --jq .default_branch
gh api $R/branches --jq '.[].name'
gh api $R/environments/github-pages/deployment-branch-policies --jq '.branch_policies[] | {id,name}'
gh pr list --state all --head 30-rename-master-to-main --json number,state,baseRefName,mergeCommit
gh run list --limit 5 --json databaseId,headBranch,event,conclusion,displayTitle
```

Match the output to a stage:

| Observed | Stage | Go to |
|----------|-------|-------|
| Default `master`, policies include `main` | A: policy added, not renamed | Rollback A |
| Default `main`, PR not open or not merged | B: renamed, code not merged | Rollback B |
| Default `main`, PR merged, deploy failed or is blocked | C: merged, deploy broken | Fix forward C, else Rollback C |
| Default `main`, PR merged, `master` policy gone | D: cleanup done | Rollback D |

---

## Rollback A: policy added, branch not renamed

Remove the extra `main` policy. Leaving it in place does no harm, so this step is optional.

```sh
R=repos/mmcguff/mmcguff.github.io
ID=$(gh api $R/environments/github-pages/deployment-branch-policies --jq '.branch_policies[] | select(.name=="main") | .id')
gh api -X DELETE $R/environments/github-pages/deployment-branch-policies/$ID
```

Verify: only the `master` policy is listed.

## Rollback B: renamed, code not merged

Nothing has been deployed from `main`, so renaming the branch back is enough. GitHub retargets any open PR from `main` to `master` automatically.

```sh
R=repos/mmcguff/mmcguff.github.io
gh api -X POST $R/branches/main/rename -f new_name=master
gh api $R --jq .default_branch                     # expect: master
```

Then fix the local clone with the "back to master" commands below, and close the PR or leave it as a draft (`gh pr close <n>` or `gh pr ready --undo <n>`). Then run Rollback A if you want the `main` policy removed.

## Fix forward C (try this before Rollback C)

Common failures after the merge, and their fixes:

| Symptom in `gh run view <id> --log-failed` | Fix (Claude) |
|------|------|
| `Branch "main" is not allowed to deploy to github-pages due to environment protection rules` | `gh api -X POST $R/environments/github-pages/deployment-branch-policies -f name=main -f type=branch`, then `gh run rerun <id> --failed` |
| No run at all after the merge | Check that `deploy.yml` on `main` says `branches: [main]`. Start a run by hand: `gh workflow run deploy.yml --ref main` |
| Test or build failure | Ordinary bug: fix it on a branch and open a PR to `main`. The site keeps serving the last good build in the meantime |
| Pages source/build type changed (`gh api $R/pages --jq .build_type` ≠ `workflow`) | `gh api -X PUT $R/pages -f build_type=workflow`, then rerun |

## Rollback C: merged, deploy broken, full revert to master

Rename the branch back **first**, so that pushing the revert to `master` triggers the old workflow, which has `branches: [master]`, and redeploys automatically. The `master` env policy is still there at this stage.

```sh
R=repos/mmcguff/mmcguff.github.io
MERGE=$(gh pr view 30-rename-master-to-main --json mergeCommit --jq .mergeCommit.oid)

# 1. Rename back
gh api -X POST $R/branches/main/rename -f new_name=master

# 2. Local clone back to master (see below), then revert the merge
git switch master && git pull --ff-only
# -m 1 only for a true merge commit (two parents); a squash or rebase merge reverts without it
if git rev-parse -q --verify "$MERGE^2" >/dev/null; then git revert -m 1 --no-edit "$MERGE"; else git revert --no-edit "$MERGE"; fi
npm run test:unit                                  # the old tests assert master again
git push origin master                             # Claude asks before this push

# 3. Confirm the redeploy
gh run list --branch master --limit 1
gh run watch "$(gh run list --branch master --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Verify: the default branch is `master`, the latest `push` run on `master` succeeds including `deploy`, and the site still loads. If no run starts after the push, run `gh workflow run deploy.yml --ref master`.

If you want, run Rollback A afterwards to remove the `main` policy.

## Rollback D: cleanup already done

Do the same as Rollback C, but first put the `master` policy back, or the redeploy from `master` will be rejected:

```sh
R=repos/mmcguff/mmcguff.github.io
gh api -X POST $R/environments/github-pages/deployment-branch-policies -f name=master -f type=branch
```

Then run every step of Rollback C.

---

## Fix a local clone

**Back to master** (after Rollback B, C or D). Claude does this on this machine; **👤 HUMAN** on other machines:

```sh
git switch main 2>/dev/null || true
git branch -m main master
git fetch origin --prune
git branch -u origin/master master
git remote set-head origin -a
git rev-parse --abbrev-ref origin/HEAD             # expect: origin/master
```

**Forward to main** (the normal switch, or after recovering from a rollback):

```sh
git branch -m master main
git fetch origin --prune
git branch -u origin/main main
git remote set-head origin -a
```

## After any rollback

- Comment on #30 with what failed and which rollback ran (Claude can do this with `gh issue comment 30`).
- Leave #30 open, because it's still the ticket for a second attempt.
