---
name: log-task-hours
description: Log the actual hours (Completed Work) on Azure DevOps by creating a child Task of the ticket, deducing ticket, hours and title from the work done with Claude. Use ONLY when the user asks to enter/log/record hours (e.g. "log my hours", "segna le ore", "/log-task-hours", "/log-task-hours 15175").
argument-hint: "[ticket-id]"
---

Log the actual hours on an Azure DevOps ticket (org `https://dev.azure.com/engagelabsit`, any project). The user does NOT provide hours or title: you deduce them.

1. **Ticket**: from `$ARGUMENTS`; otherwise from the current conversation, the branch name or folders like `Ticket-<id>`. If several candidates remain, or none, ask which one (a single question).
2. **Parent**: `az boards work-item show --id <id> --org https://dev.azure.com/engagelabsit --expand relations -o json` → `System.TeamProject`, `System.AreaPath`, `System.IterationPath`, `System.Title`, children (`System.LinkTypes.Hierarchy-Forward`).
3. **Hours already logged**: for each child Task read `Custom.Effectivedate` (or `System.CreatedDate` if missing); take the most recent as `<from>`, so the same work is not counted twice.
4. **Hours worked**: `python "${CLAUDE_SKILL_DIR}/active_session_time.py" <id> [--dal <from>]`. It sums the active time of the Claude Code sessions that mention the ticket (pauses >15 min excluded), rounded up to **multiples of 0.5** (minimum 0.5). If TOTALE is 0, say so and ask for the hours.
5. **Title** — chosen with the Clean Code rules for meaningful names:
   - **reveals intent**: says what was done and on what, without having to open the ticket (verb/action + domain object: "Ripristino impianti LA RUSSA a mai rivalutati");
   - **domain language**: use the terms of the ticket and of the business (impianto, verifica, amministratore, rivalutazione ISTAT…), not needless technical details;
   - **no noise or generic words**: "fix", "varie", "lavoro", "attività", "modifiche", "ticket <id>" are forbidden;
   - **specific but short**: max ~60 characters, written in Italian, a single thing; if the sessions cover several activities, name the predominant one.
   Sources: the current conversation, the `ai-title` records and the user messages of the sessions listed by the script.
6. **Summary**: show on one line `#<id> "<parent title>" → Task "<title>" <hours>h (<sessions/time ranges>)` and proceed without asking for confirmation.
7. **Create the Task** (same project/area/iteration as the parent):
   ```
   az boards work-item create --org https://dev.azure.com/engagelabsit --project "<TeamProject>" --type Task --title "<title>" --assigned-to michele.gatti@engagelabs.it --area "<AreaPath>" --iteration "<IterationPath>" --fields "Microsoft.VSTS.Scheduling.CompletedWork=<hours>" "Custom.Effectivedate=<current UTC time, format YYYY-MM-DDTHH:MM:SSZ>" -o json
   ```
   If `Custom.Effectivedate` does not exist in the project's process, retry without it and report it.
8. **Link and close**: `az boards work-item relation add --id <new> --relation-type parent --target-id <id> --org https://dev.azure.com/engagelabsit`, then `az boards work-item update --id <new> --state Done --org https://dev.azure.com/engagelabsit`.
9. **Verify**: re-read the Task (`CompletedWork`, `Custom.Effectivedate`, `System.Parent`, `State`).

Output: one line, e.g. `✅ Task #15345 "Analisi e fix rivalutazione ISTAT" → 2.5h on #15175 (Done)`. Do not touch the parent ticket.
