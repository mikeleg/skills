# skills

Agent skills by mikeleg, installable with [skills.sh](https://skills.sh) or as a Claude Code plugin.

## Skills

### Development

| Skill | What it does | Requirements |
| --- | --- | --- |
| `workspace-setup` | Sets up a workspace for agent work on any stack: code repo, a wiki repo that works as the agent's second brain (index first, short pages pointing to the code, written back after every task), reference folder, run/debug config and `CLAUDE.md` with real commands, on Azure DevOps, GitHub or local only. | `git`. Optional: `az` with the azure-devops extension, or `gh`, to create repos, PRs and branch policies. |
| `shape-it` | Turns a product idea, MVP or feature into a scoped plan and a backlog of vertical slices with acceptance criteria. Writes markdown in the repo and can publish it as tickets. | Optional: `gh` or `az` to publish the backlog to GitHub Issues or Azure DevOps Boards. |
| `implement` | Implements a slice, spec or set of tickets test-first from its acceptance criteria, checks the result against the spec, simplifies it, reviews it with `/code-review`, guards the quality floor (no new suppressions, skipped tests or removed assertions) and commits. | Claude Code (uses the `/simplify` and `/code-review` skills when available). |
| `tdd` | Fixes a bug test-first: writes a focused regression test that fails before the fix and passes after it, or the closest practical check when a test isn't worth it. Runs only when invoked explicitly. | None. |

### Work

| Skill | What it does | Requirements |
| --- | --- | --- |
| `log-task-hours` | Logs actual hours on an Azure DevOps work item as a child Task, inferring ticket, hours and title from your Claude Code sessions. | Azure CLI with the `azure-devops` extension and a default organization set with `az devops configure`. Claude Code (reads the `~/.claude/projects` session logs). |
| `reply-draft` | Drafts a reply to a customer email as an Outlook draft (never sent), using the thread, your past replies and the current work as context. | Microsoft 365 connector (Outlook). Optional: Azure CLI to read work items. |

### Content

| Skill | What it does | Requirements |
| --- | --- | --- |
| `video-prodotto` | Rules and recipes for building or revising a product promo video in Remotion: voice-over (Gemini TTS), music, highlights on app screenshots, CTA, sync and delivery checks. Written in Italian. | Node.js with Remotion, ffmpeg, Python. Optional: Gemini API key (`GEMINI_API_KEY`) for the voice, Claude in Chrome for screenshots. |

## Mods

| Mod | What it does |
| --- | --- |
| `cruscotto` | Side pane in Claude Code with usage limits, context use, git branch, session activity and running subagents. Open it with `/cruscotto`. |

## Install

### skills.sh

```bash
npx skills add mikeleg/skills
```

To install a single skill:

```bash
npx skills add mikeleg/skills --skill shape-it
```

### Claude Code plugin

```
/plugin marketplace add mikeleg/skills
/plugin install mikeleg-skills@mikeleg
```

### Mods

At the prompt of a Claude Code terminal session:

```
/plugin install cruscotto --marketplace mikeleg/skills
```

From a shell:

```bash
claude plugin install cruscotto --marketplace mikeleg/skills
```

## Repository layout

Each skill lives in `skills/<category>/<name>/SKILL.md`, with categories `development`, `work` and `content`. Each mod lives in `mods/<name>/` as its own plugin, listed in `.claude-plugin/marketplace.json`.

## License

[MIT](LICENSE)
