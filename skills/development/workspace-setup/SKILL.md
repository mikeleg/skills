---
name: workspace-setup
description: Set up a development workspace for working with a coding agent - code repo, docs wiki repo, reference folder, run/debug config and agent instructions - on Azure DevOps, GitHub or local only, for any stack. Use when the user wants to start a new project, set up or initialize a workspace or repo, onboard an existing repo for agent work, or says "prepare the repo", "set up the project", "init the workspace".
---

# Workspace setup

Take an empty folder (or an existing project) to a workspace an agent can work in from the first session: code and docs in separate repos, real build/test/run commands written down, a branch + PR flow, and a wiki that works as the agent's second brain. The skill assumes no language or framework.

Speak the user's language in conversation. Write files in English unless the user asks otherwise.

Rules that hold for the whole skill:

- **Adapt, don't copy.** The examples below are shapes; use the project's real names, stack and commands.
- **Don't ask what this skill already decides.** The workspace layout, the branch + PR flow, the "Proposed change" convention for docs, port + mock for integrations, and the 3-line preamble are applied, not debated.
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

Install nothing without asking. Use what you found to pre-fill the answers below; never ask what you already know.

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
├── wiki/              ← the agent's second brain (separate git)
├── reference/         ← UI mocks, external docs, exports
│   └── mock/current/  ← current version; older ones in mock/<YYYY-MM-DD>/
├── .vscode/           ← tasks.json + launch.json with ${workspaceFolder}/app/... paths
└── CLAUDE.md          ← local-only: map of the workspace and provider (step 7)
```

`reference/` is a plain folder by default (it often holds heavy binaries). If the team wants to share it, propose a repo of its own, never inside `app/` or `wiki/`. When a new version of the mocks arrives, move `mock/current/` to `mock/<YYYY-MM-DD>/` first, then replace `current/`.

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

## 4. The wiki: the agent's second brain

The wiki is the agent's long-term memory for this project. Its job is to save tokens and give context: an agent that reads a 40-line index and two short pages knows where things are and why, instead of grepping the codebase or re-deriving decisions every session. It holds what the code can't say (domain language, business rules, decisions and their reasons, integrations) and *where* things live in the code. It is not a copy of the code.

Two consequences shape everything below: it must be **cheap to read selectively** (an index first, small pages, pointers instead of copies), and it must **stay true** (a stale pointer costs more tokens than no wiki, because the agent trusts it and then has to search anyway).

### Skeleton

```
wiki/
├── index.md         ← the only page an agent always reads: one line per page
├── conventions.md   ← how to read and write this wiki (read only when writing)
├── glossary.md      ← domain terms: term · meaning · name in code
├── decisions/       ← one short page per decision: context · decision · why · consequences
├── integrations/    ← one page per external system (step 6)
└── domain/          ← one page per concept or flow (filled later, by shape-it or by hand)
```

`index.md` lists every page as `- [Title](path) – one-line summary`, grouped by folder, and nothing else. Keep it under ~150 lines; past that, give each folder its own index and link those. On Azure DevOps put `index` first in the root `.order`; on GitHub add a one-line `README.md` pointing to it.

### Page format

```
---
summary: one line, the same as in index.md
code: [src/billing/invoice.ts, InvoiceService.issue]   # where this lives; paths or symbols
updated: <date>
---
# <Concept>
Rules as short, explicit statements. Examples only when a rule is ambiguous without one.
Links to related pages instead of repeating them.
```

- One concept per page, under ~120 lines. Longer means two concepts: split.
- Point to code, never paste it. The code is the truth for *how*; the page says *what*, *why* and *where*.
- Each fact lives in one page. Everywhere else links to it.
- Undecided points are **Open** blocks (step 6), never guesses.

### Read and write protocol (written into `conventions.md` and `app/CLAUDE.md`)

- **Read before searching.** Start every task from `index.md`, open only the pages the task touches, follow their `code:` pointers. Search the codebase only for what the wiki doesn't answer.
- **Stop at Open blocks.** Ask instead of assuming.
- **Write back at the end of a task.** If the task taught something durable that the wiki lacked or had wrong (where a flow lives, a rule, a term, a decision taken), update the page, its `updated:` date and `index.md` in the same session, and list the wiki changes in the task report. If a `code:` pointer turned out wrong, fix it on the spot.
- **What changes directly, what is proposed.** Navigation facts (code pointers, how a flow is wired, new glossary entries, new pages) are updated directly. A change to an agreed business rule or decision is added as a **Proposed change** block below the agreed text instead of rewriting it:

  ```
  > **Proposed change** (<author>, <date>)
  > What: … · Why: … · Impact: …
  ```

  and merged into the text only once approved.
- Wiki changes go through a branch + PR like code; commit and push follow the same rules as the code.

### Hosting by provider

The wiki needs a repo with branches and PRs:

- **Azure DevOps:** a dedicated `<app>-wiki` repo published as a **code wiki** (`az devops wiki create --type codewiki --name <app>-wiki --repository <app>-wiki --mapped-path / --version main`, confirm first). Advise against the *project wiki* (`<Project>.wiki`): edits go straight to the branch, no PRs or policies. Remember: page order is set by a `.order` file per folder; dashes in file names become spaces in titles; diagrams use `::: mermaid`.
- **GitHub:** a dedicated `<owner>/<app>-wiki` repo (markdown rendered by GitHub, PRs and reviews). Advise against GitHub's built-in wiki (`<repo>.wiki.git`): no PRs or reviews, flat structure. Diagrams in ```` ```mermaid ```` blocks.
- **Local only:** `git init -b main` in `wiki/`.

