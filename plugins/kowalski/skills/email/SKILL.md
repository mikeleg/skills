---
name: email
description: Kowalski, email! Drafts a reply to a customer email as an Outlook draft (never sent), using the reply-draft skill. Use when the user calls Kowalski for an email reply, e.g. "/kowalski:email", "/kowalski:email 15175", "kowalski, rispondi al cliente".
argument-hint: "[sender | subject | work item id]"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/work/reply-draft/SKILL.md` and follow it exactly, skipping its frontmatter. In that file, `$ARGUMENTS` means: $ARGUMENTS, and `${CLAUDE_SKILL_DIR}` means `${CLAUDE_PLUGIN_ROOT}/skills/work/reply-draft`.
