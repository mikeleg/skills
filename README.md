# skills

Agent skills and Claude Code mods by mikeleg. The skills cover the path from an idea to committed code, plus a few work and content chores. The mods change Claude Code itself.

- [Install](#install)
- [How the development skills fit together](#how-the-development-skills-fit-together)
- [Skills](#skills)
- [Agents](#agents)
- [Mods](#mods)
- [Repository layout](#repository-layout)
- [Contributing and releasing](#contributing-and-releasing)

## Install

### Claude Code plugin

```
/plugin marketplace add mikeleg/skills
/plugin install mikeleg-skills@mikeleg
```

This installs every skill. Installed as a plugin, the skills are namespaced: `/mikeleg-skills:shape-it`, `/mikeleg-skills:implement` and so on. Claude also picks them up on its own when the request matches their description.

To get a new version:

```
/plugin marketplace update mikeleg
```

### skills.sh

Works with Claude Code and the other agents [skills.sh](https://skills.sh) supports.

```bash
npx skills add mikeleg/skills                    # all skills
npx skills add mikeleg/skills --skill shape-it   # a single skill
```

### Agents and mods

Each agent and each mod is its own plugin in the same marketplace. At the prompt of a Claude Code terminal session:

```
/plugin install kowalski --marketplace mikeleg/skills
/plugin install cruscotto --marketplace mikeleg/skills
```

Or from a shell:

```bash
claude plugin install kowalski --marketplace mikeleg/skills
claude plugin install cruscotto --marketplace mikeleg/skills
```

## How the development skills fit together

```
workspace-setup  →  shape-it  →  implement  →  (bug?) tdd
   the repo          the backlog    one slice       one fix
```

1. `workspace-setup` prepares the repo, the wiki and `CLAUDE.md` once per project.
2. `shape-it` turns an idea into `docs/backlog/<feature>/scope.md` and `backlog.md`: vertical slices with acceptance criteria, optionally published as GitHub Issues or Azure DevOps work items.
3. `implement` takes one slice (`implement S1`) and turns its acceptance criteria into tests, code, a review and a commit, running the `tdd` loop on each criterion.
4. `tdd` builds a feature or fixes a bug test-first, red → green → refactor.
5. `kets-review` reviews a change for the design regressions it introduces; `implement` runs it at its review step. `codebase-design` is the shared vocabulary of `tdd`, `implement` and `kets-review`.
6. `analyze` reads a ticket or bug report and finds where the problem is, before `tdd` or `implement` fix it.

Each skill also works on its own: `implement` accepts any ticket or spec, `shape-it` works in a chat without a codebase.

## Skills

### Development

| Skill | What it does | Requirements |
| --- | --- | --- |
| `workspace-setup` | Sets up a workspace for agent work on any stack: code repo, a wiki the agent maintains as its second brain (Karpathy's LLM Wiki pattern: raw sources, index and log, ingest / task / query / lint), reference folder, run/debug config and `CLAUDE.md` with real commands, on Azure DevOps, GitHub or local only. Checks that the workflow skills (`shape-it`, `implement`, `tdd`, `kets-review`, bundled `/simplify`, `/code-review`) are available and warns about the missing ones. | `git`. Optional: `az` with the azure-devops extension, or `gh`, to create repos, PRs and branch policies. |
| `shape-it` | Turns a product idea, MVP or feature into a scoped plan and a backlog of vertical slices with acceptance criteria. Writes markdown in the repo and can publish it as tickets. | Optional: `gh` or `az` to publish the backlog to GitHub Issues or Azure DevOps Boards. |
| `implement` | Implements a slice, spec or ticket test-first from its acceptance criteria, checks the result against the spec, simplifies it, reviews it with `/code-review` and `kets-review`, guards the quality floor (no new suppressions, skipped tests or removed assertions) and commits. | Claude Code (uses the `/simplify` and `/code-review` skills when available). |
| `tdd` | Builds a feature or fixes a bug test-first in the red → green → refactor loop: tests at agreed seams, one vertical slice at a time, refactor only on green. Adapted from Matt Pocock's `tdd` skill (MIT). | None. |
| `codebase-design` | Shared vocabulary for designing deep modules (module, interface, seam, adapter, depth), where a vertical slice is a module, plus clean code rules for the code inside a module. Used by `tdd` and `implement`. Adapted from Matt Pocock's `codebase-design` skill (MIT). | None. |
| `kets-review` | Reviews a change (diff, branch, PR or path) for the design regressions it introduces: spaghetti code and related smells, logic in the wrong place, duplicates of existing helpers, weaker types, pass-through wrappers. Judges the change against the project's own architecture, so it works on any stack and on old codebases; lists at most 3 improvement opportunities in the touched code without applying them. Complements `/code-review`. Used by `implement`. | None. Optional: `gh` or `az` to review a PR. |
| `analyze` | Analyzes a ticket, issue or bug report (Azure DevOps, GitHub, Jira or pasted text): cross-checks docs/wiki, code, git history and the database (read-only) to find where the problem is and propose the minimal fix. The answer is short and written for a person. | None to analyze pasted text. To read tickets: Azure CLI with the `azure-devops` extension, `gh`, or a connector for other trackers. |

### Work

| Skill | What it does | Requirements |
| --- | --- | --- |
| `log-task-hours` | Logs actual hours on an Azure DevOps work item as a child Task, inferring ticket, hours and title from your Claude Code sessions. Call it with `/mikeleg-skills:log-task-hours [ticket-id]` or `/kowalski:ore`. | Azure CLI with the `azure-devops` extension, Python. Claude Code (reads the `~/.claude/projects` session logs). Organization and assignee come from the Azure CLI defaults (`az devops configure`, `az account show`). |
| `reply-draft` | Drafts a reply to a customer email as an Outlook draft (never sent), using the thread, your past replies and the current work as context. Call it with `/mikeleg-skills:reply-draft [sender, subject or work item id]` or `/kowalski:email`. | Microsoft 365 connector (Outlook). Optional: Azure CLI to read work items. |

### Content

| Skill | What it does | Requirements |
| --- | --- | --- |
| `product-video` | Rules and recipes for building or revising a product promo video in Remotion: voice-over (Gemini TTS), music, highlights on app screenshots, CTA, sync and delivery checks. | Node.js with Remotion, ffmpeg, Python. Optional: Gemini API key (`GEMINI_API_KEY`) for the voice, Claude in Chrome for screenshots. |

## Agents

### kowalski

"Kowalski, analysis!" Give him a ticket, an issue or a bug report and he cross-checks wiki, code, git history and the database (read-only) to find where the problem is and propose the minimal fix. The answer is written for a person: short, with a diagram only when it helps.

Call him with `/kowalski:analisi 15307`, or just by name: `kowalski, analisi del 15307`.

His commands run the skills in this repo: `/kowalski:pianifica` ([shape-it](#development)), `/kowalski:prepara` ([workspace-setup](#development)), `/kowalski:analisi` ([analyze](#development)), `/kowalski:implementa` ([implement](#development)), `/kowalski:review` ([kets-review](#development)), `/kowalski:email` ([reply-draft](#work)), `/kowalski:ore` ([log-task-hours](#work)), `/kowalski:video` ([product-video](#content)).

Requirements: none to analyze pasted text. To read tickets: Azure CLI with the `azure-devops` extension (Azure DevOps), `gh` (GitHub), or a connector for other trackers. Those skills have their own requirements, listed in the tables above.

## Mods

### cruscotto

A side pane in Claude Code, kept to one tab. It shows:

- usage limits (5 hours, 7 days), each with where it's heading by its reset at the pace so far, and a warning naming the limit that runs out first and how long before its reset
- today's share of the weekly limit: what you used since the day's first reading, against an even split of what was left over the days to the reset
- the context split by category
- prompt-cache hit rate of the main thread and the countdown before the cache goes cold
- where your tokens go in the main thread: a turn-by-turn trace of the context, tool outputs, what the model writes, the outputs that weigh most on every request, files read again, MCP schemas
- subagents with their tokens

Rows cut short show the full text in a card when you hover over them.

A light runs back and forth along a strip while the work goes on and turns solid green when it's done. When a turn ends you get a band in the pane and, for longer turns, a toast, a system notification and a chime.

Open it with `/cruscotto`. Settings, from the plugin's configuration in `/plugin`:

| Setting | Values | Default |
| --- | --- | --- |
| `cacheTtl` | How long the prompt cache stays warm after a turn: `5m` or `1h` | `5m` |
| `notifyAfter` | From which turn length to send toast, notification and sound: `sempre`, `30s`, `2m`, `mai` | `30s` |
| `sound` | Play the end-of-work chime | `true` |

The pane's labels are in Italian.

## Repository layout

```
.claude-plugin/
  marketplace.json     # the mikeleg marketplace: defines mikeleg-skills and kowalski, lists each mod
skills/
  development/         # workspace-setup, shape-it, implement, tdd, codebase-design, kets-review, analyze
  work/                # log-task-hours, reply-draft
  content/             # product-video
plugins/
  kowalski/            # skills: pianifica, prepara, analisi, implementa, review, email, ore, video, each runs a skill from skills/
mods/
  cruscotto/           # a separate plugin: hooks/register.tsx, tests, sounds
```

Each skill lives in `skills/<category>/<name>/SKILL.md`, with any reference files or scripts next to it.

## Contributing and releasing

- New skill: add `skills/<category>/<name>/SKILL.md` with `name` and `description` in the frontmatter, add a row to the tables above and list it in the `description` of the `mikeleg-skills` entry in `.claude-plugin/marketplace.json`.
- New agent: add `plugins/<name>/skills/` and an entry in `marketplace.json` with `source: "./"` and its `skills` paths (they can include skills from `skills/`).
- New mod: add `mods/<name>/` with its own `.claude-plugin/plugin.json` and an entry in `marketplace.json`.
- Release: bump `version` in the plugin's `marketplace.json` entry (in the mod's `plugin.json` for mods), and changing a skill that kowalski wraps (analyze, implement, kets-review, reply-draft, log-task-hours, product-video, shape-it, workspace-setup) needs a kowalski bump too. Installed plugins update only when the version changes.

## License

[MIT](LICENSE)
