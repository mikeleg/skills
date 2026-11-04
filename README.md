# skills

Agent skills by mikeleg, installable with [skills.sh](https://skills.sh) or as a Claude Code plugin.

## Skills

| Skill | What it does | Requirements |
| --- | --- | --- |
| `shape-it` | Turns a product idea, MVP or feature into a scoped plan and a backlog of vertical slices with acceptance criteria. Writes markdown in the repo and can publish it as tickets. | Optional: `gh` or `az` to publish the backlog to GitHub Issues or Azure DevOps Boards. |
| `log-task-hours` | Logs actual hours on an Azure DevOps work item as a child Task, inferring ticket, hours and title from your Claude Code sessions. | Azure CLI with the `azure-devops` extension and a default organization set with `az devops configure`. Claude Code (reads the `~/.claude/projects` session logs). |
| `reply-draft` | Drafts a reply to a customer email as an Outlook draft (never sent), using the thread, your past replies and the current work as context. | Microsoft 365 connector (Outlook). Optional: Azure CLI to read work items. |
| `implement` | Implements a spec or set of tickets, using `tdd` where it fits, then simplifies the code, reviews it with `/code-review` and commits. | Claude Code (uses the `/simplify` and `/code-review` skills when available). |
| `tdd` | Fixes a bug test-first: writes a focused regression test that fails before the fix and passes after it, or the closest practical check when a test isn't worth it. Runs only when invoked explicitly. | None. |

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

## Repository layout

Each skill lives in `skills/<name>/SKILL.md`. Skills can be grouped in categories, for example `skills/development/<name>/`.

## License

[MIT](LICENSE)
