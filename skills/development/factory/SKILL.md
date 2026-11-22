---
name: factory
description: Run a feature's shaped backlog through the line - pick the slices that are ready (not done, blockers merged, seams present) from the GitHub issues, Azure DevOps work items or backlog.md, and for each one create a git worktree and branch, implement it in a subagent, open a PR (or keep a local branch when there is no remote), have a fresh agent review it and check that every acceptance criterion has a test, fix what it finds and re-review (at most 2 fix rounds), then merge it when clean. The user's gate is the approved backlog before the run; they only get back STOP questions, PRs that could not be merged and the findings left. Use when the user wants to run, produce or process a backlog, implement all the ready slices, "run the factory", "produci il backlog", "/factory <feature>".
---

# Factory

Take a feature backlog shaped by shape-it from its ready slices to merged code. This version is attended and sequential: the user starts it, slices go one at a time, each one is implemented, reviewed, fixed and merged without waiting for the user. The only human gate is the backlog the user approved before the run. What comes back to the user: questions a slice raises (`STOP`), PRs that could not be merged and why, and the review findings still open after the fix rounds.

## 0. Orient

- Feature: `$ARGUMENTS` names it (a folder under `docs/backlog/`). If it is empty and there is exactly one folder, use it; otherwise ask which one.
- Read `CLAUDE.md`/`AGENTS.md` (the app's, and the workspace root's if the app sits inside one): default branch, merge strategy, PR rules, test commands, `Provider:`. Never ask what you can read.
- Mode, the first of these that answers:
  1. the `Provider:` line in `CLAUDE.md` (`azure-devops`, `github` or `local`, as workspace-setup writes it);
  2. the `**Tracker:**` header of `docs/backlog/<feature>/scope.md` (`github:<owner/repo>`, `ado:<org/project>`; `none` says nothing);
  3. `git remote get-url origin`: `github.com` → github; `dev.azure.com` or `visualstudio.com` → azure-devops; no remote or any other host → local.
- Prerequisites:
  - **github**: `gh auth status` must work.
  - **azure-devops**: `az account show` must work, with the azure-devops extension. Never rely on global defaults: pass `--org https://dev.azure.com/<org> --project <project>` on every `az repos` and `az boards` command.
  - **local**: only `git`. There is no fetch, no push and no PR: wherever this file says `origin/<default>` use `<default>`, skip every `git fetch`, and look for in-progress branches locally only.
- Default branch: remote modes `git symbolic-ref refs/remotes/origin/HEAD`, else the one `CLAUDE.md` names, else ask. Local mode: the current branch of the main checkout if `CLAUDE.md` names it, else `main` or `master`, whichever exists, else ask. Remote modes then run `git fetch --prune origin`, so a slice branch deleted on the server doesn't count as in progress.
- Work happens in worktrees, so the main checkout doesn't need to be clean. It is touched only by the local-mode merge (2f).
- The factory runs implement and kets-review from the files next to it: if `${CLAUDE_SKILL_DIR}/../implement/SKILL.md` or `${CLAUDE_SKILL_DIR}/../kets-review/SKILL.md` is missing, stop and say which one to install.

## 1. Pick the ready slices

The state lives in the tracker or in git, not in a new file. Where the slices come from:

- **github**, feature published (scope.md Tracker `github:<owner/repo>`): find the `[Epic] <name>` issue (`gh issue list --repo <owner/repo> --search "[Epic] <name> in:title" --json number,title`); its task list gives the slice issues `S<id> · <title>`. Read each with `gh issue view <n> --repo <owner/repo> --json number,title,state,body`.
  - done: the issue is closed.
  - waiting: a `Blocked by: #n` line in the body names an issue that is still open.
  - no seams: no `### Seams` in the body.
- **azure-devops**, feature published (scope.md Tracker `ado:<org/project>`, Feature URL in the `backlog.md` header): `az boards work-item show --id <feature> --expand relations --org ... --project ...`; the children (relation `System.LinkTypes.Hierarchy-Forward`) titled `S<id> · ...` are the slices. Read each the same way.
  - done: state Done, Closed or Resolved (state category Completed).
  - waiting: a Predecessor link (`System.LinkTypes.Dependency-Reverse`) to a work item not done.
  - no seams: no Seams in the Description. Acceptance criteria are in `Microsoft.VSTS.Common.AcceptanceCriteria` (HTML).
