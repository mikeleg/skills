---
name: tdd
description: Build one feature or fix one bug test-first in the red → green → refactor loop, with tests at agreed seams. Use when the user asks for TDD or test-first work on a single feature or bug fix, mentions "red-green-refactor", wants integration tests, or when implement reaches its build step. To take a whole slice, ticket or spec from its acceptance criteria to a reviewed commit, use implement instead.
---

# Test-Driven Development

TDD is the red → green → refactor loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle: consult them before and during the loop, not after.

When exploring the codebase, read `GLOSSARY.md` (if it exists) so test names and interface vocabulary match the project's domain language, and respect ADRs in the area you're touching.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification: "user can checkout with valid cart" tells you exactly what capability exists, and it survives refactors because it doesn't care about internal structure.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Seams: where tests go

A **seam** is the public interface you test at (an HTTP endpoint, a command, a module's exported function, a component's rendered output): where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at pre-agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. No test is written at an unconfirmed seam. Seams already agreed (listed in the slice or ticket, or agreed by the skill that called this one) are confirmed: don't ask again. You can't test everything, so agreeing the seams up front is how testing effort lands on the critical paths and complex logic instead of every edge case.

Ask: "What's the public interface, and which seams should we test?" Give each proposed seam a one-line note on what it catches and what it misses.

When the shape of that interface is itself in question (how deep the module is, where the seam belongs, what the interface should expose), read `${CLAUDE_SKILL_DIR}/../codebase-design/SKILL.md` for the vocabulary (if that file isn't there, go on without it). It is the shared source of the module, interface, depth, seam, adapter, leverage and locality terms, and it is a reference to consult, not a session to run.

## Anti-patterns

- **Implementation-coupled**: mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological**: the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth: a known-good literal, a worked example, the spec.
- **Horizontal slicing**: writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation. Work in **vertical slices** instead: one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write the failing test first and run it: it must fail, and for the reason the behavior under test describes. If it passes, or fails for an unrelated reason, fix the test before touching production code. Then write only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One cycle at a time.** One seam, one test, one minimal implementation per cycle.
- **Prepare on green.** Before writing the next failing test, if the code it will change is hard to change, refactor it first (preparatory refactor, in the Refactoring section of `${CLAUDE_SKILL_DIR}/../codebase-design/SKILL.md`).
- **Refactor on green, never on red.** Once the test passes, refactor the code this cycle touched, and its test, as the Refactoring section and the clean code rules in `${CLAUDE_SKILL_DIR}/../codebase-design/SKILL.md` say.
- **One folder per slice.** Where the code is organized by feature (vertical slice architecture), everything a use case needs lives in one folder named after it in business terms (e.g. `Features/Orders/PlaceOrder/`): entry point, request/response, handler, validation, data access, and its tests next to them or in the mirrored test folder the project uses. Slices don't call each other's handlers. When this slice duplicates logic another slice already has, stop and follow the Duplication rule in `${CLAUDE_SKILL_DIR}/../codebase-design/SKILL.md`. In a repo organized by technical layer, follow the existing structure.

---

Adapted from the `tdd` skill in [mattpocock/skills](https://github.com/mattpocock/skills) (MIT License, Copyright (c) 2026 Matt Pocock), with the refactor step and the folder rule added. `tests.md` and `mocking.md` are copied unchanged.
