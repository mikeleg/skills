---
name: estimate
description: Estimate the agentic work time (hours of active Claude Code session work, not human time) of the tickets of a spec, for a new feature or a new project, as min / probable / max per ticket plus a probable and a prudent total, usable for a customer quote and for internal planning. Runs after /to-tickets. Use when the user asks to estimate, quote or size a backlog (e.g. "/estimate", "estimate the backlog", "stima il backlog", "quanto tempo ci vuole", "fammi un preventivo", "/estimate 15300").
argument-hint: "[path to spec.md or ticket folder, or issue number]"
---

# Estimate

Estimate how many hours of agentic work the tickets of a spec will take: active Claude Code session time, the same unit `log-task-hours` records as actuals. It is not human time. Speak the user's language in chat; write the artifacts in English unless asked otherwise.

## 1. Input

From `$ARGUMENTS`, otherwise look in the repo for `.scratch/<feature-slug>/`, otherwise a spec already on Azure DevOps (Feature id, or the PBIs / User Stories under it) or GitHub (the issue labelled `ready-for-agent`). Read three things:

- The spec (`spec.md`): "Problem Statement", "Solution" and "Implementation Decisions".
- The tickets from `/to-tickets`: `.scratch/<feature-slug>/issues/NN-<slug>.md` locally, or the issues on GitHub. The ticket id is its number.
- The wayfinder map (`.scratch/<effort>/map.md`, or the issue labelled `wayfinder:map`): the "Not yet specified" items, the "Domande al cliente" ticket and the prototype tickets. The map slug can differ from the feature slug.

If there are no tickets, stop and tell the user to run `/shape-it`, then `/to-spec` and `/to-tickets`. Do not give rough estimates of an idea that has no tickets.

## 2. Per ticket: min / probable / max

The tickets have no Size. Assign S, M or L to each ticket from its "What to build" and its acceptance criteria. Write the reason in the assumption cell.

Start from the reference table. These are **uncalibrated defaults**: state them as assumptions in the output, never as facts.

| Size | min | probable | max |
|---|---|---|---|
| S | 1 h | 2 h | 3 h |
| M | 3 h | 5 h | 8 h |

- **L is not estimated.** Send it back to `/to-tickets` to be split. The estimate is then **partial**: every total leaves the L tickets out, so it is not the full scope and must not go in a customer quote until they are split and re-estimated (see steps 4 and 6).
- **Tickets already done** are not estimated. A ticket is done when its Status says done or resolved, or when its GitHub issue is closed. Its value is the actual hours (see the sources in step 5), a single number with no min/max range, so it adds nothing to the uncertainty. The reference table, the widening of the max and the calibration values apply only to the remaining tickets.
- Widen the **max**, not the probable, for each open risk the ticket carries, for a skipped prototype, and for an unfamiliar stack or integration in an existing codebase. The open risks are the "Not yet specified" items of the map and the unanswered items of the "Domande al cliente" ticket. A prototype is skipped when the map has no resolved prototype ticket on the riskiest assumption. Say how much and why in the ticket's assumption cell. No fixed percentage buffer.
- If the calibration (step 5) gives better values, use them instead of the table and say so.

## 3. Extra lines outside the tickets

Also agentic work, estimated as separate lines. Defaults, uncalibrated:

| Line | min | probable | max |
|---|---|---|---|
| Initial analysis (codebase and docs reading, interview follow-ups) | 1 | 2 | 4 |
| New project only: setup (repo, pipeline, environments) and first deploy | 3 | 5 | 8 |
| Release / deploy, per release | 1 | 1.5 | 3 |
| Corrections after customer feedback, per ticket | 0.5 | 1 | 2 |

Ask how many releases to plan for if the spec does not say; propose one as the default. Corrections apply to every estimated ticket that reaches the customer, not to done tickets (their actual already includes the corrections made) and not to L tickets. Drop the lines that do not apply: no setup in an existing project, and no line whose work is already done (the initial analysis once tickets have been implemented, a release already made), because those hours are already inside the actuals.

