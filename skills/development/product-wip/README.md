# product-wip

Work in progress, not shipped: these skills are not listed in `.claude-plugin/marketplace.json`, so installing the plugin does not load them.

A separate set that goes from an idea or a change request to estimable specs and a backlog. Each skill works on its own; documents go to `docs/product/`, in Italian by default.

| Skill | What it does |
| --- | --- |
| `product-kickoff` | Optional entry point: a short decision tree (new or existing project, MVP agreed or not, bug or feature) that sets up `docs/product/state.md` and `calibration.md` and names the next skill. |
| `product-decision` | Settles one open question at a time (Mikado graph, one-way or two-way door) with options, a recommendation and the user's choice, recorded as an ADR in `docs/product/decisions/`. |
| `product-spec` | Writes an estimable spec for one capability, or a delta spec for a change to an existing codebase after a light reading of the code it touches: Given/When/Then and EARS criteria, at most three NFRs, Definition of Ready, S/M/L size in hours. |
| `product-backlog` | Cuts Ready specs, or requirements given directly, into vertical slices (walking skeleton, SPIDR, INVEST) with S/M/L sizes, agent leverage and three-point PERT estimates, and gives a planning total and a quote range. Writes `docs/product/backlog.md`, with optional export to GitHub Issues or Azure DevOps after confirmation. |

## Open before shipping

- It overlaps with `shape-it` and `estimate`: decide whether to merge or keep it separate.
- Estimate unit: here hours of human work supported by an agent, in `estimate` agentic hours.
- Conventions differ from the rest of the repo: `docs/product/` instead of `docs/backlog/<feature>/`, Italian documents, S/M/L in hours.
- `product-mvp` and `product-prototype`, named by `product-kickoff`, do not exist yet.
