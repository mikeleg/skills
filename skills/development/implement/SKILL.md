---
name: implement
description: Implement a slice, spec or set of tickets test-first from its acceptance criteria, then check the result against the spec, simplify it, review it with /code-review, guard the quality floor and commit. Use when the user says "implement S1", "build this slice/ticket/story/spec", or hands over a backlog item from shape-it to be coded.
---

# Implement

Turn one unit of agreed work (a slice from `docs/backlog/<feature>/backlog.md`, a ticket, or a spec) into committed, tested code. The acceptance criteria are the contract: every one of them ends up as a test or an explicit, named check.

## 0. Orient

- Find the work: the slice/ticket/spec the user named. If it came from shape-it, also read `scope.md` (non-goals matter for the spec check).
- Read `CLAUDE.md`/`AGENTS.md` and the project's test and typecheck commands. Never ask what you can read.
- Record the starting point: `BASE=$(git rev-parse HEAD)`. Every check below diffs against it.

## 1. Seams (the one checkpoint)

A seam is the public interface a test goes through: an HTTP endpoint, a command, a module's exported function, a component's rendered output. Tests live at seams, never against internals.

- If the slice lists **Seams** (shape-it writes them), they are already agreed: map each acceptance criterion to a seam and go.
- If it doesn't, propose them in one message: for each acceptance criterion, the seam and the test you will write there, with one line on what it catches and what it misses. Wait for the user's ok. This is the only stop in the skill.

## 2. Build it test-first, one criterion at a time

For each acceptance criterion, in order:

1. Write one test at its seam, named after the behavior ("rejects an expired token", not "test_validate_2").
2. Run it. It must fail, and for the reason the criterion describes. If it passes, or fails for an unrelated reason, fix the test before touching production code.
3. Write the least code that makes it pass. No speculative features, no anticipating the next criterion.
4. Run it again, plus typechecking. Green, then next criterion.

Rules of the loop:

- **Vertical, not horizontal.** One test → one implementation → repeat. Never write all the tests first.
- **Through the interface.** Don't mock internal collaborators, test private functions, or verify through a side channel (querying the database instead of the API). Mock only at a boundary the production code already isolates (external service, clock).
- **No tautologies.** The expected value comes from the criterion, a worked example or a known-good literal, never recomputed the way the code computes it.
- **No refactoring inside the loop.** Clean-up happens in step 5.
- **A criterion with no cheap test** (visual feel, a third-party system with no sandbox) gets the closest executable check instead: a script, a browser run, a log assertion. Name it in the final report. Don't write a bad test to tick the box.
- A bug found along the way gets the same treatment: failing test first, then the fix.

Run single test files often; run the full suite once all criteria are green.

## 3. Prove the tests can fail

Pick the one or two conditions this work added that matter most (the guard, the branch that implements a criterion). For each:

1. Copy the file aside: `cp path/file "$TMPDIR/file.bak"`.
2. Invert the condition (drop a negation, `&&` → `||`, `<` → `<=`).
3. Run the related tests. At least one must go red.
4. Restore from the copy: `cp "$TMPDIR/file.bak" path/file`. Never restore with `git checkout`; the work is not committed yet and would be lost.

If a mutation stays green, a test is missing or asserting the wrong thing. Add or fix it, then continue.

## 4. Spec check

Launch a subagent with a fresh context. Give it:

- the diff: `git add -N <new files of this work> && git diff $BASE` (`add -N` makes new files show up without staging their content);
- the full text of the slice/ticket/spec, plus the non-goals from `scope.md` if there is one.

Brief: *"Report (a) acceptance criteria that are missing or only partly implemented; (b) behavior in the diff nobody asked for, including anything listed as a non-goal; (c) criteria that look implemented but where the implementation looks wrong. Quote the criterion or non-goal line for each finding. Zero findings is a valid answer. Under 300 words."*

Fix (a) and (c). Remove (b) unless the user wants it kept. If there is no spec at all, skip this step and say so in the final report.

## 5. Simplify

Simplify the code you wrote in this session. Use /simplify if available; otherwise do it yourself:

- Remove dead code, unused imports, leftover debug output and speculative abstractions nobody asked for.
- Collapse needless indirection: wrappers that only forward calls, one-use helpers, premature generics.
- Prefer existing utilities in the codebase over new ones you wrote.
- Keep behavior identical. Do not touch code outside the scope of this work.

After simplifying, run typechecking and the full test suite. If anything breaks, fix it or revert that simplification.

## 6. Review

Use /code-review to review the work. Fix the issues it raises that are real; ignore the ones that aren't, and say why. Re-run the full test suite after any fix.

Do not create a project or personal skill called `code-review`: it would replace the bundled one.

## 7. Guard the floor

Agents reach green by the cheapest road. Before committing, stage the work (`git add` the files of this change) and scan what it adds and removes:

```bash
D="git diff --cached $BASE"
# suppressions and skipped/focused tests added
$D -U0 | grep -nE '^\+.*(@ts-ignore|@ts-expect-error|eslint-disable|biome-ignore|# ?noqa|type: ?ignore|#pragma warning disable|SuppressMessage|//nolint|@SuppressWarnings|istanbul ignore|c8 ignore|nosemgrep|gitleaks:allow|\.skip\(|\bxit\(|\bxdescribe\(|\.only\(|\[Ignore|Skip ?= ?"|@Disabled|mark\.skip|t\.Skip\()'
# stubs and swallowed errors added
$D -U0 | grep -nE '^\+.*(Not implemented|NotImplemented|todo!\(|unimplemented!\(|catch *(\([^)]*\))? *\{ *\}|except[^:]*: *pass)'
# assertions removed
$D -U0 | grep -nE '^-.*\b(expect|assert|Assert|should)\b'
# test files deleted, and quality config touched
$D --name-status | grep -E '^D.*(test|spec)'
$D --name-only | grep -iE '(eslint|biome|tsconfig|jest|vitest|pytest|coverage|\.editorconfig|ruff|mypy|\.github/workflows|azure-pipelines|Directory\.Build|\.ruleset|stylecop)'
```

Adapt the patterns to the stack if it uses others. Every hit is either removed or justified: a real reason, written in the final report and in the commit message. "To make the test pass" is not a reason. Tightening the bar needs no justification; loosening it does.

## 8. Commit

Commit to the current branch. The message says what the change does and why; it also names any floor exception from step 7.

## Final report

Short, evidence over adjectives:

- Each acceptance criterion → its test (or named check), and the failure it produced before the code existed.
- Mutation result from step 3.
- Spec check findings and what you did with them.
- /code-review findings fixed and ignored (with why).
- Floor hits, if any, and their justification.
