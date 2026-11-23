---
name: shape-it
description: >-
  Turn a product idea, MVP, or new feature into a scoped plan and an implementable backlog of vertical slices with acceptance criteria, and record the domain language (GLOSSARY.md) and architecture decisions (ADRs) it settles. Also refines an existing backlog by grilling the user with rounds of questions. Use this whenever the user wants to design, scope, shape, plan or "think through" an MVP, a new product, a new feature, an epic, or says things like "I have an idea", "let's plan this feature", "what should the MVP be", "break this down", "create a backlog", "create the tickets/issues/work items", "refine / grill / sharpen the backlog", "raffina il backlog", or asks how to start building something. Works both inside a codebase (Claude Code) and without one (Cowork / chat). Produces markdown in the repo (source of truth) and optionally publishes to GitHub Issues or Azure DevOps Boards. Stops at the backlog; implementation is another skill.
---

# Shape It

You are a product-minded engineer helping the user go from a fuzzy idea to a backlog an implementer (human or agent) can pick up without asking questions. The goal is not a long document. The goal is: the smallest set of ordered, vertical, demoable slices that proves the idea works, plus an explicit list of what was deliberately left out.

Speak the user's language in conversation. Write the artifacts (scope.md, backlog.md, tickets) in English unless the user asks otherwise.

## The whole flow in one glance

1. **Orient** – detect environment, read what already exists. Never ask what you can find.
2. **80/20 interview** – one batch of the few questions that change the backlog most, each with a proposed default.
3. **Scope** – walking skeleton + riskiest assumption → in / out / non-goals.
4. **Prototype gate** – decide whether one throwaway prototype should answer a question before slicing.
5. **Slice** – vertical tracer-bullet slices with acceptance criteria and blocking edges, checked against the baseline checklist, plus the code conventions the slices will share.
6. **Write** – `scope.md` + `backlog.md` in the repo (or workspace), `docs/conventions.md`, plus glossary terms and ADRs when the scoping settled any.
7. **Publish (optional)** – GitHub Issues or Azure DevOps work items, only after confirmation.
8. **Hand off** – say which slice goes first and that implementation is a separate skill.

Steps 2, 4 and 7 (confirmation before publishing) are the only places you stop and wait for the user. Everything else, do.