- **backlog.md** (local mode, or the feature was never published: Tracker `none` or missing, and then say so in one line): read it as merged, `git show origin/<default>:docs/backlog/<feature>/backlog.md` (`<default>:` in local mode). `**Status:** done` lands there only when the slice is merged.
  - done: `**Status:** done`.
  - waiting: a slice in its `Blocked by` is not done.
  - no seams: no `### Seams` section.

Every source gets, checked in this order, one state per slice (`S3`, `S3a`...):

- **done**, as above.
- **in progress**: the branch `slice/<feature>/S<id>` exists locally or on origin (`git branch -a --list "*slice/<feature>/S<id>"`). It has an open PR or a question waiting for the user; skip it.
- **waiting**, as above.
- **no seams**, as above: implement would stop to agree them; send it to shape-it's refine mode.
- **ready**: none of the above.

Show a table (slice, state, reason) and the ready slices in backlog order. Ask the user once to confirm the run: all the ready slices, or the ones they name. This is the only question before the run. The confirmation covers slices that become ready during the run, once the slices they wait on are merged; if the user named specific slices, only those run.

## 2. For each ready slice, one at a time

`<skills>` below is the absolute path of `${CLAUDE_SKILL_DIR}/..`; `<wt>` is the slice's worktree, as an absolute path.

### 2a. Worktree

`git worktree add ../<repo>-<feature>-S<id> -b slice/<feature>/S<id> origin/<default>`, next to the repo, not inside it. Never use Claude's own worktree isolation.

When the slice came from a tracker, write its text to a temp file `<spec>` outside the repo: title, then the body (GitHub) or the Description and the acceptance criteria (Azure DevOps, HTML converted to markdown). It is the spec for the slice.

### 2b. Implement

Launch a subagent with this brief, placeholders filled:

