---
name: estimate
description: Estimate the agentic work time (hours of active Claude Code session work, not human time) of a shaped backlog of slices, for a new feature or a new project, as min / probable / max per slice plus a probable and a prudent total, usable for a customer quote and for internal planning. Runs after shape-it. Use when the user asks to estimate, quote or size a backlog (e.g. "/estimate", "estimate the backlog", "stima il backlog", "quanto tempo ci vuole", "fammi un preventivo", "/estimate 15300").
argument-hint: "[path to scope.md or backlog.md, or work item id]"
---

# Estimate

Estimate how many hours of agentic work the slices of a backlog will take: active Claude Code session time, the same unit `log-task-hours` records as actuals. It is not human time. Speak the user's language in chat; write the artifacts in English unless asked otherwise.

## 1. Input

From `$ARGUMENTS`, otherwise look for `docs/backlog/*/scope.md` + `backlog.md` (or the repo's convention), otherwise a backlog already on Azure DevOps (Feature id, or the PBIs / User Stories under it) or GitHub (epic issue). Read scope.md for the riskiest assumption, the prototype status, the open risks and the implementer profile.

If there is no sliced backlog (slices with a Size), stop and tell the user to run `shape-it` first. Do not give rough estimates of an idea that has not been sliced.

## 2. Per slice: min / probable / max

Start from the reference table. These are **uncalibrated defaults**: state them as assumptions in the output, never as facts.

| Size | min | probable | max |
|---|---|---|---|
| S | 1 h | 2 h | 3 h |
| M | 3 h | 5 h | 8 h |

- **L is not estimated.** Send it back to `shape-it` to be split. The estimate is then **partial**: every total leaves the L slices out, so it is not the full scope and must not go in a customer quote until they are split and re-estimated (see steps 4 and 6).
- **Slices already done** (an actual exists: see the sources in step 5) are not estimated: their value is the actual hours, a single number with no min/max range, so they add nothing to the uncertainty. The reference table, the widening of the max and the calibration values apply only to the remaining slices.
- Widen the **max**, not the probable, for each open risk the slice carries (scope.md "Open risks"), for a prototype that was skipped on the riskiest assumption, and for an unfamiliar stack or integration in an existing codebase. Say how much and why in the slice's assumption cell. No fixed percentage buffer.
- If the calibration (step 5) gives better values, use them instead of the table and say so.

## 3. Extra lines outside the slices

Also agentic work, estimated as separate lines. Defaults, uncalibrated:

| Line | min | probable | max |
|---|---|---|---|
| Initial analysis (codebase and docs reading, interview follow-ups) | 1 | 2 | 4 |
| New project only: setup (repo, pipeline, environments) and first deploy | 3 | 5 | 8 |
| Release / deploy, per release | 1 | 1.5 | 3 |
| Corrections after customer feedback, per slice | 0.5 | 1 | 2 |

Ask how many releases to plan for if the backlog does not say; propose one as the default. Corrections apply to every estimated slice that reaches the customer, not to done slices (their actual already includes the corrections made) and not to L slices. Drop the lines that do not apply: no setup in an existing project, and no line whose work is already done (the initial analysis once slices have been implemented, a release already made), because those hours are already inside the actuals.

**Exclusions**, listed in the output and never counted: meetings, emails, customer calls, waiting for answers or approvals, human review time, and any other non-agentic human work.

## 4. Totals

Two numbers, both over the remaining slices and the extra lines:

- **Probable** = sum of the probable values. For internal planning.
- **Prudent** = probable + sqrt(sum of (max - probable)^2). For the customer quote: the risks are unlikely to all hit together, so the margin grows with the square root, not linearly. Round both up to the next 0.5 h.

State the formula in the output.

If some slices are done, keep the done and the remaining apart: **Done** = sum of the actuals; **Remaining** = probable and prudent as above; **Full scope** = done + remaining (probable and prudent), the figure a customer quote can use. The user plans the work left from the Remaining figures.

## 5. Calibration (when actuals exist)

Compare estimate and actual per slice, and per Size. Do not build tooling; read and compute by hand.

- **Azure DevOps**: the `Microsoft.VSTS.Scheduling.CompletedWork` of the child Tasks under each PBI / story (logged by `log-task-hours`), summed per slice.
- **Otherwise**: the **Actual (h)** line of the backlog entries in markdown. Add the line next to Estimate when the slice is done, and ask the user to fill it if it is missing. Keep the slice's Estimate line: the calibration needs it.

If the actuals of at least ~3 slices of a Size are in, compare their median with the probable of that Size and with the min/max range; propose updated S/M reference values and say how many slices they rest on. Applying the new values to this or later estimates needs the user's ok. With no actuals, skip this step in one line.

## 6. Output

Write `estimate.md` next to `scope.md` (scope.md stays under one screen; it is not appended to). Template (omit the Done section when no slice is done; omit the partial banner when there is no L slice):

```markdown
# Estimate – <Feature / MVP name>

> **PARTIAL ESTIMATE: the totals EXCLUDE the L slices <S3, S5>.** Do not put them in a customer quote until those slices are split with `shape-it` and re-estimated.

Scope: ./scope.md · Backlog: ./backlog.md · Estimated <date> · Unit: hours of agentic work (active Claude Code session time), not human time

## Done
| Slice | Size | Actual |
|---|---|---|
| S0 · <title> | M | 4.5 |

## Remaining slices
| Slice | Size | Min | Probable | Max | Assumption |
|---|---|---|---|---|---|
| S1 · <title> | M | 3 | 5 | 10 | Max +2: skipped prototype on <riskiest assumption> |
| S2 · … | S | 1 | 2 | 3 | – |

## Extra lines
| Line | Min | Probable | Max | Assumption |
|---|---|---|---|---|
| Initial analysis | 1 | 2 | 4 | – |
| Deploy x <N> releases | … | … | … | – |
| Corrections x <N> slices | … | … | … | – |

## Totals
- **Done: <h> h** (sum of the actuals)
- **Remaining probable: <h> h** (internal planning)
- **Remaining prudent: <h> h** (planning with margin) = probable + sqrt(sum of (max − probable)²)
- **Full scope, probable / prudent: <h> / <h> h** (done + remaining; the prudent one is for the customer quote)
- Excluded: L slices <S3, S5>, not estimated.

## Assumptions
- Reference values used: S = 1 / 2 / 3 h, M = 3 / 5 / 8 h; analysis, setup, deploy and corrections as in the skill. Uncalibrated defaults | calibrated on <N> slices (<date>).
- <implementer profile, number of releases, anything the numbers depend on>

## Exclusions
- Meetings, emails, customer calls, waiting times, human review and any other non-agentic work.
```

Also add one line to each estimated slice in `backlog.md`, next to Size: `**Estimate (h):** <min> / <probable> / <max>`. Leave done slices as they are (they have their Actual) and add nothing to L slices.

Chat summary, short. When there are L slices, open with the warning: the totals exclude them, they are not the full scope and must not go in a customer quote until the slices are split via `shape-it` and re-estimated; name the slices. Then: totals (done, remaining and full scope when something is done; otherwise probable and prudent), the slices that carry the most uncertainty, the calibration finding if any.

## 7. Tracker (ask first)

- **Azure DevOps**: when the slices are work items, offer to write the probable value of each remaining slice to `Microsoft.VSTS.Scheduling.OriginalEstimate`. Ask before writing to the board, then, following `shape-it`'s `references/azure-devops.md` (same `az` setup, org and project):
  `az boards work-item update --id <id> --fields "Microsoft.VSTS.Scheduling.OriginalEstimate=<probable>" --org <org>`
  If the work item type does not accept the field, report it once and skip; do not create Tasks to hold it.
- **GitHub**: markdown only.

Do not change anything else on the work items.

## Things that mean you are doing it wrong

- You estimated without a sliced backlog, or estimated an L slice.
- Totals that leave out L slices are presented as the full scope, with no partial warning.
- A done slice got a min/max range, or analysis and corrections were counted again for work already done.
- The numbers are human days or weeks, or include meetings and emails.
- You added a flat percentage buffer instead of widening the max of the risky slices.
- The reference table is presented as measured fact, not as an uncalibrated default.
- You wrote to the board without asking.
