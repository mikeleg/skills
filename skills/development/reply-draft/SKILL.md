---
name: reply-draft
description: Draft a reply to a customer email as an Outlook draft (never sent), using the thread, the user's past replies and the current work (fix, ticket, branch) as context. Use when the user asks to draft/prepare/write a reply to a customer email, e.g. "draft a reply", "reply to the customer", "prepara una bozza di risposta", "rispondi al cliente", "/reply-draft", "/reply-draft 15175".
argument-hint: "[sender | subject | work item id]"
---

Prepare a reply draft in Outlook through the Microsoft 365 connector. The draft is never sent: the user reviews and sends it.

1. **Find the customer email** (`outlook_email_search`, then `read_resource` on `mail:///messages/{id}`):
   - `$ARGUMENTS` is a sender (address or name) or subject text: search with it.
   - `$ARGUMENTS`, or the conversation, is an Azure DevOps work item id: run `az boards work-item show --id <id> --expand relations -o json` (org from the `az devops configure` defaults) and extract the customer email clues from description, history, attachments and links (sender, subject, date, quoted text). Search Outlook with those.
   - No argument: take the newest email in Inbox (order: newest).
   - If several candidates match or you are unsure, ask ONE question listing them (sender, subject, date).
2. **Gather context**:
   - Read the whole thread (search by subject/conversation), including the user's own earlier replies in Sent Items. Copy their tone, formality (tu/Lei, you/vous...), greeting and sign-off.
   - Use the current session and repo work: a fix done for the ticket, `git log`/`git diff` on the current branch, the work item state.
   - Explain things in business terms: no file names, stack traces or internal ticket jargon, unless the customer is technical and asked for them.
   - Never invent facts, dates, commitments, prices or release dates. When something needed is unknown, insert a clearly marked placeholder in the customer's language (e.g. `[DA CONFERMARE: data di rilascio]`, `[TO CONFIRM: release date]`) and report it in the output.
3. **Write the reply**:
   - Same language as the customer email.
   - Answer every question the customer asked.
   - Concise, no AI-sounding filler.
   - Close like the user's past replies. If Outlook adds a signature automatically, do not add a signature block: reuse only the closing name line seen in past replies.
4. **Create the draft**:
   - `outlook_create_reply_all_draft` if the original has recipients other than the user (To/Cc); otherwise `outlook_create_reply_draft`.
   - Body as HTML (`<p>`, `<br>`, `<ul>`/`<li>`, allowed tags only), `bodyType: html`.
   - NEVER send: do not call `outlook_send_draft`.
   - If the user asks for changes afterwards, use `outlook_update_draft` on the same draft; do not create a new one.
5. **Output**: one or two lines with recipient(s), subject and the draft `webLink`, plus any placeholders the user must fill.
