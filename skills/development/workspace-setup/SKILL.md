---
name: workspace-setup
description: Set up a development workspace for working with a coding agent - code repo, raw-sources folder, run/debug config and agent instructions - on Azure DevOps, GitHub or local only, for any stack, configures Matt Pocock's skills (setup-matt-pocock-skills), and warns if the workflow skills (shape-it, estimate, implement, factory, tdd, kets-review) or the mattpocock-skills plugin are missing. Use when the user wants to start a new project, set up or initialize a workspace or repo, onboard an existing repo for agent work, or says "prepare the repo", "set up the project", "init the workspace".
---

# Workspace setup

Take an empty folder (or an existing project) to a workspace an agent can work in from the first session: code repo, raw-sources folder, real build/test/run commands written down, and a branch + PR flow. The skill assumes no language or framework.

Speak the user's language in conversation. Write files in English unless the user asks otherwise.

Rules that hold for the whole skill:

- **Adapt, don't copy.** The examples below are shapes; use the project's real names, stack and commands.
- **Don't ask what this skill already decides.** The workspace layout, the branch + PR flow and the 3-line preamble are applied, not debated.
- **Don't invent.** No made-up build commands, package names, registries or URLs. If the user doesn't know, it's recorded as an open point where the agent will read it (step 5), not guessed.
- **Confirm external or hard-to-undo actions one by one:** creating remote repos, push, merge, deletes.
- **Never print tokens or credentials, never write them to a file.**
- **Commit and push only when asked.**
- **Merge into existing files.** When a file this skill writes already exists (`app/CLAUDE.md`, `app/.claude/settings.json`, `.gitignore`, `.vscode/tasks.json`, `.vscode/launch.json`, root `CLAUDE.md`), merge into it: add what's missing, keep what's there, never replace. Show the diff before writing.

## 0. Look around first (silently)

1. `pwd` and the contents of the current folder.
2. If the current folder is a git repo whose parent already has the workspace layout (`reference/` or a root `CLAUDE.md` next to it), it is the `app/` of an existing workspace: continue with the parent as the workspace root, don't propose a new container. Otherwise, stop and propose: create the container one level up and prefer **cloning** the repo into `app/` over moving it. Moving changes the path, which loses Claude Code's per-path memory and breaks existing git worktrees. Move nothing without confirmation.
3. Do `app/`, `reference/`, `.vscode/`, `CLAUDE.md` already exist? Are they git repos? With which remote host (`dev.azure.com` / `visualstudio.com` → Azure DevOps, `github.com` → GitHub)?
4. Which CLIs are available: `git`, `az` (+ `azure-devops` extension), `gh`.
5. The stack already in `app/`, if any: recognise it from build files, manifests and the installed toolchain, without assuming one.
6. Which of the workflow's skills (step 7) are available.
7. Is there a legacy `wiki/` folder with `decisions/` or `entities/`? Then propose moving its decision pages to `app/docs/adr/` as ADRs (keep their numbers) and its term definitions from `entities/` into the glossary (`app/GLOSSARY.md`, or the right one via `app/GLOSSARY-MAP.md`); ask before doing it.

Install nothing without asking. Use what you found to pre-fill the answers below; never ask what you already know.

## 1. Questions (at most two rounds, with AskUserQuestion)

AskUserQuestion is for the multiple-choice questions (provider, new or existing, device testing, GitHub visibility). Free-text answers (stack, org and project, owner, repo names, internal package details, repo URLs) are asked in plain chat.

First round, at most 4 questions, recommended option first when there is one:

1. **Where does the project live?** Azure DevOps · GitHub · Local only (no remote for now).
2. **New or existing?** New (create repos) · Existing (clone or attach repos that already exist).
3. **Stack:** only if step 0 didn't recognise it. Backend and frontend language/framework, free answer.
4. **Testing on external devices?** (mobile app, LAN, hotspot) Yes · No. Decides whether `launch.json` needs network scenarios (step 4).

Second round, only what the chosen provider needs:

