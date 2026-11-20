# Domain docs: glossary and ADRs

Adapted from Matt Pocock's domain-modeling skill (MIT), github.com/mattpocock/skills.

Contents:
- [Where the files live](#where-the-files-live)
- [Glossary format](#glossary-format)
- [Splitting into contexts](#splitting-into-contexts)
- [ADR format](#adr-format)
- [When to write an ADR](#when-to-write-an-adr)
- [Superseding an ADR](#superseding-an-adr)
- [Consumers](#consumers)

## Where the files live

Always these paths:

- `GLOSSARY.md` at the repo root (single context).
- If `GLOSSARY-MAP.md` exists at the root, the repo has several contexts: the map lists where each context's `GLOSSARY.md` lives. Pick the context the feature belongs to; ask if unclear.
- ADRs in `docs/adr/NNNN-slug.md`, numbered sequentially: scan `docs/adr/` for the highest number, add 1.
- Greenfield mode without a repo: same files in the working folder.

Create both lazily: `GLOSSARY.md` when the first term exists, `docs/adr/` when the first ADR exists. No empty files, no placeholders.

## Glossary format

```md
# {Context name}

{One or two sentences: what this context is.}

## Language

**Order**:
A customer's request to buy one or more products.
_Avoid_: Purchase, transaction
```

Rules:
- Opinionated: pick one word, list the others under `_Avoid_`.
- Definitions are one or two sentences saying what the thing IS, not what it does.
- Only terms specific to this domain. No general programming concepts (timeout, cache, handler).
- No implementation details (tables, classes, endpoints). It is a vocabulary, not a spec.
- Group under subheadings when clusters of terms emerge.

## Splitting into contexts

Most repos have one context and one root `GLOSSARY.md`. Split only when the same word has two different meanings in two areas of the product (e.g. "Order" in Sales vs Warehouse) and one definition with `_Avoid_` lines cannot hold both. Propose the split to the user and wait for the ok: it moves files that other skills read.

On the ok:
- One `GLOSSARY.md` per context, next to that context's code (e.g. `src/sales/GLOSSARY.md`), same format as above, with the context name as title.
- Move each term of the root `GLOSSARY.md` to its context; a term used in both with different meanings gets a definition in each.
- Replace the root `GLOSSARY.md` with `GLOSSARY-MAP.md`:

~~~md
# Glossary Map

## Contexts
- [Sales](./src/sales/GLOSSARY.md): quotes and customer orders
- [Warehouse](./src/warehouse/GLOSSARY.md): stock and shipments

## Relationships
- **Sales → Warehouse**: a confirmed order creates a shipment
~~~

ADRs stay in the root `docs/adr/` for every context: that is where implement and kets-review look.

## ADR format

```md
# {Short title of the decision}

{One to three sentences: the context, the decision, and why.}
```

Add only when they carry real value:
- `Status` frontmatter: `proposed | accepted | deprecated | superseded by ADR-NNNN`.
- Considered options, when the rejected alternatives are non-obvious.
- Consequences, when the decision constrains later work.

## When to write an ADR

All three must hold:
1. Hard to reverse: changing your mind later costs real work.
2. Surprising without context: a future reader would wonder "why on earth like this?".
3. The result of a real trade-off: there were genuine alternatives and you picked one for stated reasons.

What usually qualifies:
- Architectural shape.
- Integration patterns between contexts or systems.
- Technology choices with lock-in.
- Boundary and scope decisions, including the explicit no-s.
- Deliberate deviations from the obvious path.
- Constraints not visible in the code.
- Rejected alternatives that someone would otherwise propose again.

Not an ADR: anything easy to reverse, the order of the slices, the in / out list of this round (that is `scope.md`). Often a feature yields zero or one ADR. Never pad.

## Superseding an ADR

Never edit an ADR to say the opposite. A new ADR records the new decision, and the old one gets `Status: superseded by ADR-NNNN`. This needs the user's explicit ok.

## Consumers

`implement` and `kets-review` read these files and stop or flag when work contradicts an accepted ADR or uses an `_Avoid_` term.
