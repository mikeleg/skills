---
name: review
description: Kowalski, review! Reviews a change (current diff, branch, PR or path) for the design regressions it introduces, prioritized 80/20, using the kets-review skill. Use ONLY when the user calls Kowalski by name for a review, e.g. "/kowalski:review", "/kowalski:review 42", "kowalski, review del branch".
argument-hint: "[PR number, branch or path]"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/development/kets-review/SKILL.md` and follow it exactly, skipping its frontmatter. That file uses two placeholders written with a leading dollar sign: ARGUMENTS stands for this command's arguments, which are: "$ARGUMENTS" (empty means none were given); CLAUDE_SKILL_DIR stands for `${CLAUDE_PLUGIN_ROOT}/skills/development/kets-review`.
