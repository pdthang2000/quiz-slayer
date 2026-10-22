# ADR-004: Tag merge runs in one transaction across many cards

- Date: 2026-10-20
- Status: accepted

## Context
Renaming a tag to an existing name merges the two tags (TAG-08). A merge changes tag A, tag B, and every card that has A. The default rule is "one command, one aggregate; other aggregates react to events".

With events, each card is a separate transaction and can fail on its own:
```
t1 Dog gets Dogs ✓
t2 Rex fails (trashed / edited in another tab / DB timeout)
t3 Max gets Dogs ✓
→ half-merged: Dogs shows 3 cards, pitbull still exists with Rex
```
The user is promised "Result: 4 cards" at once. A half-merged state is visible and confusing, and finishing it needs a saga.

Test used to decide:
| Question | Yes → | No → |
|---|---|---|
| Must the user see it done all at once, right now? | one transaction | events |
| Can each part fail and retry independently? | events | one transaction |
Merge: all at once, parts not independent → one transaction.

## Decision
A merge runs in one DB transaction, and every card still goes through the domain class:
1. Lock tag A and tag B rows (`SELECT ... FOR UPDATE`).
2. Load all cards with A (Active and Trashed).
3. Call `card.replaceTag(A, B)` on each (CARDTAG-04). Rules are checked in the class.
4. Save all cards, delete tag A, commit. Any throw → rollback, nothing changes.

## Options considered
- **A1 — set-based SQL** (copy links, delete links, delete tag): fastest, but bypasses the Card class; rules would be protected only by tests.
- **A2 — one transaction through the Card class**: chosen. Rules stay in the domain; slower for very large tags, fine for a rare action in a personal app.
- **B — card by card via events**: half-merged states, saga to finish, more code.
- **C — no merge (error on existing name)**: loses the feature.

## Consequences
- Breaks the "one aggregate per transaction" guideline on purpose; DDD's core (rules in the domain, DB stores only approved changes) still holds.
- Lock prevents the race "card tagged with A during the merge".
- Event listeners must handle `TagsMerged`.
- Revisit with A1 if a merge of thousands of cards becomes slow.
