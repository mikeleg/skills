---
name: prepara
description: Kowalski, prepara! Sets up a development workspace (repo, wiki, run config, agent instructions), using the workspace-setup skill. Use ONLY when the user calls Kowalski by name to set up a workspace, e.g. "/kowalski:prepara", "kowalski, prepara il repo".
argument-hint: "[project name]"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/development/workspace-setup/SKILL.md` and follow it exactly, skipping its frontmatter. That file uses two placeholders written with a leading dollar sign: ARGUMENTS stands for this command's arguments, which are: "$ARGUMENTS" (empty means none were given); CLAUDE_SKILL_DIR stands for `${CLAUDE_PLUGIN_ROOT}/skills/development/workspace-setup`.