Agents started inside `app/` must be able to read the wiki: add `"additionalDirectories": ["../wiki"]` under `permissions` in `app/.claude/settings.json` (versioned, so every clone with the same layout gets it). If reads outside `app/` still get blocked, start sessions from the workspace root instead, where both `app/` and `wiki/` are in scope.

Create the skeleton only: `index.md`, `conventions.md` (page format + protocol above), an empty `glossary.md` with its header row, the empty folders, and one page per integration from step 6. Writing the domain pages is not this skill's job.

## 5. Run & debug

`.vscode/` at the **workspace root**, never inside `app/`.

- Generate `tasks.json` / `launch.json` only with real commands: read from the existing project (build files, manifests, scripts, `docker-compose.yml`…) or confirmed by the user. For a new project with no code yet, create the files with only the tasks you're sure of and record the rest as open points (step 6).
- A compound task that starts all parts of the stack together; maintenance tasks (reset DB, logs, stop).
- A `problemMatcher` with "server ready" detection for debugging.
- With device testing: one scenario per network context (local, LAN, hotspot). Never assume IPs: ask or detect, and write them as values to verify.

## 6. Internal packages, integrations and open points

- **Internal packages/templates:** if one exists for the chosen stack, configure it instead of rewriting the wiring from scratch (registry/feed in the package manager's config file, no credentials in the file: use the registry's own auth mechanism). If name, feed or version are missing, don't proceed on that point: record it as an open point.
- **External integrations:** for each one, a port (interface) + a mock implementation registered by default, so the app runs and tests without the real system. Each integration gets a wiki page (what the system is, the operations used, the port that wraps them); what isn't known yet about it is an open point on that page.

### Open points

There is no separate questions file. An open point lives where the agent will read it, so it can't act on a guess:

- **Domain, product, integrations** → in the wiki page it concerns, as a block right where the missing answer matters:

  ```
  > **Open** (<date>): <question> · Blocks: <what can't be decided without it> · Ask: <who>
  ```

  When the answer is agreed, replace the block with the rule itself (through the Proposed change flow if the page is already agreed).
- **Development environment** (internal feed, network IPs, a branch policy that couldn't be applied) → in `app/CLAUDE.md`, in a short "To verify" list.

`conventions.md` explains the convention, so an agent that meets an **Open** block stops and asks instead of assuming.

## 7. Instructions for the agent

**`app/CLAUDE.md` (versioned)** – truthful, nothing aspirational:

- Architecture and stack *decided* (what is only scaffolded is written as such).
- Real build, test, typecheck and run commands. `implement` and other skills read them from here.
- Provider and flow: dedicated branch, PR with context / what changes / how to verify, the provider's PR commands, the `main` protection rule (applied, or convention).
- Backlog: `docs/backlog/<feature>/` (scope.md + backlog.md, written by `shape-it`).
- Security: never print tokens or put them in files; confirm before push, merge, sending, deleting.
- The 3-line preamble ritual (goal, source of truth, definition of done) before non-trivial work, and the rule "if sources disagree, surface it and ask".
- Wiki (`../wiki/`): the read and write protocol from step 4, in four lines: start from `index.md`, open only the pages the task touches and follow their `code:` pointers; search the code only for what the wiki doesn't answer; stop at **Open** blocks; at the end of the task, write back what you learned (agreed rules only as Proposed change).
- To verify: the environment's open points from step 6, if any.

**`<workspace-root>/CLAUDE.md` (local-only)** – short, read in every session opened on the root:

```
# Workspace <name>
- Provider: <azure-devops | github | local>  (org/project or owner)
- Stack: <decided languages/frameworks>
- app/  → <remote url or "local">
- wiki/ → <remote url or "local">  · type: <code wiki | markdown repo | local>
- reference/ → current mocks in reference/mock/current/
- wiki/ is the agent's second brain: start from wiki/index.md before searching the code
- Project instructions: app/CLAUDE.md
```

`CLAUDE.md` files are loaded into every session, so keep them short: commands, flow, rules for working, and the pointer to the wiki. Everything else (domain language, business rules, decisions, where things live) goes in the wiki, which is read on demand. Each fact lives in one place: don't duplicate.

## 8. Close

1. Show the checklist, one line per item: ✅ done · ⏳ convention / to complete · ❌ not applicable, with a one-line reason for every ⏳ and ❌.
   - Workspace root is not a git repo; `app/`, `wiki/`, `reference/` exist
   - `app/` repo with remote (or local), `.gitignore`
   - `main` protected (policy, ruleset, hook, or written convention)
   - `wiki/` repo with branches + PRs; `index.md`, `conventions.md` (format, protocol, Proposed change, Open), `glossary.md`, `decisions/`, `integrations/`, `domain/`
   - `app/.claude/settings.json` lets agents in `app/` read `../wiki`
   - `.vscode/` at the root with real tasks and launch configs
   - Internal packages configured, or recorded as open points
   - Integrations behind a port + mock, one wiki page each
   - `app/CLAUDE.md` and root `CLAUDE.md` written, with real commands
2. List the open points and where each one was recorded (wiki page or `app/CLAUDE.md`).
3. Ask whether to commit (and push, if there's a remote) the scaffolding of `app/` and `wiki/`: one commit per repo, descriptive message. Never without confirmation.
4. Propose the next step: `shape-it` to turn the first feature or MVP into a backlog.
