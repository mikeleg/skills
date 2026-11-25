---
name: product-decision
description: Settle one open project question at a time with clear options, a recommendation and the user's choice, recorded as an ADR in docs/product/decisions. Use whenever the user is torn between alternatives on scope, architecture, data, integrations, tools or a client commitment ("meglio A o B?", "come gestiamo...", "dobbiamo decidere se...", "which approach should we take"), or when a spec or backlog has a blocking open point.
---

# Product decision

Resolves **exactly one** open question per run and records it as an ADR. Handling one at a time keeps each choice small enough to reason about and avoids deciding things whose prerequisites are still open.

## Inputs and outputs

- **Reads, when present**: `docs/product/state.md` ("Open decisions"), `docs/product/decisions/`, `docs/product/mvp.md`, `docs/product/specs/`.
- **Writes**: `docs/product/decisions/D-NNN-short-title.md` (next free number).
- **Updates, when present**: `state.md`.

This skill works on its own. With no queue and no `state.md`, take the question from the user's request; ask only for context you cannot infer. Create `state.md` only if new open questions surface and need a home.

Write the ADR in the language set in `state.md`, otherwise in the user's language (default Italian). Pattern names stay in English.

## Procedure

1. **Pick the question.** If the user names one, use it and flag any open prerequisite. If several are queued, sketch a Mikado graph in a few lines (which questions depend on which) and pick a leaf, one with no open prerequisites.
2. **Classify reversibility**, because it decides how much analysis the question deserves.
   - *Two-way door* (cheap to change later): propose a choice with a one-line reason and ask for a quick yes.
   - *One-way door* (data model, public contracts, platform choice, commitments to the client): do the full analysis below.
3. **Options**: two or three, one of them the minimal 80/20 option. For each: what it means concretely, pros, cons, effect on the work (more or fewer slices, a spike added or removed), reversibility.
4. **Recommend** one option in a sentence, then let the user choose. On a one-way door the choice is theirs, since they carry the consequences with the client.
5. **Record** the ADR with the template.
6. **Update `state.md`** if it exists: remove the question, add any new ones with their prerequisites, write the next step.

## Guidelines

- One decision per run; new questions go to the queue so this one stays focused.
- ADRs are history: to change a decision, write a new ADR and mark the old one "Superseded by D-NNN" rather than editing it, so the reasoning trail survives.
- Write context and decision so a non-technical reader understands them.
- State missing information as an assumption instead of inventing a constraint.

## ADR template

```markdown
# D-NNN Short title

- Status: Proposed | Accepted | Superseded by D-NNN
- Date: YYYY-MM-DD
- Reversibility: one-way door | two-way door
- Relates to: SPEC-NN, S<n> slices (if known)

## Context
The question and why it must be decided now, in 3-5 lines.

## Options considered
1. **Name** - what it means. Pros. Cons. Estimate effect.
2. ...

## Decision
The chosen option and why.

## Consequences
What gets easier, what gets harder, what is still to decide.
```

Translate the headings into the document language.
