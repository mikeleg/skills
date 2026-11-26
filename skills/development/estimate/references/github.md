# GitHub setup

Read this only when the tracker is GitHub.

## Detect the path

- **Claude Code / shell available**: `gh auth status` must succeed. If it does not, tell the user to run `gh auth login` and stop; do not try to work around it.
- **Cowork / chat with a GitHub connector**: use the connector's edit-issue and label tools.
- Neither → skip the tracker step and say so.
