---
name: codebase-design
description: Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary.
---

# Codebase Design

Design **deep modules**: a lot of behaviour behind a small interface, placed at a clean seam, testable through that interface. Use this language and these principles wherever code is being designed or restructured. The aim is leverage for callers, locality for maintainers, and testability for everyone.

## Glossary

Use these terms exactly: don't substitute "component," "service," "API," or "boundary." Consistent language is the whole point.

**Module**: anything with an interface and an implementation. Deliberately scale-agnostic: a function, class, package, or tier-spanning slice. _Avoid_: unit, component, service.

**Interface**: everything a caller must know to use the module correctly: the type signature, but also invariants, ordering constraints, error modes, required configuration, and performance characteristics. _Avoid_: API, signature (too narrow, they refer only to the type-level surface).

**Implementation**: what's inside a module, its body of code. Distinct from **Adapter**: a thing can be a small adapter with a large implementation (a Postgres repo) or a large adapter with a small implementation (an in-memory fake). Reach for "adapter" when the seam is the topic; "implementation" otherwise.

**Depth**: leverage at the interface. The amount of behaviour a caller (or test) can exercise per unit of interface they have to learn. A module is **deep** when a large amount of behaviour sits behind a small interface, **shallow** when the interface is nearly as complex as the implementation.

**Seam** _(Michael Feathers)_: a place where you can alter behaviour without editing in that place; the *location* at which a module's interface lives. Where to put the seam is its own design decision, distinct from what goes behind it. _Avoid_: boundary (overloaded with DDD's bounded context).

**Adapter**: a concrete thing that satisfies an interface at a seam. Describes *role* (what slot it fills), not substance (what's inside).

**Leverage**: what callers get from depth. More capability per unit of interface they learn. One implementation pays back across N call sites and M tests.

**Locality**: what maintainers get from depth. Change, bugs, knowledge, and verification concentrate in one place rather than spreading across callers. Fix once, fixed everywhere.

## Deep vs shallow

**Deep module** = small interface + lots of implementation:

```
┌─────────────────────┐
│   Small Interface   │  ← Few methods, simple params
├─────────────────────┤
│                     │
│  Deep Implementation│  ← Complex logic hidden
│                     │
└─────────────────────┘
```

**Shallow module** = large interface + little implementation (avoid):

```
┌─────────────────────────────────┐
│       Large Interface           │  ← Many methods, complex params
├─────────────────────────────────┤
│  Thin Implementation            │  ← Just passes through
└─────────────────────────────────┘
```

When designing an interface, ask:

- Can I reduce the number of methods?
- Can I simplify the parameters?
- Can I hide more complexity inside?

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be internally composed of small, mockable, swappable parts; they just aren't part of the interface. A module can have **internal seams** (private to its implementation, used by its own tests) as well as the **external seam** at its interface.
- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test *past* the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.** Don't introduce a seam unless something actually varies across it.
- **A vertical slice is a module.** In a repo organized by feature, each slice (one use case with its entry point, handler, validation and data access) is a module, and its entry point (endpoint, command, message handler) is its seam. Keep the slice deep: callers and tests go through the entry point, never into the slice's internals.

## Designing for testability

Good interfaces make testing natural:

1. **Accept dependencies, don't create them.**

   ```typescript
   // Testable
   function processOrder(order, paymentGateway) {}

   // Hard to test
   function processOrder(order) {
     const gateway = new StripeGateway();
   }
   ```

2. **Return results, don't produce side effects.**

   ```typescript
   // Testable
   function calculateDiscount(cart): Discount {}

   // Hard to test
   function applyDiscount(cart): void {
     cart.total -= discount;
   }
   ```

3. **Small surface area.** Fewer methods = fewer tests needed. Fewer params = simpler test setup.

## Inside the module: clean code

The interface decides depth; the implementation behind it still has to be easy to read and change. Write it by these rules (Robert C. Martin, *Clean Code*):

- **Names.** Reveal intent and use the domain's terms (the project's `GLOSSARY.md` if it exists). No abbreviations, encodings or type prefixes. Functions are verbs, types are nouns. If a name needs a comment, change the name.
- **Functions.** Each does one thing, at one level of abstraction. Few arguments: past three, group them into a type that has a domain name. No flag arguments: two behaviors are two functions. No hidden side effects. A function either does something or answers something, not both (command-query separation).
- **Errors.** Use the stack's error mechanism (exceptions or result types), not error codes. Don't return or pass null where the language offers something better. Never swallow an error.
- **Comments.** Explain why, never what. Delete commented-out code and comments the code already says.
- **Duplication.** No duplicated logic inside a module. When two vertical slices duplicate logic, don't merge it or keep it on your own: point out which slices and what is duplicated, then ask the user whether to keep the duplicate or move it to a shared place. Say so when sharing would couple slices that change for different reasons: the wrong shared abstraction costs more than the duplicate.
- **Layout.** Public entry first, the functions it calls below it in reading order. Keep what changes together close together.
- **Tests are code too.** One behavior per test; fast, independent, repeatable, self-validating.

