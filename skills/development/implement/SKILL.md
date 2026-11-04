---
name: implement
description: Implement a piece of work based on a spec or set of tickets, then simplify the result and review it with /code-review before committing.
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly.

## Simplify

Once the implementation works, simplify the code you wrote in this session. Use /simplify if available; otherwise do it yourself:

- Remove dead code, unused imports, leftover debug output and speculative abstractions nobody asked for.
- Collapse needless indirection: wrappers that only forward calls, one-use helpers, premature generics.
- Prefer existing utilities in the codebase over new ones you wrote.
- Keep behavior identical. Do not touch code outside the scope of this work.

After simplifying, run typechecking and the full test suite. If anything breaks, fix it or revert that simplification.

## Review

Use /code-review to review the work. Fix the issues it raises that are real; ignore the ones that aren't, and say why. Re-run the full test suite after any fix.

Commit your work to the current branch.