- Azure DevOps: organization, project, app repo name.
- GitHub: owner (user or org), app repo name, visibility.
- Internal packages or templates: is there an in-house library, template or starter for this stack? If yes: name, registry/feed, version. If the user doesn't know, it's an open point (step 5). Don't guess package names or feeds.
- Existing: URLs of the repos to clone, if step 0 didn't find them.

Then show the **3-line preamble** and wait for confirmation:

- **Goal** – e.g. "Workspace `<name>` on Azure DevOps, stack `<stack>`, app repo + reference folder".
- **Source of truth** – this skill + the answers just given.
- **Definition of done** – local scaffolding complete; remote repos only if confirmed; no push.

## 2. Workspace layout

```
<workspace-root>/      ← opened in the IDE, NOT a git repo
├── app/               ← code repo (`GLOSSARY.md` and `docs/adr/` are created lazily, when the first term or ADR exists, not at setup)
├── reference/         ← raw sources: specs, client docs, notes, API docs, mocks (read-only for the agent)
│   └── mock/current/  ← current version; older ones in mock/<YYYY-MM-DD>/
├── .vscode/           ← tasks.json + launch.json with ${workspaceFolder}/app/... paths
└── CLAUDE.md          ← local-only: map of the workspace and provider (step 6)
```

`reference/` is a plain folder by default (it often holds heavy binaries). If more than one person works on the project, propose a repo of its own (never inside `app/`). When a new version of the mocks arrives, move `mock/current/` to `mock/<YYYY-MM-DD>/` first, then replace `current/`.

Agents started inside `app/` must be able to read `reference/`: add `"additionalDirectories": ["../reference"]` under `permissions` in `app/.claude/settings.json` (versioned, so every clone with the same layout gets it). If reads outside `app/` still get blocked, start sessions from the workspace root instead, where `app/` and `reference/` are both in scope.

## 3. Code repo (`app/`) by provider

### Azure DevOps

- Prerequisites: `az account show` works. Don't set global defaults (`az devops configure --defaults`): pass `--org https://dev.azure.com/<org> --project <project>` on every `az repos` and `az devops` command.
- New: `az repos create --name <app> --org https://dev.azure.com/<org> --project <project>` (confirm first) → `git clone` the returned URL into `app/`.
- Existing: `git clone` into `app/`.
- PR: `az repos pr create --org https://dev.azure.com/<org> --project <project> --source-branch <branch> --target-branch main --title ... --description ...`.
### GitHub

- Prerequisites: `gh auth status` works.
- New: check the active `gh` account owns or can create in `<owner>` (`gh auth status`); if not, stop and ask, never switch accounts silently. Then `gh repo create <owner>/<app> --<visibility>` (visibility from step 1, confirm first) → clone into `app/`.
- Existing: `gh repo clone <owner>/<app> app`.
- PR: `gh pr create --base main --title ... --body ...`; review: `gh pr view --comments`, `gh pr merge`.
### Local only

- `git init -b main` in `app/`.
- No PRs: the flow is dedicated branch → diff review (`git diff main...<branch>`) → `git merge --no-ff` on explicit request.
- The factory runs locally too: slice branches, local review, merge into `main` when the checkout is clean.
- Note in `app/CLAUDE.md` how to add a remote later without changing habits.

In every case: a `.gitignore` for build output, dependencies, local device/IDE files and local-only documents.

## 4. Run & debug

`.vscode/` at the **workspace root**, never inside `app/`.

- Generate `tasks.json` / `launch.json` only with real commands: read from the existing project (build files, manifests, scripts, `docker-compose.yml`…) or confirmed by the user. For a new project with no code yet, create the files with only the tasks you're sure of and record the rest as open points (step 5).
- A compound task that starts all parts of the stack together; maintenance tasks (reset DB, logs, stop).
- A `problemMatcher` with "server ready" detection for debugging.
- With device testing: one scenario per network context (local, LAN, hotspot). Never assume IPs: ask or detect, and write them as values to verify.

## 5. Internal packages, integrations and open points

- **Internal packages/templates:** if one exists for the chosen stack, configure it instead of rewriting the wiring from scratch (registry/feed in the package manager's config file, no credentials in the file: use the registry's own auth mechanism). If name, feed or version are missing, don't proceed on that point: record it as an open point.
- **External integrations:** each known one is listed in the "To verify" list of `app/CLAUDE.md`, with what is still unknown about it.

