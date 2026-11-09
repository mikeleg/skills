---
name: workspace-setup
description: Set up a development workspace for working with a coding agent - code repo, a wiki the agent maintains as its second brain (Karpathy's LLM Wiki pattern), raw-sources folder, run/debug config and agent instructions - on Azure DevOps, GitHub or local only, for any stack, and installs the workflow skills (shape-it, implement, tdd) if they are missing. Use when the user wants to start a new project, set up or initialize a workspace or repo, onboard an existing repo for agent work, or says "prepare the repo", "set up the project", "init the workspace".
---

# Workspace setup

Take an empty folder (or an existing project) to a workspace an agent can work in from the first session: code and docs in separate repos, real build/test/run commands written down, a branch + PR flow, and a wiki that works as the agent's second brain. The skill assumes no language or framework.

Speak the user's language in conversation. Write files in English unless the user asks otherwise.

Rules that hold for the whole skill:

- **Adapt, don't copy.** The examples below are shapes; use the project's real names, stack and commands.
- **Don't ask what this skill already decides.** The workspace layout, the branch + PR flow, the LLM Wiki pattern for docs (step 4), port + mock for integrations, and the 3-line preamble are applied, not debated.
- **Don't invent.** No made-up build commands, package names, registries or URLs. If the user doesn't know, it's recorded as an open point where the agent will read it (step 6), not guessed.
- **Confirm external or hard-to-undo actions one by one:** creating remote repos, branch policies, push, merge, deletes.
- **Never print tokens or credentials, never write them to a file.**
- **Commit and push only when asked.**

## 0. Look around first (silently)

1. `pwd` and the contents of the current folder.
2. If the current folder is itself a git repo, the user probably opened the code repo instead of the workspace container. Stop and propose: create the container one level up and move or clone the repo into `app/`. Move nothing without confirmation.
3. Do `app/`, `wiki/`, `reference/`, `.vscode/`, `CLAUDE.md` already exist? Are they git repos? With which remote host (`dev.azure.com` / `visualstudio.com` → Azure DevOps, `github.com` → GitHub)?
4. Which CLIs are available: `git`, `az` (+ `azure-devops` extension), `gh`.
5. The stack already in `app/`, if any: recognise it from build files, manifests and the installed toolchain, without assuming one.
6. Which agents the project is set up for besides Claude Code: `AGENTS.md`, `.github/copilot-instructions.md`, `.codex/`, `.cursor/` in `app/`.
7. Which of the workflow's skills are already available (step 8).

Install nothing without asking (step 8 installs missing skills after one confirmation). Use what you found to pre-fill the answers below; never ask what you already know.

## 1. Questions (one round, with AskUserQuestion)

First round, at most 4 questions, recommended option first when there is one:

1. **Where does the project live?** Azure DevOps · GitHub · Local only (no remote for now).
2. **New or existing?** New (create repos) · Existing (clone or attach repos that already exist).
3. **Stack:** only if step 0 didn't recognise it. Backend and frontend language/framework, free answer.
4. **Testing on external devices?** (mobile app, LAN, hotspot) Yes · No. Decides whether `launch.json` needs network scenarios (step 5).

Second round, only what the chosen provider needs:

- Azure DevOps: organization, project, app repo name, wiki repo name (default `<app>-wiki`).
- GitHub: owner (user or org), app repo name, visibility, wiki repo name (default `<app>-wiki`).
- Internal packages or templates: is there an in-house library, template or starter for this stack? If yes: name, registry/feed, version. If the user doesn't know, it's an open point (step 6). Don't guess package names or feeds.
- Existing: URLs of the repos to clone, if step 0 didn't find them.

Then show the **3-line preamble** and wait for confirmation:

- **Goal** – e.g. "Workspace `<name>` on Azure DevOps, stack `<stack>`, app + wiki as code wiki".
- **Source of truth** – this skill + the answers just given.
- **Definition of done** – local scaffolding complete; remote repos and policies only if confirmed; no push.

## 2. Workspace layout

```
<workspace-root>/      ← opened in the IDE, NOT a git repo
├── app/               ← code repo
├── wiki/              ← the agent's second brain, maintained by the agent (separate git)
├── reference/         ← raw sources: specs, client docs, notes, API docs, mocks (read-only for the agent)
│   └── mock/current/  ← current version; older ones in mock/<YYYY-MM-DD>/
├── .vscode/           ← tasks.json + launch.json with ${workspaceFolder}/app/... paths
└── CLAUDE.md          ← local-only: map of the workspace and provider (step 7)
```

`reference/` is a plain folder by default (it often holds heavy binaries). The wiki cites it, so if more than one person works on the project, propose a repo of its own (never inside `app/` or `wiki/`) so the citations resolve for everyone. When a new version of the mocks arrives, move `mock/current/` to `mock/<YYYY-MM-DD>/` first, then replace `current/`.

## 3. Code repo (`app/`) by provider

### Azure DevOps

- Prerequisites: `az account show` works; `az devops configure --defaults organization=https://dev.azure.com/<org> project=<project>`.
- New: `az repos create --name <app>` (confirm first) → `git clone` the returned URL into `app/`.
- Existing: `git clone` into `app/`.
- PR: `az repos pr create --source-branch <branch> --target-branch main --title ... --description ...`.
- Protect `main` (confirm first, needs project admin):
  `az repos policy approver-count create --repository-id <id> --branch main --minimum-approver-count 1 --creator-vote-counts false --allow-downvotes false --reset-on-source-push true --blocking true --enabled true`.
  If it fails on permissions, write the rule as a convention in `app/CLAUDE.md` and move on.

### GitHub

- Prerequisites: `gh auth status` works.
- New: `gh repo create <owner>/<app> --private` (confirm first) → clone into `app/`.
- Existing: `gh repo clone <owner>/<app> app`.
- PR: `gh pr create --base main --title ... --body ...`; review: `gh pr view --comments`, `gh pr merge`.
- Protect `main`: branch protection or rulesets. On **private repos on the Free plan** they aren't available (the API answers 403/404): then the rule becomes a written convention in `app/CLAUDE.md`. Try only after confirmation.

### Local only

- `git init -b main` in `app/`.
- No PRs: the flow is dedicated branch → diff review (`git diff main...<branch>`) → `git merge --no-ff` on explicit request.
- Protect `main`: offer a local `pre-commit` hook that blocks direct commits on `main`. Say that hooks are not versioned.
- Note in `app/CLAUDE.md` how to add a remote later without changing habits.

In every case: a `.gitignore` for build output, dependencies, local device/IDE files and local-only documents.

## 4. The wiki: the agent's second brain (LLM Wiki pattern)

The wiki follows Andrej Karpathy's **LLM Wiki** pattern: instead of re-deriving context from raw documents and from the codebase in every session, the agent builds and maintains a persistent, interlinked set of markdown pages that sits between it and the sources. Knowledge compounds: each source read, each task done and each good answer is filed once and reused for free. An agent that reads a short index and two pages knows what things mean, why they are the way they are and where they live in the code, instead of grepping or re-reading a spec.

Two things make it pay off: it is **cheap to read selectively** (index first, small pages, pointers to code instead of copies), and it **stays true** (a stale page costs more tokens than no page, because the agent trusts it and then has to search anyway). The operations below exist for those two.

### Three layers

- **Raw sources – `reference/`.** Specs, client documents, meeting notes, API docs, mocks, exports. Curated by the human, **immutable**: the agent reads them and never edits them. The code in `app/` is also a source the agent reads; the wiki points into it.
- **The wiki – `wiki/`.** Written and maintained **by the agent**: summaries, entity and concept pages, decisions, integrations, cross-links. The human reads it, reviews it through PRs, and rarely writes in it. To change what the wiki says, the human changes or adds a source (or states a decision) and the agent updates the pages.
- **The schema – `wiki/CLAUDE.md`.** The wiki's structure, page format and workflows below. The user and the agent evolve it together as they learn what works.

### Structure

```
wiki/
├── CLAUDE.md        ← schema: structure, page format, operations (read before writing)
├── index.md         ← catalog of every page: the only page always read
├── log.md           ← append-only history of ingests, tasks, queries, lint passes
├── overview.md      ← the project on one page: purpose, users, main flows, architecture at a glance
├── sources/         ← one summary page per raw source in ../reference/
├── entities/        ← domain entities (Order, Customer…): meaning, rules, name in code
├── concepts/        ← business rules, flows, cross-cutting concepts
├── decisions/       ← one page per decision: context · decision · why · consequences
└── integrations/    ← one page per external system (step 6)
```

**`index.md`** – every page, grouped by category, one line each: `- [Title](path) – one-line summary · <updated>`. The agent reads it first for every task and every question, and updates it on every write. It works without search tooling up to a few hundred pages; past that, split it per category or add a local search tool over the markdown.

**`log.md`** – one entry per operation, newest last, always with the same prefix so it can be grepped:

```
## [2026-11-09] ingest | Client spec v3 (reference/specs/spec-v3.pdf)
Pages: sources/spec-v3, entities/order, concepts/discounts (+ index)
## [2026-11-10] task | S2 checkout with discount codes (PR #14)
## [2026-11-12] lint | 2 stale pointers fixed, 1 contradiction opened as Open block
```

`grep "^## \[" log.md | tail -5` tells the agent what happened recently without reading anything else.

### Page format

```
---
summary: one line, the same as in index.md
sources: [sources/spec-v3.md, decisions/0004-discount-stacking.md]
code: [src/billing/discounts.ts, DiscountPolicy.apply]
updated: <date>
---
# <Entity or concept>
Rules as short, explicit statements, each traceable to a source.
Links to related pages instead of repeating them.
```

- One entity or concept per page, under ~120 lines. Longer means two pages.
- **Point to code, never paste it.** The code is the truth for *how*; the page says *what*, *why* and *where*.
- **Every rule traces to a source** (`sources:`). No source, no rule: it's an **Open** block (step 6).
- Each fact lives in one page; everywhere else links to it. Plain relative markdown links, so the pages render on Azure DevOps, GitHub and in Obsidian alike (Obsidian's graph view is a handy optional viewer).

### Operations (written into `wiki/CLAUDE.md`)

- **Ingest** – a new or changed source lands in `reference/`. The agent reads it, discusses the key points with the user, writes `sources/<name>.md`, updates every entity, concept, decision and integration page it touches (often several), the index and the log. One source at a time, with the user in the loop. If the source contradicts a page, the agent doesn't pick a winner: it opens an **Open** block and asks.
- **Task** – the coding version of ingest. At the end of a task, the work itself is the source: update the pages whose rules or `code:` pointers changed, add a `decisions/` page for any decision taken, log `task | <slice or PR>`. Pages the task only read and found correct need no update.
- **Query** – answer questions from the wiki first: index → pages → `code:` pointers, searching the codebase only for what the wiki doesn't answer, citing the pages used. When an answer is worth keeping (how a flow works end to end, a comparison, an analysis), file it as a page so the next session gets it for free.
- **Lint** – on request or every few weeks: contradictions between pages, claims superseded by a newer source, orphan pages, concepts mentioned without a page, missing cross-links, `code:` pointers that no longer resolve (path gone, symbol renamed), **Open** blocks a newer source now answers. Fix what's mechanical, list the rest, log `lint`.

Wiki changes go through a branch + PR like code, so the human reviews what the agent wrote; commit and push follow the same rules as the code.

### Hosting by provider

The wiki needs a repo with branches and PRs:

- **Azure DevOps:** a dedicated `<app>-wiki` repo published as a **code wiki** (`az devops wiki create --type codewiki --name <app>-wiki --repository <app>-wiki --mapped-path / --version main`, confirm first). Advise against the *project wiki* (`<Project>.wiki`): edits go straight to the branch, no PRs or policies. Put `index`, `overview`, `log` first in the root `.order`; dashes in file names become spaces in titles; diagrams use `::: mermaid`.
- **GitHub:** a dedicated `<owner>/<app>-wiki` repo (markdown rendered by GitHub, PRs and reviews), with a one-line `README.md` pointing to `index.md`. Advise against GitHub's built-in wiki (`<repo>.wiki.git`): no PRs or reviews, flat structure. Diagrams in ```` ```mermaid ```` blocks.
- **Local only:** `git init -b main` in `wiki/`.

Agents started inside `app/` must be able to read the wiki: add `"additionalDirectories": ["../wiki", "../reference"]` under `permissions` in `app/.claude/settings.json` (versioned, so every clone with the same layout gets it). If reads outside `app/` still get blocked, start sessions from the workspace root instead, where all three folders are in scope.

Create the skeleton only: `CLAUDE.md` (layers, structure, page format, operations above, adapted to the project), `index.md` with its categories, `log.md` with a first `setup` entry, a stub `overview.md` with what step 1 established, the empty folders, and one page per integration from step 6. If `reference/` already holds sources, propose ingesting them one at a time after the setup; don't bulk-ingest during it.

## 5. Run & debug

`.vscode/` at the **workspace root**, never inside `app/`.

- Generate `tasks.json` / `launch.json` only with real commands: read from the existing project (build files, manifests, scripts, `docker-compose.yml`…) or confirmed by the user. For a new project with no code yet, create the files with only the tasks you're sure of and record the rest as open points (step 6).
- A compound task that starts all parts of the stack together; maintenance tasks (reset DB, logs, stop).
- A `problemMatcher` with "server ready" detection for debugging.
- With device testing: one scenario per network context (local, LAN, hotspot). Never assume IPs: ask or detect, and write them as values to verify.

## 6. Internal packages, integrations and open points

- **Internal packages/templates:** if one exists for the chosen stack, configure it instead of rewriting the wiring from scratch (registry/feed in the package manager's config file, no credentials in the file: use the registry's own auth mechanism). If name, feed or version are missing, don't proceed on that point: record it as an open point.
- **External integrations:** for each one, a port (interface) + a mock implementation registered by default, so the app runs and tests without the real system. Each integration gets a page in `wiki/integrations/` (what the system is, the operations used, the port and mock that wrap them, its sources); what isn't known yet about it is an open point on that page.

### Open points

There is no separate questions file. An open point lives where the agent will read it, so it can't act on a guess:

- **Domain, product, integrations** → in the wiki page it concerns, as a block right where the missing answer matters:

  ```
  > **Open** (<date>): <question> · Blocks: <what can't be decided without it> · Ask: <who>
  ```

  When a source or a decision answers it, the next ingest or task replaces the block with the rule and cites where the answer came from. Lint lists the blocks still open.
- **Development environment** (internal feed, network IPs, a branch policy that couldn't be applied) → in `app/CLAUDE.md`, in a short "To verify" list.

`wiki/CLAUDE.md` explains the convention, so an agent that meets an **Open** block stops and asks instead of assuming.

## 7. Instructions for the agent

**`app/CLAUDE.md` (versioned)** – truthful, nothing aspirational:

- Architecture and stack *decided* (what is only scaffolded is written as such).
- Real build, test, typecheck and run commands. `implement` and other skills read them from here.
- Provider and flow: dedicated branch, PR with context / what changes / how to verify, the provider's PR commands, the `main` protection rule (applied, or convention).
- Backlog: `docs/backlog/<feature>/` (scope.md + backlog.md, written by `shape-it`).
- Workflow: `shape-it` → `implement` (with `/simplify`, `/code-review`); `tdd` for bugs. Where they come from (plugin or `.claude/skills/`) and how to install them if missing.
- Security: never print tokens or put them in files; confirm before push, merge, sending, deleting.
- The 3-line preamble ritual (goal, source of truth, definition of done) before non-trivial work, and the rule "if sources disagree, surface it and ask".
- Wiki (`../wiki/`), in four lines: start every task from `../wiki/index.md`, open only the pages it touches and follow their `code:` pointers, search the code only for what the wiki doesn't answer; stop at **Open** blocks; read `../wiki/CLAUDE.md` before writing to the wiki; end every task with the wiki's **task** operation (update touched pages, decisions, index, log). Never edit `../reference/`.
- To verify: the environment's open points from step 6, if any.

**`<workspace-root>/CLAUDE.md` (local-only)** – short, read in every session opened on the root:

```
# Workspace <name>
- Provider: <azure-devops | github | local>  (org/project or owner)
- Stack: <decided languages/frameworks>
- app/  → <remote url or "local">
- wiki/ → <remote url or "local">  · type: <code wiki | markdown repo | local>
- reference/ → raw sources (read-only for the agent); current mocks in reference/mock/current/
- wiki/ → the agent's second brain (LLM Wiki pattern): start from wiki/index.md, schema in wiki/CLAUDE.md
- Project instructions: app/CLAUDE.md
```

`CLAUDE.md` files are loaded into every session, so keep them short: commands, flow, rules for working, and the pointer to the wiki. Everything else (domain language, business rules, decisions, where things live) goes in the wiki, which is read on demand. Each fact lives in one place: don't duplicate.

## 8. Skills the workflow needs

The workspace is only useful if the agent has the skills that work in it. Check before closing, and install what's missing.

| Skill | Where it comes from | Used for |
|---|---|---|
| `shape-it` | `mikeleg-skills` plugin (marketplace `mikeleg/skills`) | idea → scope → backlog of slices |
| `implement` | `mikeleg-skills` plugin | slice → tested, reviewed commit |
| `tdd` | `mikeleg-skills` plugin | bug fix, test first (invoked by hand) |
| `/simplify`, `/code-review`, `/verify` | bundled with Claude Code | used by `implement` |

**Check.** A skill counts as available if it appears in this session's list of available skills. To see where it comes from, and to catch one installed but disabled:

- `claude plugin list --json`: look for `mikeleg-skills@mikeleg` with `"enabled": true`, and note its `scope`;
- `app/.claude/skills/<name>/SKILL.md` (project) and `~/.claude/skills/<name>/SKILL.md` (user), for copies installed with skills.sh or by hand.

**Install what's missing**, after one confirmation that names the missing skills and the exact command. Install at **project scope**, so the setting is versioned with `app/` and every clone asks for the same skills:

- **Claude Code only** (the default):
  ```
  claude plugin marketplace add mikeleg/skills --scope project
  claude plugin install mikeleg-skills@mikeleg --scope project
  ```
  run from `app/`. This records the marketplace and the plugin in `app/.claude/settings.json`; teammates get the marketplace once they trust the folder and install the plugin themselves (`/plugin`). On Claude Code v2.1.292 or later, `claude plugin install mikeleg-skills --marketplace mikeleg/skills --scope project` does both in one step.
- **Other agents too** (step 0 found Copilot, Codex, Cursor…), or no `claude` CLI: install the skill files into the repo with skills.sh, so every agent reads the same copy:
  ```
  npx skills add mikeleg/skills -s shape-it implement tdd -a claude-code <other agents> -y
  ```
  run from `app/`; it writes `app/.claude/skills/` (and each agent's own folder), to be committed. Update later with `npx skills update`.
- **Bundled skills missing** means Claude Code is too old: propose `claude update`. Don't try to replace them with copies.
- If a skill exists in more than one place (user and project, plugin and skills.sh copy), say so: the copies drift. Keep one.

New skills show up after `/reload-plugins` or in a new session; say which. If the user declines an install, the checklist marks it ⏳ and the next steps say what won't work without it.

## 9. Close

1. Show the checklist, one line per item: ✅ done · ⏳ convention / to complete · ❌ not applicable, with a one-line reason for every ⏳ and ❌.
   - Workspace root is not a git repo; `app/`, `wiki/`, `reference/` exist
   - `app/` repo with remote (or local), `.gitignore`
   - `main` protected (policy, ruleset, hook, or written convention)
   - `wiki/` repo with branches + PRs; `CLAUDE.md` (schema), `index.md`, `log.md` with the setup entry, `overview.md`, `sources/`, `entities/`, `concepts/`, `decisions/`, `integrations/`
   - `app/.claude/settings.json` lets agents in `app/` read `../wiki` and `../reference`
   - `.vscode/` at the root with real tasks and launch configs
   - Internal packages configured, or recorded as open points
   - Integrations behind a port + mock, one wiki page each
   - `app/CLAUDE.md` and root `CLAUDE.md` written, with real commands
   - Workflow skills available: `shape-it`, `implement`, `tdd`, and the bundled `/simplify`, `/code-review`, `/verify`; installed at project scope where missing
2. List the open points and where each one was recorded (wiki page or `app/CLAUDE.md`).
3. Ask whether to commit (and push, if there's a remote) the scaffolding of `app/` and `wiki/`: one commit per repo, descriptive message. Never without confirmation.
4. Propose the next step: ingest the sources already in `reference/` one at a time, then `shape-it` to turn the first feature or MVP into a backlog.
