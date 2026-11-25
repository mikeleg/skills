# Tracker: Azure DevOps

The backlog of this project lives in Azure Boards. `docs/product/backlog.md` stays the copy `estimate` reads; work items are where the team works. Use `az` with the `azure-devops` extension.

## Settings

- Organization: `https://dev.azure.com/<org>`
- Project: `<project>`
- Process: `<Agile | Scrum | Basic | CMMI>`
- Container type: `<Feature | Epic>` - Slice type: `<User Story | Product Backlog Item | Issue | Requirement>`
- Area path: `<area>` - Iteration path: `<iteration, or project default>`
- Size field: `<Microsoft.VSTS.Scheduling.StoryPoints with S=2, M=5 | in the description>`

Read the types from the project, never guess them: `az boards work-item type list --org <org> --project "<project>" -o table`.

| Process | Container | Slice |
|---|---|---|
| Agile | Feature | User Story |
| Scrum | Feature | Product Backlog Item |
| Basic | Epic | Issue |
| CMMI | Feature | Requirement |

## Setup check

Done when `az account show` succeeds, `az extension show --name azure-devops` finds the extension and `az boards work-item type list --org <org> --project "<project>"` lists the slice type above. If any step fails, tell the user what is missing (`az login`, `az extension add --name azure-devops`, org or project name) and stop.

## Read

- Slices under the feature: `az boards query --org <org> --project "<project>" --wiql "SELECT [System.Id],[System.Title],[System.State] FROM WorkItems WHERE [System.Parent] = <feature-id>" -o json`
- One item: `az boards work-item show --id <id> --org <org> -o json`

## Publish

- Container: `az boards work-item create --org <org> --project "<project>" --type "<container>" --title "<feature>" --description "<html>" --area "<area>" -o json`
- Slice: `az boards work-item create --org <org> --project "<project>" --type "<slice type>" --title "S<n> · <title>" --description "<html>" --fields "Microsoft.VSTS.Common.AcceptanceCriteria=<html>" --area "<area>" -o json`
- Parent: `az boards work-item relation add --id <slice-id> --relation-type parent --target-id <container-id> --org <org>`
- Blocked by: the blocker is the predecessor: `az boards work-item relation add --id <slice-id> --relation-type predecessor --target-id <blocker-id> --org <org>`
- Update: `az boards work-item update --id <id> --title ... --description "<html>" --org <org>`

Description and acceptance criteria are HTML: turn lists into `<ul><li>`, one Given/When/Then per `<li>`, otherwise they collapse into one paragraph. With more than three slices, write the HTML to temporary files and pass them with `$(cat <file>)`. Do not move items into a sprint unless asked.

## Link back

Write `https://dev.azure.com/<org>/<project>/_workitems/edit/<id>` on the slice's `**Tracker:**` line in `backlog.md`, and the container URL in its header.
