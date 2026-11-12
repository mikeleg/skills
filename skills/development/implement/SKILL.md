---
name: implement
description: Implement a slice, spec or ticket test-first from its acceptance criteria, then check the result against the spec, simplify it, review it with /code-review and kets-review, guard the quality floor and commit. Use when the user says "implement S1", "build this slice/ticket/story/spec", or hands over a backlog item from shape-it to be coded.
---

# Implement

Turn one unit of agreed work (a slice from `docs/backlog/<feature>/backlog.md`, a ticket, or a spec) into committed, tested code. The acceptance criteria are the contract: every one of them ends up as a test or an explicit, named check.

## 0. Orient

- Find the work: the slice/ticket/spec the user named. If it came from shape-it, also read `scope.md` (non-goals matter for the spec check).
- Read `CLAUDE.md`/`AGENTS.md` and the project's test and typecheck commands. Never ask what you can read.
- Note how the code is organized. In a new repo, or one already organized by feature, the work is built as a vertical slice (see step 2). In a repo organized by technical layer (Controllers/Services/Repositories), follow the existing structure and say so in the final report.
- Record the starting point: run `git rev-parse HEAD` and note the SHA. Every check below diffs against it. Shell variables don't survive between commands, so write the SHA out in each command (shown as `<base>` below).

## 1. Seams (the one checkpoint)

A seam is the public interface a test goes through: an HTTP endpoint, a command, a module's exported function, a component's rendered output. Tests live at seams, never against internals.

- If the slice lists **Seams** (shape-it writes them), they are already agreed: map each acceptance criterion to a seam and go.
- If it doesn't, propose them in one message: for each acceptance criterion, the seam and the test you will write there, with one line on what it catches and what it misses. Wait for the user's ok. This is the only planned stop; the other one is a slice that duplicates another (see the Duplication rule in codebase-design).
- If where a seam belongs, or how deep the module behind it should be, is unclear, read `${CLAUDE_SKILL_DIR}/../codebase-design/SKILL.md` for the vocabulary and the options (if that file isn't there, go on without it).

## 2. Build it test-first, one criterion at a time

Read `${CLAUDE_SKILL_DIR}/../tdd/SKILL.md`, with the `tests.md` and `mocking.md` next to it, and follow its red → green → refactor loop and its rules. If that file isn't there, use the `tdd` skill if this session lists it; otherwise follow the loop below on its own and say so in the final report. The seams are the ones agreed in step 1. Here the loop runs once per acceptance criterion, in order:

1. Write one test at its seam, named after the behavior ("rejects an expired token", not "test_validate_2").
2. Run it. It must fail, and for the reason the criterion describes. If it passes, or fails for an unrelated reason, fix the test before touching production code.
3. Write the least code that makes it pass. No anticipating the next criterion.
4. Run it again, plus typechecking. Green, then refactor as the tdd skill says, then next criterion.

On top of the tdd rules:

- **A criterion with no cheap test** (visual feel, a third-party system with no sandbox) gets the closest executable check instead: a script, a browser run, a log assertion. Name it in the final report. Don't write a bad test to tick the box.
- A bug found along the way gets the same treatment: failing test first, then the fix.

Run single test files often; run the full suite once all criteria are green.

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
- the full text of the slice/ticket/spec, plus the non-goals from `scope.md` if there is one.

Brief: *"Report (a) acceptance criteria that are missing or only partly implemented; (b) behavior in the diff nobody asked for, including anything listed as a non-goal; (c) criteria that look implemented but where the implementation looks wrong. Quote the criterion or non-goal line for each finding. Zero findings is a valid answer. Under 300 words."*

Fix (a) and (c). Remove (b) and list what you removed in the final report, so the user can ask to put it back. If there is no spec at all, skip this step and say so in the final report.

## 5. Simplify

The loop already refactored each cycle; this is the refactor pass over the whole change. Use /simplify if available; otherwise refactor it yourself as the Refactoring section of `${CLAUDE_SKILL_DIR}/../codebase-design/SKILL.md` says, mainly remove dead code, collapse a pass-through and reuse the existing helper. Then run typechecking and the full test suite.

## 6. Review

Use `/code-review low` to review the work, then read `${CLAUDE_SKILL_DIR}/../kets-review/SKILL.md` and follow it on the same change for the design regressions it introduces (if that file isn't there, skip it and say so in the final report). Fix the issues they raise that are real; ignore the ones that aren't, and say why. Don't apply the opportunities kets-review lists: copy them into the final report. Re-run the full test suite after any fix.

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

Commit to the current branch. The message says what the change does and why; it also names any floor exception from step 7.

## Final report

Short, evidence over adjectives:

- Each acceptance criterion → its test (or named check), and the failure it produced before the code existed.
- Where the code went: the slice folder, or the layered structure followed instead.
- Duplications between slices that were flagged, and what the user chose.
- Mutation result from step 3.
- Spec check findings, what you did with them, and anything removed as unrequested.
- /code-review and kets-review findings fixed and ignored (with why), and the kets-review opportunities.
- Floor hits, if any, and their justification.