### Open points

There is no separate questions file. Every open point goes in the "To verify" list of `app/CLAUDE.md`, where the agent reads it and so can't act on a guess: environment ones (internal feed, network IPs) and domain, product and integration unknowns alike. `shape-it` carries the domain ones into `scope.md` "Open risks" when it shapes the first feature.

## 6. Instructions for the agent

**`app/CLAUDE.md` (versioned)** – truthful, nothing aspirational:

- Architecture and stack *decided* (what is only scaffolded is written as such).
- Real build, test, typecheck and run commands. `implement` and other skills read them from here.
- Provider and flow: dedicated branch, PR with context / what changes / how to verify, the provider's PR commands.
- Backlog: `docs/backlog/<feature>/` (scope.md + backlog.md, written by `shape-it`). Run the workflow skills from a session opened in `app/`: they look for `docs/backlog/` and the git remote there; the workspace root is for browsing and `.vscode`.
- Workflow: `shape-it` → `estimate` (optional) → `implement` (with `/simplify`) or `factory` (which also reviews with `/code-review` and `kets-review`); `tdd` for test-first work (features or bugs). They come from the `mikeleg-skills` plugin (marketplace `mikeleg/skills`).
- Security: never print tokens or put them in files; confirm before push, merge, sending, deleting.
- The 3-line preamble ritual (goal, source of truth, definition of done) before non-trivial work, and the rule "if sources disagree, surface it and ask".
- Read order: `CLAUDE.md` → the glossary (`GLOSSARY.md`, or the right one via `GLOSSARY-MAP.md`) and the ADR titles in `docs/adr/` → code.
- Domain terms: `GLOSSARY.md` (or the right one via `GLOSSARY-MAP.md`); decisions: `docs/adr/`. Respect both. Glossary entry: `**Term**:` then one or two sentences saying what it is, plus `_Avoid_:` with the words not to use. ADR: `docs/adr/NNNN-slug.md`, next number, a title and one to three sentences (context, decision, why).
- Never edit `../reference/`.
- To verify: the open points from step 5 (environment, domain, product, integrations), if any.

**`<workspace-root>/CLAUDE.md` (local-only)** – short, read in every session opened on the root:

```
# Workspace <name>
- Provider: <azure-devops | github | local>  (org/project or owner)
- Stack: <decided languages/frameworks>
- app/  → <remote url or "local">
- reference/ → raw sources (read-only for the agent); current mocks in reference/mock/current/
- Project instructions: app/CLAUDE.md
- Workflow skills (shape-it, estimate, implement, factory, kets-review): run from a session opened in `app/`, which holds `docs/backlog/` and the git remote; this root is for browsing and `.vscode`.
```

`CLAUDE.md` files are loaded into every session, so keep them short: commands, flow and rules for working. Domain terms go in the glossary (`GLOSSARY.md`), decisions in `docs/adr/`, feature scope in `docs/backlog/`. Each fact lives in one place: don't duplicate.

## 6b. Matt Pocock's skills setup

The skills of the `mattpocock-skills` plugin, which `shape-it` calls, need a one-time setup of the repo. The skill `setup-matt-pocock-skills` does it. It has `disable-model-invocation: true`, so the Skill tool cannot run it. Read its file instead.

1. Look for the newest match of `~/.claude/plugins/cache/*/mattpocock-skills/*/skills/engineering/setup-matt-pocock-skills/SKILL.md`.
2. If there is no match, skip this step. Report it as missing in the close-out (step 7).
3. Read the file. Skip its frontmatter. Follow it inside `app/`, with the presets below.

The user already answered these questions in step 1, so Matt's skill does not ask them again:

- **Issue tracker (his Section A):** GitHub provider → GitHub. Azure DevOps or local only → local markdown (`.scratch/`). Do not ask. State the choice in the draft.
- **Domain docs (his Section C):** single-context. Ask only if his own monorepo signals are present.
- **File to edit:** `app/CLAUDE.md`. It exists at this point. Never create `AGENTS.md`.
- **Confirmation (his step 3):** do not show a second draft. Add his draft to the diff of the "Merge into existing files" rule. The user reviews one draft.

