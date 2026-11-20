---
name: factory
description: Run a feature's shaped backlog through the line - pick the slices that are ready (not done, blockers merged, seams present), and for each one create a git worktree and branch, implement it in a subagent, open a PR and have a fresh agent review it with comments posted on the PR (GitHub or Azure DevOps), with at most one fix round. The user stays at the two gates - the approved backlog before, the merge after. Use when the user wants to run, produce or process a backlog, implement all the ready slices, "run the factory", "produci il backlog", "/factory <feature>".
---

# Factory

Take a feature backlog shaped by shape-it from its ready slices to reviewed PRs. This version is attended and sequential: the user starts it, slices go one at a time, and every question a slice raises comes back to the user. The two human gates stay outside the run: the backlog the user approved before it, the merge after it.

## 0. Orient

- Feature: `$ARGUMENTS` names it (a folder under `docs/backlog/`). If it is empty and there is exactly one folder, use it; otherwise ask which one.
- Read `CLAUDE.md`/`AGENTS.md`: default branch, PR rules, test commands. Never ask what you can read.
- Provider, from `git remote get-url origin`: `github.com` → GitHub (`gh auth status` must work); `dev.azure.com` or `visualstudio.com` → Azure DevOps (`az account show` must work, with the azure-devops extension). Anything else, or no remote: stop, the factory needs PRs.
- Default branch: `git symbolic-ref refs/remotes/origin/HEAD`; if that fails, the one `CLAUDE.md` names; otherwise ask. Then `git fetch --prune origin`, so a slice branch deleted on the server doesn't count as in progress.
- The main checkout is never touched: all work happens in worktrees, so it doesn't need to be clean.
- The factory runs implement and kets-review from the files next to it: if `${CLAUDE_SKILL_DIR}/../implement/SKILL.md` or `${CLAUDE_SKILL_DIR}/../kets-review/SKILL.md` is missing, stop and say which one to install.

## 1. Pick the ready slices

The state lives in git, not in a new file.

- Read the backlog as merged: `git show origin/<default>:docs/backlog/<feature>/backlog.md`. A slice's `**Status:** done` lands there only when its PR is merged.
- Give each slice (`S3`, `S3a`...) one state, checked in this order:
  - **done**: `**Status:** done` on the default branch.
  - **in progress**: the branch `slice/<feature>/S<id>` exists locally or on origin (`git branch -a --list "*slice/<feature>/S<id>"`). It has an open PR or a question waiting for the user; skip it.
  - **waiting**: a slice in its `Blocked by` is not done.
  - **no seams**: it has no `### Seams` section. implement would stop to agree them; send it to shape-it's refine mode.
  - **ready**: none of the above.
- Show a table (slice, state, reason) and the ready slices in backlog order. Ask the user once to confirm the run: all the ready slices, or the ones they name. This is the only question before the run.

## 2. For each ready slice, one at a time

`<skills>` below is the absolute path of `${CLAUDE_SKILL_DIR}/..`; `<wt>` is the slice's worktree, as an absolute path.

### 2a. Worktree

`git worktree add ../<repo>-<feature>-S<id> -b slice/<feature>/S<id> origin/<default>`, next to the repo, not inside it. Never use Claude's own worktree isolation.

### 2b. Implement

Launch a subagent with this brief, placeholders filled:

> Implement slice S<id> of `docs/backlog/<feature>/backlog.md`. Work only in `<wt>`: run every command there and read or write only files under it. Read `<skills>/implement/SKILL.md` and follow it, skipping its frontmatter; `${CLAUDE_SKILL_DIR}` in that file stands for `<skills>/implement`. There is no user to ask: wherever implement says to stop and ask or to wait for the user (ADR conflict, duplicate slice, seams to agree), stop there, change nothing more, don't commit, and return `STOP:` followed by the question verbatim, with the quotes implement asks for. If `/simplify` or `/code-review` can't be invoked as a skill, do that step yourself on the diff and say so in the report. When done, return `DONE:`, the commit SHA and implement's final report.

- `STOP:` → leave the worktree and the branch as they are (the next run lists the slice as in progress), keep the question for the final report, move on to the next slice.
- `DONE:` → check it: `git -C <wt> log origin/<default>..HEAD` shows the commit, and the slice has `**Status:** done` in `<wt>`'s `backlog.md`. If not, treat it as a stop and say what is missing.

### 2c. Pull request

- `git -C <wt> push -u origin slice/<feature>/S<id>`.
- Title `S<id> · <slice title>`. Body, written to a temp file: a link to the slice, its `**Tracker:**` URL if it has one, and implement's final report.
- GitHub: `gh pr create --base <default> --head slice/<feature>/S<id> --title "<title>" --body-file <file>`.
- Azure DevOps: `az repos pr create --source-branch slice/<feature>/S<id> --target-branch <default> --title "<title>" --description "@<file>"`, plus `--work-items <id>` when the slice's `Tracker` is a work item. The description is capped at 4000 characters: if the body is longer, keep the slice link, the tracker and each criterion → its test, and cut the rest of the report.
- Note the PR number.

### 2d. Review by a fresh agent

Launch a new subagent, one that never saw the implementation, with this brief:

> Review PR <n>, slice S<id>. Work in `<wt>`. Read `<skills>/kets-review/SKILL.md` and follow it with the arguments `<n> --comment`; `${CLAUDE_SKILL_DIR}` in that file stands for `<skills>/kets-review`. Then the correctness review. GitHub: run `/code-review <n> --comment`. Azure DevOps: `/code-review` can't comment there, so run `/code-review slice/<feature>/S<id>` and post its findings as one thread the way kets-review step 8 posts on Azure DevOps, with `**code-review**` as the first line and the thread active if there is any finding, closed otherwise. If `/code-review` can't be invoked, review the diff for correctness bugs yourself and post that instead, saying so. Return the kets-review verdict, the number of code-review findings and where each comment was posted.

### 2e. One fix round

If kets-review says "fixes needed" or code-review found real bugs, launch a subagent in `<wt>` that fixes them, runs the tests, commits and pushes. Never an "Against a decision" finding: that one stays for the user. Then stop: no second review. The PR goes to the user with its comments; note what was fixed.

## 3. Final report

- Each slice run: the PR link, the review verdict, the fixes applied; or the `STOP` question verbatim, with its worktree.
- For each `STOP`: once the user has answered, either finish the slice by hand in its worktree, or discard it: `git worktree remove --force <wt>` (a stop leaves uncommitted work), `git branch -D slice/<feature>/S<id>`, and `git push origin --delete slice/<feature>/S<id>` only if the branch was pushed, so the next run picks the slice up again.
- Slices skipped and why: in progress, waiting, no seams (→ shape-it refine).
- Next for the user: read the PRs and merge them. Worktrees stay until the merge; then `git worktree remove ../<repo>-<feature>-S<id>`.
- After merging, run the factory again: the slices that were waiting become ready.
- A slice whose blocker has an open PR is waiting until that PR is merged: a backlog that is one chain gives one PR per run.
