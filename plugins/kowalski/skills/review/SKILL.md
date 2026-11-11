---
name: review
description: Kowalski, review! Reviews a change (current diff, branch, PR or path) for the design regressions it introduces, prioritized 80/20, using the kets-review skill. Use when the user calls Kowalski for a review, e.g. "/kowalski:review", "/kowalski:review 42", "kowalski, review del branch".
argument-hint: [PR number, branch or path]
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/development/kets-review/SKILL.md` and follow it exactly, skipping its frontmatter. In that file, `$ARGUMENTS` means: $ARGUMENTS, and `${CLAUDE_SKILL_DIR}` means `${CLAUDE_PLUGIN_ROOT}/skills/development/kets-review`.
