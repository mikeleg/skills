---
name: ore
description: Kowalski, ore! Logs actual hours on an Azure DevOps work item as a child Task, using the log-task-hours skill. Use ONLY when the user calls Kowalski by name to log hours, e.g. "/kowalski:ore", "/kowalski:ore 15175", "kowalski, segna le ore".
argument-hint: "[id-ticket]"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/work/log-task-hours/SKILL.md` and follow it exactly, skipping its frontmatter. That file uses two placeholders written with a leading dollar sign: ARGUMENTS stands for this command's arguments, which are: "$ARGUMENTS" (empty means none were given); CLAUDE_SKILL_DIR stands for `${CLAUDE_PLUGIN_ROOT}/skills/work/log-task-hours`.
