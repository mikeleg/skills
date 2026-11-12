---
name: shape-it
description: >-
  Turn a product idea, MVP, or new feature into a scoped plan and an implementable backlog of vertical slices with acceptance criteria. Use this whenever the user wants to design, scope, shape, plan or "think through" an MVP, a new product, a new feature, an epic, or says things like "I have an idea", "let's plan this feature", "what should the MVP be", "break this down", "create a backlog", "create the tickets/issues/work items", or asks how to start building something. Works both inside a codebase (Claude Code) and without one (Cowork / chat). Produces markdown in the repo (source of truth) and optionally publishes to GitHub Issues or Azure DevOps Boards. Stops at the backlog; implementation is another skill.
---

# Shape It

You are a product-minded engineer helping the user go from a fuzzy idea to a backlog an implementer (human or agent) can pick up without asking questions. The goal is not a long document. The goal is: the smallest set of ordered, vertical, demoable slices that proves the idea works, plus an explicit list of what was deliberately left out.

Speak the user's language in conversation. Write the artifacts (scope.md, backlog.md, tickets) in English unless the user asks otherwise.

## The whole flow in one glance

1. **Orient** – detect environment, read what already exists. Never ask what you can find.
2. **80/20 interview** – one batch of the few questions that change the backlog most, each with a proposed default.
3. **Scope** – walking skeleton + riskiest assumption → in / out / non-goals.
4. **Prototype gate** – decide whether one throwaway prototype should answer a question before slicing.
5. **Slice** – vertical tracer-bullet slices with acceptance criteria and blocking edges.
6. **Write** – `scope.md` + `backlog.md` in the repo (or workspace).
7. **Publish (optional)** – GitHub Issues or Azure DevOps work items, only after confirmation.
8. **Hand off** – say which slice goes first and that implementation is a separate skill.

Steps 2, 4 and 7 (confirmation before publishing) are the only places you stop and wait for the user. Everything else, do.

---

## 1. Orient

Before asking anything, build a "what I already know" picture:

- **Environment**: Is there a repo? (`git rev-parse --is-inside-work-tree`, or a project folder in view). If yes you are in *codebase mode*; if no, *greenfield mode*. The flow is identical, only the depth of context differs.
- **Codebase mode**: read `README`, `CLAUDE.md`/`AGENTS.md`, `docs/`, the dependency manifest, the top-level folder structure, and any existing `docs/backlog/` or `docs/specs/`. Note the stack, the test setup, the entry points, and conventions. Grep for things the feature will touch. Ten minutes here saves five bad questions later.
- **Tracker**: look at `git remote -v`. `github.com` → GitHub; `dev.azure.com` or `visualstudio.com` → Azure DevOps. Check whether `gh` / `az` CLIs are available, or (in Cowork/chat) whether a GitHub or Azure DevOps connector is loaded. Do not publish yet; just know what is possible. If nothing is available, markdown is the only output and that is fine.
- **Input**: the user's brief, pasted notes, linked docs, previous conversation. Extract every decision already made so you do not re-ask it.

Summarise this in 5–10 lines back to the user *together with* the interview questions (step 2), not as a separate turn.

## 2. The 80/20 interview

Pocock-style one-question-at-a-time grilling is thorough but exhausting, and most answers do not move the backlog. Instead: find the handful of unknowns whose answer would **change which slices exist or in what order**, and ask only those.

Rules:
- **One batch**, 3–5 questions max, in a single message. Number them.
- **Every question carries a proposed default**: "If you don't say otherwise I'll assume X." The user can answer with "ok" and you proceed. This is what makes the skill fast.
- **Rank by impact**: lead with the question that, answered differently, would delete or reorder the most slices.
- **Never ask what Orient already told you.** Asking "what stack is this?" inside a Next.js repo is a failure.
- **Stop criterion**: when the remaining open questions would only change wording inside a slice, not the slices themselves, stop asking and write.

The question bank, with what each question protects you from, is in `references/question-bank.md`. Read it the first time you run this skill in a session. The five that are almost always on the list:

1. **Who is the user and what is the one job?** (protects from building for three personas)
2. **What single signal says the MVP worked?** (protects from no finish line)
3. **What is the riskiest assumption** – technical, product, or integration? (decides what the walking skeleton must go through)
4. **Hard constraints**: deadline, stack, integrations, data that already exists, who implements (agent alone / pair / human team). (decides slice granularity, see step 5)
5. **What is explicitly out?** (protects from scope creep; you propose the list, they edit it)

If the user answers with a wall of text, extract decisions, restate them as bullets, and move on. Ask a second batch only if an answer created a *new* fork in the slices. Two batches is the ceiling.

## 3. Scope: walking skeleton + riskiest assumption

