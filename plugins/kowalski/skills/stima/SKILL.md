---
name: stima
description: Kowalski, stima! Estimates the agentic work hours of a shaped backlog (min / probable / max per slice, probable and prudent totals), using the estimate skill. Use ONLY when the user calls Kowalski by name to estimate, e.g. "/kowalski:stima", "kowalski, stima il backlog".
argument-hint: "[path to scope.md or backlog.md, or work item id]"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/development/estimate/SKILL.md` and follow it exactly, skipping its frontmatter. That file uses two placeholders written with a leading dollar sign: ARGUMENTS stands for this command's arguments, which are: "$ARGUMENTS" (empty means none were given); CLAUDE_SKILL_DIR stands for `${CLAUDE_PLUGIN_ROOT}/skills/development/estimate`.
