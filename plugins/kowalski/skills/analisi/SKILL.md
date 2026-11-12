---
name: analisi
description: Kowalski, analysis! Analyzes a ticket, issue or bug report and finds where the problem is, using the analyze skill. Use ONLY when the user calls Kowalski by name for an analysis, e.g. "/kowalski:analisi 15307", "kowalski, analisi del 15307".
argument-hint: <ticket id, issue URL or description>
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/development/analyze/SKILL.md` and follow it exactly, skipping its frontmatter. That file uses two placeholders written with a leading dollar sign: ARGUMENTS stands for this command's arguments, which are: "$ARGUMENTS" (empty means none were given); CLAUDE_SKILL_DIR stands for `${CLAUDE_PLUGIN_ROOT}/skills/development/analyze`.
