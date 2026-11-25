---
name: product-backlog
description: Turn specs or plain requirements into an agile backlog of vertical slices sized S/M/L, every L split until none is left, each with an "In brief" line, saved in docs/product/backlog.md with a short docs/product/scope.md, ready for the estimate skill and optionally exported to GitHub Issues or Azure DevOps. Use whenever the user asks for a backlog, user stories, tasks, work items, sprint planning, or to break a feature or spec into implementable pieces before estimating or quoting it, even if they never say "slice".
---

# Product backlog

Cuts specs into **vertical slices**: each slice crosses the roles it needs (interface, API, data, integration) and ends in behaviour someone can verify. Horizontal slices ("build the tables", "build the UI") deliver nothing usable on their own and hide integration risk until the end, which is why they are avoided.

This skill does not estimate hours. The `estimate` skill does, from the slices' Size and from `scope.md`, so there is one estimator, one formula and one calibration based on the agentic hours that `log-task-hours` records. The backlog's job is to give `estimate` slices it can accept: every slice S or M, every risk written down.

Each slice must be self-contained enough that any coding agent or harness could implement it from the slice text alone, so it carries its own context and never refers to the commands of a specific tool.

## Inputs and outputs

- **Reads, when present**: `docs/product/specs/` (Ready specs), `docs/product/decisions/`, `docs/product/prototype/`, `docs/product/state.md`, and the application code.
- **Writes**: `docs/product/backlog.md` and `docs/product/scope.md`.
- **Updates, when present**: `state.md` (next step).

This skill works on its own. If there are no spec files, work from the specs or requirements the user provides; list what is missing, state assumptions explicitly and slice what is clear enough. Specs marked *Draft* are listed with the reason and left out, because slicing an unready spec produces slices that will be redone. If `state.md` is missing, ask for the backlog target only when exporting. Do not tell the user to run another skill first.

Write the documents in the language set in `state.md`, otherwise in the user's language (default Italian). Pattern names stay in English.

## Procedure

1. **Walking skeleton first** on a new project: the thinnest end-to-end path through every layer into a deployable environment. It flushes out setup and integration risk while it is cheap. Setup work lives inside it, not in a slice of its own.
2. **Slice with SPIDR**: Spike (explore an unknown), Path (one path at a time), Interface (one interface at a time), Data (a subset of data), Rules (one rule at a time). Only spikes may be non-vertical.
3. **INVEST check** on each slice: independent, negotiable, valuable, estimable, small, testable.
4. **Size**, measured as work for the coding agent that will implement the slice, the same meaning `estimate` uses:
   - **S**: one implement run through one seam, a few files.
   - **M**: one implement run through several seams or layers.
   - **L**: does not fit one implement run, because there is too much to hold at once or decisions are still open along the way.
5. **Split every L, then check again.** At the end of the slicing pass, take each L back, because `estimate` refuses L slices and a backlog with one gives only a partial estimate. An L means the work is too big for one run, and that has two possible causes, handled differently:
   - **Too much work, no open choice**: split it yourself, mechanically, with SPIDR: main path apart from edge cases, one operation at a time (create, edit, delete, list), one business rule at a time, a subset of the data first, one interface at a time. No question to the user is needed, because nothing about scope changes.
   - **The split needs a scope choice** (what goes in this round and what moves to `## Later`, which variant comes first, whether an edge case is in at all): do not choose for the user. Interview them through product-decision, one question at a time, with your recommended answer, then split according to the answer.
   Size the new slices and repeat until no L is left. Keep the original id with a letter suffix (S3 becomes S3a, S3b) so references and history survive. When a choice depends on facts nobody has yet, plan a time-boxed spike first and size the remaining work once the spike is planned.
6. **In brief**: one line per slice in plain language, saying what it does for the user. The client and `estimate`'s reader summary read this line instead of the acceptance criteria, so someone who never read the requirements must understand it.
7. **Agent leverage** per slice: *high* (CRUD, boilerplate, repetitive tests), *medium*, *low* (integrations, debugging existing systems, decisions, client alignment). It does not change the Size; it tells the reader where the agent speeds things up and where human time concentrates.
8. **Spikes** for unknowns: a timebox and an expected output (a decision, a technical proof, a measurement).
9. **Order**: walking skeleton, then high technical risk, then value, with explicit `Blocked by` dependencies. Risk goes first so bad news arrives while there is still budget to react.
10. **Write `scope.md`**, short, with the sections `estimate` reads (template below). Every open risk listed there widens the maximum of the slices it touches, so leaving one out narrows the quote without reason.
11. **Write `backlog.md`**: a header with a link to `scope.md`, the implementer profile and the next step, then the slices in order, then a `## Later` section for what was cut.
12. **Hand off**: say that the next step is `estimate docs/product/backlog.md`, and that the quote is `estimate`'s prudent total plus the human time line in `scope.md`.

## Agentic hours and human time

`estimate` measures agentic hours, the active coding-agent session time, and excludes human work. A quote still has to pay for the human time around the sessions: reviewing the agent's output outside a session, meetings, client alignment, waiting for answers. Record it in `scope.md` under "Human time" as hours or as a percentage of the agentic total, given by the user or taken from `state.md`. Keep it a separate, declared line in the quote rather than spreading it over the slices, so the agentic part stays comparable with the logged actuals and the human part stays visible to the client.

## Export (adapter pattern)

`backlog.md` is the source of truth; export is a separate, optional step so the slicing never depends on a tool.

1. Target from `state.md`, otherwise from the git remote: `github.com` means GitHub, `dev.azure.com` or `visualstudio.com` means Azure DevOps, anything else means local only.
2. Show the list of items and ask for confirmation before creating anything remotely: it is visible to others and tedious to undo.
3. GitHub: `gh issue create`. Azure DevOps: `az boards work-item create`. One slice per item; spikes get a dedicated label or type.
4. Write the external ID next to each slice on its `**Tracker:**` line, and on later runs update those items instead of creating duplicates.

## `scope.md` template

```markdown
# Scope - <feature or MVP name>

## Product in brief
What the product or feature does, in plain language, 3-5 lines.

## Where AI is used
Only if the product uses AI: feature, what the AI does, who stays in control.

## Riskiest assumption
The thing most likely to break the plan.

## Prototype
done (vX, what it answered) | skipped (why) | not needed

## Open risks
- Risk - slices it touches - who can unblock it

## Implementer profile
agent alone | pair | human team | mixed

## Human time
<hours or % of the agentic total> - what it covers (review outside sessions, meetings, client alignment)
```

## Slice template

```markdown
### S<n> - Behaviour-oriented title

**In brief:** what the user can do once this slice ships, in plain language.
**Why:** what it proves or unlocks.
**Size:** S | M - **Agent leverage:** high | medium | low
**Blocked by:** S<n>, ... | none
**From:** SPEC-NN (AC-1, AC-3) - **Decisions:** D-NNN
**Tracker:** (ID after export)

**Acceptance criteria**
- Given ... When ... Then ...

**Implementation context**: code areas, contracts, constraints.
**Verifiable steps**:
1. ...
**Verification**: test or check proving the criteria.
**Out of scope**: ...
```

Leave the slice without hour lines: `estimate` adds `**Estimate (h):**` next to Size, and `**Actual (h):**` comes later from the actuals.

Translate the headings into the document language, keeping the `**Size:**`, `**Estimate (h):**`, `**Actual (h):**`, `**Tracker:**` and `**In brief:**` labels as they are, because `estimate` looks for them.
