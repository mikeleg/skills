---
name: shape-it
description: >-
  Plan a big chunk of work as a wayfinder map with fixed limits on grilling rounds and tickets. Use it for a pre-sales estimate of a new project (with zero specifications or with some or full specifications) and for new features on an existing project. Also use it to continue a map ("work through the map"). Trigger phrases: "shape it", "plan this feature", "I have an idea", "scope the MVP", "break this down", "estimate a new project", "pre-sales estimate", "pianifica", "stima per un nuovo progetto", "nuova feature", "lavora sulla mappa".
argument-hint: "<presales-zero|presales-spec|feature> <idea, spec path, or map path/URL [ticket]>"
---

# Shape It

This skill wraps Matt Pocock's `wayfinder` skill (MIT). It needs the `mattpocock-skills` plugin. Wayfinder plans a big chunk of work as a map of decision tickets. Shape-it adds fixed directives that keep the grilling short and the map small.

Reply to the user in the user's language. Write the map and the tickets in English, unless the user asks otherwise.

## Profile

The profile is the first word of `$ARGUMENTS`. The rest of `$ARGUMENTS` is the user's request. If the profile is missing or unknown, ask the user which one applies.

- `presales-zero`: pre-sales estimate for a new project with zero specifications.
- `presales-spec`: pre-sales estimate for a new project with some or full specifications. Read the specifications first. Extract the decisions they already make. Do not ask these again.
- `feature`: new features on an existing project. Read these first: `README`, `CLAUDE.md` or `AGENTS.md`, `GLOSSARY.md`, `docs/adr/`, `docs/conventions.md`. The decisions recorded there are already made.

The user is the consultant. The consultant is not the client.

## Find wayfinder

Wayfinder, `to-spec` and `to-tickets` cannot run with the Skill tool. Their frontmatter sets `disable-model-invocation: true`. Read the files instead.

1. Look for the newest match of `~/.claude/plugins/cache/*/mattpocock-skills/*/skills/engineering/wayfinder/SKILL.md`.
2. If there is no match, stop. Tell the user to add the marketplace `mattpocock/skills` and install `mattpocock-skills@mattpocock`.

The skills `grilling`, `domain-modeling`, `research` and `prototype` are normal skills of the same plugin. Call them with the Skill tool, as wayfinder says.

## Fixed directives

These directives override wayfinder and every skill it calls.

1. Copy these directives in full and the row of the chosen profile into the map **Notes** at charting. Every later session applies them. In a "work through the map" session, read them from **Notes** and apply them.
2. Never write in **Notes** an exception to wayfinder's "plan, don't do". A `task` ticket that delivers part of the destination is mis-typed. Close it as out of scope.
3. Open a ticket or ask a question only if the answer changes what gets built or in which order. Put everything else in **Not yet specified**.
4. The destination is one or two lines. Fix it in one grilling round. Never write "the whole product".
5. Grilling: at most N rounds per session and at most 4 questions per round. N comes from the profile. Each question is one sentence plus the recommended answer. At the cap, close with what is decided. Put the rest in **Not yet specified**. Do not visit every branch of the design tree.
6. Charting: at most M tickets. M comes from the profile. If more questions are sharp, keep the M that unblock the most work. Put the others in **Not yet specified**, one line each.
7. Facts before questions. If code, documents or the tracker can tell the answer, make it a `research` ticket or an AFK task. Never ask the human.
8. A decision that belongs to the client is not grilled and not assumed. Collect these decisions in one HITL `task` ticket titled "Domande al cliente". It is a checklist that the consultant sends to the client. Mark the tickets that depend on it as blocked by it.
9. Do not discuss implementation details in grilling (names, schemas, code structure). They belong to `to-spec` and `to-tickets`.
10. A glossary and ADRs that already exist are decisions made. Do not reopen them.

| Profile | Max tickets at charting (M) | Max grilling rounds per session (N) | domain-modeling |
|---|---|---|---|
| `presales-zero` | 6 | 2 | Off. Create no `GLOSSARY.md` or ADR file before the contract is signed. Keep the terms in the map. |
| `presales-spec` | 5 | 2 | Off, as above. |
| `feature` | 5 | 2 | On. Read and update `GLOSSARY.md` and ADRs as `domain-modeling` says. |

The numbers are assumptions. Change them here.

## Tracker

Use local markdown, as in the local-markdown tracker of Matt Pocock: `.scratch/<effort>/map.md` and `.scratch/<effort>/issues/NN-<slug>.md`. This applies to both pre-sales profiles and to Azure DevOps projects.

If `/setup-matt-pocock-skills` configured the project for GitHub or GitLab, use that tracker. Read `docs/agents/issue-tracker.md`.

## Run

1. Read the `wayfinder` file you found. Skip its frontmatter.
2. Follow it under the fixed directives. Pass the rest of `$ARGUMENTS` as the user's request.
3. Choose the mode from the request:
   - A loose idea or a spec path: chart a new map.
   - A map path, URL or number, with or without a ticket: work through the map.
4. Chart the map every time, also for a small feature. Wayfinder says to stop and ask when no fog remains. Here, chart a small map anyway.
5. When you chart, write the directives into **Notes** (directive 1).
6. When you work through a map, read the directives from **Notes** first.

## Exit

The map is clear when two things are true. No ticket is open. Nothing in **Not yet specified** blocks the destination.

Then tell the user to run these two steps by hand:

1. `/to-spec`
2. `/to-tickets`

With local markdown, `/to-tickets` writes `.scratch/<slug>/issues/`.

## Signs you are doing it wrong

- The map has more than M tickets at charting.
- A grilling round has more than 4 questions.
- The grilling goes over N rounds in one session.
- The consultant answers a client decision, or you assume it.
- A ticket builds a part of the destination instead of deciding.
- You ask the human for a fact that the code or the documents hold.
- A question or a ticket does not change what gets built or in which order.
- You create a `GLOSSARY.md` or an ADR file in a pre-sales profile.
