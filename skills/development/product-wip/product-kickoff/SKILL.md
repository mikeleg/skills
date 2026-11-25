---
name: product-kickoff
description: Starting point for taking an idea, an MVP or a change request to estimable specs and a backlog. Walks a short decision tree (new or existing project, MVP agreed or not, bug or feature), sets up docs/product/state.md, and says which product skill to run next. Use when the user starts a new project or client engagement, says "ho un'idea", "nuovo progetto", "il cliente chiede", "da dove parto", or wants to organise work before specifying and estimating it.
---

# Product kickoff

Walks the decision tree, creates or updates `docs/product/state.md` and names the next step. It does not write specs or backlog items itself.

Kickoff is optional. Every other product skill can be invoked directly and copes with missing files; kickoff exists to choose the shortest sensible path and to record the project settings once so nobody has to repeat them.

## Inputs and outputs

- **Reads**: `docs/product/state.md` if present, the repository (application code, git remote, build files), any material the user provides.
- **Writes**: `docs/product/state.md` and `docs/product/tracker.md`.
- If `state.md` already exists, summarise phase and next step and ask whether to continue or open a new request, rather than starting over and losing what was decided.

Write the documents in the language the user chooses (default Italian) and record it in `state.md`. Pattern names stay in English.

## Decision tree

Ask one question at a time, offering a proposed answer whenever the repository or the request lets you infer it, and skip questions that are already answered.

1. **New or existing project?** If the repository contains application code, propose "existing".

### New project

2. **Is the MVP already agreed with the client?** Yes: *capture* mode, collect the decisions already made. No: *propose* mode, you propose a scope and the user corrects it.
3. **Appetite**: the maximum time or budget worth investing in the MVP. It is what makes the 80/20 cut concrete; if the user does not know, ask for an order of magnitude.
4. **Prototype needed?** Yes when the interface is central or the client must validate it. The prototype becomes a project reference, but the spec wins on conflict.
5. **Path**: product-mvp (impact map + story map), product-prototype if needed, product-decision for each real choice, product-spec for each story map activity, product-backlog.

### Existing project

New features on a running project are routine agile work, so there is no problem hunt.

2. **Bug or small change** (one rule, one field, one contained behaviour): short delta spec with product-spec, then product-backlog with one or two slices.
3. **Feature**: delta spec with product-spec (which reads the touched code), product-decision only if a real choice emerges, then product-backlog.

### Project settings

- **Backlog target**: infer from the git remote (`github.com` means GitHub, `dev.azure.com` or `visualstudio.com` means Azure DevOps, otherwise local) and confirm. Write it on the `Backlog:` line of `state.md` exactly as `GitHub`, `Azure DevOps` or `local`. Then write `docs/product/tracker.md` from the matching template in `${CLAUDE_SKILL_DIR}/trackers/` (`github.md`, `azure-devops.md`, `local.md`), filling in the real values: repo for GitHub; organization, project, process and the work item types read from the project, area and iteration for Azure DevOps. The file holds the exact commands product-backlog uses to read and publish, so the tracker is configured once per project instead of being guessed at every run. Run the template's setup check before moving on, so a missing login or a wrong project surfaces at kickoff and not at the end of the slicing; if it fails, say what is missing and keep the choice, do not switch to local.
- **Stack**: infer from the repository, otherwise ask. It only feeds estimates; the skills describe work by role (interface, API, data, integration) so they stay stack-agnostic.
- **Human time**: hours or percentage for the human work the `estimate` skill leaves out (review outside agent sessions, meetings, client alignment). product-backlog copies it into `scope.md` as a separate quote line. If the user gives none, leave it empty and say the quote will lack it.

## Guidelines

- Record undecided client choices under "Open decisions" instead of filling them in, because an invented decision ends up in a quote.
- Hours come from the `estimate` skill, in agentic hours (active coding-agent session time), calibrated on the actuals `log-task-hours` records. Human time is a separate line, so both stay visible in the quote.
- If a skill named in the path is not installed, say so and describe the minimum the user can provide to continue without it.

## `state.md` template

```markdown
# Project state

- Flow: new | existing
- Mode: capture | propose | small change | feature
- Appetite: ...
- Prototype: yes (vX) | no
- Backlog: GitHub | Azure DevOps | local
- Stack: ...
- Human time: ... h | ...%
- Document language: Italian

## Phase
What is done and what is not.

## Open decisions
- [ ] Problem - prerequisites: ...

## Specs
- SPEC-NN Name - Draft | Ready

## Next step
The skill to run and on what.
```

Write the headings in the document language.
