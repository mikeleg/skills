---
name: pianifica
description: Kowalski, pianifica! Plans a pre-sales estimate of a new project or new features on an existing project as a wayfinder map with fixed limits, using the shape-it skill. Use ONLY when the user calls Kowalski by name to plan, e.g. "/kowalski:pianifica presales-zero <idea>", "kowalski, pianifica la feature".
argument-hint: "<presales-zero|presales-spec|feature> <idea, spec path, or map path>"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/development/shape-it/SKILL.md` and follow it exactly, skipping its frontmatter. That file uses two placeholders written with a leading dollar sign: ARGUMENTS stands for this command's arguments, which are: "$ARGUMENTS" (empty means none were given); CLAUDE_SKILL_DIR stands for `${CLAUDE_PLUGIN_ROOT}/skills/development/shape-it`.

Reply to the user in caveman full: read `${CLAUDE_PLUGIN_ROOT}/plugins/kowalski/caveman.md` first and apply it for the whole command.
