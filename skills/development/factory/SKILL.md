---
name: factory
description: Run a feature's shaped backlog through the line - pick the slices that are ready (not done, blockers merged, seams present) from the GitHub issues, Azure DevOps work items or backlog.md, and for each one create a git worktree and branch, pay first the open refactoring items on the files it touches, implement it in a subagent following docs/conventions.md, open a PR (or keep a local branch when there is no remote), have a fresh agent review it and check that every acceptance criterion has a test, fix what it finds and re-review until every comment is resolved (at most 3 fix rounds), then merge it when clean. The user's gate is the approved backlog before the run; they only get back STOP questions, PRs that could not be merged and the findings left. Use when the user wants to run, produce or process a backlog, implement all the ready slices, "run the factory", "produci il backlog", "/factory <feature>".
---

# Factory

Take a feature backlog shaped by shape-it from its ready slices to merged code. This version is attended and sequential: the user starts it, slices go one at a time, each one is implemented, reviewed, fixed and merged without waiting for the user. The only human gate is the backlog the user approved before the run. What comes back to the user: questions a slice raises (`STOP`), PRs that could not be merged and why, and the review comments still open after the fix rounds.

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
- Test suites: the full suite, wherever this file says so, is every suite `CLAUDE.md` lists (unit, integration, end-to-end), end-to-end included when it can run here (its prerequisites, such as the database, are up). If the project has end-to-end tests (a Playwright or Cypress config, an `e2e/` folder) that the CI config (`.github/workflows/*.yml`, `azure-pipelines.yml`) doesn't run, say so in one line with the step 1 table: green CI then doesn't cover them, and the review is the only place they run.
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

Refactoring items to pay first. Read the open ones from the project backlog, where 2f files them: GitHub `gh issue list --label refactor --state open --json number,title,body`; Azure DevOps the `refactor`-tagged query of 2f; local the unchecked lines of `docs/backlog/refactoring.md` as merged. For each ready slice, its items are the ones its Implementation notes name with `First: #<n>`, plus each open item with effort small or medium whose files overlap the files the slice touches (its `Touch:` line, or the files its seams and notes name), at most two per slice, the smallest effort first. An item goes to one slice only, the first in backlog order. Large items are never paid inside a slice.

Ceiling: when the open refactoring items outnumber the slices that are not done, say so above the table: the debt grows faster than the features, and the next round should be a refactoring round (shape-it refine turns the items into refactor slices).

Show a table (slice, state, reason, refactoring items first) and the ready slices in backlog order. Past the ceiling, the confirmation question also offers stopping for a refactoring round instead. Ask the user once to confirm the run: all the ready slices, or the ones they name. This is the only question before the run. The confirmation covers slices that become ready during the run, once the slices they wait on are merged; if the user named specific slices, only those run.

## 2. For each ready slice, one at a time

`<skills>` below is the absolute path of `${CLAUDE_SKILL_DIR}/..`; `<wt>` is the slice's worktree, as an absolute path.

### 2a. Worktree

`git worktree add ../<repo>-<feature>-S<id> -b slice/<feature>/S<id> origin/<default>`, next to the repo, not inside it. Never use Claude's own worktree isolation.

When the slice came from a tracker, write its text to a temp file `<spec>` outside the repo: title, then the body (GitHub) or the Description and the acceptance criteria (Azure DevOps, HTML converted to markdown). It is the spec for the slice.

`<shots>` is `../<repo>-<feature>-S<id>-screenshots/`, a folder outside the repo, for the slice's screenshots (2b).

### 2b. Implement

Launch a subagent with this brief, placeholders filled:

> Implement slice S<id> of `docs/backlog/<feature>/backlog.md`. [Tracker only: The spec for S<id> is `<spec>`, outside the worktree: read it and use it instead of the slice text in `backlog.md`; implement's `**Status:** done` update goes to `backlog.md` as usual if the slice is there.] Work only in `<wt>`: run every command there and read or write only files under it. Read `<skills>/implement/SKILL.md` and follow it, skipping its frontmatter; `${CLAUDE_SKILL_DIR}` in that file stands for `<skills>/implement`. There is no user to ask: wherever implement says to stop and ask or to wait for the user (ADR conflict, duplicate slice, seams to agree), stop there, change nothing more, don't commit, and return `STOP:` followed by the question verbatim, with the quotes implement asks for. If `/simplify` or `/code-review` can't be invoked as a skill, do that step yourself on the diff and say so in the report. [Refactoring items only: Before the slice, pay these refactoring items, each as its own commit before the slice's: <#n · title · files · why>, one per line. No behaviour change: the full suite is green before and after, and no existing test changes for it. If one turns out large (it changes an interface used elsewhere, or needs a decision), drop it, revert its changes, and say why in the report.] Follow the rules in `docs/conventions.md` if it exists: they are part of the spec. If the work changes an existing test, every case the old test covered must still be covered and pass: don't delete cases, don't weaken assertions, don't change expected values unless the slice's criteria require that behavior change; if they do, update the case, never remove it, and the reason is the criterion. If the diff touches UI files (views, components, templates, styles, pages) or UI text, capture in `<shots>` a PNG of every changed screen after the change, plus a "before" PNG when an existing screen changes (capture it before editing): run the app as `CLAUDE.md` says, or with the `run` skill, Playwright or a browser tool where available. If the app can't be run or captured, say so in one line. When done, return `DONE:`, the commit SHA, implement's final report, the refactoring items paid and dropped (with why), the changed existing tests (file/test name, what changed, why, "old cases kept"), the screenshot paths and the refactoring opportunities left (the kets-review ones with effort medium or large that you didn't apply), each with: title (the refactoring move + where), files, effort, why (one line, from kets-review).

- `STOP:` → leave the worktree and the branch as they are (the next run lists the slice as in progress), keep the question for the final report, move on to the next slice.
- `DONE:` → check it: `git -C <wt> log origin/<default>..HEAD` shows the commit. In backlog.md mode the slice also has `**Status:** done` in `<wt>`'s `backlog.md`. If not, treat it as a stop and say what is missing.

### 2c. Pull request

Remote modes: `git -C <wt> push -u origin slice/<feature>/S<id>`. Local mode: no PR; the review target is the branch `slice/<feature>/S<id>` and its diff `git diff <default>...slice/<feature>/S<id>`. Skip to 2d.

- Title `S<id> · <slice title>`. Body, written to a temp file, short, for a person who may read it, with no repetition: 2-4 lines on what changes; the criterion → test list, one line each; "Tests changed" when an existing test changed, one line per test: file/test name, what changed, why (the criterion), "old cases kept"; "Screenshots" when the UI changed (below); the slice link and its tracker URL if it has one. Implement's full report goes to the final report, not into the PR.
- Refactoring items paid: one line each under "Refactoring paid first" in the body.
- GitHub: `gh pr create --base <default> --head slice/<feature>/S<id> --title "<title>" --body-file <file>`. When the slice is an issue, the body includes the line `Closes #<issue>`, plus one `Closes #<n>` per refactoring item paid.
- Azure DevOps: `az repos pr create --source-branch slice/<feature>/S<id> --target-branch <default> --title "<title>" --description "@<file>" --org ... --project ...`, plus `--work-items <id>` when the slice is a work item, and the ids of the refactoring items paid. The description is capped at 4000 characters: keep the body under it.
- Note the PR number.
- Screenshots, when `<shots>` has PNGs: attach them to the PR, then delete the temp files.
  - GitHub: the CLI can't upload images to a PR. Commit them to the orphan branch `pr-assets`, never to the slice branch, so they never reach `<default>`. If `git ls-remote --heads origin pr-assets` is empty, create it once in a temporary worktree: `git worktree add --orphan -b pr-assets ../<repo>-pr-assets` (or `git switch --orphan` in it); otherwise `git worktree add ../<repo>-pr-assets pr-assets` after fetching. Copy the PNGs to `<feature>/S<id>/<name>.png`, commit, push, `git worktree remove` the temporary worktree. Embed them in the PR body, then `gh pr edit <n> --body-file`: `![<name>](https://github.com/<owner>/<repo>/blob/pr-assets/<feature>/S<id>/<name>.png?raw=true)`. The `pr-assets` branch stays: the PR images depend on it.
  - Azure DevOps: upload each PNG as a PR attachment, `az devops invoke --area git --resource pullRequestAttachments --route-parameters project=<project> repositoryId=<id> pullRequestId=<n> fileName=<name>.png --http-method POST --in-file <png> --api-version 7.1-preview`. Check that it sends the file as binary (`application/octet-stream`); if it can't, use `curl --data-binary @<png>` with a token from `az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798`. Reference the returned `url` in the description as `![<name>](<url>)`, then `az repos pr update --id <n> --description "@<file>"`.
  - Local mode: keep `<shots>` and list its paths in the final report; don't delete it.
  - The app can't be run or captured: one line under "Screenshots" in the PR body says so. It doesn't block the merge.

### 2d. Review by a fresh agent

Launch a new subagent, one that never saw the implementation, with this brief. The acceptance criteria are the ones in `<spec>` or in the slice in `backlog.md`.

> Review PR <n>, slice S<id>. Work in `<wt>`. Read `<skills>/kets-review/SKILL.md` and follow it with the arguments `<n> --comment`; `${CLAUDE_SKILL_DIR}` in that file stands for `<skills>/kets-review`. Then the correctness review. GitHub: run `/code-review <n> --comment`. Azure DevOps: `/code-review` can't comment there, so run `/code-review slice/<feature>/S<id>` and post its findings as one thread the way kets-review step 8 posts on Azure DevOps, with `**code-review**` as the first line and the thread active if there is any finding, closed otherwise. If `/code-review` can't be invoked, review the diff for correctness bugs yourself and post that instead, saying so. Then the tests: map every acceptance criterion of the slice (`<spec>` or `backlog.md`) to the test that validates it, and run the full test suite (every suite `CLAUDE.md` lists, end-to-end included when it can run here; say which ran). If the PR pays refactoring items, check that their commits change no behaviour and no existing test. Report the criteria that have no test, whose test doesn't really check the criterion, or whose test fails. Check the existing tests the slice changed: `git diff <default>...HEAD` on the test files; for each modified or deleted existing test compare the old cases with the new ones; a lost case or a weakened assertion that no criterion requires is a finding. Check that the PR body lists each changed existing test under "Tests changed". On a re-review, check that every earlier review comment on the PR got a reply and is resolved; one that didn't is a finding. Keep every comment you post short: one line per finding. Return the kets-review verdict, the code-review findings, the criterion → test map with its gaps, the test suite result, the lost or weakened test cases, the unresolved earlier comments and where each comment was posted, and the refactoring opportunities left (the kets-review opportunities with effort medium or large), each with: title (the refactoring move + where), files, effort, why (one line, from kets-review).

Local mode, no PR: run kets-review on the branch without `--comment`, and `/code-review slice/<feature>/S<id>`; post nothing, return the findings to the factory. The brief otherwise stays the same.

Refactoring opportunities to file (2f) are the ones implement left plus the ones the last review reports that nobody applied, deduplicated by files and move. Small ones are applied by implement, never filed.

**Clean** means all of: the kets-review verdict is not "fixes needed", no real code-review bug, every criterion has a passing test that checks it, no existing test lost a case or weakened an assertion without a criterion requiring it, the full suite is green, every earlier review comment has a reply and is resolved.

### 2e. Fix and re-review, at most 3 fix rounds

Never ask the user in this loop. If the review is not clean, launch a fix subagent in `<wt>` with the review's findings. It:

- fixes every real finding, including kets-review "Against a decision" ones, by aligning the code with the ADR; it never edits or supersedes an ADR and never asks;
- fixes a duplication by reusing or extracting the shared piece (per `docs/conventions.md` where it has a rule), never by copying the same block into more places;
- writes the missing tests so each acceptance criterion is validated by a test (or, where implement allows it, a named executable check);
- when it changes an existing test, every case the old test covered must still be covered and pass: no deleted cases, no weaker assertions, no changed expected values unless a criterion requires that behavior change (then the case is updated, not removed, and the reason is the criterion); it adds that test to "Tests changed" in the PR body (GitHub `gh pr edit <n> --body-file`; Azure DevOps `az repos pr update --id <n> --description "@<file>"`);
- for every comment the review posted on the PR: fixes it, or, if it is not a real issue, says why in one line; replies to that comment or thread in one line saying what was done; resolves it (below). Every comment it posts is one short line;
- runs the full suite, commits, and pushes (not in local mode).

Resolving, per provider:

- GitHub inline review threads (from `/code-review --comment`): reply, then resolve with `gh api graphql` `resolveReviewThread(input:{threadId:"<id>"})`. List the threads with the `pullRequest.reviewThreads` query: `id`, `isResolved`, `comments`.
- GitHub top-level PR comments (kets-review) can't be resolved: reply with a PR comment (`gh pr comment <n>`) that names the comment it answers.
- Azure DevOps threads: reply in the thread, then set its status to fixed (`2`), or wontFix (`3`) for a justified non-issue: `az devops invoke --area git --resource pullRequestThreads --route-parameters project=<project> repositoryId=<id> pullRequestId=<n> threadId=<t> --http-method PATCH --in-file <file> --api-version 7.1`, the file holding `{"status":2}`.

Then launch a NEW fresh review agent with the 2d brief (on a PR it posts a new comment). Repeat until clean and every comment is resolved, for at most 3 fix rounds. Still not clean after round 3: don't merge, leave the PR (or the branch) open with its comments, and keep the remaining findings and the comments still open for the final report.

### 2f. Merge when clean

Merge only when the review is clean and, in remote modes, the PR has no unresolved review thread: GitHub, no `isResolved:false` thread in the `reviewThreads` query; Azure DevOps, no thread in status active or pending. Otherwise it is not clean.

- GitHub: `gh pr merge <n> --merge`, or the merge strategy `CLAUDE.md` names. No `--delete-branch`: it also tries to delete the local branch, which fails while it is checked out in `<wt>`; the cleanup below deletes it.
- Azure DevOps: `az repos pr update --id <n> --status completed --transition-work-items true --delete-source-branch true --org ...`.
- Remote modes: if the merge is refused (branch protection, required reviewers, policies, conflicts), don't force or bypass anything: leave the PR open and keep the reason for the final report.
- Local mode: commit the refactoring opportunities first (below), then merge only when the main checkout is on `<default>` and `git -C <repo> status --porcelain` is empty: `git -C <repo> merge --no-ff slice/<feature>/S<id>`. Otherwise leave the branch and report why. On a conflict: `git -C <repo> merge --abort`, leave the branch, report.

Refactoring opportunities: file each one the slice left in the project backlog, after the merge succeeded; in local mode before it, in the same merge. Not the feature's epic, not the slice's PR. Skip duplicates: an open item with the same files and the same move gets `Also seen in S<id>` instead of a new item. A slice that was not merged files nothing: its opportunities go in the final report. When an opportunity is a pattern later slices would repeat (the same block copied, a shared component missing, wiring growing in one file), also draft a rule for `docs/conventions.md` in its format (shape-it `references/templates.md`); never write it there yourself, rules change with the user's ok: it goes in the final report.
  - **github**: `gh label create refactor --color C5DEF5 --description "Refactoring opportunity" --force` once per run, then one issue per opportunity: `gh issue create --title "Refactor: <title>" --label refactor --body-file <file>`. Body: where (files), why, effort, `Found in: S<id> (#<pr>)`. No milestone, no project board, no link to the epic. Duplicates: `gh issue list --label refactor --state open --json number,title,body`; on a match `gh issue comment <n> --body "Also seen in S<id> (#<pr>)"`.
  - **azure-devops**: one work item per opportunity, of the process's backlog item type (User Story, Product Backlog Item, Issue or Requirement, as shape-it's `references/azure-devops.md` maps it): `az boards work-item create --type "<type>" --title "Refactor: <title>" --description "<html>" --fields "System.Tags=refactor" --org ... --project ...`. HTML description with the same content as GitHub's body. No parent: it belongs to the project backlog, not the feature. Duplicates: `az boards query --wiql "SELECT [System.Id] FROM WorkItems WHERE [System.Tags] CONTAINS 'refactor' AND [System.State] NOT IN ('Done','Closed','Removed')" --org ... --project ...`, read the matches; on a match `az boards work-item update --id <id> --discussion "Also seen in S<id> (PR <n>)" --org ... --project ...`.
  - **local**: in `<wt>`, append to `docs/backlog/refactoring.md` (create it with the header `# Refactoring backlog` if missing) one line per opportunity: `- [ ] **<title>** · <files> · effort <e> · found in S<id> · <why>`. Duplicates: an unchecked line naming the same files and move gets ` · also seen in S<id>` appended instead of a new line. A refactoring item the slice paid gets its line checked, `- [x]`, with ` · paid in S<id>`. Commit it on the slice branch (`git -C <wt> commit`) before the merge, so the file lands with it.