**Exclusions**, listed in the output and never counted: meetings, emails, customer calls, waiting for answers or approvals, human review time, and any other non-agentic human work.

## 4. Totals

Two numbers, both over the remaining tickets and the extra lines:

- **Probable** = sum of the probable values. For internal planning.
- **Prudent** = probable + sqrt(sum of (max - probable)^2). For the customer quote: the risks are unlikely to all hit together, so the margin grows with the square root, not linearly. Round both up to the next 0.5 h.

State the formula in the output.

If some tickets are done, keep the done and the remaining apart: **Done** = sum of the actuals; **Remaining** = probable and prudent as above; **Full scope** = done + remaining (probable and prudent), the figure a customer quote can use. The user plans the work left from the Remaining figures.

## 5. Calibration (when actuals exist)

Compare estimate and actual per ticket, and per Size. Read the Size of a done ticket from the earlier `estimate.md`. Do not build tooling; read and compute by hand.

- **Azure DevOps**: the `Microsoft.VSTS.Scheduling.CompletedWork` of the child Tasks under each PBI / story (logged by `log-task-hours`), summed per ticket.
- **Otherwise**: the **Actual (h)** line of the ticket file in local markdown. Add the line after the Estimate line when the ticket is done, and ask the user to fill it if it is missing. On GitHub, ask the user for the actual hours. Keep the ticket's Estimate line: the calibration needs it.

If the actuals of at least ~3 tickets of a Size are in, compare their median with the probable of that Size and with the min/max range; propose updated S/M reference values and say how many tickets they rest on. Applying the new values to this or later estimates needs the user's ok. With no actuals, skip this step in one line.

## 6. Output

Write `estimate.md` next to the spec: `.scratch/<feature-slug>/estimate.md`. On GitHub, write it at the repo's `.scratch/<feature-slug>/` too, or ask the user where. Template (omit the Done section when no ticket is done; omit the partial banner when there is no L ticket):

```markdown
# Estimate – <Feature / MVP name>

> **PARTIAL ESTIMATE: the totals EXCLUDE the L tickets <03, 05>.** Do not put them in a customer quote until those tickets are split with `/to-tickets` and re-estimated.

Spec: ./spec.md · Tickets: ./issues/ · Map: <path> · Estimated <date> · Unit: hours of agentic work (active Claude Code session time), not human time

## Done
| Ticket | Size | Actual |
|---|---|---|
| 00 · <title> | M | 4.5 |

## Remaining tickets
| Ticket | Size | Min | Probable | Max | Assumption |
|---|---|---|---|---|---|
| 01 · <title> | M | 3 | 5 | 10 | Size M: <reason>. Max +2: skipped prototype on <riskiest assumption> |
| 02 · … | S | 1 | 2 | 3 | Size S: <reason> |

## Extra lines
| Line | Min | Probable | Max | Assumption |
|---|---|---|---|---|
| Initial analysis | 1 | 2 | 4 | – |
| Deploy x <N> releases | … | … | … | – |
| Corrections x <N> tickets | … | … | … | – |

## Totals
- **Done: <h> h** (sum of the actuals)
- **Remaining probable: <h> h** (internal planning)
- **Remaining prudent: <h> h** (planning with margin) = probable + sqrt(sum of (max − probable)²)
- **Full scope, probable / prudent: <h> / <h> h** (done + remaining; the prudent one is for the customer quote)
- Excluded: L tickets <03, 05>, not estimated.

## Assumptions
- Reference values used: S = 1 / 2 / 3 h, M = 3 / 5 / 8 h; analysis, setup, deploy and corrections as in the skill. Uncalibrated defaults | calibrated on <N> tickets (<date>).
- <number of releases, anything the numbers depend on>

## Exclusions
- Meetings, emails, customer calls, waiting times, human review and any other non-agentic work.
```

