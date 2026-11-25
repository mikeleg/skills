# Tracker: GitHub

The backlog of this project lives in the GitHub Issues of `<owner>/<repo>`. `docs/product/backlog.md` stays the copy `estimate` reads; issues are where the team works. Use the `gh` CLI.

## Setup check

Done when `gh repo view <owner>/<repo> --json nameWithOwner` prints the repo from inside this directory. If it fails, tell the user what is missing (`gh auth login`, or the remote) and stop.

## Read

- Open issues: `gh issue list --state open --json number,title,body,labels --limit 200`
- One issue: `gh issue view <n> --json number,title,body,labels,state`

## Publish

- Feature: one tracking issue titled `<feature>` with the scope link and a task list of its slices.
- Slice: `gh issue create --title "S<n> · <title>" --body-file <file>`, body = In brief, Why, acceptance criteria, implementation context. Label spikes `spike`.
- Parent: `gh issue edit <feature> --add-sub-issue <n>` (gh 2.94+); otherwise `Part of #<feature>` at the top of the body.
- Blocked by: `gh issue edit <n> --add-blocked-by <m>` (gh 2.94+); otherwise a `Blocked by: #<m>` line at the top of the body.
- Update an existing slice: `gh issue edit <n> --title ... --body-file <file>`.

## Link back

Write `#<n>` on the slice's `**Tracker:**` line in `backlog.md`, and the tracking issue in its header.
