---
name: kets-review
description: Review a change (current diff, branch, PR or path) for the design regressions it introduces - spaghetti code and related smells, logic in the wrong place, duplicates of existing helpers, weaker types, pass-through wrappers - judged against the project's own architecture, on any stack and any age of codebase. Lists at most 3 improvement opportunities in the touched code without applying them. Complements /code-review (bugs). Use when the user asks for a design, quality or structure review of a change, a spaghetti check, "/kets-review", or when implement reaches its review step.
---

# Kets Review

Judge the change, not the project. Measure it against the architecture the project has, not an ideal one. This skill complements `/code-review` (correctness bugs) and `/simplify` (local cleanups): don't repeat their findings. Use the vocabulary of the `codebase-design` skill (module, interface, seam, depth, deletion test).

## 1. Target

- Default: the current branch's diff against its base (merge-base with the default branch), uncommitted changes included.
- Also accepts a PR number (read it with `gh pr diff` or `az repos pr show`), a branch, or a path.
- Empty diff: say so and stop.

## 2. Learn the project's conventions first

Before judging, read:

- `CLAUDE.md` / `AGENTS.md`
- the wiki index and `GLOSSARY.md`, if present
- the folder structure
- 2-3 neighbouring files of the same kind as the changed ones

Write down 3-5 lines: how the project is organized (layers, vertical slices, MVC, plain scripts...), where logic of this kind lives, naming and error-handling conventions, the canonical helpers near the change. This is the yardstick. DDD, bounded-context or layer checks apply only if the project actually uses them. Never judge against an architecture the project doesn't have.

## 3. Classify each problem by origin

- **Introduced** by the change: finding, to fix.
- **Worsened** by the change (it adds to an existing problem, e.g. one more `if` in a function that was already spaghetti): finding on the added part only. The change must not make it worse; the pre-existing part can become an opportunity.
- **Pre-existing** in code the change touches (same function or class), not worsened: at most an opportunity.
- **Pre-existing** in code the change doesn't touch: not reported.

This rule is what makes the review usable on old codebases.

## 4. What to look for, by priority

80/20: the most impact for the least work. A few kinds of problem cause most of the maintenance cost: they make every future change touch several places, or hide bugs. The priority below is the impact. Look for P1 first across the whole diff; move to P2 and P3 only after. A review that finds only the P1s is already useful. Then weigh each problem by what its fix costs (see the report): the best move is the cheapest fix with the biggest impact.

| Priority | Smell | Signal in the code |
|---|---|---|
| P1 | Copy-paste | A block almost identical to one that already exists, in the change or in the project. Search the codebase; name the existing one with its path |
| P1 | Wrong placement | By the project's conventions: feature logic in a base class or generic shared helper; business logic in controllers, repositories or middleware when the project separates them |
| P1 | Missing concept | The same if/switch on the same type or state in several places, or a new flag or enum added only to create one more "mode" inside an existing flow |
| P1 | Hidden effects | A function that answers but also changes something; "call A before B" not enforced by the code; shared mutable global or static state |
| P1 | Hidden errors | Empty catch blocks, error codes, null returned where the language offers better |
| P1 | Spaghetti | Flow doesn't read top to bottom: state variables set in one place and checked far below, scattered returns, exceptions used as control flow |
| P1 | Code judo | A restructuring that keeps behaviour identical and removes whole branches or methods. Look for it actively |
| P2 | God class or method | An already large class or method keeps growing and takes on new responsibilities, not just new lines. Report lines before → after; no fixed threshold |
| P2 | Shotgun surgery | The change repeats the same tweak in N files: that concept has no home |
| P2 | Weaker types | New casts, `object`/`dynamic`/`any`, nullables without a reason at a seam |
| P2 | Lasagna | Wrappers or layers that only forward calls: deletion test |
| P2 | Arrow code | The change adds levels of if/loop/try to an already nested block |
| P2 | Stack-specific | Only if relevant to the project's stack: nested callbacks in JS, `async void` or `.Result` in .NET, queries inside a loop (N+1) |
| P3 | Primitive obsession | Strings/ints for domain concepts, magic numbers and strings, long parameter lists, boolean flag arguments |
| P3 | Feature envy | A method uses another object's data more than its own |
| P3 | Dead and "temporary" code | Commented-out code, unreachable branches, TODOs or fixes "for now" |

## 5. Remedies

Prefer the smallest move that removes the problem:

- delete a wrapper;
- reuse the existing helper;
- move the code where the project puts code of that kind;
- extract a function only when it gets a name that hides real complexity (deletion test);
- replace a repeated switch with one place that decides; use a pattern only if the project already uses it or there are at least two real variants now.

Never propose: an architecture migration (introducing DDD, layers or CQRS where the project doesn't have them); patterns without two real implementations; splitting functions only to make them short; renaming or reformatting outside the change.

## 6. Verify before reporting

Every finding cites `file:line`, the concrete signal, why it is a problem here (the consequence for whoever changes this code next), and the remedy. Re-read the code; drop any finding you can't point to. Skip what `/code-review` or `/simplify` already covers.

## 7. Report

Write it in the conversation's language. Order:

1. **Start here**: the 1-3 moves with the most impact for the least work, picked across findings and opportunities. One line each: the move, `file:line`, why it pays off.
2. **Findings** (introduced or worsened). Each: `file:line`, problem, signal, remedy, fix cost (S: minutes, M: hours, L: a day or more), origin (introduced / worsened). Order by impact over cost: the priority gives the impact, the fix cost reorders. A P2 that takes minutes comes before a P1 that takes a day.
   - P1: all of them.
   - P2: at most 5, the cheapest to fix first.
   - P3: at most 3, only those that cost S, in one "Minor" line.
   If you left some out, say how many and of which priority.
3. **Opportunities**: at most 3, pre-existing in the touched code, chosen by payoff over cost. Weigh payoff by how often the file changes: `git log --since="12 months ago" --format= --name-only -- <file> | wc -l`; debt in a file that changes often pays off more. Each: what, where, the file's churn, estimated cost (S/M/L) and risk, why it pays off. Listed only: never applied, no tickets opened.
4. **Verdict**: "ok" or "fixes needed". P1 and P2 findings block until fixed or justified with a real technical reason; P3 findings and opportunities never block. Passing tests is not a reason to approve.

If there is nothing to report, say so in one line; no filler praise. Be direct and specific, never rude, never watered down.
