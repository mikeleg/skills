---
name: kets-review
description: Review a change (current diff, branch, PR or path) for the design regressions it introduces, or the whole project on request ("project") - spaghetti code and related smells, logic in the wrong place, duplicates of existing helpers, weaker types, pass-through wrappers, contradictions with the project's ADRs (docs/adr/) and glossary (GLOSSARY.md) - judged against the project's own architecture, on any stack and any age of codebase. With --comment, posts the report on the GitHub or Azure DevOps PR. Complements /code-review (bugs). Use when the user asks for a design, quality or structure review of a change, a spaghetti check, "/kets-review", or when factory reaches its review step.
---

# Kets Review

Judge the change, not the project, unless the project mode is asked for (step 1). Measure it against the architecture the project has, not an ideal one. This skill complements `/code-review` (correctness bugs) and `/simplify` (local cleanups): don't repeat their findings. Use the vocabulary of `${CLAUDE_SKILL_DIR}/../codebase-design/SKILL.md`, if that file is there (module, interface, seam, depth, deletion test, refactoring moves).

## 1. Target

Two modes: the change (default) or the whole project (only when asked).

**Change (default).**

- The current branch's diff against its base (merge-base with the default branch), uncommitted changes included, new untracked files too (a plain `git diff` misses them; `git add -N` shows them without staging).
- Also accepts a PR number, a branch, a commit or a commit range (`git show <sha>`, `git diff <a>..<b>`), or a path.
- PR number: GitHub `gh pr diff <n>`. Azure DevOps: `az repos pr show` returns metadata, not a diff, so read the source and target branches from `az repos pr show --id <n>` (`sourceRefName`, `targetRefName`), run `git fetch origin <source> <target>`, then `git diff origin/<target>...origin/<source>`.
- `--comment` (with a PR number): after the report, post it on the PR (step 8). The flag is not part of the target.
- Path: limits the change's diff to those files or folders; it does not review whole files. To review whole files, use the project mode with that folder.
- On the default branch with no uncommitted changes the merge-base diff is empty: fall back to the commits not yet pushed (`git diff @{u}..HEAD`, when an upstream exists and it is non-empty), otherwise to the last commit (`git diff HEAD~1..HEAD`). Say which one was used in the report's "Reviewed" line.
- Empty diff (the fallback included, or nothing at all): say so, suggest the project mode, and stop. Never switch to it on your own.
- Scope: only the files in the diff. Judge the changed lines and the function or class they sit in; never sweep the rest of the project. Other files are read only for the yardstick in step 2 and for targeted searches (e.g. an existing copy of a changed block).

**Project.** When the argument is `project` or `progetto` (optionally followed by a folder), or the user asks to review the whole project or codebase.

- Target: the whole repo, or that folder.
- Don't read everything, 80/20: review the hotspots, the 10 files changed most often in the last 12 months (`git log --since="12 months ago" --format= --name-only -- <folder> | sort | uniq -c | sort -rn`), skipping generated, vendored, lock and test-data files. Name them in the report's "Reviewed" line.
- There is no change, so step 3 doesn't apply: every problem is a finding tagged `existing`, ADR conflicts included. The report has no verdict; the P1/P2/P3 limits of step 7 stay.

## 2. Learn the project's conventions first

Before judging, read:

- `CLAUDE.md` / `AGENTS.md`
- `GLOSSARY.md` (the right one via `GLOSSARY-MAP.md` if the root has it), if present
- the ADRs in `docs/adr/`, if present: read the titles, open the ones touching the changed area. They are part of the yardstick. Only accepted ADRs count (no `Status`, or `accepted`); ignore `proposed`, `deprecated` and `superseded` ones
- `docs/conventions.md`, if present: its rules are part of the yardstick. Code the change adds that ignores a rule (writes its own version of a pattern the rule says lives somewhere) is a Copy-paste finding (P1): name the rule and the existing piece
- the folder structure
- 2-3 neighbouring files of the same kind as the changed ones

