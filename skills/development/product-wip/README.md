# product-wip

Work in progress, not shipped: these skills are not listed in `.claude-plugin/marketplace.json`, so installing the plugin does not load them.

A separate set that goes from an idea or a change request to specs and a backlog that the `estimate` skill turns into hours. Each skill works on its own; documents go to `docs/product/`, in Italian by default.

| Skill | What it does |
| --- | --- |
| `product-kickoff` | Optional entry point: a short decision tree (new or existing project, MVP agreed or not, bug or feature) that sets up `docs/product/state.md` and names the next skill. |
| `product-decision` | Settles one open question at a time (Mikado graph, one-way or two-way door) with options, a recommendation and the user's choice, recorded as an ADR in `docs/product/decisions/`. |
| `product-spec` | Writes an estimable spec for one capability, or a delta spec for a change to an existing codebase after a light reading of the code it touches: Given/When/Then and EARS criteria, at most three NFRs, Definition of Ready and the drivers of the estimate. |
| `product-backlog` | Cuts Ready specs, or requirements given directly, into vertical slices (walking skeleton, SPIDR, INVEST) with S/M/L sizes in `estimate`'s meaning, every L split until none is left, an In brief line and agent leverage per slice. Writes `docs/product/backlog.md` and a short `scope.md` for `estimate`, with optional export to GitHub Issues or Azure DevOps after confirmation. |

## Open before shipping

- It overlaps with `shape-it` and `estimate`: decide whether to merge or keep it separate.
- Conventions differ from the rest of the repo: `docs/product/` instead of `docs/backlog/<feature>/`, Italian documents.
- `estimate` is the only estimator: run it as `estimate docs/product/backlog.md`. The quote is its prudent total plus the human time line in `scope.md`.
- `product-mvp` and `product-prototype`, named by `product-kickoff`, do not exist yet.
