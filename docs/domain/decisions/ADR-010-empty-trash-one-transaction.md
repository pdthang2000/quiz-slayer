# ADR-010: Empty trash runs in one transaction across many cards

- Date: 2026-10-23
- Status: accepted (Jackkie, C-35)

## Context
"Empty trash" deletes every trashed card of the user after checking that the Trash still holds the count the user saw (TRASH-07, TRASH-11). That changes many Card aggregates in one command. The default rule is "one command, one aggregate"; exceptions need an ADR (CLAUDE.md, ADR-004).

## Decision
`emptyTrash(expectedCount)` runs in one transaction through the `TransactionRunner` (ADR-008):
1. Load the user's trashed cards.
2. Count ≠ expectedCount → `TrashChanged`, nothing deleted (TRASH-11).
3. `card.deletePermanently()` on each (TRASH-09, TRASH-10), then delete exactly those cards.
Any failure rolls back everything.

## Options considered
- **One transaction (chosen)** — "Delete 47 cards forever?" is all or nothing, as the dialog promises.
- **Card by card** — follows the rule; a failure halfway leaves part of the Trash deleted.

## Consequences
- Rules are still checked in the Card class before anything is written.
- Only the cards loaded in step 1 are deleted, and only while still Trashed: a card trashed meanwhile stays; a card restored meanwhile is not deleted.
- A very large Trash means one long transaction; revisit if that ever gets slow (cf. ADR-004).