After a successful merge, clean up yourself, never leave it to the user, in this order: `git worktree remove <wt>`; `git branch -D slice/<feature>/S<id>` (the merge was verified, and `-D` avoids the "not fully merged" refusal after a squash or rebase); on GitHub `git push origin --delete slice/<feature>/S<id>` (ignore "remote ref does not exist"; Azure DevOps already deleted it); in remote modes `git fetch --prune origin`. Worktrees and branches of slices that were not merged (STOP, PR left open) stay: they hold work. Then go back to step 1 to recompute the states: slices that waited on the merged one may now be ready, and they run in this session, in backlog order, without asking again.

## 3. Clean up and final report

At the end of the run delete the temp files the factory wrote (PR bodies, slice spec files, thread JSON, screenshots already uploaded; the `pr-assets` branch stays) and run `git worktree prune`.

- Each slice run: merged (PR link, or merge commit in local mode) or left open and why (merge refused, findings left after round 3); how many review rounds it took and what was fixed; the tests added; the existing tests changed; implement's report; where the screenshots are (local mode, or when they could not be attached).
- Refactoring items paid, per slice, and the ones dropped with why.
- Rules proposed for `docs/conventions.md`, ready to paste, each with the opportunities it comes from; and whether the open refactoring items are now past the ceiling (step 1).
- Refactoring items created or updated in the project backlog, per slice, with links (the issue or work item, or `docs/backlog/refactoring.md` in local mode); the opportunities of slices that were not merged, not filed.
- Findings and review comments still open, per slice, with where they were posted.
- Each `STOP` question verbatim, with its worktree. Once the user has answered, either finish the slice by hand in its worktree, or discard it: `git worktree remove --force <wt>` (a stop leaves uncommitted work), `git branch -D slice/<feature>/S<id>`, and in remote modes `git push origin --delete slice/<feature>/S<id>` only if the branch was pushed, so the next run picks the slice up again.
- Slices skipped and why: in progress, waiting, no seams (→ shape-it refine).
- Cleaned up: the worktrees and branches of the merged slices, the temp files, stale worktree entries.
- Kept because they hold work: the worktree and branch of every slice that was not merged (STOP, PR left open), listed with their paths.