Write down 3-5 lines: how the project is organized (layers, vertical slices, MVC, plain scripts...), where logic of this kind lives, naming and error-handling conventions, the canonical helpers near the change. This is the yardstick. DDD, bounded-context or layer checks apply only if the project actually uses them. Never judge against an architecture the project doesn't have.

## 3. Classify each problem by origin

- **Introduced** by the change: finding, to fix.
- **Worsened** by the change (it adds to an existing problem, e.g. one more `if` in a function that was already spaghetti): finding on the added part only. The change must not make it worse.
- **Pre-existing** in code the change touches (same function or class), not worsened: not reported.
- **Pre-existing** in code the change doesn't touch: not reported.

This rule is what makes the review usable on old codebases.

## 4. What to look for, by priority

80/20: the most impact for the least work. A few kinds of problem cause most of the maintenance cost: they make every future change touch several places, or hide bugs. The priority below is the impact. Look for P1 first across the whole diff; move to P2 and P3 only after. A review that finds only the P1s is already useful. Then weigh each problem by the effort its fix takes (see the report): the best move is the smallest effort with the biggest impact.

| Priority | Smell | Signal in the code |
|---|---|---|
| P1 | Against a decision | The change (in project mode, the code) contradicts an accepted ADR in docs/adr/, or names a domain concept it adds (in project mode, defines) with a term GLOSSARY.md lists under _Avoid_. Names from external APIs, libraries, frameworks or existing contracts at the boundary don't count. Quote the ADR or glossary line |
| P1 | Copy-paste | A block almost identical to one that already exists, in the change or in the project. Search the codebase; name the existing one with its path |
| P1 | Wrong placement | By the project's conventions: feature logic in a base class or generic shared helper; business logic in controllers, repositories or middleware when the project separates them |
| P1 | Missing concept | The same if/switch on the same type or state in several places, or a new flag or enum added only to create one more "mode" inside an existing flow |
| P1 | Hidden effects | A function that answers but also changes something; "call A before B" not enforced by the code; shared mutable global or static state |
| P1 | Hidden errors | Empty catch blocks, error codes, null returned where the language offers better |
| P1 | Spaghetti | Flow doesn't read top to bottom: state variables set in one place and checked far below, scattered returns, exceptions used as control flow |
| P2 | God class or method | An already large class or method keeps growing and takes on new responsibilities, not just new lines. Report lines before → after; no fixed threshold |
| P2 | Shotgun surgery | The change repeats the same tweak in N files: that concept has no home |
| P2 | Weaker types | New casts, `object`/`dynamic`/`any`, nullables without a reason at a seam |
| P2 | Lasagna | Wrappers or layers that only forward calls: deletion test |
| P2 | Arrow code | The change adds levels of if/loop/try to an already nested block |
| P2 | Stack-specific | Only if relevant to the project's stack: nested callbacks in JS, `async void` or `.Result` in .NET, queries inside a loop (N+1) |
| P3 | Primitive obsession | Strings/ints for domain concepts, magic numbers and strings, long parameter lists, boolean flag arguments |
| P3 | Feature envy | A method uses another object's data more than its own |
| P3 | Dead and "temporary" code | Commented-out code, unreachable branches, TODOs or fixes "for now" |
| P3 | Comment instead of code | A comment the code could say itself: a name, an extracted function, a type or a named constant would make it unnecessary (rule in `codebase-design` Comments). A one-line why the code can't express is fine |

## 5. Remedies

Prefer the smallest refactoring move from `codebase-design` that removes the problem, and name it in the finding's Fix line. Look actively for code judo: when it exists it is the best move.