His skill writes `docs/agents/issue-tracker.md`, `docs/agents/domain.md` and an `## Agent skills` block in `app/CLAUDE.md`. It writes `docs/agents/triage-labels.md` only when the `triage` skill is installed.

With local markdown, do not add `.scratch/` to `.gitignore`. The map and the tickets stay versioned. His templates do not ignore it.

## 7. Skills the workflow needs

The workspace is only useful if the agent has the skills that work in it. Check them and **warn** about what's missing; don't install anything.

| Skill | Where it comes from | Used for |
|---|---|---|
| `shape-it` | `mikeleg-skills` plugin (marketplace `mikeleg/skills`) | idea → scope → backlog of slices |
| `estimate` | `mikeleg-skills` plugin | backlog → agentic hours (min / probable / max per slice) |
| `implement` | `mikeleg-skills` plugin | slice → tested commit |
| `factory` | `mikeleg-skills` plugin | ready slices (from GitHub issues, Azure DevOps work items or `backlog.md`) → implemented, reviewed, fixed and merged, one at a time |
| `tdd` | `mikeleg-skills` plugin | red → green → refactor, features or bugs; used by `implement` |
| `kets-review` | `mikeleg-skills` plugin | design review of a change; used by `factory` |
| `wayfinder`, `to-spec`, `to-tickets` and the skills `shape-it` calls | `mattpocock-skills` plugin (marketplace `mattpocock/skills`) | map of decision tickets, then spec and tickets; used by `shape-it` |
| `/simplify`, `/code-review` | bundled with Claude Code | `/simplify` used by `implement`, `/code-review` by `factory` |

**Check.** A skill counts as available if it appears in this session's list of available skills, or if its kowalski wrapper does (e.g. `/kowalski:produci` for `factory`). If one is missing, `claude plugin list --json` tells whether `mikeleg-skills@mikeleg` is installed but disabled.

A skill of `mattpocock-skills` counts as available if its `SKILL.md` is in the plugin cache: `~/.claude/plugins/cache/*/mattpocock-skills/*/skills/*/<skill>/SKILL.md`. The slash commands with `disable-model-invocation` may not appear in the session list. `claude plugin list --json` also tells whether the plugin is installed.

**Warn.** For each missing skill, one line in the close-out: what won't work without it, and the command the user can run:

- `mikeleg-skills` skills: `/plugin marketplace add mikeleg/skills` then `/plugin install mikeleg-skills@mikeleg` in Claude Code, or `npx skills add mikeleg/skills` for other agents.
- `mattpocock-skills` skills: `claude plugin marketplace add mattpocock/skills` then `claude plugin install mattpocock-skills@mattpocock`. Without them, `shape-it` cannot run.
- Bundled skills: Claude Code is too old, `claude update`.

## 8. Close

1. Show the checklist, one line per item: ✅ done · ⏳ convention / to complete · ❌ not applicable, with a one-line reason for every ⏳ and ❌.
   - Workspace root is not a git repo; `app/` and `reference/` exist
   - `app/` repo with remote (or local), `.gitignore`
   - `app/.claude/settings.json` lets agents in `app/` read `../reference`
   - `.vscode/` at the root with real tasks and launch configs
   - Internal packages configured, or recorded as open points
   - `app/CLAUDE.md` and root `CLAUDE.md` written, with real commands
   - Matt Pocock's setup ran, with the files it wrote (`docs/agents/*.md`, the `## Agent skills` block in `app/CLAUDE.md`), or skipped because the plugin is missing
   - Workflow skills available: `shape-it`, `estimate`, `implement`, `factory`, `tdd`, `kets-review`, the `mattpocock-skills` plugin, and the bundled `/simplify`, `/code-review` (missing ones listed with their install command)
2. List the open points, all recorded in the "To verify" list of `app/CLAUDE.md`.
3. Ask whether to commit (and push, if there's a remote) the scaffolding of `app/`, with a descriptive message. Never without confirmation.
4. Propose the next step: `shape-it` for the first feature or MVP.