**When clean code and depth disagree, depth wins.** Don't split a function into shallow pieces only to make it short (see Extract a function below): a longer function that reads top to bottom is better than a chain of one-line forwarders.

## Refactoring

**Refactor**: change the structure of code without changing its behaviour. Tests are green before and after, and no test changes its expected values; run them after every move and undo the move that turns one red. Stay inside the code the change touches; a wider clean-up is its own task. _Avoid_: "clean-up", "simplify" or "tidy" as names for something else.

Use these moves, by these names, smallest first:

- **Remove dead code**: unused code and imports, leftover debug output, commented-out code, speculative abstractions nobody asked for.
- **Rename to the domain**: give a thing the domain's term (see Names above).
- **Reuse the existing helper**: replace code that duplicates a helper the project already has with a call to it.
- **Collapse a pass-through**: delete a wrapper, layer or one-use helper that only forwards calls, or a premature generic; it fails the deletion test.
- **Move to its place**: move code to where the project puts code of that kind.
- **Extract a function**: only when the new name hides real complexity and passes the deletion test.
- **Give the concept a home**: replace the same if/switch on a type or state, repeated in several places, with one place that decides; use a pattern only if the project already uses it or there are at least two real variants now.
- **Code judo**: restructure so whole branches or methods disappear while behaviour stays the same. When it exists it is the best move: look for it.

Duplication between two vertical slices is not refactored on your own: see Duplication above.

## Relationships

- A **Module** has exactly one **Interface** (the surface it presents to callers and tests).
- **Depth** is a property of a **Module**, measured against its **Interface**.
- A **Seam** is where a **Module**'s **Interface** lives.
- An **Adapter** sits at a **Seam** and satisfies the **Interface**.
- **Depth** produces **Leverage** for callers and **Locality** for maintainers.

## Rejected framings

- **Depth as ratio of implementation-lines to interface-lines** (Ousterhout): rewards padding the implementation. We use depth-as-leverage instead.
- **"Interface" as the TypeScript `interface` keyword or a class's public methods**: too narrow: interface here includes every fact a caller must know.
- **"Boundary"**: overloaded with DDD's bounded context. Say **seam** or **interface**.

## Going deeper

- **Deepening a cluster given its dependencies**, see [DEEPENING.md](DEEPENING.md): dependency categories, seam discipline, and replace-don't-layer testing.
- **Exploring alternative interfaces**, see [DESIGN-IT-TWICE.md](DESIGN-IT-TWICE.md): spin up parallel sub-agents to design the interface several radically different ways, then compare on depth, locality, and seam placement.

---

Adapted from the `codebase-design` skill in [mattpocock/skills](https://github.com/mattpocock/skills) (MIT License, Copyright (c) 2026 Matt Pocock), with the vertical-slice principle and the clean code section added. `DEEPENING.md` and `DESIGN-IT-TWICE.md` are copied unchanged.

