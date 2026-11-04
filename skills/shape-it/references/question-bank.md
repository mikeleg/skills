# Question bank for the 80/20 interview

Each question says what it protects the backlog from. Pick the 3–5 whose answer would change *which slices exist or their order*. Always attach a proposed default. Skip anything Orient already answered.

## Tier 1 – almost always worth asking

| Question | Protects from | Default to propose |
|---|---|---|
| Who is the user, and what is the one job they hire this for? | Building for several personas at once; slices that serve nobody fully | The persona that appears most in the brief / the one that pays |
| What is the single signal that the MVP worked? (a number, an event, a sentence a user says) | No finish line; endless polish | "First real user completes the core job without help" |
| What is the riskiest assumption – the thing most likely to kill this? Technical, product, or integration? | A skeleton that avoids the hard part | The external dependency or the unvalidated UX, whichever the brief mentions nervously |
| Who implements the backlog: an agent alone, you + agent, a human team, mixed? | Wrong granularity: tickets too thin for an agent or too prescriptive for humans | Agent alone (most detailed body, humans can skip sections) |
| Here is what I think is out of scope: [list]. Agree? | Scope creep; re-arguing the same cuts | The list you derived from the brief |

## Tier 2 – ask when the brief points at them

| Question | Protects from | When it matters |
|---|---|---|
| Hard deadline or budget? | Over-slicing; a 12-slice backlog for a 3-day window | Any mention of a date, a demo, a launch |
| Existing data or system this has to live with? (migrations, legacy API, auth) | Discovering the integration cost in slice 4 | Features in existing products; anything with "import", "sync", "migrate" |
| Is this throwaway (validate and maybe delete) or foundation (first version of the real thing)? | Gold-plating a throwaway; hacking a foundation | Greenfield MVPs |
| Which of these flows is the *core* path: A, B, C? | Skeleton going through the wrong flow | Brief describes several user flows |
| Must this work offline / at scale / in another locale from day one? | Hidden non-functional requirements that reshape slice 1 | Mobile, B2B, regulated domains |
| Is there a design, mockup, or competitor you are modelling this on? | Inventing UX that already exists | Anything with a UI |

## Tier 3 – rarely; only if the answer forks the slices

- Multi-tenant or single-tenant?
- Who owns the data model decision – you, or do I propose?
- Should the prototype (if any) be shown to anyone outside the team?
- Is there a test/CI convention I must satisfy for "done"?

## How to phrase the batch

```
Before I scope this, the few things that change the backlog the most:

1. Core user & job – I read it as <X>. Correct?
2. Success signal – I'll use "<Y>" unless you give me a better one.
3. Riskiest assumption – looks like <Z>. If it's something else, that's the thing I want the skeleton to go through.
4. Who implements – I'll write for an agent working alone; humans can skip the implementation notes. OK?
5. Out of scope for this round: <a>, <b>, <c>. Add or remove?

Reply "ok" to accept all defaults.
```

## Signs you should stop asking

- The user has said "ok" or "just go" once already.
- The next question would change wording inside a slice, not the slice list.
- You are about to ask something a prototype would answer better than a conversation.
