# Baseline checklist

The things a review finds missing after the merge, by area. For every area a slice touches, each item that applies becomes an acceptance criterion of the first slice in that area, or a line in `scope.md` Out of scope with its reason. Skip the areas the product doesn't have; don't pad a slice with items that don't apply.

## Sign-in and sessions
- Sign-out ends the session, and the client can't reuse it.
- A removed or disabled user loses access at the next request, not when the session expires.
- Sessions survive a restart or redeploy of the server (keys or session store persisted), or the scope says they don't.
- Repeated failed sign-ins are throttled; the limit and the answer (e.g. `429`) are stated.
- Session cookie or token: lifetime, HttpOnly / Secure / SameSite, or the token's storage on the client.
- Behind a reverse proxy, the client address comes from the forwarded headers (or the deployment is out of scope).

## Identity and uniqueness
- Every "must be unique" rule is enforced by the database (unique index or constraint), not only checked in code; a concurrent duplicate gets the same friendly error as a sequential one.
- What happens to an identifier (slug, code, key) when the record is edited: kept, regenerated, or chosen by the user.
- Existing data that already breaks the new rule: what the migration does with it.

## Lists
- Paginated from the first slice that lists: page size, maximum, total or "has more".
- Default order, stated, and stable across pages.
- Empty state.
- Filters or search, if the list will hold more than a screen.

## Forms and validation
- The same rule on client and server; the server is the source of truth.
- Errors shown next to the field they belong to, and the form keeps what the user typed.
- Blank values (empty string, whitespace, empty rich text such as `<p></p>`) count as missing everywhere the rule applies: on save, in counts, in warnings.

## Writes and data changes
- Concurrent edits of the same record: last write wins, or a conflict error; stated.
- A change to a schema or a definition that existing records depend on: what happens to those records.
- Deleting something other records reference: blocked, cascaded or nulled; stated.
- Timestamps (created, updated) set by the server from the first slice that stores the record.

## Files and uploads
- Allowed types checked by content, not only by name; maximum size; the answer above it.
- Storage that survives a redeploy (a setting pointing outside the deploy folder).
- What happens to the file when its record is deleted, and to the record when its file is missing.

## External calls
- Timeout, retry and what the user sees when the service is down.
- Credentials from settings or secrets, never from committed files.

## Delivery and CI
- Every test suite the project has (unit, integration, end-to-end) runs in CI on every PR; a suite that doesn't is named in Open risks.
- The commands to build, test and run are in `CLAUDE.md` / `AGENTS.md` once the first slice adds them.
- Migrations: who applies them in each environment.