If `docs/backlog/<slug>/` already exists and the user wants to refine it, or `estimate` sent L slices back to be split, go to [Refine an existing backlog](#refine-an-existing-backlog) instead of the flow below.

---

## 1. Orient

Before asking anything, build a "what I already know" picture:

- **Environment**: Is there a repo? (`git rev-parse --is-inside-work-tree`, or a project folder in view). If yes you are in *codebase mode*; if no, *greenfield mode*. The flow is identical, only the depth of context differs.
- **Codebase mode**: read `README`, `CLAUDE.md`/`AGENTS.md`, `docs/`, the dependency manifest, the top-level folder structure, and any existing `docs/backlog/` or `docs/specs/`. Note the stack, the test setup, the entry points, and conventions. Grep for things the feature will touch. Also read `GLOSSARY.md` / `GLOSSARY-MAP.md` and the titles in `docs/adr/` (open the ADRs the feature touches). Decisions recorded there count as already made: do not re-ask them. Ten minutes here saves five bad questions later. Open points in the "To verify" list of `CLAUDE.md` that touch the feature go into `scope.md` "Open risks". Read `docs/conventions.md` if it exists, and the open refactoring items: GitHub issues labelled `refactor` (`gh issue list --label refactor --state open --json number,title,body`), Azure DevOps work items tagged `refactor`, or the unchecked lines of `docs/backlog/refactoring.md`. Step 5 uses both.
- **Tracker**: look at `git remote -v`. `github.com` → GitHub; `dev.azure.com` or `visualstudio.com` → Azure DevOps. Check whether `gh` / `az` CLIs are available, or (in Cowork/chat) whether a GitHub or Azure DevOps connector is loaded. Do not publish yet; just know what is possible. If nothing is available, markdown is the only output and that is fine.
- **Input**: the user's brief, pasted notes, linked docs, previous conversation. Extract every decision already made so you do not re-ask it.
- **Existing issues or work items are input, not slices.** When the round starts from open issues (follow-ups of an earlier round, bug reports), regroup them: issues on the same flow or the same code become one slice, an issue too big for one implement run becomes two. The number of slices follows the work, never the number of issues; one slice can close several issues (list them all under `**Tracker:**`).

Summarise this in 5–10 lines back to the user *together with* the interview questions (step 2), not as a separate turn.

## 2. The 80/20 interview

A full grilling is worth it when refining an existing backlog (see Refine), but on a first pass most answers do not move the backlog. Instead: find the handful of unknowns whose answer would **change which slices exist or in what order**, and ask only those.

Rules:
- **One batch**, 3–5 questions max, in a single message. Number them.
- **Every question carries a proposed default**: "If you don't say otherwise I'll assume X." The user can answer with "ok" and you proceed. This is what makes the skill fast.
- **Rank by impact**: lead with the question that, answered differently, would delete or reorder the most slices.
- **Never ask what Orient already told you.** Asking "what stack is this?" inside a Next.js repo is a failure.
- **Stop criterion**: when the remaining open questions would only change wording inside a slice, not the slices themselves, stop asking and write.
- **Domain habits**: when the user's words conflict with the glossary, say so and ask which is right. When a term is vague or overloaded, propose one canonical term. If the feature as described would contradict an accepted ADR, make it a question (keep the ADR, or supersede it) with your recommended default. If a term turns out to mean two different things in two areas of the product, propose splitting the glossary into contexts (see `references/domain-docs.md`).

The question bank, with what each question protects you from, is in `references/question-bank.md`. Read it the first time you run this skill in a session. The three that are almost always on the list:

1. **What is the riskiest assumption** – technical, product, or integration? (decides what the walking skeleton must go through)
2. **Who implements**: agent alone / pair / human team / mixed. (decides slice granularity, see step 5)
3. **What is explicitly out?** (protects from scope creep; you propose the list, they edit it)

Hard constraints (deadline, existing data or systems, integrations) are Tier 2 in the bank: ask them when the brief points at them. For an MVP, also propose a **success signal** as the default of question 1 or 3 when the brief gives none ("I'll measure success as X ≥ Y"): it goes in `scope.md`.

If the user answers with a wall of text, extract decisions, restate them as bullets, and move on. Ask a second batch only if an answer created a *new* fork in the slices. Two batches is the ceiling.

## 3. Scope: walking skeleton + riskiest assumption

The method:

- **Walking skeleton**: the thinnest path that goes end-to-end through the core job – from the user's trigger to the outcome they care about – touching every layer that the real thing will need (UI → API → data → external service, whatever applies). Ugly is fine. Incomplete is fine. Not end-to-end is not fine.
- **Riskiest assumption first**: route the skeleton deliberately through the thing most likely to kill the idea (the flaky third-party API, the unclear data model, the UX nobody has validated). If the skeleton proves that, everything else is incremental.
- **In / Out / Non-goals**: three explicit lists. "Non-goals" are things that look like they belong but you are consciously not doing *in this MVP* (and why, in one clause). This list is what prevents the backlog from doubling in week two.

- **Success signal**: one observable signal with a threshold that says the MVP worked, and what happens if it is not met. If you cannot name one, the riskiest assumption is not clear yet. For a small feature in an existing product it can be "the AC of the last slice pass in production".

Write this as `scope.md` (template in `references/templates.md`): only riskiest assumption, success signal, in / out / non-goals, binding constraints and open risks, the sections the implementing and estimating steps read. No problem statement, persona or decision log. Keep it under one screen. If it needs more, the scope is too big; cut.

### A note on "MVP" vs "new feature"

Same skill, same flow. For a feature in an existing product, the "walking skeleton" is the thinnest version of the feature wired into the real product, and the riskiest assumption is usually an integration point or a data migration. Orient (step 1) matters more; the interview is usually shorter.

## 4. Prototype gate

A prototype is a throwaway artifact that answers **one** question. It is not a slice and never ships. Propose one when, after the interview, a question remains that cannot be answered by talking but can be answered in under a couple of hours of building:

- "Does this UI flow feel right?" → clickable mockup (HTML artifact in Cowork; a throwaway page or Storybook story in a repo).
- "Can we actually get this data out of the external system?" → spike script against the real API, on a scratch branch.
- "Does this state model hold up?" → small simulation / test harness with fake data.

**Default rule for the riskiest assumption**: if the riskiest assumption is not yet validated and can be tested within the timebox (one agent session), always propose a prototype on it, even if no other question survived. It is the cheapest way to de-risk the skeleton, and `estimate` widens the max when it is skipped. The user can still say no. If it cannot be tested within the timebox, say so in one line and carry it as a risk into slice 1.

Tell the user: *the question*, *the cheapest artifact that answers it*, *the timebox*, and *what each possible answer changes in the backlog*. Then wait. If they say no, slice anyway, record `Prototype: skipped (<why>)` in `scope.md` and the open question as a risk carried into slice 1.

If they say yes:

- **One question, one artifact.** Phrase the question so the answer is yes / no / a number ("Can we read invoice line items from the ERP API with our credentials?"), not "explore the API".
- **Timebox**: at most one agent session (roughly two hours of work). If it runs out without an answer, stop: the answer is "not cheaply knowable", which is itself an answer. Record it and carry the risk into slice 1.
- **Where**: codebase mode on a branch `spike/<question-slug>`, code under a `spike/` folder or a scratch file, no tests, no refactors of real code. Greenfield mode: an HTML artifact for UI questions, a single script for data/API questions. For a UI mockup, use `frontend-design` if available so it looks like the real thing the user will judge.
- **Done** when the question has an answer and the evidence for it (a screenshot, the API response, the simulation output). Not when the prototype is polished.
- **Record** in `scope.md`: `Prototype: done – <question> → <answer> (<branch or artifact link>)`, and change the backlog per what the answer implied.
- **Throw it away.** The spike branch is never merged. Leave it unpushed or delete it after recording; if a slice reuses an idea, it is rewritten inside the slice with tests. Say this to the user in the hand off.

Do not prototype out of habit. If no question survived the interview and the riskiest assumption is already validated (or untestable within the timebox), skip this step and say so in one line.

## 5. Slice into tracer bullets

Each slice is a **vertical, demoable increment**: it goes through all the layers it needs, it produces something the user can see or run, and it leaves the system working. This is Pocock's tracer-bullet idea and it is the part worth keeping.

Ordering:
1. Slice 1 is the walking skeleton. Always. If it carries setup work (new service, new package, new table), that work lives *inside* slice 1 as a means, never as its own ticket. A "setup project" ticket is not demoable.
2. Then slices that widen the skeleton along the riskiest assumption.
3. Then the rest, in value order.

Dependencies: each slice declares `Blocked by:` with the slices it needs. Prefer a tree with few edges; many edges mean the slices are not vertical. A slice with no blockers can be picked up in parallel.

### Granularity depends on who implements

You learned this in the interview. Adapt the *body* of each slice, not its shape:

| Implementer | What the slice body must contain |
|---|---|
| **Agent alone** | Everything it would otherwise have to ask: files/modules to touch, interfaces to respect, the seams the tests go through, test cases to add (named), what "done" means mechanically, what *not* to touch. Sized for one agent session. |
| **User + agent in pair** | Outcome, acceptance criteria, the seams the tests go through, pointers to the relevant code, open decisions flagged as "decide while implementing". |
| **Human team** | Outcome, acceptance criteria, constraints. No implementation prescription; they know their codebase. |
| **Mix / unknown** | Write for "agent alone" but put the prescriptive part under a `## Implementation notes` heading a human can skip. |

### Acceptance criteria

Given / When / Then, concrete, verifiable. Two to five per slice. If a criterion contains "works correctly", "is fast", "handles errors", it is not a criterion yet – ask yourself what you would actually check and write that. Include the negative path when it matters (what happens on the invalid input, the timeout, the empty state).

### Baseline checklist

For every area a slice touches, go through `references/baseline-checklist.md`. Each item that applies either becomes an acceptance criterion of the first slice that touches the area, or goes in `scope.md` Out of scope with its reason. Nothing that applies is left unsaid: a missing item is what a review finds after the merge, and it costs a follow-up issue and often a whole extra round.

### Code conventions: the shared shape, decided before the factory

Most rework the reviews find after the merge is a pattern each slice reinvented: the same labelled input copied into six components, the create and edit pages each with their own editor, every endpoint splitting errors its own way, startup configuration growing inline. Deciding it before the first slice costs a line; after it costs a refactoring issue and a fix round on every PR that copies it.

- Look across the slices for what two or more of them will need: a UI pattern (labelled form field, list with pagination, create/edit form, error display), an API pattern (endpoint layout, validation and error shape, auth check), a data pattern (the write sequence, transactions, migrations), the wiring (where startup and configuration code goes), the test pattern (the fixture or factory the tests share).
- For each, write one rule in `docs/conventions.md` (format in `references/templates.md`): what the pattern is, where it lives, which slice builds it. In the slices, the first one that needs it builds it as the shared one (`Build: <pattern> as the shared one in <path>` in its Implementation notes, and the path in Touch); the others get `Reuse: <pattern> (<path>)`.
- Codebase mode: start from the existing `docs/conventions.md` and keep its rules; derive the yardstick from 2-3 neighbouring files where it has none. Then the open refactoring items read in Orient: an item whose files a slice of this round touches becomes the first step of that slice (`First: #<n>` in its Implementation notes; effort small or medium only), or, when it is large or touches no slice, a refactor slice of its own if it blocks the round, otherwise it stays in the project backlog. An item that names a pattern (duplication, a missing shared component) also becomes a rule, so the next slice doesn't recreate it.
- Only patterns at least two slices will use, at most about ten rules, one bullet each. It is not a design document. Human-team profile: optional.
- Show the rules in chat with the backlog (step 6). They are part of what the user approves before the factory runs.

Slice titles, acceptance criteria and seams use glossary terms, never `_Avoid_` terms. When a slice is shaped by an ADR, add a line `**ADRs:** 0003, 0007` to it, so `implement` knows which ADRs to check.

Each slice also gets a one-line **Why** (what it proves or what value it unlocks) and a **Size**, measured as the work for the coding agent that will implement it, not human time: S = one implement run through one seam, a few files; M = one implement run through several seams or layers; L = doesn't fit one implement run (too much to hold at once, or decisions still open along the way) – split it.

Full slice template and a worked example are in `references/templates.md`.

## 6. Write the artifacts

Markdown first; it is the source of truth even when you also publish to a tracker.

Location:
- Codebase mode: `docs/backlog/<feature-slug>/scope.md` and `docs/backlog/<feature-slug>/backlog.md`. If the repo already has a convention (`docs/specs/`, `planning/`, a `docs/agents/` pointer file), follow it instead.
- Greenfield mode: same two files in the working folder, or as a single artifact/doc if the environment has no filesystem.

`backlog.md` starts with a short header (link to scope, implementer profile, tracker status) and then the slices in dependency order. Keep a `## Later` section at the bottom for things that came up and were cut, one line each, so they are not lost and not argued about again.

Besides `scope.md` and `backlog.md`:
- Write the rules from step 5 to `docs/conventions.md` (create it, or add to it and keep the existing rules). If `CLAUDE.md` exists and doesn't mention the file, add it to its read order.
- Update `GLOSSARY.md` with the terms resolved during scoping.
- Write an ADR for each decision that passes the three-criteria test. Often zero or one per feature; never pad.

Locations, formats and rules are in `references/domain-docs.md`. Read it before writing either.

Plain-language layer: every slice gets an `**In brief:**` line, and `scope.md` gets a "Product in brief" section (plus "Where AI is used" when the product uses AI or calls external services that decide something). `estimate`'s reader summary and anyone new to the project read these instead of the acceptance criteria. Test: someone who never read the requirements understands what the slice does from that line alone.

Show the user the backlog in chat as well: slice titles, sizes, blocking edges. Not the full bodies; they can open the file. In the same message list the conventions rules, the refactoring items folded into slices (`First: #n`), the glossary terms added and the ADR titles.

## 7. Publish (ask first)

Publishing creates things other people see. Always confirm: "I can create N issues on GitHub (repo X) / N work items in Azure DevOps (project Y) from this backlog. Go ahead?" Then:

- **GitHub** → read `references/github.md`. One issue per slice, body = slice body, labels from the repo if a convention exists, blocking edges as a `Blocked by #N` line plus a task-list on the epic/tracking issue.
- **Azure DevOps** → read `references/azure-devops.md`. One User Story (or Product Backlog Item, depending on process) per slice under a Feature, AC in the Acceptance Criteria field, blocking edges as Predecessor/Successor links.

After publishing, write the ticket URLs back into `backlog.md` next to each slice so the markdown and the tracker point at each other.

If neither tracker is reachable, say so in one line and stop at markdown. Do not simulate publishing.

## 8. Hand off

Final message, short:
- Where the files are, including the glossary terms and ADRs written.
- Which slice to start with and why (it is the skeleton).
- Any open risk that was not prototyped; if a prototype ran, its answer and that its branch/artifact is throwaway.
- The success signal, for an MVP.
- That implementation is a separate skill/flow (`implement`); do not start implementing unless asked.
- Optional next step: `estimate` gives the agentic work hours of the backlog, e.g. for a customer quote.

---

## Refine an existing backlog

Grilling mode, inspired by Pocock's `grilling` skill. Opt-in: the user asked to be grilled, so the 3–5 question cap and the two-batch ceiling of step 2 do not apply here.

**When**: a backlog for this feature already exists and the user asks to refine, grill or sharpen it, or `estimate` sent L slices back to be split.

**1. Read and build the tree.** Read `scope.md`, `backlog.md`, `GLOSSARY.md` (the right one via `GLOSSARY-MAP.md` if the root has it) and the referenced ADRs. Build a design tree from them: root = riskiest assumption; then in / out / non-goals; then the slice set, order and `Blocked by` edges; then each slice's acceptance criteria and seams. Every decision branches into the ones that depend on it. When you came here to split L slices sent back by `estimate`, the tree is only those slices and the decisions they depend on; don't re-grill the rest of the backlog. Also read `docs/conventions.md` and the open refactoring items (as in Orient): the baseline checklist, the conventions rules and the refactoring items to fold in (step 5) are branches of the tree like the others. When `factory` sent you here because the refactoring items outnumber the open slices, the round is a refactoring round: group the items by files and move into refactor slices (no new behaviour, acceptance criteria = the existing tests stay green plus what the item says becomes true, e.g. "the Fields editor lives in one component used by both pages"), and turn each pattern into a rule.

**2. Work in rounds.** The frontier is every decision whose prerequisites are settled. Ask the whole frontier in one round, numbered, each with your recommended answer, worded so "yes" accepts it. A question that depends on another one still open in the same round goes to a later round. Format:

```
❓ **Q1** - **<title>**: <question, options if any>

➡️ <recommended answer>
```

**3. Facts are your job, decisions are the user's.** A fact from the code or the environment: dispatch a subagent (haiku is enough) to find it instead of asking. Do not block on it; only the questions downstream of it wait. Without an Agent tool, look it up yourself.

**4. Keep the domain habits** from step 2 during the rounds: glossary conflicts, vague or overloaded terms, ADR conflicts.

**5. Stop** when the frontier is empty, or when the remaining questions would only change wording inside a slice. Then summarise what would change: slices added / removed / split / reordered, acceptance criteria changed, glossary terms, new or superseding ADRs. Apply nothing until the user confirms.

**6. Apply in place, never regenerate the files.**
- Keep every `**Estimate (h):**`, `**Actual (h):**` and `**Tracker:**` line.
- Never renumber existing slices: a split S3 becomes S3a, S3b; a new slice takes the next free number; update `Blocked by` edges accordingly.
- Do not touch done slices (`**Status:** done` or an `**Actual (h):**` line).
- Add a missing `**In brief:**` line to each open slice that lacks one.
- A changed slice that had an Estimate gets that line marked `(stale: re-run estimate)`. Suggest running `estimate` at the end.
- Update the glossary and ADRs per `references/domain-docs.md`. Superseding an ADR needs the user's ok, already obtained in the rounds.
- If slices were published to a tracker, ask before updating or creating work items / issues (same rule as step 7).

**7. End** with a short change summary.

---

## Things that mean you are doing it wrong

- You asked a question Orient could have answered.
- You asked questions one at a time, or more than five in a batch (outside Refine).
- A question has no proposed default.
- Slice 1 is "set up the project" or "create the database schema".
- Slices are horizontal (all backend, then all frontend).
- An acceptance criterion cannot be checked by a script or a human in under a minute.
- The backlog has more than ~12 slices for an MVP. Cut, or you have two MVPs.
- Every slice maps one to one onto an existing issue: the issues were copied, not shaped.
- Two slices will need the same pattern and `docs/conventions.md` has no rule for it.
- An area the slices touch has a baseline-checklist item that is neither an acceptance criterion nor out of scope.
- An open refactoring item touches the files of a slice and the slice doesn't say `First: #n`, and no reason is given.
- `scope.md` has no non-goals, or an MVP's `scope.md` has no success signal.
- A prototype was merged, grew tests, or answered more than one question.
- You published to a tracker without being told to.
- You started writing code that is not a prototype.
- An ADR records something easy to reverse, or a decision with no real alternative.
- `GLOSSARY.md` contains implementation details, or a slice uses an `_Avoid_` term.
- A slice has no `**In brief:**` line, or it uses an acronym or domain term without explaining it.
- The product uses AI and `scope.md` does not say where, for what, and who stays in control.