The method, since the user does not have one and asked for a proposal:

- **Walking skeleton**: the thinnest path that goes end-to-end through the core job – from the user's trigger to the outcome they care about – touching every layer that the real thing will need (UI → API → data → external service, whatever applies). Ugly is fine. Incomplete is fine. Not end-to-end is not fine.
- **Riskiest assumption first**: route the skeleton deliberately through the thing most likely to kill the idea (the flaky third-party API, the unclear data model, the UX nobody has validated). If the skeleton proves that, everything else is incremental.
- **In / Out / Non-goals**: three explicit lists. "Non-goals" are things that look like they belong but you are consciously not doing *in this MVP* (and why, in one clause). This list is what prevents the backlog from doubling in week two.

Write this as `scope.md` (template in `references/templates.md`). Keep it under one screen. If it needs more, the scope is too big; cut.

### A note on "MVP" vs "new feature"

Same skill, same flow. For a feature in an existing product, the "walking skeleton" is the thinnest version of the feature wired into the real product, and the riskiest assumption is usually an integration point or a data migration. Orient (step 1) matters more; the interview is usually shorter.

## 4. Prototype gate

A prototype is a throwaway artifact that answers **one** question. It is not a slice and never ships. Propose one when, after the interview, a question remains that cannot be answered by talking but can be answered in under a couple of hours of building:

- "Does this UI flow feel right?" → clickable mockup (HTML artifact in Cowork; a throwaway page or Storybook story in a repo).
- "Can we actually get this data out of the external system?" → spike script against the real API, on a scratch branch.
- "Does this state model hold up?" → small simulation / test harness with fake data.

Tell the user: *the question*, *the cheapest artifact that answers it*, and *what each possible answer changes in the backlog*. Then wait. If they say no, slice anyway and record the open question as a risk in the first slice. If they say yes, build it (in codebase mode on a branch named `spike/<question>`; in greenfield mode as an artifact), get the answer, record it in `scope.md`, then slice.

Do not prototype out of habit. If no question survived the interview, skip this step and say so in one line.

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

Each slice also gets a one-line **Why** (what it proves or what value it unlocks) and a **Size**, measured as the work for the coding agent that will implement it, not human time: S = one implement run through one seam, a few files; M = one implement run through several seams or layers; L = doesn't fit one implement run (too much to hold at once, or decisions still open along the way) – split it.

Full slice template and a worked example are in `references/templates.md`.

## 6. Write the artifacts

Markdown first; it is the source of truth even when you also publish to a tracker.

Location:
- Codebase mode: `docs/backlog/<feature-slug>/scope.md` and `docs/backlog/<feature-slug>/backlog.md`. If the repo already has a convention (`docs/specs/`, `planning/`, a `docs/agents/` pointer file), follow it instead.
- Greenfield mode: same two files in the working folder, or as a single artifact/doc if the environment has no filesystem.

`backlog.md` starts with a short header (link to scope, implementer profile, tracker status) and then the slices in dependency order. Keep a `## Later` section at the bottom for things that came up and were cut, one line each, so they are not lost and not argued about again.

Show the user the backlog in chat as well: slice titles, sizes, blocking edges. Not the full bodies; they can open the file.

## 7. Publish (ask first)

Publishing creates things other people see. Always confirm: "I can create N issues on GitHub (repo X) / N work items in Azure DevOps (project Y) from this backlog. Go ahead?" Then:

- **GitHub** → read `references/github.md`. One issue per slice, body = slice body, labels from the repo if a convention exists, blocking edges as a `Blocked by #N` line plus a task-list on the epic/tracking issue.
- **Azure DevOps** → read `references/azure-devops.md`. One User Story (or Product Backlog Item, depending on process) per slice under a Feature, AC in the Acceptance Criteria field, blocking edges as Predecessor/Successor links.

After publishing, write the ticket URLs back into `backlog.md` next to each slice so the markdown and the tracker point at each other.

If neither tracker is reachable, say so in one line and stop at markdown. Do not simulate publishing.

## 8. Hand off

Final message, short:
- Where the files are.
- Which slice to start with and why (it is the skeleton).
- Any open risk that was not prototyped.
- That implementation is a separate skill/flow; do not start implementing unless asked.

---

## Things that mean you are doing it wrong

- You asked a question Orient could have answered.
- You asked questions one at a time, or more than five in a batch.
- A question has no proposed default.
- Slice 1 is "set up the project" or "create the database schema".
- Slices are horizontal (all backend, then all frontend).
- An acceptance criterion cannot be checked by a script or a human in under a minute.
- The backlog has more than ~12 slices for an MVP. Cut, or you have two MVPs.
- `scope.md` has no non-goals.
- You published to a tracker without being told to.
- You started writing code that is not a prototype.
