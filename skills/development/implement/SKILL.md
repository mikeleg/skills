---
name: implement
description: Implement a slice, spec or ticket from its acceptance criteria - agree the seams, build it test-first by running the tdd loop on each criterion - then check the result against the spec, simplify it, review it with /code-review and kets-review, guard the quality floor and commit. Use when the user says "implement S1", "build this slice/ticket/story/spec", or hands over a backlog item from shape-it to be coded.
---

# Implement

Turn one unit of agreed work (a slice from `docs/backlog/<feature>/backlog.md`, a ticket, or a spec) into committed, tested code. The acceptance criteria are the contract: every one of them ends up as a test or an explicit, named check.

## 0. Orient

- Find the work: the slice/ticket/spec the user named. If it came from shape-it, also read `scope.md` (non-goals matter for the spec check).
- Read `CLAUDE.md`/`AGENTS.md` and the project's test and typecheck commands. Never ask what you can read.
- Note how the code is organized: by feature (a new repo counts as this) or by technical layer (Controllers/Services/Repositories). The folder rule in tdd depends on it; the final report says which structure the work followed.
- Read `${CLAUDE_SKILL_DIR}/../tdd/SKILL.md`, with the `tests.md` and `mocking.md` next to it: steps 1 and 2 follow it. If that file isn't there, use the `tdd` skill if this session lists it; otherwise work red → green → refactor without it and say so in the final report.
- Read `GLOSSARY.md` (the right one via `GLOSSARY-MAP.md` if the root has it) and the ADRs in `docs/adr/`: the ones the slice lists under `**ADRs:**`, plus any whose title touches the area of the work. Skip silently if they don't exist. Only accepted ADRs count: no `Status`, or `accepted`; ignore `proposed`, `deprecated` and `superseded`. If the slice, as written, contradicts an accepted ADR, stop before writing code: quote the ADR and the slice line, and ask the user whether to change the slice or supersede the ADR. Never edit an ADR to say the opposite.
- After the user's choice on an ADR conflict (here or in steps 2, 4 and 6): if they supersede, write the new ADR and mark the old one `Status: superseded by ADR-NNNN`, following `${CLAUDE_SKILL_DIR}/../shape-it/references/domain-docs.md` (format and numbering; if that file isn't there, use: next number in `docs/adr/`, title + 1-3 sentences); if they change the slice, update the slice text in `backlog.md` first, so the spec check reads the new version.
- Read `docs/conventions.md` if it exists: its rules are part of the spec. Where the slice says `Build: <pattern>`, build it as the shared one at that path; where it says `Reuse:`, or a rule covers what you are about to write, use the existing piece instead of writing another. If the slice can't follow a rule, say which and why in the final report; never change a rule yourself.
- If the slice builds or changes a screen that the reference mock has (`docs/mock/`, or the client's mocks in `../reference/mock/current/`), the screen follows it: layout, components, states and wording. Never copy the mock's code: build the screen with the project's components, as `docs/conventions.md` says. A difference from the mock goes in the final report with its reason.
- If the slice's Implementation notes start with `First: #<n>` (an open refactoring item), pay it before step 1, as its own commit: no behaviour change, the full suite green before and after, no existing test changed for it. If it turns out large (an interface used elsewhere changes, or it needs a decision), drop it, revert it, and say why in the final report.
- Run `git status --porcelain`. If there are uncommitted changes not part of this work, stop and ask the user to commit or stash them first (otherwise the step 4 diff includes them and removing (b) could delete them).
- Record the starting point: run `git rev-parse HEAD` and note the SHA. Every check below diffs against it. Shell variables don't survive between commands, so write the SHA out in each command (shown as `<base>` below).

## 1. Seams (the planned checkpoint)

Tests go only at agreed seams; tdd says what a seam is and how to propose one.

- If the slice lists **Seams** (shape-it writes them), they are already agreed: map each acceptance criterion to a seam and go.
- If it doesn't, propose them in one message as tdd says, a seam and a test for each acceptance criterion. Wait for the user's ok. This is the planned stop; the others are a dirty working tree (step 0), an ADR conflict (steps 0, 2, 4 and 6) and a slice that duplicates another (see the Duplication rule in codebase-design).

## 2. Build it with tdd, one criterion at a time

Run the tdd loop once per acceptance criterion, in order. The criterion is the behavior the test names, and the seams from step 1 are tdd's agreed seams: don't ask again. How to write the test and run the loop is in tdd; this step only adds:

- Name the domain concepts this change adds (types, functions, variables, test names, UI text) with the glossary terms; never an `_Avoid_` term. The rule doesn't apply to names from external APIs, libraries, frameworks or existing contracts at the boundary (e.g. `db.transaction()`), nor to code the change doesn't touch.
- If a criterion can't go green without breaking an accepted ADR read in step 0, stop and ask (same choice as step 0) instead of going around it.
- Note the failure each test produced before the code existed: the final report asks for it.
- Run typechecking with the tests on every green.
- **A criterion with no cheap test** (visual feel, a third-party system with no sandbox) gets the closest executable check instead: a script, a browser run, a log assertion. Name it in the final report. Don't write a bad test to tick the box.
- A bug found along the way gets a tdd cycle of its own.
- Run single test files often; run the full suite once all criteria are green.

## 3. Prove the tests can fail

Pick the one or two conditions this work added that matter most (the guard, the branch that implements a criterion). For each:

1. Copy the file aside to a backup outside the repo, one per file: `cp path/file <backup>`, where `<backup>` is a unique path (in the scratchpad directory if you have one, otherwise from `mktemp`). Note the path.
2. Invert the condition (drop a negation, `&&` → `||`, `<` → `<=`).
3. Run the related tests. At least one must go red.
4. Restore from the backup: `cp <backup> path/file`. Never restore with `git checkout`; the work is not committed yet and would be lost.

If a mutation stays green, a test is missing or asserting the wrong thing. Add or fix it, then continue.

## 4. Spec check

Launch a subagent with a fresh context. Give it:

- the diff: `git add -N <new files of this work> && git diff <base>` (`add -N` makes new files show up without staging their content);
- the full text of the slice/ticket/spec, plus the non-goals from `scope.md` if there is one;
- the relevant accepted ADRs (see step 0) and the glossary, if there are any.

Brief: *"Report (a) acceptance criteria that are missing or only partly implemented; (b) behavior in the diff nobody asked for, including anything listed as a non-goal; (c) criteria that look implemented but where the implementation looks wrong; (d) places where the diff contradicts an accepted ADR or, in a name of a domain concept the change adds (types, functions, variables, test names, UI text), uses a term the glossary lists under _Avoid_ (not names from external APIs, libraries, frameworks or existing contracts at the boundary, nor code the change doesn't touch); quote the ADR or glossary line. Quote the criterion or non-goal line for each other finding. Zero findings is a valid answer. Under 300 words."*

Fix (a) and (c). Remove (b) and list what you removed in the final report, so the user can ask to put it back. Never fix (d) silently: stop and ask the user whether to adapt the code or supersede the ADR (then follow step 0). The exception is an `_Avoid_` term in a name the change adds: rename it without asking. Contradicting an ADR always asks. If there is no spec, still run the subagent on the diff for (d) only, with the accepted ADRs and the glossary, if there are any. Skip this step, and say so in the final report, only if there is neither a spec nor ADRs/glossary.

## 5. Simplify

The loop already refactored each cycle; this is the refactor pass over the whole change. Use /simplify if available; otherwise refactor it yourself as the Refactoring section of `${CLAUDE_SKILL_DIR}/../codebase-design/SKILL.md` says, mainly remove dead code, collapse a pass-through and reuse the existing helper. Either way, go through every comment the change adds and apply the Comments rule of `codebase-design`: rewrite the code so the comment is not needed, and keep it only as a one-line why. Then run typechecking and the full test suite.

## 6. Review

Use `/code-review low` to review the work, then read `${CLAUDE_SKILL_DIR}/../kets-review/SKILL.md` and follow it on the same change for the design regressions it introduces (if that file isn't there, skip it and say so in the final report). Fix the issues they raise that are real, except a kets-review P1 "Against a decision" finding (ADR or glossary conflict): it follows the step 4 (d) rule (ADR conflict → stop and ask; `_Avoid_` term in a name the change adds → rename), never fixed silently. Ignore the ones that aren't, and say why. Apply the opportunities kets-review lists with effort small, as refactors; copy the medium and large ones into the final report. Re-run the full test suite after any fix.

## 7. Guard the floor

Agents reach green by the cheapest road. Before committing, stage the work (`git add` the files of this change) and scan what it adds and removes:

```bash
# suppressions and skipped/focused tests added
git diff --cached <base> -U0 | grep -nE '^\+.*(@ts-ignore|@ts-expect-error|eslint-disable|biome-ignore|# ?noqa|type: ?ignore|#pragma warning disable|SuppressMessage|//nolint|@SuppressWarnings|istanbul ignore|c8 ignore|nosemgrep|gitleaks:allow|\.skip\(|\bxit\(|\bxdescribe\(|\.only\(|\[Ignore|Skip ?= ?"|@Disabled|mark\.skip|t\.Skip\()'
# stubs and swallowed errors added
git diff --cached <base> -U0 | grep -nE '^\+.*(Not implemented|NotImplemented|todo!\(|unimplemented!\(|catch *(\([^)]*\))? *\{ *\}|except[^:]*: *pass)'
# assertions removed
git diff --cached <base> -U0 | grep -nE '^-.*\b(expect|assert|Assert|should)\b'
# test files deleted, and quality config touched
git diff --cached <base> --name-status | grep -E '^D.*(test|spec)'
git diff --cached <base> --name-only | grep -iE '(eslint|biome|tsconfig|jest|vitest|pytest|coverage|\.editorconfig|ruff|mypy|\.github/workflows|azure-pipelines|Directory\.Build|\.ruleset|stylecop)'
```

Adapt the patterns to the stack if it uses others. Every hit is either removed or justified: a real reason, written in the final report and in the commit message. "To make the test pass" is not a reason. Tightening the bar needs no justification; loosening it does.

## 8. Commit

Commit to the current branch. The message says what the change does and why; it also names any floor exception from step 7. A decision taken during the work that passes the three-criteria test in `${CLAUDE_SKILL_DIR}/../shape-it/references/domain-docs.md` gets its ADR in `docs/adr/` in the same commit. When the work is a slice from a shape-it `backlog.md`, add `**Status:** done` to that slice (next to Size) and include that change in the same commit.

## Final report

Short, evidence over adjectives:

- Each acceptance criterion → its test (or named check), and the failure it produced before the code existed.
- Where the code went: the slice folder, or the layered structure followed instead.
- Duplications between slices that were flagged, and what the user chose.
- Mutation result from step 3.
- Spec check findings, what you did with them, and anything removed as unrequested.
- ADR and glossary conflicts found, what the user chose (supersede or change the slice), and what was written (new ADR number, or the slice updated in `backlog.md`).
- /code-review and kets-review findings fixed and ignored (with why), the kets-review opportunities applied, and the ones left.
- Floor hits, if any, and their justification.
