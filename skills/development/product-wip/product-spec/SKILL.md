---
name: product-spec
description: Write an estimable specification (spec, specifica, requisiti, analisi funzionale) for one product capability or one change to an existing codebase, with Given/When/Then acceptance criteria and an S/M/L hour size, saved in docs/product/specs. Use whenever the user wants to specify, detail, analyse or estimate a feature, a user story, a change request, a new screen or flow, or a bug fix before development, on a new or an existing project, even if they never say "spec" (e.g. "il cliente vuole aggiungere l'export PDF, come lo specifichiamo?").
---

# Product spec

Produces a spec for **one capability** (a user-visible outcome such as "the customer books a slot") or, on an existing project, for **one change** (delta spec). The spec describes verifiable behaviour, not technical layers: slicing into technical work happens later in product-backlog, and a spec organised as "backend / frontend" would force that slicing to be redone.

The reader is anyone on the project, including the client, so the business part comes first and stays free of jargon; technical detail goes at the end.

## Inputs and outputs

- **Reads, when present**: `docs/product/state.md`, `docs/product/mvp.md` (story map), `docs/product/decisions/`, `docs/product/prototype/`, and on existing projects the application code.
- **Writes**: `docs/product/specs/S-NN-capability-name.md` (next free number).
- **Updates, when present**: `state.md` (spec list and status, new open decisions).

This skill works on its own. Every input file is optional: when one is missing, take what you need from the user's request or the repository and ask only for the minimum you cannot infer (goal, actors, main path). Do not tell the user to run another skill first, and do not invent business facts; an unknown that matters becomes an open point. Create `state.md` only if you need to record an open decision.

Write the document in the language set in `state.md`, otherwise in the user's language (default Italian). Pattern names (ADR, EARS, Given/When/Then) stay in English because translating them makes them harder to recognise.

## Procedure

1. **Bound the capability.** One user goal per spec. If the request covers several goals, propose a split and ask, because a spec with several goals cannot be sized or accepted as a unit.
2. **On an existing project, read the code first** (see "Delta spec" below).
3. **Business part**: goal, actors, main path, variants and exceptions, business rules, out of scope.
4. **Acceptance criteria** numbered `AC-n` in Given/When/Then, each one checkable by a test or a person. For behaviour without a UI (jobs, integrations, rules) use EARS: "When <trigger>, the system shall <response>", "While <state>, ...", "If <unwanted condition>, then ...".
5. **Data and integrations**: entities and fields touched, external systems and what is exchanged.
6. **Non-functional requirements**: at most 3, only those that change the design, as quality attribute scenarios (source, stimulus, response, measure). Long NFR lists get ignored; the few that matter get built.
7. **Prototype reference**, if a prototype exists: version and screens. When spec and prototype disagree, the spec wins, and the divergence goes under "Open points" so someone updates the prototype.
8. **Open points**: list them. If one blocks the estimate, keep the spec in *Draft* and, if `state.md` exists, add it to "Open decisions". Use product-decision only for a real choice between options.
9. **Size**: hours of human work supported by a coding agent, including the time to review and verify the agent's output, which is the cost most often forgotten. S up to 16 h, M 16-40 h, L 40-80 h; above 80 h propose a split. Name the drivers (unknowns, integrations, legacy data).
10. **Definition of Ready**: mark the spec *Ready* only when the goal is clear, every AC is verifiable, no open point blocks the estimate, data and integrations are known or covered by a spike, and a size is assigned. product-backlog slices only Ready specs, so be honest here.

## Delta spec (existing project)

New features on a running project are routine agile work, not a problem hunt. Do a light code reading limited to what the request touches:

1. Where the change lands: entry points, modules, screens.
2. Existing contracts and data it depends on or changes (APIs, schemas, events).
3. Tests covering that area, and gaps that matter for this change.

Stop there: no architecture review, no list of unrelated issues. Then write "Current behaviour" and "New behaviour" in place of the full main path, grounded in what the code shows, and put touched areas, contracts and tests in "Technical notes" with file paths. Add ACs for what must not change, because regressions are the main risk of a delta.

For a bug or a small change keep it short: current behaviour, new behaviour, ACs, size.

## Writing rules

- Omit empty sections rather than writing "N/A"; a shorter spec gets read.
- Technical notes describe work by role (interface, API, data, integration) and cite real files when the code exists; they do not prescribe a framework, so the spec survives stack choices.

## Template

```markdown
# S-NN Capability name

- Status: Draft | Ready
- Size: S | M | L (hour range)
- Prototype: vX, screens ...
- Decisions: D-NNN, ...

## Goal
## Actors
## Main path            (delta: Current behaviour / New behaviour)
## Variants and exceptions
## Business rules
## Out of scope
## Acceptance criteria
- AC-1 Given ... When ... Then ...
## Data and integrations
## Non-functional requirements
## Open points
## Technical notes
```

Translate the headings into the document language.
