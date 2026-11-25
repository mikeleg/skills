---
name: product-backlog
description: Turn specs or plain requirements into an agile backlog of vertical slices with S/M/L sizes, three-point hour estimates (PERT) and a defensible quote range, saved in docs/product/backlog.md, with optional export to GitHub Issues or Azure DevOps. Use whenever the user asks for a backlog, user stories, tasks, work items, sprint planning, a preventivo, a stima in ore, or to break a feature or spec into implementable pieces, even if they never say "slice".
---

# Product backlog

Cuts specs into **vertical slices**: each slice crosses the roles it needs (interface, API, data, integration) and ends in behaviour someone can verify. Horizontal slices ("build the tables", "build the UI") deliver nothing usable on their own and hide integration risk until the end, which is why they are avoided.

Each slice must be self-contained enough that any coding agent or harness could implement it from the slice text alone, so it carries its own context and never refers to the commands of a specific tool.

## Inputs and outputs

- **Reads, when present**: `docs/product/specs/` (Ready specs), `docs/product/decisions/`, `docs/product/prototype/`, `docs/product/state.md` (stack, backlog target, overhead, document language), `docs/product/calibration.md`, and the application code.
- **Writes**: `docs/product/backlog.md`.
- **Updates, when present**: `state.md` (totals, next step), `calibration.md` (new rows with empty actuals).

This skill works on its own. If there are no spec files, work from the specs or requirements the user provides; list what is missing for a reliable estimate, state assumptions explicitly and slice what is estimable. Specs marked *Draft* are listed with the reason and left out, because estimating an unready spec produces numbers the user will later have to defend. If `state.md` is missing, ask for stack, backlog target and overhead only when you actually need them (export or quote). If `calibration.md` is missing, skip calibration. Do not tell the user to run another skill first.

Write the document in the language set in `state.md`, otherwise in the user's language (default Italian). Pattern names stay in English.

## Procedure

1. **Walking skeleton first** on a new project: the thinnest end-to-end path through every layer into a deployable environment. It flushes out setup and integration risk while it is cheap.
2. **Slice with SPIDR**: Spike (explore an unknown), Path (one path at a time), Interface (one interface at a time), Data (a subset of data), Rules (one rule at a time). Only spikes and setup may be non-vertical.
3. **INVEST check** on each slice: independent, negotiable, valuable, estimable, small, testable.
4. **Size**: S up to 4 h, M 4-8 h, L 8-16 h. Split anything larger, because estimates beyond a couple of days are mostly guesswork.
5. **Agent leverage** per slice: *high* (CRUD, boilerplate, repetitive tests), *medium*, *low* (integrations, debugging existing systems, decisions, client alignment). Agent speed-up is uneven, so a flat discount is wrong in both directions; this field makes the reasoning visible to whoever reads the quote.
6. **Three-point estimate in hours** of human work supported by an agent, including review and verification of the agent's output: optimistic (O), most likely (M), pessimistic (P). PERT mean = (O + 4M + P) / 6, standard deviation = (P - O) / 6. Keep P within the slice size.
7. **Calibration**: if `calibration.md` holds at least 10 slices with actual hours, compute the mean deviation per size and agent leverage, apply it to new estimates and say which correction you applied.
8. **Spikes** for unknowns: a timebox in hours and an expected output (a decision, a technical proof, a measurement).
9. **Order**: walking skeleton, then high technical risk, then value, with explicit dependencies. Risk goes first so bad news arrives while there is still budget to react.
10. **Totals**, computed exactly and shown with their parts:
    - *Planning* = sum of PERT means.
    - *Quote* = sum of means + square root of the sum of variances (about the 84th percentile) + spike hours + overhead percentage if known.
    - Present the quote as a range with its components, never as a single number: quoting the mean overruns roughly half the time.
11. **Write `backlog.md`**: totals summary first, then slices in order.

## Export (adapter pattern)

`backlog.md` is the source of truth; export is a separate, optional step so the slicing logic never depends on a tool.

1. Target from `state.md`, otherwise from the git remote: `github.com` means GitHub, `dev.azure.com` or `visualstudio.com` means Azure DevOps, anything else means local only.
2. Show the list of items and ask for confirmation before creating anything remotely: it is visible to others and tedious to undo.
3. GitHub: `gh issue create`. Azure DevOps: `az boards work-item create`. One slice per item; spikes get a dedicated label or type.
4. Write the external ID next to each slice in `backlog.md`, and on later runs update those items instead of creating duplicates.

## Slice template

```markdown
### F-NNN Behaviour-oriented title

- Type: slice | spike | setup
- From: S-NN (AC-1, AC-3) - Decisions: D-NNN
- Depends on: F-NNN
- Size: S | M | L - Agent leverage: high | medium | low
- Estimate h: O 3 / M 5 / P 8 - PERT 5.2
- External: (ID after export)

**Goal**: what the user or system can do at the end.
**Roles touched**: interface, API, data, integration.
**Implementation context**: code areas, contracts, constraints.
**Verifiable steps**:
1. ...
**Verification**: test or check proving the ACs.
**Out of scope**: ...
```

Translate the headings into the document language.
