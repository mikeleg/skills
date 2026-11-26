# Azure DevOps setup

Read this only after the user confirmed writing to the board and the tracker is Azure DevOps.

## Detect the path

- **Claude Code / shell available**: `az extension show --name azure-devops` and `az devops configure --list` (org + project defaults). `az boards work-item update` needs `--organization` and `--project` if defaults are not set. If `az` is not logged in (`az account show` fails) tell the user to run `az login` / `az devops login` and stop.
- **Cowork / chat with an Azure DevOps connector**: use its update-work-item tool.
- Neither → skip the tracker step and say so.