For an "Against a decision" finding about an ADR, the fix is: align with the ADR, or ask the user to supersede it with a new ADR (effort large: it needs the user's decision). Never propose editing the ADR to match the code. An `_Avoid_` term is fixed by renaming it to the glossary term inside the change (usually effort small).

Never propose: an architecture migration (introducing DDD, layers or CQRS where the project doesn't have them); renaming or reformatting outside the change. Both are project decisions, not fixes to this change, and they bury the real diff.

## 6. Verify before reporting

Every finding cites `file:line`, the concrete signal, why it is a problem here (the consequence for whoever changes this code next), and the remedy. Re-read the code; drop any finding you can't point to.

## 7. Report

Write it in the conversation's language, for someone who hasn't read the diff: plain words first, the priority and smell name only as a tag. Fill the template in `report-template.md`, next to this file. For the sentences inside it, follow the voice rules and the final pass in `${CLAUDE_SKILL_DIR}/../../content/brand-voice/SKILL.md`, if that file is there.

Rules:

- **Verdict** first. "fixes needed" when a reported P1 or P2 finding is neither fixed nor justified with a real technical reason. An "Against a decision" finding about an ADR is lifted only by aligning the code with the ADR or by a superseding ADR the user approved, never by a technical reason. P3 findings never block. Passing tests is not a reason to approve.
- **Effort** is what the fix takes the agent that will make it, not a person's time: **small** = one place in one file, and the existing tests already cover it; **medium** = several files or call sites, or tests to add or change; **large** = changes an interface used elsewhere, crosses modules or layers, or needs a decision from the user first.
- **Fix first**: 1-3 moves with the most impact for the least work, picked among the findings. Point to the finding (1, 2...) by its number instead of repeating it. An "Against a decision" finding, if there is one, is always the first item, whatever its effort.
- **Findings** (introduced or worsened) are numbered, so the user can say "fix 2". "Against a decision" findings are always listed first, exempt from the effort reordering. Order the others by impact over effort: the priority gives the impact, the effort reorders, so a small P2 comes before a large P1. P1: all of them. P2: at most 5, the smallest effort first. P3: at most 3, only small ones, in the "Minor" line.
- One sentence per bullet, no paragraphs. A code snippet only when the signal can't be shown otherwise, at most 3 lines.
- Leave out empty sections and lines ("Minor", "Left out") instead of writing "none".

If there is nothing to report, say so in one line; no filler praise. Be direct and specific, never rude, never watered down.

## 8. Post on the PR (`--comment`)

Only when the arguments include `--comment` and the target is a PR number. Without the flag never post. With the flag but no PR (local diff, branch, commit, path or project mode), say there is no PR to comment on and skip this step.

- The comment is the step 7 report, written in plain full sentences whatever reply style the conversation uses, with `**kets-review**` as its first line so it stands out among the PR comments. Write it to a temp file; never pass it inline on the command line.
- Provider, from `git remote get-url origin`: `github.com` → GitHub; `dev.azure.com` or `visualstudio.com` → Azure DevOps; anything else → say so and skip.
- GitHub: `gh pr comment <n> --body-file <file>`.
- Azure DevOps: `az repos pr` has no comment command, so create a thread through the REST API. Read `repository.id` and `repository.project.name` from `az repos pr show --id <n>`, and the organization from the remote URL. Build the thread JSON with an encoder (`jq`, Python, PowerShell `ConvertTo-Json`), never by string concatenation: `{"comments":[{"parentCommentId":0,"content":"<report>","commentType":1}],"status":<s>}`, with status `1` (active) when the verdict is "fixes needed", otherwise `4` (closed), so a comment-resolution policy blocks the merge only when there is something to fix. Post it: `az devops invoke --org https://dev.azure.com/<org> --area git --resource pullRequestThreads --route-parameters project=<project> repositoryId=<id> pullRequestId=<n> --http-method POST --in-file <file> --api-version 7.1`.
- One comment per run. If the command fails (auth, permissions), show the error and say the report was not posted; the report in the conversation stands.
- End by saying where the comment was posted.
