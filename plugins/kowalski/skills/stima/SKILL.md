---
name: stima
description: Kowalski, stima! Estimates the agentic work hours of the tickets of a spec (min / probable / max per ticket, probable and prudent totals), using the estimate skill. Use ONLY when the user calls Kowalski by name to estimate, e.g. "/kowalski:stima", "kowalski, stima il backlog".
argument-hint: "[path to spec.md or ticket folder, or issue number]"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/development/estimate/SKILL.md` and follow it exactly, skipping its frontmatter. That file uses two placeholders written with a leading dollar sign: ARGUMENTS stands for this command's arguments, which are: "$ARGUMENTS" (empty means none were given); CLAUDE_SKILL_DIR stands for `${CLAUDE_PLUGIN_ROOT}/skills/development/estimate`.

Reply to the user in caveman full: read `${CLAUDE_PLUGIN_ROOT}/plugins/kowalski/caveman.md` first and apply it for the whole command.