Also add one line to each estimated ticket file, after `**Blocked by:**`: `**Estimate (h):** <min> / <probable> / <max>`. Leave done tickets as they are (they have their Actual) and add nothing to L tickets. On GitHub, the label in step 7 replaces this line.

### Reader summary (ask first)

Offer to also write `summary.md` next to `estimate.md`, for a reader who knows nothing about the project (PM, customer). Ask which language to write it in; default to the user's chat language. Fixed order, descriptions before numbers, so the reader understands the product before the tables:

1. **What the product does**: the macro features from the spec "Problem Statement" and "Solution", in plain language.
2. **Where AI is used**: derive it from the spec "Solution" and "Implementation Decisions": feature, what the AI does, what it does not do, who stays in control; and which cost lines it drives. Omit when the product uses no AI.
3. **Key numbers**: probable and prudent totals, and what the unit means (agentic hours, not human days).
4. **Tickets table**: columns ID, What it does (from the ticket's "What to build"), Size, Blocked by, Min / Probable / Max, Risk. No compressed title alone.
5. **Open risks** in plain words: what is unknown, who must unblock it, effect on the estimate.
6. **Assumptions and exclusions**.
7. **Glossary**: every acronym and domain term used in the summary, one line each.

If tickets lack "What to build", or the spec lacks "Problem Statement" or "Solution", stop and tell the user to complete them with `/to-spec` and `/to-tickets` first (or offer to draft them for the user's ok). Do not invent descriptions from titles silently.

Chat summary, short. When there are L tickets, open with the warning: the totals exclude them, they are not the full scope and must not go in a customer quote until the tickets are split via `/to-tickets` and re-estimated; name the tickets. Then: totals (done, remaining and full scope when something is done; otherwise probable and prudent), the tickets that carry the most uncertainty, the calibration finding if any.

## 7. Tracker

- **Azure DevOps**: when the tickets are work items, offer to write the probable value of each remaining ticket to `Microsoft.VSTS.Scheduling.OriginalEstimate`. Ask before writing to the board, then, following `shape-it`'s `references/azure-devops.md` (same `az` setup, org and project):
  `az boards work-item update --id <id> --fields "Microsoft.VSTS.Scheduling.OriginalEstimate=<probable>" --org <org>`
  If the work item type does not accept the field, report it once and skip; do not create Tasks to hold it.
- **GitHub**: when the tickets are issues, label each remaining ticket's issue with its probable value, `estimate:<probable>h` (e.g. `estimate:5h`), right away, without asking: the label only mirrors `estimate.md`. Follow `shape-it`'s `references/github.md` (same `gh` setup):
  `gh label create "estimate:<probable>h" --color BFD4F2 --description "Agentic hours, probable" --force`
  `gh issue edit <n> --add-label "estimate:<probable>h"`
  One estimate label per issue: if it already has an `estimate:` label with another value, remove it in the same command (`--remove-label "estimate:<old>h"`). L tickets and done tickets get none. List the labels applied in the chat summary.

Do not change anything else on the work items or issues.

## Things that mean you are doing it wrong

- You estimated without tickets from `/to-tickets`, or estimated an L ticket.
- Totals that leave out L tickets are presented as the full scope, with no partial warning.
- A done ticket got a min/max range, or analysis and corrections were counted again for work already done.
- The numbers are human days or weeks, or include meetings and emails.
- You added a flat percentage buffer instead of widening the max of the risky tickets.
- The reference table is presented as measured fact, not as an uncalibrated default.
- You wrote to the Azure DevOps board without asking, or asked before labelling the GitHub issues instead of doing it.
- A reader summary opens with tables before saying what the product does.
- A row of the reader summary cannot be understood without opening the tickets, or uses an unexplained acronym.
- The product uses AI and the reader summary does not say where and for what.
