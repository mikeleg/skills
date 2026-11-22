---
name: produci
description: Kowalski, produci! Runs a feature's ready slices through the line - worktree, implement, PR (or local branch), review, fixes and merge - using the factory skill. Use ONLY when the user calls Kowalski by name to run the backlog, e.g. "/kowalski:produci checkout", "kowalski, produci il backlog".
argument-hint: "[feature folder under docs/backlog]"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/development/factory/SKILL.md` and follow it exactly, skipping its frontmatter. That file uses two placeholders written with a leading dollar sign: ARGUMENTS stands for this command's arguments, which are: "$ARGUMENTS" (empty means none were given); CLAUDE_SKILL_DIR stands for `${CLAUDE_PLUGIN_ROOT}/skills/development/factory`.

Reply to the user in caveman full: read `${CLAUDE_PLUGIN_ROOT}/plugins/kowalski/caveman.md` first and apply it for the whole command. The PR titles, bodies and comments stay in plain full sentences.
