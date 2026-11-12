---
name: email
description: Kowalski, email! Drafts a reply to a customer email as an Outlook draft (never sent), using the reply-draft skill. Use ONLY when the user calls Kowalski by name for an email reply, e.g. "/kowalski:email", "/kowalski:email 15175", "kowalski, rispondi al cliente".
argument-hint: "[sender | subject | work item id]"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/work/reply-draft/SKILL.md` and follow it exactly, skipping its frontmatter. That file uses two placeholders written with a leading dollar sign: ARGUMENTS stands for this command's arguments, which are: "$ARGUMENTS" (empty means none were given); CLAUDE_SKILL_DIR stands for `${CLAUDE_PLUGIN_ROOT}/skills/work/reply-draft`.