> Implement slice S<id> of `docs/backlog/<feature>/backlog.md`. [Tracker only: The spec for S<id> is `<spec>`, outside the worktree: read it and use it instead of the slice text in `backlog.md`; implement's `**Status:** done` update goes to `backlog.md` as usual if the slice is there.] Work only in `<wt>`: run every command there and read or write only files under it. Read `<skills>/implement/SKILL.md` and follow it, skipping its frontmatter; `${CLAUDE_SKILL_DIR}` in that file stands for `<skills>/implement`. There is no user to ask: wherever implement says to stop and ask or to wait for the user (ADR conflict, duplicate slice, seams to agree), stop there, change nothing more, don't commit, and return `STOP:` followed by the question verbatim, with the quotes implement asks for. If `/simplify` or `/code-review` can't be invoked as a skill, do that step yourself on the diff and say so in the report. When done, return `DONE:`, the commit SHA and implement's final report.

- `STOP:` → leave the worktree and the branch as they are (the next run lists the slice as in progress), keep the question for the final report, move on to the next slice.
- `DONE:` → check it: `git -C <wt> log origin/<default>..HEAD` shows the commit. In backlog.md mode the slice also has `**Status:** done` in `<wt>`'s `backlog.md`. If not, treat it as a stop and say what is missing.

### 2c. Pull request

Remote modes: `git -C <wt> push -u origin slice/<feature>/S<id>`. Local mode: no PR; the review target is the branch `slice/<feature>/S<id>` and its diff `git diff <default>...slice/<feature>/S<id>`. Skip to 2d.

- Title `S<id> · <slice title>`. Body, written to a temp file: a link to the slice, its tracker URL if it has one, and implement's final report.
- GitHub: `gh pr create --base <default> --head slice/<feature>/S<id> --title "<title>" --body-file <file>`. When the slice is an issue, the body includes the line `Closes #<issue>`.
- Azure DevOps: `az repos pr create --source-branch slice/<feature>/S<id> --target-branch <default> --title "<title>" --description "@<file>" --org ... --project ...`, plus `--work-items <id>` when the slice is a work item. The description is capped at 4000 characters: if the body is longer, keep the slice link, the tracker and each criterion → its test, and cut the rest of the report.
- Note the PR number.

### 2d. Review by a fresh agent

Launch a new subagent, one that never saw the implementation, with this brief. The acceptance criteria are the ones in `<spec>` or in the slice in `backlog.md`.

> Review PR <n>, slice S<id>. Work in `<wt>`. Read `<skills>/kets-review/SKILL.md` and follow it with the arguments `<n> --comment`; `${CLAUDE_SKILL_DIR}` in that file stands for `<skills>/kets-review`. Then the correctness review. GitHub: run `/code-review <n> --comment`. Azure DevOps: `/code-review` can't comment there, so run `/code-review slice/<feature>/S<id>` and post its findings as one thread the way kets-review step 8 posts on Azure DevOps, with `**code-review**` as the first line and the thread active if there is any finding, closed otherwise. If `/code-review` can't be invoked, review the diff for correctness bugs yourself and post that instead, saying so. Then the tests: map every acceptance criterion of the slice (`<spec>` or `backlog.md`) to the test that validates it, and run the full test suite. Report the criteria that have no test, whose test doesn't really check the criterion, or whose test fails. Return the kets-review verdict, the code-review findings, the criterion → test map with its gaps, the test suite result and where each comment was posted.

Local mode, no PR: run kets-review on the branch without `--comment`, and `/code-review slice/<feature>/S<id>`; post nothing, return the findings to the factory. The brief otherwise stays the same.

**Clean** means all of: the kets-review verdict is not "fixes needed", no real code-review bug, every criterion has a passing test that checks it, the full suite is green.

### 2e. Fix and re-review, at most 2 fix rounds

Never ask the user in this loop. If the review is not clean, launch a fix subagent in `<wt>` with the review's findings. It:

- fixes every real finding, including kets-review "Against a decision" ones, by aligning the code with the ADR; it never edits or supersedes an ADR and never asks;
- writes the missing tests so each acceptance criterion is validated by a test (or, where implement allows it, a named executable check);
- runs the full suite, commits, and pushes (not in local mode).

Then launch a NEW fresh review agent with the 2d brief (on a PR it posts a new comment). Repeat until clean, for at most 2 fix rounds. Still not clean after round 2: don't merge, leave the PR (or the branch) open with its comments, and keep the remaining findings for the final report.

### 2f. Merge when clean

- GitHub: `gh pr merge <n> --merge`, or the merge strategy `CLAUDE.md` names. No `--delete-branch`: it also tries to delete the local branch, which fails while it is checked out in `<wt>`; the cleanup below deletes it.
- Azure DevOps: `az repos pr update --id <n> --status completed --transition-work-items true --delete-source-branch true --org ...`.
- Remote modes: if the merge is refused (branch protection, required reviewers, policies, conflicts), don't force or bypass anything: leave the PR open and keep the reason for the final report.
- Local mode: merge only when the main checkout is on `<default>` and `git -C <repo> status --porcelain` is empty: `git -C <repo> merge --no-ff slice/<feature>/S<id>`. Otherwise leave the branch and report why. On a conflict: `git -C <repo> merge --abort`, leave the branch, report.

After a successful merge, clean up yourself, never leave it to the user, in this order: `git worktree remove <wt>`; `git branch -D slice/<feature>/S<id>` (the merge was verified, and `-D` avoids the "not fully merged" refusal after a squash or rebase); on GitHub `git push origin --delete slice/<feature>/S<id>` (ignore "remote ref does not exist"; Azure DevOps already deleted it); in remote modes `git fetch --prune origin`. Worktrees and branches of slices that were not merged (STOP, PR left open) stay: they hold work. Then go back to step 1 to recompute the states: slices that waited on the merged one may now be ready, and they run in this session, in backlog order, without asking again.

## 3. Clean up and final report

At the end of the run delete the temp files the factory wrote (PR bodies, slice spec files, thread JSON) and run `git worktree prune`.

- Each slice run: merged (PR link, or merge commit in local mode) or left open and why (merge refused, findings left after round 2); how many review rounds it took and what was fixed; the tests added.
- Findings still open, per slice, with where they were posted.
- Each `STOP` question verbatim, with its worktree. Once the user has answered, either finish the slice by hand in its worktree, or discard it: `git worktree remove --force <wt>` (a stop leaves uncommitted work), `git branch -D slice/<feature>/S<id>`, and in remote modes `git push origin --delete slice/<feature>/S<id>` only if the branch was pushed, so the next run picks the slice up again.
- Slices skipped and why: in progress, waiting, no seams (→ shape-it refine).
- Cleaned up: the worktrees and branches of the merged slices, the temp files, stale worktree entries.
- Kept because they hold work: the worktree and branch of every slice that was not merged (STOP, PR left open), listed with their paths.
