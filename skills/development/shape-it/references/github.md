# Publishing to GitHub Issues

Read this only after the user confirmed publishing and the tracker is GitHub.

## Detect the path

- **Claude Code / shell available**: `gh auth status` must succeed. If it does not, tell the user to run `gh auth login` and stop; do not try to work around it.
- **Cowork / chat with a GitHub connector**: use the connector's create-issue tool. Same mapping below.
- Neither → stop at markdown and say so.

## Mapping

| Backlog | GitHub |
|---|---|
| Feature / MVP | One tracking issue titled `[Epic] <name>` whose body is a task list of the slices (checked off as they close) and a link/pointer to `docs/backlog/<slug>/scope.md`. |
| Slice | One issue titled `S<N> · <title>`. Body = slice body verbatim (Why, Size, AC, Implementation notes). Last line: `Blocked by: #<n>, #<m>` or `Blocked by: none`. |
| Size | Label `size:S` / `size:M` if those labels exist; otherwise leave Size in the body only. Do not create labels unless asked. |
| Later section | Not published. It stays in markdown. |

Create slice issues first (so numbers exist), then the epic with the task list referencing them. Order the task list in dependency order.

If the repo uses GitHub Projects, do **not** add issues to a project unless the user asked; it is a visible change to a shared board.

## Commands (Claude Code)

```bash
# one per slice
gh issue create --title "S1 · <title>" --body-file /tmp/s1.md [--label "size:M"]
# epic last
gh issue create --title "[Epic] <name>" --body-file /tmp/epic.md
```

Write each body to a temp file first; multi-line `--body` strings break easily. Capture the URL each command prints.

## After publishing

Write the URL into `backlog.md` on the `**Tracker:**` line of each slice and in the header. Commit nothing unless the user's workflow says to; just report the file is updated.

## Blocking edges

GitHub has no native "blocked by" field on free plans. The `Blocked by: #N` line plus the epic task list is the convention. If the repo already uses a different convention (labels like `blocked`, a specific keyword), Orient should have found it – follow the repo.
