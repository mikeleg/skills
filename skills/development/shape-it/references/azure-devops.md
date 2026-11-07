# Publishing to Azure DevOps Boards

Read this only after the user confirmed publishing and the tracker is Azure DevOps.

## Detect the path

- **Claude Code / shell available**: `az extension show --name azure-devops` and `az devops configure --list` (org + project defaults). `az boards work-item create` needs `--organization` and `--project` if defaults are not set. If `az` is not logged in (`az account show` fails) tell the user to run `az login` / `az devops login` and stop.
- **Cowork / chat with an Azure DevOps connector**: use its create-work-item tool. Same mapping below.
- Neither → stop at markdown and say so.

## Know the process template first

Work item types differ by process. Ask the API, do not guess:

```bash
az boards work-item type list --project "<project>" -o table
```

| Process | Container type | Slice type |
|---|---|---|
| Agile | Feature | User Story |
| Scrum | Feature | Product Backlog Item |
| Basic | Epic | Issue |
| CMMI | Feature | Requirement |

## Mapping

| Backlog | Azure DevOps |
|---|---|
| Feature / MVP | One Feature (or Epic in Basic) titled `<name>`. Description = link to scope.md + the In/Out lists. |
| Slice | One story/PBI titled `S<N> · <title>`, **Parent** = the Feature. Description = Why + Implementation notes. **Acceptance Criteria field** (`Microsoft.VSTS.Common.AcceptanceCriteria`) = the AC list. |
| Size | `Microsoft.VSTS.Scheduling.StoryPoints` if the team uses points (S=2, M=5 is a sane default; ask if unsure); otherwise put Size in the description. |
| Blocked by | `Predecessor` / `Successor` link: the blocker is the predecessor. |
| Later section | Not published. |

Area path and iteration path: use the project defaults unless the user names one. Never move items into a sprint unless asked.

## Commands (Claude Code)

```bash
# container
az boards work-item create --type Feature --title "<name>" \
  --description "$(cat /tmp/feature.html)" --project "<project>" -o json
# returns id → FEATURE_ID

# slice
az boards work-item create --type "User Story" --title "S1 · <title>" \
  --description "$(cat /tmp/s1-desc.html)" \
  --fields "Microsoft.VSTS.Common.AcceptanceCriteria=$(cat /tmp/s1-ac.html)" \
  --project "<project>" -o json
# returns id → S1_ID

# parent link
az boards work-item relation add --id S1_ID --relation-type parent --target-id FEATURE_ID

# blocking edge: S2 blocked by S1 → S1 is predecessor of S2
az boards work-item relation add --id S2_ID --relation-type predecessor --target-id S1_ID
```

Description and AC fields are HTML, not markdown. Convert `- item` lists to `<ul><li>`, and `Given/When/Then` lines to `<li>` items; otherwise everything collapses into one paragraph. Keep a helper script in `/tmp` if there are more than three slices.

## After publishing

Write each work item URL (`https://dev.azure.com/<org>/<project>/_workitems/edit/<id>`) into `backlog.md` on the slice's `**Tracker:**` line and the Feature URL in the header.
