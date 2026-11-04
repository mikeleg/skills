# Templates

## scope.md

```markdown
# <Feature / MVP name>

**Status:** scoped <date> · **Implementer:** agent alone | pair | team | mixed · **Tracker:** none | github:<owner/repo> | ado:<org/project>

## Problem
One paragraph. Who hurts, when, and what they do today instead.

## User & job
<persona> needs to <job> so that <outcome>.

## Success signal
The one observable thing that says this worked: <signal>.

## Riskiest assumption
<assumption>. The walking skeleton goes through it. Prototype: none | done (<answer>) | skipped (<why>).

## In scope (this round)
- …

## Out of scope / non-goals
- <thing> – <why not now, one clause>
- …

## Constraints
- Stack / integrations / data / deadline / conventions, only the ones that bind.

## Decisions taken during scoping
- <decision> (<who, when>)

## Open risks
- <risk> – carried into slice <N>
```

## backlog.md

```markdown
# Backlog – <Feature / MVP name>

Scope: ./scope.md · Implementer: <profile> · Tracker: <status>

Order is dependency order. A slice with no "Blocked by" can start in parallel.

---

## S1 · <Title – verb phrase, what the user can do after this>
**Why:** proves <riskiest assumption> end-to-end / unlocks <value>
**Size:** S | M
**Blocked by:** –
**Tracker:** (url after publishing)

### Acceptance criteria
- Given <context>, when <action>, then <observable result>.
- Given <invalid or edge case>, when <action>, then <what happens instead>.
- …

### Implementation notes  *(agent / pair profiles; team can skip)*
- Touch: <files/modules>. Do not touch: <files/modules>.
- Interfaces to respect: <…>
- Tests to add: <test name> covering AC1; <test name> covering AC2.
- Done when: tests above pass and <manual check, if any>.

---

## S2 · …

---

## Later (cut from this round)
- <one line each; why it was cut if not obvious>
```

## Worked example (greenfield, agent-alone profile)

Idea: "a tool that watches our Slack #support channel and drafts replies from our docs".

Riskiest assumption from the interview: *the docs are good enough that a draft is useful at all.* So the skeleton must go: real Slack message → retrieval over real docs → draft → human sees it. Not "set up Slack app" as S1.

```markdown
## S1 · A support message produces a visible draft reply from the docs
**Why:** proves the core assumption (docs → useful draft) on a real message, through every layer
**Size:** M
**Blocked by:** –

### Acceptance criteria
- Given a message posted in #support-test, when the bot runs, then within 60s a draft reply appears as a thread reply prefixed "[draft]".
- Given the message asks about a topic covered in docs/, when the draft is produced, then it cites at least one doc path that actually contains the answer.
- Given the message is a greeting with no question, when the bot runs, then no draft is posted and the event is logged as "skipped: no question".

### Implementation notes
- Touch: new `src/bot/` (Slack events), `src/retrieval/` (naive embedding over docs/*.md), `src/draft.ts`. Do not touch: existing `src/web/`.
- Retrieval can be brute-force cosine over all chunks; no vector DB yet (Later).
- Tests: `draft.test.ts` – given a fixture message + fixture docs, returns a draft that includes the matching doc path; given a greeting, returns null.
- Done when: tests pass and one real message in #support-test yields a draft a human judges "would have saved me time".

## S2 · Support engineer can accept or discard a draft with one click
**Why:** turns the draft into a measurable signal (accept rate = success metric)
**Size:** S
**Blocked by:** S1
…

## Later
- Vector DB – brute force is fine under ~2k chunks
- Multi-channel – one channel proves the point
- Auto-send without human – explicitly a non-goal until accept rate > 70%
```

Notice what is *not* here: a "create Slack app" ticket, a "set up embeddings pipeline" ticket, a "design the schema" ticket. Those happen inside S1 because S1 needs them, and S1 is the only thing that proves anything.
